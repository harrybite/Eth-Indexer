import { TransferModel, type TransferDocument } from "../db/models/Transfer.js";
import { User } from "../db/models/users.js";
import { logger } from "../utils/logger.js";

type TransferDoc = Omit<TransferDocument, "createdAt" | "updatedAt">;

function isDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;
  return record.code === 11000;
}

/**
 * Stores transfers in the database, but only if the "to" address
 * exists as a user's amfiWalletAddress in the User collection.
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

  console.log("Validating transfers against users", 
    { totalTransfers: transfers.length, uniqueToAddresses: toAddresses.length }
  );

  logger.info(
    { totalTransfers: transfers.length, uniqueToAddresses: toAddresses.length },
    "Validating transfer addresses against users"
  );

  // Query users with matching wallet addresses
  const validUsers = await User.find({
    amfiWalletAddress: { $in: toAddresses },
  }).select("amfiWalletAddress");

  const validAddressSet = new Set(
    validUsers.map((u) => u.amfiWalletAddress?.toLowerCase()).filter(Boolean)
  );

  logger.info(
    { validUsersFound: validUsers.length, validAddresses: validAddressSet.size },
    "Found valid users"
  );

  // Filter transfers to only include those with valid "to" addresses
  const validTransfers = transfers.filter((t) =>
    validAddressSet.has(t.to.toLowerCase())
  );

  if (validTransfers.length === 0) {
    logger.info("No valid transfers to insert (no matching users found)");
    return [];
  }

  logger.info(
    {
      totalTransfers: transfers.length,
      validTransfers: validTransfers.length,
      filteredOut: transfers.length - validTransfers.length,
    },
    "Inserting validated transfers"
  );

  // Insert valid transfers
  let insertedDocs: TransferDoc[] = [];
  try {
    insertedDocs = await TransferModel.insertMany(validTransfers, { ordered: false });
    logger.info({ inserted: insertedDocs.length }, "Successfully inserted transfers");
  } catch (err: unknown) {
    // Ignore duplicate key errors (idempotent re-runs)
    if (!isDuplicateKeyError(err)) {
      logger.error({ err }, "Failed to insert transfers");
      throw err;
    }

    const anyErr = err as Record<string, unknown>;
    const maybeInserted = anyErr.insertedDocs;
    if (Array.isArray(maybeInserted)) {
      insertedDocs = maybeInserted as TransferDoc[];
      logger.info(
        { inserted: insertedDocs.length },
        "Partially inserted transfers (some duplicates)"
      );
    }
  }

  return insertedDocs;
}
