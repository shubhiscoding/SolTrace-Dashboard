"use client";

import { useState, useRef } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Activity, Play, Square, Box } from "lucide-react";
import BN from "bn.js";

// Helper to reliably parse base64 in browser without heavy Buffer polyfills if possible
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

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
    
    if (eventName === "swap_executed") {
      const amountBuf = buffer.subarray(offset, offset + 8);
      const decodedAmount = new BN(amountBuf, "le").toString();
      offset += 8;

      const pubkeyBuf = buffer.subarray(offset, offset + 32);
      const decodedUser = new PublicKey(pubkeyBuf).toBase58();
      
      payload = { amount: decodedAmount, user: decodedUser };
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

export default function Dashboard() {
  const [programId, setProgramId] = useState("Bhf9E7kVVCavZHoy38hCB9vRMRDDSESRXVhDpRvAPErx");
  const [rpcUrl, setRpcUrl] = useState("ws://127.0.0.1:8900");
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const subIdRef = useRef<number | null>(null);
  const connectionRef = useRef<Connection | null>(null);

  const toggleSubscription = async () => {
    if (isListening) {
      if (subIdRef.current !== null && connectionRef.current) {
        await connectionRef.current.removeOnLogsListener(subIdRef.current);
      }
      setIsListening(false);
      subIdRef.current = null;
      return;
    }

    try {
      const pubkey = new PublicKey(programId);
      
      let endpoint = rpcUrl;
      let wsEndpoint = rpcUrl;
      
      if (rpcUrl.startsWith("wss://") || rpcUrl.startsWith("ws://")) {
        endpoint = rpcUrl.replace("wss://", "https://").replace("ws://", "http://");
      } else if (rpcUrl.startsWith("https://") || rpcUrl.startsWith("http://")) {
        wsEndpoint = rpcUrl.replace("https://", "wss://").replace("http://", "ws://");
      }

      const conn = new Connection(endpoint, {
        commitment: "confirmed",
        wsEndpoint: wsEndpoint,
      });
      
      connectionRef.current = conn;
      
      const id = conn.onLogs(pubkey, (logsContext, ctx) => {
        const traces = logsContext.logs.filter(l => l.includes("Program data: "));
        if (traces.length === 0) return;

        const newEntries = traces.map(t => {
          const base64 = t.split("Program data: ")[1];
          const parsed = parseSolTraceLog(base64);
          return {
            signature: logsContext.signature,
            timestamp: new Date().toISOString(),
            parsed,
            rawBase64: base64
          };
        });

        setLogs(prev => [...newEntries, ...prev]);
      });

      subIdRef.current = id;
      setIsListening(true);
    } catch (e) {
      alert("Invalid Program ID or RPC URL");
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-sm">
            Soltrace Studio
          </h1>
          <p className="text-blue-100/50 mt-2 font-medium">Real-time Sol_Log! Event Stream</p>
        </div>
        <div className="flex items-center space-x-4 bg-black/20 px-4 py-2 rounded-full border border-white/5">
          <div className={`w-3 h-3 ${isListening ? 'bg-emerald-400 live-indicator' : 'bg-red-500 rounded-full'}`} />
          <span className="text-sm font-medium tracking-wide">{isListening ? 'STREAMING ACTIVE' : 'DISCONNECTED'}</span>
        </div>
      </div>

      {/* Config Panel */}
      <div className="glass-panel p-6 grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="col-span-3 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-blue-200/60 mb-2 block font-semibold">Program ID</label>
            <input 
              value={programId}
              onChange={e => setProgramId(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 font-mono text-sm tracking-tight"
              disabled={isListening}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-blue-200/60 mb-2 block font-semibold">WebSocket Provider (RPC)</label>
            <input 
              value={rpcUrl}
              onChange={e => setRpcUrl(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 font-mono text-sm tracking-tight text-emerald-100"
              disabled={isListening}
            />
          </div>
        </div>
        <div className="flex flex-col justify-end">
          <button 
            onClick={toggleSubscription}
            className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-bold transition-all duration-300 w-full ${
              isListening 
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-blue-400/30'
            }`}
          >
            {isListening ? (
              <><Square className="w-5 h-5 fill-current" /> <span>Halt Stream</span></>
            ) : (
              <><Play className="w-5 h-5 fill-current" /> <span>Listen</span></>
            )}
          </button>
        </div>
      </div>

      {/* Log Viewer */}
      <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[700px] border border-white/10 shadow-2xl relative">
        <div className="bg-black/40 border-b border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg tracking-wide text-gray-200">Execution Tail</h2>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/20">
            {logs.length} Events Sniffed
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-blue-200/40 space-y-4">
              <Box className="w-16 h-16 opacity-30 animate-pulse" />
              <p className="font-medium tracking-wide">Awaiting intercepted protocol events...</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="bg-[#0f1117]/80 border border-white/5 rounded-xl p-5 transition-all hover:bg-[#151821] hover:border-white/10 group shadow-lg">
                <div className="flex justify-between items-center px-2 py-1 mb-4">
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 text-[11px] font-black rounded-md uppercase tracking-wider
                      ${log.parsed?.level === 'Info' ? 'bg-blue-500/20 text-blue-400' : 
                        log.parsed?.level === 'Error' ? 'bg-red-500/20 text-red-400' : 
                        'bg-gray-500/20 text-gray-400'}`}
                    >
                      {log.parsed?.level || 'UNKNOWN'}
                    </span>
                    <span className="font-mono text-emerald-300 font-bold tracking-tight text-sm bg-emerald-500/10 px-3 py-1 rounded-md">
                      {log.parsed?.event || 'Unknown Event'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <a href={`https://explorer.solana.com/tx/${log.signature}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl.replace('ws','http'))}`} 
                       target="_blank" 
                       rel="noreferrer"
                       className="text-[11px] text-blue-400 hover:text-blue-200 font-mono tracking-tighter truncate w-32 block opacity-60 hover:opacity-100 transition-opacity">
                      {log.signature}
                    </a>
                    <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="bg-[#050508] rounded-xl p-5 font-mono text-sm overflow-x-auto text-gray-300 border border-white/5 shadow-inner">
                  {log.parsed?.payload ? (
                    <pre className="text-blue-100/90 leading-relaxed"><span className="text-pink-400 opacity-60">{"{"}</span>
{Object.entries(log.parsed.payload).map(([k, v], i, arr) => (
  <div key={k} className="pl-4">
    <span className="text-blue-300">"{k}"</span>: <span className="text-emerald-300">"{v}"</span>{i < arr.length - 1 ? ',' : ''}
  </div>
))}
<span className="text-pink-400 opacity-60">{"}"}</span></pre>
                  ) : (
                    <span className="text-red-400/70 font-italic break-all align-middle block p-2 bg-red-900/10 rounded">{log.rawBase64}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
