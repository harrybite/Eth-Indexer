

import { Schema, model, Types, Document } from "mongoose";

export interface IUserTokenBalance extends Document {
  userId: Types.ObjectId;
  amfiWalletAddress: string;
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  balance: string;       // bigint stored as string
  balanceUsd: number;    // for sorting / leaderboard
  createdAt: Date;
  updatedAt: Date;
}

const userTokenBalanceSchema = new Schema<IUserTokenBalance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amfiWalletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    chainId: {
      type: Number,
      required: true,
      index: true,
    },

    tokenSymbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    tokenAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    balance: {
      type: String,
      required: true,
      default: "0",
    },

    balanceUsd: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ============================
 * INDEXES (CRITICAL FOR SCALE)
 * ============================
 */

// 1️⃣ Prevent duplicate balance rows per user per chain per token
userTokenBalanceSchema.index(
  { userId: 1, chainId: 1, tokenAddress: 1 },
  { unique: true }
);

// 2️⃣ Fast leaderboard queries (highest holders per chain/token)
userTokenBalanceSchema.index({ chainId: 1, tokenAddress: 1, balanceUsd: -1 });

// 3️⃣ Fast lookup of all balances for a wallet
userTokenBalanceSchema.index({ amfiWalletAddress: 1, chainId: 1 });

// 4️⃣ Optional: Fast lookup per user
userTokenBalanceSchema.index({ userId: 1, chainId: 1 });

export const UserTokenBalanceModel = model<IUserTokenBalance>(
  "UserTokenBalance",
  userTokenBalanceSchema
);