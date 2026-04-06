import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || "";

const LogSchema = new mongoose.Schema({
    signature: { type: String, required: true, unique: true },
    programId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    level: { type: String },
    event: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed },
    rawBase64: { type: String }
});

const SolTraceLog = mongoose.models.SolTraceLog || mongoose.model('SolTraceLog', LogSchema);

export async function GET() {
    try {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGO_URI);
        }
        
        // Fetch latest 100 logs from Mongo
        const logs = await SolTraceLog.find({}).sort({ timestamp: -1 }).limit(100);
        return NextResponse.json(logs);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
