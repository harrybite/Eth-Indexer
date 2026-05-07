import express from "express";
import { pinoHttp } from "pino-http";
import { logger } from "../utils/logger.js";
import { usersRouter } from "./routes/users.routes.js";
import { transfersRouter } from "./routes/transfers.routes.js";
import { nativeTransfersRouter } from "./routes/nativeTransfers.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/users", usersRouter);
  app.use("/api/transfers", transfersRouter);
  app.use("/api/native-transfers", nativeTransfersRouter);

  app.use(errorHandler);

  return app;
}
