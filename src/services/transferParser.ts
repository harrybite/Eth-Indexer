import { Interface, Log } from "ethers";
import { z } from "zod";

const erc20Iface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)"
]);

const transferArgsSchema = z.object({
  from: z.string(),
  to: z.string(),
  value: z.union([z.bigint(), z.string(), z.number()])
});

function normalizeEthersArgs(input: unknown): unknown {
  if (Array.isArray(input)) {
    const arr = input as unknown[];
    const from = arr[0];
    const to = arr[1];
    const value = arr[2];
    return { from, to, value };
  }

  if (input && typeof input === "object") {
    const rec = input as Record<string, unknown>;
    const from = rec.from ?? rec[0];
    const to = rec.to ?? rec[1];
    const value = rec.value ?? rec[2];
    return { from, to, value };
  }

  return input;
}

export function parseErc20Transfer(log: Log): {
  from: string;
  to: string;
  value: string;
} {
  const parsed = erc20Iface.parseLog(log);

  if (!parsed) {
    throw new Error("Unable to parse ERC20 Transfer log");
  }

  const normalizedArgs = normalizeEthersArgs(parsed.args);
  const args = transferArgsSchema.parse(normalizedArgs);

  const from = args.from.toLowerCase();
  const to = args.to.toLowerCase();
  const value =
    typeof args.value === "bigint" ? args.value.toString() : BigInt(args.value).toString();

  return { from, to, value };
}
