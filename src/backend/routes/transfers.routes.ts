import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getTransfersHandler,
  getTransferByTxHashHandler,
} from "../controllers/transfers.controller.js";

export const transfersRouter = Router();

transfersRouter.get("/", asyncHandler(getTransfersHandler));
transfersRouter.get("/:txHash", asyncHandler(getTransferByTxHashHandler));
