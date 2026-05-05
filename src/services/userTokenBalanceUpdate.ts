import { User } from "../db/models/users.js";
import { UserTokenBalanceModel } from "../db/models/userTokenBalance.js";
import { logger } from "../utils/logger.js";
import { formatUnits } from "ethers";

interface TransferForBalanceUpdate {
  chainId: number;
  tokenName: string;
  tokenAddress: string;
  from: string;
  to: string;
  value: string; // Raw value as string (wei, smallest unit)
}

interface UpdateOptions {
  tokenDecimals: number;
}

/**
 * Updates user token balances in the UserTokenBalance collection based on transfers.
 * - Decreases balance for sender (from address)
 * - Increases balance for receiver (to address)
 * 
 * IMPORTANT: Only updates balances for addresses that exist as users in the database.
 * 
 * @param transfers - Array of transfers to process
 * @param options - Configuration including token decimals
 */
export async function updateChainSpecificBalances(
  transfers: TransferForBalanceUpdate[],
  options: UpdateOptions
): Promise<void> {
  if (transfers.length === 0) return;

  const { tokenDecimals } = options;

  // Step 1: Extract all unique addresses (both from and to)
  const allAddresses = new Set<string>();
  for (const transfer of transfers) {
    allAddresses.add(transfer.from.toLowerCase());
    allAddresses.add(transfer.to.toLowerCase());
  }

  logger.info(
    { totalTransfers: transfers.length, uniqueAddresses: allAddresses.size },
    "Starting token balance updates in UserTokenBalance collection"
  );

  // Step 2: Query database to find which addresses are actually users
  const validUsers = await User.find({
    amfiWalletAddress: { $in: Array.from(allAddresses) },
  }).select("_id amfiWalletAddress");

  // Create maps for quick lookup
  const addressToUserId = new Map<string, string>();
  for (const user of validUsers) {
    if (user.amfiWalletAddress) {
      addressToUserId.set(user.amfiWalletAddress.toLowerCase(), user._id.toString());
    }
  }

  console.log("Valid user addresses found:", {
    totalAddresses: allAddresses.size,
    validUsers: addressToUserId.size,
    addresses: Array.from(addressToUserId.keys()),
  });

  logger.info(
    { totalAddresses: allAddresses.size, validUsers: addressToUserId.size },
    "Found valid user addresses"
  );

  if (addressToUserId.size === 0) {
    logger.info("No valid users found, skipping balance updates");
    return;
  }

  // Step 3: Process each transfer and update balances
  let updatesProcessed = 0;
  let updatesFailed = 0;

  for (const transfer of transfers) {
    try {
      const amount = BigInt(transfer.value);
      
      if (amount <= 0n) {
        logger.warn({ transfer }, "Skipping transfer with invalid amount");
        continue;
      }

      console.log("Processing transfer for balance update", {
        from: transfer.from,
        to: transfer.to,
        chainId: transfer.chainId,
        tokenSymbol: transfer.tokenName,
        tokenAddress: transfer.tokenAddress,
        amount: amount.toString(),
      });

      const fromAddress = transfer.from.toLowerCase();
      const toAddress = transfer.to.toLowerCase();
      const { chainId, tokenName, tokenAddress } = transfer;

      const fromUserId = addressToUserId.get(fromAddress);
      const toUserId = addressToUserId.get(toAddress);

      console.log("Processing transfer for balance update", {
        from: fromAddress,
        to: toAddress,
        chainId,
        tokenSymbol: tokenName,
        tokenAddress,
        amount: amount.toString(),
        fromIsUser: !!fromUserId,
        toIsUser: !!toUserId,
      });

      // Update sender balance (decrease)
      if (fromUserId) {
        await updateUserBalance({
          userId: fromUserId,
          walletAddress: fromAddress,
          chainId,
          tokenSymbol: tokenName,
          tokenAddress,
          amountChange: -amount, // Negative for decrease
          tokenDecimals,
        });
        console.log(`Decreased balance for ${fromAddress}: ${tokenName} by ${amount.toString()}`);
        updatesProcessed++;
      }

      // Update receiver balance (increase)
      if (toUserId) {
        await updateUserBalance({
          userId: toUserId,
          walletAddress: toAddress,
          chainId,
          tokenSymbol: tokenName,
          tokenAddress,
          amountChange: amount, // Positive for increase
          tokenDecimals,
        });
        console.log(`Increased balance for ${toAddress}: ${tokenName} by ${amount.toString()}`);
        updatesProcessed++;
      }

      if (!fromUserId && !toUserId) {
        logger.debug(
          { from: fromAddress, to: toAddress },
          "Neither from nor to address is a user, skipping"
        );
      }
    } catch (err) {
      updatesFailed++;
      logger.error(
        { err, transfer },
        "Failed to process balance update for transfer"
      );
      // Continue with other transfers
    }
  }

  logger.info(
    { 
      totalTransfers: transfers.length,
      updatesProcessed,
      updatesFailed,
    },
    "Completed token balance updates in UserTokenBalance collection"
  );
}

