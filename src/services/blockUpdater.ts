import { env } from "../config/env.js";
import { BlockCursorModel } from "../db/models/BlockCursor.js";

export async function getLastIndexedBlock(): Promise<number> {
  const doc = await BlockCursorModel.findOne({ chainId: env.CHAIN_ID }).lean();
  if (!doc) return env.START_BLOCK - 1;
  return doc.lastIndexedBlock;
}

export async function setLastIndexedBlock(lastIndexedBlock: number) {
  await BlockCursorModel.updateOne(
    { chainId: env.CHAIN_ID },
    { $set: { lastIndexedBlock } },
    { upsert: true },
  );
}