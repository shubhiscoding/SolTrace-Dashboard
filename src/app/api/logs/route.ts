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

// Create a wildcard text index for all string fields in the document!
LogSchema.index({ "$**": "text" });

const SolTraceLog = mongoose.models.SolTraceLog || mongoose.model('SolTraceLog', LogSchema);

export async function GET(request: Request) {
    try {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(MONGO_URI);
            // Ensure indexes are built
            await SolTraceLog.syncIndexes();
        }

        const url = new URL(request.url);
        const level = url.searchParams.get("level");
        const event = url.searchParams.get("event");
        const search = url.searchParams.get("search");

        const filter: any = {};
        
        if (level && level !== 'All') {
            filter.level = { $regex: new RegExp(`^${level}$`, 'i') };
        }
        if (event && event.trim() !== '') {
            filter.event = { $regex: new RegExp(event, 'i') };
        }

        // Fetch recent logs matching the hard filters
        let logs = await SolTraceLog.find(filter).sort({ timestamp: -1 }).limit(1000).lean();

        if (search && search.trim() !== '') {
            const searchLower = search.toLowerCase();
            
            // Native JS Deep JSON Search & Ranking
            const rankedLogs = logs.map((log: any) => {
                // Strictly evaluate the JSON keys and values within the payload + event + signature
                const searchableString = JSON.stringify({
                    signature: log.signature,
                    event: log.event,
                    payload: log.payload
                }).toLowerCase();

                // Count exact occurrences of the search term
                const occurrences = searchableString.split(searchLower).length - 1;
                
                return { ...log, _score: occurrences };
            });

            // Filter out 0 matches, sort by occurrences (descending), then timestamp
            logs = rankedLogs
                .filter((log: any) => log._score > 0)
                .sort((a: any, b: any) => b._score - a._score);
        }
        
        // Return top 100 matching logs
        return NextResponse.json(logs.slice(0, 100));
    } catch (e) {
        console.error("API GET logs error:", e);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
