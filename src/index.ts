import { connectMongo } from "./db/mongo.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { runIndexerLoop } from "./indexer/indexer.js";
import { SUPPORTED_TOKENS } from "./constent.js";

async function main() {
  logger.info(
    {
      chainId: env.CHAIN_ID,
      confirmations: env.CONFIRMATIONS,
      pollIntervalMs: env.POLL_INTERVAL_MS,
      chunkSize: env.CHUNK_SIZE,
      supportedTokensCount: SUPPORTED_TOKENS.length,
      startBlock: env.START_BLOCK
    },
    "Starting indexer",
  );

  await connectMongo(env.MONGODB_URI);

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down...");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await runIndexerLoop();
}

main().catch((err) => {
  logger.error({ err }, "Fatal error");
  process.exit(1);
});
