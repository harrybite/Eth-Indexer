import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getNativeTransfersHandler,
  getNativeTransferByTxHashHandler,
} from "../controllers/nativeTransfers.controller.js";

export const nativeTransfersRouter = Router();

nativeTransfersRouter.get("/", asyncHandler(getNativeTransfersHandler));
nativeTransfersRouter.get("/:txHash", asyncHandler(getNativeTransferByTxHashHandler));
