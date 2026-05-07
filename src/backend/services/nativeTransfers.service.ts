import { NativeTransferModel } from "../../db/models/NativeTransfer.js";

export interface NativeTransferQuery {
  address?: string;
  from?: string;
  to?: string;
  chainId?: number;
}

export async function listNativeTransfers(query: NativeTransferQuery, skip: number, limit: number) {
  const filter: Record<string, unknown> = {};

  if (query.address) {
    const addr = query.address.toLowerCase();
    filter.$or = [{ from: addr }, { to: addr }];
  } else {
    if (query.from) filter.from = query.from.toLowerCase();
    if (query.to) filter.to = query.to.toLowerCase();
  }
  if (query.chainId !== undefined) filter.chainId = query.chainId;

  const [data, total] = await Promise.all([
    NativeTransferModel.find(filter)
      .sort({ blockNumber: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NativeTransferModel.countDocuments(filter),
  ]);

  return { data, total };
}

export async function getNativeTransferByTxHash(txHash: string) {
  return NativeTransferModel.findOne({ txHash: txHash.toLowerCase() }).lean();
}
