import mongoose, { Schema } from 'mongoose';


export interface UserLiveBalances {
  walletAddress: string;
  balanceInUSD: number;
  nativeBalance: number;
}

const userLiveBalanceSchema = new Schema<UserLiveBalances>(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    balanceInUSD: {
      type: Number,
      default: 0,
      required: false,
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
userLiveBalanceSchema.index({ walletAddress: 1 });

// Export model with proper typing
const userLiveBalance =
  (mongoose.models.User as mongoose.Model<UserLiveBalances>) ||
  mongoose.model<UserLiveBalances>(
    'userLiveBalance',
    userLiveBalanceSchema,
  );
export { userLiveBalance };
