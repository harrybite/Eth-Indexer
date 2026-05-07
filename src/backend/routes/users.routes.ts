import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getUsersHandler, getUserByWalletHandler } from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.get("/", asyncHandler(getUsersHandler));
usersRouter.get("/:walletAddress", asyncHandler(getUserByWalletHandler));
