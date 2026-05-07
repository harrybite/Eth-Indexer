import { connectMongo } from "../db/mongo.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { createApp } from "./server.js";

async function main() {
  await connectMongo(env.MONGODB_URI);

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "API server started");
  });

  process.on("SIGINT", () => { logger.info("Shutting down API server"); process.exit(0); });
  process.on("SIGTERM", () => { logger.info("Shutting down API server"); process.exit(0); });
}

main().catch((err) => {
  logger.error({ err }, "Fatal error starting API server");
  process.exit(1);
});
