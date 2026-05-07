import { User } from "../../db/models/users.js";
import { UserTokenBalanceModel } from "../../db/models/userTokenBalance.js";

export async function listUsers(skip: number, limit: number) {
  const [data, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(),
  ]);
  return { data, total };
}

export async function getUserByWallet(walletAddress: string) {
  const addr = walletAddress.toLowerCase();
  const user = await User.findOne({ walletAddress: addr }).lean();
  if (!user) return null;

  const tokenBalances = await UserTokenBalanceModel.find({ userId: user._id })
    .sort({ tokenSymbol: 1 })
    .lean();

  return { user, tokenBalances };
}
