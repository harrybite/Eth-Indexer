# ETH Indexer

A TypeScript (Node.js) EVM log indexer that watches ERC-20 `Transfer` events on any EVM-compatible chain and stores them in MongoDB. It also maintains per-user token balances and native token balances for registered wallet addresses.

## What it indexes

- ERC-20 `Transfer(address indexed from, address indexed to, uint256 value)` logs for all configured `SUPPORTED_TOKENS`
- Native token transfers (when `INDEX_NATIVE_TOKEN=true`)
- Skips dust transfers below `MINIMUM_TRANSFER_AMOUNT`
- Uses a **safe block** (`latestBlock - CONFIRMATIONS`) to avoid re-org issues
- Resumes from the last indexed block across restarts (cursor stored in MongoDB)

## Architecture

```
Indexer loop
  └── fetchErc20TransferLogs     → fetch logs in CHUNK_SIZE block ranges
  └── parseErc20Transfer         → decode raw log into { from, to, value }
  └── storeValidatedTransfers    → insert into Transfers collection (idempotent, skips duplicates)
  └── updateUserBalancesFromTransfers   → update User.balanceInUSD for receivers
  └── updateChainSpecificBalances       → upsert UserTokenBalance for senders & receivers
```

## Quick start

### 1. Start MongoDB

```bash
pnpm run db:up
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Install dependencies and run

```bash
pnpm install
pnpm run dev
```

### Other scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Run with hot-reload (tsx watch) |
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run start` | Run compiled build |
| `pnpm run typecheck` | Type-check without emitting |
| `pnpm run test` | Run tests (vitest) |
| `pnpm run db:down` | Stop MongoDB container |

## Environment variables

### Required

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | MongoDB database name | `amfi` |
| `RPC_URL` | EVM-compatible JSON-RPC endpoint | `https://rpc.example.com` |
| `SUPPORTED_TOKENS` | JSON array of token configs to index | see below |

`SUPPORTED_TOKENS` format:

```json
[
  { "address": "0xTokenAddress", "name": "RUSD", "decimals": 18 }
]
```

### Optional (with defaults)

| Variable | Default | Description |
|---|---|---|
| `CHAIN_ID` | `0` | Chain ID stored on each transfer record |
| `CONFIRMATIONS` | `10` | Blocks behind latest to treat as safe |
| `POLL_INTERVAL_MS` | `30000` | Milliseconds between indexer loop iterations |
| `CHUNK_SIZE` | `10` | Number of blocks to fetch logs for per request |
| `START_BLOCK` | `0` | Block to start indexing from (only on first run) |
| `MINIMUM_TRANSFER_AMOUNT` | `1` | Minimum token amount (human-readable) to index; skips dust below this |
| `FEE` | `0.5` | Fee amount used in balance calculations |
| `FEE_ENABLED` | `false` | Whether fee deduction is applied |
| `TOKEN_DECIMALS` | — | Global fallback decimals (prefer per-token decimals in `SUPPORTED_TOKENS`) |
| `INDEX_NATIVE_TOKEN` | `false` | Also index native token (e.g. ETH/MAAL) transfers |
| `MAAL_PRICE_CACHE_TTL_HOURS` | `24` | How long to cache the native token USD price |
| `MAAL_PRICE_CACHE_PATH` | `data/maal-price.json` | File path for the price cache |
| `LOG_LEVEL` | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) |
| `NODE_ENV` | `development` | Node environment |

## Core indexing logic

```
latestBlock  = eth_blockNumber()
safeBlock    = latestBlock - CONFIRMATIONS
fromBlock    = lastIndexedBlock + 1
toBlock      = min(safeBlock, fromBlock + CHUNK_SIZE - 1)

if toBlock < fromBlock → sleep POLL_INTERVAL_MS and retry
```

## Requirements

- Node.js >= 20
- MongoDB 7+
- Docker (for `db:up` / `db:down`)

---

If you found this project useful, consider giving it a ⭐ on GitHub — it helps others discover it and keeps the project going!
