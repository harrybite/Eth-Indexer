import mongoose, { Schema, Document } from "mongoose";

export interface Usertype extends Document {
  balanceInUSD?: number;
  nativeBalance?: number;
  walletAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}


const UserSchema = new Schema<Usertype>(
  {
    balanceInUSD: { 
      type: Number,
      default: 0,
      required: false,
    },

    walletAddress: {
      type: String,
      required: false,
      lowercase: true,
    },
    nativeBalance: {
      type: Number,
      default: 0,
      required: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  },
);

// Create indexes for better performance
UserSchema.index({ walletAddress: 1 });

// Export model with proper typing
const User =
  (mongoose.models.User as mongoose.Model<Usertype>) ||
  mongoose.model<Usertype>("User", UserSchema);
export { User };
