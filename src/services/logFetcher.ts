import { id, Log } from "ethers";
import { createProvider } from "./evmProvider.js";

export const ERC20_TRANSFER_TOPIC0 = id("Transfer(address,address,uint256)");

export async function fetchErc20TransferLogs(params: {
  fromBlock: number;
  toBlock: number;
  tokenAddresses: string[];
}): Promise<Log[]> {
  const provider = createProvider();

  const addressFilter = params.tokenAddresses.length > 0 ? params.tokenAddresses : undefined;

  return provider.getLogs({
    fromBlock: params.fromBlock,
    toBlock: params.toBlock,
    address: addressFilter,
    topics: [ERC20_TRANSFER_TOPIC0]
  });
}
