/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import "dotenv/config";
import { z } from "zod";
import { de } from "zod/v4/locales";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),

  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().nonnegative().default(0),

  CONFIRMATIONS: z.coerce.number().int().nonnegative().default(10),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  CHUNK_SIZE: z.coerce.number().int().positive().default(10),
  START_BLOCK: z.coerce.number().int().nonnegative().default(0),
  FEE_ENABLED: z.string().default("false").transform((v) => v.toLowerCase() === "true" || v === "1"),
  DB_NAME: z.string().nonempty(),

  FEE: z.coerce.number().positive().default(0.5),
  MINIMUM_TRANSFER_AMOUNT: z.coerce.number().positive().default(1), // set to fee to avoid processing dust transfers that won't cover the fee
  TOKEN_DECIMALS: z.coerce.number(),
  
  SUPPORTED_TOKENS: z
    .string()
    .default("[]")
    .transform((value) => {
      const parsed = JSON.parse(value);
      return z
        .array(
          z.object({
            address: z.string().min(1),
            name: z.string().min(1),
            decimals: z.coerce.number().int().nonnegative(),
          })
        )
        .parse(parsed);
    }),

  INDEX_NATIVE_TOKEN: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true" || v === "1"),

  MAAL_PRICE_CACHE_TTL_HOURS: z.coerce.number().int().positive().default(24),
  MAAL_PRICE_CACHE_PATH: z.string().default("data/maal-price.json"),

  MONGODB_URI: z.string().min(1)
});

export const env = envSchema.parse(process.env);
