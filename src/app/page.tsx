"use client";

import { useState, useRef, useEffect } from "react";
import { Activity, Play, Square, Box, Database } from "lucide-react";

export default function Dashboard() {
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  };

  const toggleSubscription = async () => {
    if (isListening) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      setIsListening(false);
      intervalRef.current = null;
      return;
    }

    // Instantly fetch upon listening
    await fetchLogs();
    
    // Setup polling since indexer writes to MongoDB
    intervalRef.current = setInterval(fetchLogs, 2000);
    setIsListening(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-sm">
            Soltrace Studio
          </h1>
          <p className="text-blue-100/50 mt-2 font-medium">Observability Database Monitor</p>
        </div>
        <div className="flex items-center space-x-4 bg-black/20 px-4 py-2 rounded-full border border-white/5">
          <div className={`w-3 h-3 ${isListening ? 'bg-emerald-400 live-indicator' : 'bg-red-500 rounded-full'}`} />
          <span className="text-sm font-medium tracking-wide">{isListening ? 'POLLING MONGODB' : 'IDLE'}</span>
        </div>
      </div>

      {/* Config Panel */}
      <div className="glass-panel p-6 grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="col-span-3 flex items-center space-x-4 p-4 text-emerald-300">
             <Database className="w-8 h-8" />
             <div>
                <p className="font-bold tracking-widest text-sm text-blue-200">DATA SOURCE</p>
                <p className="text-xs opacity-70">Querying Structured JSON from Backend MongoDB. Run `npm run indexer` to ingest.</p>
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
              <><Square className="w-5 h-5 fill-current" /> <span>Halt Poll</span></>
            ) : (
              <><Play className="w-5 h-5 fill-current" /> <span>Watch Live DB</span></>
            )}
          </button>
        </div>
      </div>

      {/* Log Viewer */}
      <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[700px] border border-white/10 shadow-2xl relative">
        <div className="bg-black/40 border-b border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg tracking-wide text-gray-200">Database Records</h2>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/20">
            {logs.length} Structured Logs
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-blue-200/40 space-y-4">
              <Box className="w-16 h-16 opacity-30 animate-pulse" />
              <p className="font-medium tracking-wide">Awaiting database entries...</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="bg-[#0f1117]/80 border border-white/5 rounded-xl p-5 transition-all hover:bg-[#151821] hover:border-white/10 group shadow-lg">
                <div className="flex justify-between items-center px-2 py-1 mb-4">
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 text-[11px] font-black rounded-md uppercase tracking-wider
                      ${log.level === 'Info' ? 'bg-blue-500/20 text-blue-400' : 
                        log.level === 'Error' ? 'bg-red-500/20 text-red-400' : 
                        'bg-gray-500/20 text-gray-400'}`}
                    >
                      {log.level || 'UNKNOWN'}
                    </span>
                    <span className="font-mono text-emerald-300 font-bold tracking-tight text-sm bg-emerald-500/10 px-3 py-1 rounded-md">
                      {log.event || 'Unknown Event'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-blue-400 font-mono tracking-tighter block opacity-60">
                      {log.signature}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="bg-[#050508] rounded-xl p-5 font-mono text-sm overflow-x-auto text-gray-300 border border-white/5 shadow-inner">
                  {log.payload ? (
                    <pre className="text-blue-100/90 leading-relaxed"><span className="text-pink-400 opacity-60">{"{"}</span>
{Object.entries(log.payload).map(([k, v], i, arr) => (
  <div key={k} className="pl-4">
    <span className="text-blue-300">"{k}"</span>: <span className="text-emerald-300">"{String(v)}"</span>{i < arr.length - 1 ? ',' : ''}
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
