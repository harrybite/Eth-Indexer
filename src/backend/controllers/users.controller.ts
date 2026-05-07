import type { Request, Response } from "express";
import { listUsers, getUserByWallet } from "../services/users.service.js";
import { parsePagination } from "../utils/pagination.js";

export async function getUsersHandler(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const { data, total } = await listUsers(skip, limit);
  res.json({ data, total, page, limit });
}

export async function getUserByWalletHandler(req: Request, res: Response): Promise<void> {
  const walletAddress = req.params.walletAddress;
  if (!walletAddress || typeof walletAddress !== "string") {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }
  const result = await getUserByWallet(walletAddress);
  if (!result) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(result);
}
