import { JsonRpcProvider } from "ethers";
import { env } from "../config/env.js";

export function createProvider() {
  return new JsonRpcProvider(env.RPC_URL, env.CHAIN_ID || undefined);
}
