import { TransferModel, type TransferDocument } from "../db/models/Transfer.js";
import { logger } from "../utils/logger.js";

type TransferDoc = Omit<TransferDocument, "createdAt" | "updatedAt">;

function isDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;
  // MongoBulkWriteError (from insertMany) uses the name field; plain duplicate errors use code 11000
  if (record.name === "MongoBulkWriteError") return true;
  return record.code === 11000;
}

/**
 * Stores transfers in the database.
 * 
 * @param transfers - Array of transfer documents to store
 * @returns Array of actually inserted transfers (may be empty or partial)
 */
export async function storeValidatedTransfers(
  transfers: TransferDoc[]
): Promise<TransferDoc[]> {
  if (transfers.length === 0) return [];

  // Extract unique "to" addresses
  const toAddresses = [...new Set(transfers.map((t) => t.to.toLowerCase()))];

  logger.info({ totalTransfers: transfers.length, uniqueToAddresses: toAddresses.length }, "Storing transfers");


  let insertedDocs: TransferDoc[] = [];
  try {
    insertedDocs = await TransferModel.insertMany(transfers, { ordered: false });
    logger.info({ inserted: insertedDocs.length }, "Successfully inserted transfers");
  } catch (err: unknown) {
    // Ignore duplicate key errors (idempotent re-runs)
    if (!isDuplicateKeyError(err)) {
      logger.error({ err }, "Failed to insert transfers");
      throw err;
    }

    const anyErr = err as Record<string, unknown>;
    // MongoBulkWriteError exposes the successful insertions via `result.insertedIds`
    // but not the actual documents. Log the count from the result if available.
    const result = anyErr.result as Record<string, unknown> | undefined;
    const insertedCount = result
      ? (result.insertedCount as number | undefined) ?? 0
      : 0;
    logger.info(
      { inserted: insertedCount },
      "Partially inserted transfers (some duplicates skipped)"
    );
  }

  return insertedDocs;
}
