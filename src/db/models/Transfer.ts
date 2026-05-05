import { Schema, model } from "mongoose";

export type TransferDocument = {
  chainId: number;
  tokenAddress: string;
  tokenName: string;
  from: string;
  to: string;
  value: string;

  blockNumber: number;
  txHash: string;
  logIndex: number;

  createdAt: Date;
  updatedAt: Date;
};

const transferSchema = new Schema<TransferDocument>(
  {
    chainId: { type: Number, required: true, index: true },
    tokenAddress: { type: String, required: true, index: true, lowercase: true, },
    tokenName: { type: String, required: false },
    from: { type: String, required: true, index: true, lowercase: true, },
    to: { type: String, required: true, index: true, lowercase: true,  },
    value: { type: String, required: true },

    blockNumber: { type: Number, required: true, index: true },
    txHash: { type: String, required: true, tolowercase: true  },
    logIndex: { type: Number, required: true }
  },
  { timestamps: true },
);

transferSchema.index({ chainId: 1, txHash: 1, logIndex: 1 }, { unique: true });

export const TransferModel = model<TransferDocument>("Transfer", transferSchema);
