/* eslint-disable @typescript-eslint/no-unused-vars */
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { sleep } from "../utils/sleep.js";
import { createProvider } from "../services/evmProvider.js";
import { fetchErc20TransferLogs } from "../services/logFetcher.js";
import { parseErc20Transfer } from "../services/transferParser.js";
import { TransferModel } from "../db/models/Transfer.js";
import { getLastIndexedBlock, setLastIndexedBlock } from "../services/blockUpdater.js";
import { formatUnits, type Provider, type TransactionResponse } from "ethers";
import { NativeTransferModel } from "../db/models/NativeTransfer.js";
import {
  updateUserBalancesFromTransfers,
  updateUserNativeBalancesByAddress,
} from "../services/balanceUpdate.js";
import { FEE, MINIMUM_TRANSFER_AMOUNT, SUPPORTED_TOKENS, TOKEN_DECIMALS } from "../constent.js";
import { storeValidatedTransfers } from "../services/transferStorage.js";
import { updateChainSpecificBalances } from "../services/userTokenBalanceUpdate.js";
import BigNumber from "bignumber.js";

// Change this when your native token decimals change.
export const NATIVE_TOKEN_DECIMALS = 18;

function clampToNonNegative(n: number) {
  return n < 0 ? 0 : n;
}


async function persistTransfers(logs: Awaited<ReturnType<typeof fetchErc20TransferLogs>>) {
  if (logs.length === 0) return;

  const docs = logs.map((log) => {
    const { from, to, value } = parseErc20Transfer(log);
    
    

    const txValue = new BigNumber(value).dividedBy(new BigNumber(10).pow(TOKEN_DECIMALS));
    if (txValue.isLessThan(MINIMUM_TRANSFER_AMOUNT)) {
      logger.info(
        { txHash: log.transactionHash, value: txValue.toString() },
        "Skipping transfer below minimum transfer amount",
      );
      return null;
    }
  

    const tokenName = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === log.address.toLowerCase())?.name ?? "unknown";
    return {
      chainId: env.CHAIN_ID,
      tokenAddress: log.address.toLowerCase(),
      tokenName: tokenName,
      from,
      to,
      value,
      blockNumber: Number(log.blockNumber),
      txHash: String(log.transactionHash),
      logIndex: Number(log.index)
    };
  }).filter((doc) => doc !== null);

  console.log("Inserting transfer docs", { count: docs.length });

  // Use the new validated transfer storage service
  const insertedDocs = await storeValidatedTransfers(docs);

  // Only apply balance increments for transfers that were newly inserted.
  if (insertedDocs.length > 0) {
    await updateUserBalancesFromTransfers(
      insertedDocs.map((d) => ({ to: d.to, value: d.value })),
      { tokenDecimals: TOKEN_DECIMALS },
    );
  }

    // Update chain-specific balances for both senders and receivers
    console.log("Updating chain-specific balances for inserted transfers", { count: docs.length });
    await updateChainSpecificBalances(
      docs.map((d) => ({
        chainId: d.chainId,
        tokenName: d.tokenName,
        tokenAddress: d.tokenAddress,
        from: d.from,
        to: d.to,
        value: d.value,
      })),
      { tokenDecimals: TOKEN_DECIMALS },
    );

}

function isDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;
  return record.code === 11000;
}

