import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getMaalPriceInUSD } from "./MaalPriceUSD.js";

type CacheFile = {
  priceUsd: number;
  fetchedAt: string; // ISO
};

function isValidCacheFile(input: unknown): input is CacheFile {
  if (!input || typeof input !== "object") return false;
  const rec = input as Record<string, unknown>;
  return (
    typeof rec.priceUsd === "number" &&
    Number.isFinite(rec.priceUsd) &&
    typeof rec.fetchedAt === "string"
  );
}

function nowMs() {
  return Date.now();
}

function ttlMsFromEnv() {
  return env.MAAL_PRICE_CACHE_TTL_HOURS * 60 * 60 * 1000;
}

async function readCacheFile(cachePath: string): Promise<CacheFile | null> {
  try {
    const raw = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidCacheFile(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCacheFile(cachePath: string, data: CacheFile): Promise<void> {
  const dir = path.dirname(cachePath);
  await mkdir(dir, { recursive: true });
  await writeFile(cachePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Returns cached MAAL price in USD.
 * - Refreshes at most once per TTL (default 24h)
 * - Persists to a JSON file for reuse across restarts
 */
export async function getCachedMaalPriceUsd(): Promise<{ priceUsd: number; source: "cache" | "api" }> {
  const cachePathFromEnv = String(env.MAAL_PRICE_CACHE_PATH);
  const cachePath = path.resolve(process.cwd(), cachePathFromEnv);
  const ttlMs = ttlMsFromEnv();

  const cached = await readCacheFile(cachePath);
  if (cached) {
    const fetchedAtMs = Date.parse(cached.fetchedAt);
    const ageMs = Number.isFinite(fetchedAtMs) ? nowMs() - fetchedAtMs : Number.POSITIVE_INFINITY;

    if (ageMs >= 0 && ageMs < ttlMs && cached.priceUsd > 0) {
      return { priceUsd: cached.priceUsd, source: "cache" };
    }
  }

  // Fetch from API and refresh cache
  const priceUsd = await getMaalPriceInUSD();

  if (typeof priceUsd === "number" && Number.isFinite(priceUsd) && priceUsd > 0) {
    const data: CacheFile = { priceUsd, fetchedAt: new Date().toISOString() };
    await writeCacheFile(cachePath, data);
    logger.info({ priceUsd, cachePath }, "Refreshed MAAL price cache");
    return { priceUsd, source: "api" };
  }

  // If API fails, fall back to stale cache if present
  if (cached && cached.priceUsd > 0) {
    logger.warn({ cachePath }, "MAAL price API failed; using stale cached price");
    return { priceUsd: cached.priceUsd, source: "cache" };
  }

  // Hard fallback
  logger.warn({ cachePath }, "MAAL price unavailable; defaulting to 0");
  return { priceUsd: 0, source: "cache" };
}
