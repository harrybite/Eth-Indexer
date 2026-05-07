import { TransferModel } from "../../db/models/Transfer.js";

export interface TransferQuery {
  address?: string;
  from?: string;
  to?: string;
  tokenAddress?: string;
  chainId?: number;
}

export async function listTransfers(query: TransferQuery, skip: number, limit: number) {
  const filter: Record<string, unknown> = {};

  if (query.address) {
    const addr = query.address.toLowerCase();
    filter.$or = [{ from: addr }, { to: addr }];
  } else {
    if (query.from) filter.from = query.from.toLowerCase();
    if (query.to) filter.to = query.to.toLowerCase();
  }
  if (query.tokenAddress) filter.tokenAddress = query.tokenAddress.toLowerCase();
  if (query.chainId !== undefined) filter.chainId = query.chainId;

  const [data, total] = await Promise.all([
    TransferModel.find(filter)
      .sort({ blockNumber: -1, logIndex: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TransferModel.countDocuments(filter),
  ]);

  return { data, total };
}

export async function getTransferByTxHash(txHash: string) {
  return TransferModel.find({ txHash: txHash.toLowerCase() })
    .sort({ logIndex: 1 })
    .lean();
}