async function persistNativeTransfers(params: {
  provider: Provider;
  fromBlock: number;
  toBlock: number;
}) {
  const { provider, fromBlock, toBlock } = params;

  const docs: Array<{
    chainId: number;
    from: string;
    to: string;
    value: string;
    blockNumber: number;
    txHash: string;
  }> = [];

  console.log("Native transfers (receipt-based)", { fromBlock, toBlock });

  // 1. Fetch block hashes only (cheap & reliable)
  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
    const block = await provider.getBlock(blockNumber);
    if (!block || !Array.isArray(block.transactions)) continue;

    for (const txHash of block.transactions) {
      // 2. Fetch receipt (canonical source)
      console.log("found txHash", txHash);

      const receipt = await provider.getTransactionReceipt(txHash as string);

      console.log("Fetched receipt", txHash, receipt );
      if (!receipt || receipt.status !== 1) continue;


      // 3. Fetch transaction to read native value
      const tx = await provider.getTransaction(txHash as string);
      console.log("Fetched transaction", txHash, tx );
      if (!tx) continue;

      if (!tx.from || !tx.to) continue;
      if (tx.value === 0n) continue;

      console.log('Found native transfer',{
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        blockNumber: receipt.blockNumber,
        txHash: txHash as string,
      })

      docs.push({
        chainId: env.CHAIN_ID,
        from: tx.from.toLowerCase(),
        to: tx.to.toLowerCase(),
        value: tx.value.toString(),
        blockNumber: receipt.blockNumber,
        txHash: txHash as string,
      });
    }
  }

  if (docs.length === 0) {
    console.log("No native transfers found", { fromBlock, toBlock });
    return;
  }

  let insertedDocs: Array<(typeof docs)[number]> = [];
  try {
    insertedDocs = await NativeTransferModel.insertMany(docs, { ordered: false });
  } catch (err: unknown) {
    if (!isDuplicateKeyError(err)) throw err;
    const anyErr = err as Record<string, unknown>;
    const maybeInserted = anyErr.insertedDocs;
    if (Array.isArray(maybeInserted)) {
      insertedDocs = maybeInserted as Array<(typeof docs)[number]>;
    }
  }

  // if (insertedDocs.length === 0) return;

  // const nativeByToAddress = new Map<string, number>();

  // for (const d of insertedDocs) {
  //   const amountNative = Number(formatUnits(BigInt(d.value), NATIVE_TOKEN_DECIMALS));
  //   if (!Number.isFinite(amountNative) || amountNative <= 0) continue;


  //   nativeByToAddress.set(
  //     d.to,
  //     (nativeByToAddress.get(d.to) ?? 0) + amountNative,
  //   );
  // }

  // await updateUserNativeBalancesByAddress({
  //   nativeByToAddress,
  //   reason: "native-transfer",
  // });
}

export async function runIndexerOnce() {
  const provider = createProvider();

  const latestBlock = await provider.getBlockNumber();
  const safeBlock = clampToNonNegative(latestBlock - env.CONFIRMATIONS);

  const lastIndexedBlock = await getLastIndexedBlock();

  const fromBlock = lastIndexedBlock + 1;
  const toBlock = safeBlock;

  if (toBlock < fromBlock) {
    logger.info(
      { latestBlock, safeBlock, lastIndexedBlock, fromBlock, toBlock },
      "Nothing to index yet",
    );
    return;
  }

  logger.info(
    { latestBlock, safeBlock, lastIndexedBlock, fromBlock, toBlock },
    "Indexing block range",
  );

  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const chunkFrom = cursor;
    const chunkTo = Math.min(toBlock, chunkFrom + env.CHUNK_SIZE - 1);

    const tokenAddresses = SUPPORTED_TOKENS.map(t => t.address);

    const logs = await fetchErc20TransferLogs({
      fromBlock: chunkFrom,
      toBlock: chunkTo,
      tokenAddresses: tokenAddresses,
    });

    console.log("Logs fetched", { 
      logsLength: logs.length,
      fromBlock: chunkFrom,
      toBlock: chunkTo
     });

    const data = await persistTransfers(logs);
    console.log("Native token indexing enabled:", env.INDEX_NATIVE_TOKEN);
    if (env.INDEX_NATIVE_TOKEN) {
      await persistNativeTransfers({ provider, fromBlock: chunkFrom, toBlock: chunkTo });
    }
    await setLastIndexedBlock(chunkTo);

    console.log("data from persistTransfers", data);

    logger.info(
      { chunkFrom, chunkTo, logs: logs.length, lastIndexedBlock: chunkTo },
      "Indexed chunk",
    );

    cursor = chunkTo + 1;
  }
}

export async function runIndexerLoop() {
  while (true) {
    try {
      await runIndexerOnce();
    } catch (err) {
      logger.error({ err }, "Indexer run failed");
    }
    await sleep(env.POLL_INTERVAL_MS);
  }
}
