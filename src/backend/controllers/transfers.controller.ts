import type { Request, Response } from "express";
import {
  listTransfers,
  getTransferByTxHash,
  type TransferQuery,
} from "../services/transfers.service.js";
import { parsePagination } from "../utils/pagination.js";

export async function getTransfersHandler(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string>;

  const query: TransferQuery = {
    address: q.address || undefined,
    from: q.from || undefined,
    to: q.to || undefined,
    tokenAddress: q.tokenAddress || undefined,
    chainId: q.chainId ? Number(q.chainId) : undefined,
  };

  const { data, total } = await listTransfers(query, skip, limit);
  res.json({ data, total, page, limit });
}

export async function getTransferByTxHashHandler(req: Request, res: Response): Promise<void> {
  const txHash = req.params.txHash;
  if (!txHash || typeof txHash !== "string") {
    res.status(400).json({ error: "Invalid txHash" });
    return;
  }
  const transfers = await getTransferByTxHash(txHash);
  if (transfers.length === 0) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }
  res.json({ data: transfers });
}
