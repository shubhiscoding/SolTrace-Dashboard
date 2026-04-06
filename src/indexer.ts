import { createSolanaRpcSubscriptions, address } from '@solana/kit';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGO_URI || "";
const SOLANA_RPC_WS = process.env.SOLANA_RPC_WS || "ws://127.0.0.1:8900";
const PROGRAM_ID = process.env.PROGRAM_ID || "Bhf9E7kVVCavZHoy38hCB9vRMRDDSESRXVhDpRvAPErx";

if (!MONGO_URI || MONGO_URI.includes('<db_password>')) {
    console.error("FATAL: Please set actual database password in .env.local");
    process.exit(1);
}

// 1. Setup MongoDB Schema
const LogSchema = new mongoose.Schema({
    signature: { type: String, required: true, unique: true },
    programId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    level: { type: String },
    event: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed },
    rawBase64: { type: String }
});

LogSchema.index({ "$**": "text" });

const SolTraceLog = mongoose.models.SolTraceLog || mongoose.model('SolTraceLog', LogSchema);

// 2. Decoder Logic (moved from Frontend to Backend)
const parseSolTraceLog = (base64Data: string) => {
    try {
        const buffer = Buffer.from(base64Data, "base64");
        let offset = 8; // skip discriminator

        const logLevelIndex = buffer.readUInt8(offset);
        offset += 1;
        const levels = ["Trace", "Debug", "Info", "Warn", "Error"];

        const strLen = buffer.readUInt32LE(offset);
        offset += 4;

        const eventName = buffer.subarray(offset, offset + strLen).toString("utf-8");
        offset += strLen;

        const dataLen = buffer.readUInt32LE(offset);
        offset += 4;

        let payload: any = {};
        
        // Custom decode SwapExecuted
        if (eventName === "swap_executed") {
            const amountBuf = buffer.subarray(offset, offset + 8);
            const amountBigInt = amountBuf.readBigUInt64LE(0);
            offset += 8;

            const pubkeyBuf = buffer.subarray(offset, offset + 32);
            // encode the 32 byte pubkey buffer back to a base58 solana address representation
            const decodedUser = bs58.encode(pubkeyBuf);
            
            payload = { amount: amountBigInt.toString(), user: decodedUser };
        } else {
            payload = { raw: buffer.subarray(offset).toString("hex") };
        }

        return {
            level: levels[logLevelIndex] || "Info",
            event: eventName,
            payload
        };
    } catch (err) {
        return null;
    }
};

// 3. Setup @solana/kit Subscription and MongoDB Ingestion
async function startIndexer() {
    console.log(`📡 Connecting to MongoDB...`);
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB.`);

    const rpcSubscriptions = createSolanaRpcSubscriptions(SOLANA_RPC_WS);
    console.log(`📡 Setup RPC Subscriptions on ${SOLANA_RPC_WS}`);
    
    console.log(`✅ Listening for logs from ${PROGRAM_ID}...`);
    
    const abortController = new AbortController();
    const logsNotifications = await rpcSubscriptions.logsNotifications(
        { mentions: [address(PROGRAM_ID)] },
        { commitment: 'confirmed' }
    ).subscribe({ abortSignal: abortController.signal });

    for await (const notification of logsNotifications) {
        const { value: { logs, signature, err } } = notification;
        if (err) continue;
        if (!logs) continue;

        const traces = logs.filter((l: string) => l.includes("Program data: "));
        if (traces.length === 0) continue;

        for (const t of traces) {
            const base64 = t.split("Program data: ")[1];
            const parsed = parseSolTraceLog(base64);

            if (parsed) {
                try {
                    await SolTraceLog.create({
                        signature,
                        programId: PROGRAM_ID,
                        level: parsed.level,
                        event: parsed.event,
                        payload: parsed.payload,
                        rawBase64: base64
                    });
                    console.log(`💾 Saved event '${parsed.event}' [${signature}] to MongoDB!`);
                } catch (e: any) {
                    if (e.code !== 11000) { // ignore duplicate key errors if already processed
                        console.error('Mongo Save Error', e);
                    }
                }
            }
        }
    }
}

startIndexer().catch(console.error);
