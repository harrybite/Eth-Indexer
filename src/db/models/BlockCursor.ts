import { Schema, model } from "mongoose";

export type BlockCursorDocument = {
  chainId: number;
  lastIndexedBlock: number;
  updatedAt: Date;
  createdAt: Date;
};

const blockCursorSchema = new Schema<BlockCursorDocument>(
  {
    chainId: { type: Number, required: true, unique: true, index: true },
    lastIndexedBlock: { type: Number, required: true }
  },
  { timestamps: true },
);

export const BlockCursorModel = model<BlockCursorDocument>("BlockCursor", blockCursorSchema);
