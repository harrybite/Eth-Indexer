import { Schema, model } from "mongoose";

export type NativeTransferDocument = {
  chainId: number;
  from: string;
  to: string;
  value: string;
  tokenName?: string;
  blockNumber: number;
  txHash: string;

  createdAt: Date;
  updatedAt: Date;
};

const nativeTransferSchema = new Schema<NativeTransferDocument>(
  {
    chainId: { type: Number, required: true, index: true },
    from: { type: String, required: true, index: true, tolowercase: true  },
    to: { type: String, required: true, index: true, tolowercase: true  },
    value: { type: String, required: true },
    tokenName: { type: String, required: false, default: "Maal" },
    blockNumber: { type: Number, required: true, index: true },
    txHash: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

nativeTransferSchema.index({ chainId: 1, txHash: 1 }, { unique: true });

export const NativeTransferModel = model<NativeTransferDocument>(
  "NativeTransfer",
  nativeTransferSchema,
);
