# Amfi Indexer

A TypeScript (Node.js) log indexer for an EVM / Ethereum-based chain using MongoDB.

## What it indexes

- ERC-20 `Transfer(address,address,uint256)` logs
- Only for `SUPPORTED_TOKENS` (comma-separated token contract addresses)
- Uses a **safe block** (latest - confirmations) to avoid reorg issues

## Quick start

1) Start MongoDB:

```bash
npm run db:up
```

2) Configure env:

```bash
cp .env.example .env
```

3) Install deps and run:

```bash
npm i
npm run dev
```

## Core logic

- `latestBlock = eth_blockNumber()`
- `safeBlock = latestBlock - CONFIRMATIONS`
- `fromBlock = lastIndexedBlock + 1`
- `toBlock = safeBlock`
- If `toBlock < fromBlock`, wait and poll again

## Configuration

See `.env.example` for all settings.