/**
 * Updates a user's token balance in the UserTokenBalance collection.
 * Uses MongoDB's $inc operator for atomic updates.
 * Creates the record if it doesn't exist (upsert).
 * 
 * @param params - Balance update parameters
 */
async function updateUserBalance(params: {
  userId: string;
  walletAddress: string;
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  amountChange: bigint; // Can be positive (receive) or negative (send)
  tokenDecimals: number;
}): Promise<void> {
  const {
    userId,
    walletAddress,
    chainId,
    tokenSymbol,
    tokenAddress,
    amountChange,
    tokenDecimals,
  } = params;

  try {
    // First, get the current balance to calculate the new balance
    const existingBalance = await UserTokenBalanceModel.findOne({
      userId,
      chainId,
      tokenAddress: tokenAddress.toLowerCase(),
    });

    // Calculate new balance
    const currentBalanceBigInt = existingBalance
      ? BigInt(existingBalance.balance)
      : 0n;
    const newBalanceBigInt = currentBalanceBigInt + amountChange;

    // Don't allow negative balances
    const finalBalanceBigInt = newBalanceBigInt < 0n ? 0n : newBalanceBigInt;
    const finalBalanceString = finalBalanceBigInt.toString();

    // Calculate USD value (set to 0 for now, can be updated with price feeds later)
    const balanceInHumanReadable = Number(formatUnits(finalBalanceBigInt, tokenDecimals));
    const balanceUsd = balanceInHumanReadable; 

    console.log("Updating UserTokenBalance:", {
      userId,
      walletAddress,
      chainId,
      tokenSymbol,
      tokenAddress,
      currentBalance: currentBalanceBigInt.toString(),
      amountChange: amountChange.toString(),
      newBalance: finalBalanceString,
      balanceInHumanReadable,
    });

    // Upsert the balance record
    const result = await UserTokenBalanceModel.updateOne(
      {
        userId,
        chainId,
        tokenAddress: tokenAddress.toLowerCase(),
      },
      {
        $set: {
          amfiWalletAddress: walletAddress.toLowerCase(),
          tokenSymbol: tokenSymbol.toUpperCase(),
          balance: finalBalanceString,
          balanceUsd,
        },
      },
      {
        upsert: true, // Create if doesn't exist
      }
    );

    logger.info(
      {
        userId,
        walletAddress,
        chainId,
        tokenSymbol,
        tokenAddress,
        amountChange: amountChange.toString(),
        newBalance: finalBalanceString,
        balanceInHumanReadable,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      },
      "Updated user token balance"
    );
  } catch (err) {
    logger.error(
      {
        err,
        userId,
        walletAddress,
        chainId,
        tokenSymbol,
        tokenAddress,
      },
      "Failed to update user token balance"
    );
    throw err;
  }
}
