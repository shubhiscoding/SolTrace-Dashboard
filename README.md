# Soltrace Dashboard ⚡

Soltrace is a high-performance observability and structured logging dashboard for Solana programs. It provides a real-time, searchable database interface for events emitted natively using the `sol_log!` macro, capturing exactly what is happening inside your smart contracts in a compute-efficient manner.

Unlike standard `msg!` string formatting which burns thousands of Compute Units on-chain, SolTrace relies on emitting cheap encoded JSON via return data pipelines, and offloads all parsing, indexing, and structuring to this standalone dashboard backend heavily utilizing `@solana/kit`.

---

## Architecture Overview

**1. Background Indexer (`src/indexer.ts`)**
A continuous background daemon that connects to a Solana RPC (Helius/Localnet) via websockets. It sniffs for `Program data:` emits tailored for your Program ID, seamlessly decodes the Base64 binary packets into strict JSON using standard struct parsers, and pipes them directly into MongoDB.

**2. API Backend (`src/app/api/logs/route.ts`)**
A fast Next.js API powered by MongoDB that executes the complicated deep JSON searches, text relevance ranking, and filtering natively across the data pool.

**3. Frontend User Interface**
An ultra-modern, dark-themed React UI optimized to query MongoDB flawlessly. It provides responsive text searches, level filtering, and a seamless Live/Pause event loop without ever relying on browser-heavy web3 decoding.

---

## Setup Instructions

### 1. Database Setup
You will need a MongoDB cluster (e.g., MongoDB Atlas, strictly recommended for text scanning). 

Create a `.env.local` file in the root of this folder and add your specific credentials:

```bash
# .env.local
MONGO_URI="mongodb+srv://<USER>:<PASSWORD>@<CLUSTER>.mongodb.net/soltrace?appName=Cluster0"
SOLANA_RPC_WS="wss://devnet.helius-rpc.com/?api-key=<YOUR_HELIUS_KEY>"
PROGRAM_ID="Bhf9E7kVVCavZHoy38hCB9vRMRDDSESRXVhDpRvAPErx"
```

### 2. Install Dependencies
Make sure you have Node > 18.x installed. Run:
```bash
npm install
```

### 3. Running the Stack
The observability stack is a true decoupled architecture, meaning you need to run **TWO** terminal windows.

**Terminal 1: Start the Background Indexer**
This Node task connects to Solana and aggressively pushes blocks to MongoDB.
```bash
npm run indexer
```

**Terminal 2: Start the Next.js UI**
This spins up the Dashboard interface at `http://localhost:3000`.
```bash
npm run dev
```

---

## Features
* **Deep Native JS/MongoDB Scoring**: Queries automatically count occurrences seamlessly across Base64 signatures, explicit structs, or metadata.
* **Instant Reactive Filters**: Searching or altering level dropdowns instantly requests sub-millisecond query pipelines against MongoDB.
* **Pause / Live Toggle**: Freeze your streams while you investigate complex structural logs while maintaining filtering capabilities against your static view.
