import type { Request, Response } from "express";
import {
  listNativeTransfers,
  getNativeTransferByTxHash,
  type NativeTransferQuery,
} from "../services/nativeTransfers.service.js";
import { parsePagination } from "../utils/pagination.js";

export async function getNativeTransfersHandler(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const q = req.query as Record<string, string>;

  const query: NativeTransferQuery = {
    address: q.address || undefined,
    from: q.from || undefined,
    to: q.to || undefined,
    chainId: q.chainId ? Number(q.chainId) : undefined,
  };

  const { data, total } = await listNativeTransfers(query, skip, limit);
  res.json({ data, total, page, limit });
}

export async function getNativeTransferByTxHashHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const txHash = req.params.txHash;
  if (!txHash || typeof txHash !== "string") {
    res.status(400).json({ error: "Invalid txHash" });
    return;
  }
  const transfer = await getNativeTransferByTxHash(txHash);
  if (!transfer) {
    res.status(404).json({ error: "Native transfer not found" });
    return;
  }
  res.json({ data: transfer });
}
