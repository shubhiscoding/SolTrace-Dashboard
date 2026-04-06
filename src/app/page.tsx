"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Play, Pause, Database, Search, Filter } from "lucide-react";

export default function Dashboard() {
  const [isListening, setIsListening] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Filter States
  const [levelFilter, setLevelFilter] = useState("All");
  const [eventFilter, setEventFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (levelFilter !== "All") params.append("level", levelFilter);
      if (eventFilter) params.append("event", eventFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  }, [levelFilter, eventFilter, searchTerm]);

  // Auto-fetch whenever filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Polling loop for live logs
  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [isListening, fetchLogs]);

  const toggleSubscription = () => {
    setIsListening(!isListening);
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0a0c10] text-[#c9d1d9] font-sans selection:bg-blue-500/30">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none mix-blend-overlay" />
      
      <div className="max-w-7xl mx-auto p-8 relative z-10 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 drop-shadow-sm">
              Soltrace Studio
            </h1>
            <p className="text-blue-200/50 mt-2 font-medium tracking-wide">Observability Database Monitor</p>
          </div>
          <div className="flex items-center space-x-3 bg-[#11141b] px-5 py-2.5 rounded-full border border-blue-500/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse' : 'bg-red-500 brightness-75'}`} />
            <span className="text-xs font-bold tracking-widest text-slate-300">
              {isListening ? 'POLLING DB' : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Global Controls & Filters Panel */}
        <div className="bg-[#11141b]/80 backdrop-blur-3xl border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-32 -top-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
             {/* Text Search */}
             <div className="col-span-12 md:col-span-5 relative group">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50 mb-2 block ml-1"><Filter className="w-3 h-3 inline-block -mt-0.5 mr-1" /> Deep Search JSON</label>
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-blue-300/50 group-focus-within:text-blue-400 transition-colors" />
                  <input 
                    placeholder="Search inside payload data..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pl-11 pr-4 py-3 font-mono text-sm tracking-tight text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-blue-200/20"
                  />
                </div>
             </div>
             
             {/* Level Filter */}
             <div className="col-span-6 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50 mb-2 block ml-1">Log Level</label>
                <select 
                  value={levelFilter} 
                  onChange={e => setLevelFilter(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-4 py-3 pt-3 font-sans text-sm font-semibold tracking-wide text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                >
                  <option>All</option>
                  <option>Info</option>
                  <option>Warn</option>
                  <option>Error</option>
                  <option>Debug</option>
                  <option>Trace</option>
                </select>
             </div>
             
             {/* Event Filter */}
             <div className="col-span-6 md:col-span-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50 mb-2 block ml-1">Event Name</label>
                <input 
                  placeholder="e.g. swap_executed" 
                  value={eventFilter}
                  onChange={e => setEventFilter(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-4 py-3 font-mono text-sm tracking-tight text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-blue-200/20"
                />
             </div>

             {/* Action Button */}
             <div className="col-span-12 md:col-span-2">
                <button 
                  onClick={toggleSubscription}
                  className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-bold transition-all duration-300 w-full whitespace-nowrap overflow-hidden ${
                    isListening 
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20' 
                      : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white hover:opacity-90 hover:scale-[1.02] shadow-[0_5px_20px_rgba(16,185,129,0.3)] border border-emerald-400/30'
                  }`}
                >
                  {isListening ? (
                    <><Pause className="w-4 h-4 fill-current shrink-0" /> <span>Pause Logs</span></>
                  ) : (
                    <><Play className="w-4 h-4 fill-current shrink-0" /> <span className="tracking-wide">Live Logs</span></>
                  )}
                </button>
             </div>
          </div>
        </div>

        {/* Output Console View */}
        <div className="bg-[#11141b]/90 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col h-[650px] border border-white/5 shadow-2xl relative">
          <div className="bg-[#0a0c10] border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-lg tracking-wide text-white">Log Stream</h2>
            </div>
            {searchTerm && <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-400/10 px-2 py-1 flex rounded border border-emerald-400/20">relevance sorting active</span>}
            <span className="text-xs font-bold px-3 py-1 bg-[#151b23] text-blue-300 rounded border border-blue-500/20">
              {logs.length} Matches Found
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-blue-200/30 space-y-4">
                <Database className="w-16 h-16 opacity-30 drop-shadow-md" />
                <p className="font-medium tracking-wide">Ready for query execution.</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="bg-[#151b23] border border-white/[0.03] rounded-xl p-5 hover:border-blue-500/20 transition-all hover:bg-[#1a202a] shadow-md group">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded uppercase tracking-widest border
                        ${log.level === 'Info' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          log.level === 'Error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}
                      >
                        {log.level || 'UNKNOWN'}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold tracking-tight text-sm px-2 py-0.5 rounded drop-shadow-sm">
                        {log.event || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-blue-300/40 font-mono tracking-tighter">
                        {log.signature}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="bg-[#0a0c10] rounded-lg p-5 font-mono text-[13px] border border-black/50 shadow-inner overflow-x-auto selection:bg-blue-500/30">
                    {log.payload ? (
                      <pre className="text-slate-300 leading-relaxed max-w-full whitespace-pre-wrap break-words"><span className="text-blue-500/50">{"{"}</span>
{Object.entries(log.payload).map(([k, v], idx, arr) => (
  <div key={k} className="pl-6 hover:bg-white/[0.02] rounded px-2 -ml-2 transition-colors">
    <span className="text-indigo-300">"{k}"</span>: <span className="text-emerald-300/90 font-medium">{String(v).includes('{') ? JSON.stringify(v) : `"${String(v)}"`}</span>{idx < arr.length - 1 ? <span className="text-slate-500">,</span> : ''}
  </div>
))}
<span className="text-blue-500/50">{"}"}</span></pre>
                    ) : (
                      <span className="text-red-400/70 font-xs break-all block">{log.rawBase64}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
