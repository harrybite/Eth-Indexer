import { formatUnits } from "ethers";
import { User } from "../db/models/users.js";
import { logger } from "../utils/logger.js";
import { FEE, TOKEN_DECIMALS } from "../constent.js";
import { BigNumber } from "bignumber.js";
import { env } from "../config/env.js";


export type TransferForBalanceUpdate = {
	to: string;
	value: string; // raw integer amount (wei-like) as string
	tokenName: string; // optional, only used for logging
	decimals: number; // optional, only used for logging
};

function toFiniteNumberOrNull(value: string): number | null {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function parseTokenAmount(value: string, tokenDecimals: number): number | null {
	try {
		const asUnits = formatUnits(BigInt(value), tokenDecimals);
		return toFiniteNumberOrNull(asUnits);
	} catch {
		return null;
	}
}

/**
 * For each transfer, finds a user by `amfiWalletAddress === to` (lowercased)
 * and increments `balanceInUSD` by the transferred token amount.
 *
 * Note: This intentionally does NOT upsert users.
 */
export async function updateUserBalancesFromTransfers(
	transfers: TransferForBalanceUpdate[]
): Promise<{ addressesTouched: number; usersMatched: number; usersModified: number; skipped: number }> {
	if (transfers.length === 0) {
		return { addressesTouched: 0, usersMatched: 0, usersModified: 0, skipped: 0 };
	}


	const totalsByAddress = new Map<string, number>();
	let skipped = 0;

	console.log('transfers to process for balance update', { count: transfers.length, transfers });

	for (const transfer of transfers) {
		const to = (transfer.to ?? "").toLowerCase();
		if (!to) {
			skipped++;
			continue;
		}

		const amount = parseTokenAmount(transfer.value, transfer.decimals);
		if (amount === null || amount === 0) {
			skipped++;
			continue;
		}
		// deduct the fee from the amount before updating user balances if FEE_ENABLED is true
		if (env.FEE_ENABLED) {
			const amountBN = new BigNumber(amount);
			const feeBN = new BigNumber(FEE)
			if (amountBN.isLessThanOrEqualTo(feeBN)) {
				skipped++;
				continue;
			}
			const amountAfterFee = amountBN.minus(feeBN).toNumber();
			console.log(`Applying fee of ${FEE} to transfer to ${to}, original amount: ${amount}, amount after fee: ${amountAfterFee}`);
			totalsByAddress.set(to, (totalsByAddress.get(to) ?? 0) + amountAfterFee);
		} else {
			totalsByAddress.set(to, (totalsByAddress.get(to) ?? 0) + amount);
		}

	}

	if (totalsByAddress.size === 0) {
		return { addressesTouched: 0, usersMatched: 0, usersModified: 0, skipped };
	}

	console.log('updating balances for addresses', totalsByAddress);
	const ops = Array.from(totalsByAddress.entries()).map(([ walletAddress, amount]) => ({
		updateOne: {
			filter: { walletAddress },
			update: { $inc: { balanceInUSD: amount } },
			upsert: false,
		},
	}));

	const res = await User.bulkWrite(ops, { ordered: false });

	logger.info(
		{
			addressesTouched: totalsByAddress.size,
			usersMatched: res.matchedCount,
			usersModified: res.modifiedCount,
			skipped,
		},
		"Updated user balances from transfers",
	);

	return {
		addressesTouched: totalsByAddress.size,
		usersMatched: res.matchedCount,
		usersModified: res.modifiedCount,
		skipped,
	};
}

export async function updateUserNativeBalancesByAddress(params: {
	nativeByToAddress: Map<string, number>;
	reason: string;
}): Promise<{ addressesTouched: number; usersMatched: number; usersModified: number; skipped: number }> {
	const { nativeByToAddress, reason } = params;
	if (nativeByToAddress.size === 0) {
		return { addressesTouched: 0, usersMatched: 0, usersModified: 0, skipped: 0 };
	}

	const ops = Array.from(nativeByToAddress.entries()).map(([ walletAddress, amountNative]) => ({
		updateOne: {
			filter: { walletAddress },
			update: { $inc: { nativeBalance: amountNative } },
			upsert: false,
		},
	}));

	const res = await User.bulkWrite(ops, { ordered: false });

	logger.info(
		{
			addressesTouched: nativeByToAddress.size,
			usersMatched: res.matchedCount,
			usersModified: res.modifiedCount,
			reason,
		},
		"Updated user native balances",
	);

	return {
		addressesTouched: nativeByToAddress.size,
		usersMatched: res.matchedCount,
		usersModified: res.modifiedCount,
		skipped: 0,
	};
}

 