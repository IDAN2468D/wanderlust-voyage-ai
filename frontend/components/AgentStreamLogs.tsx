"use client";

import React, { useRef, useEffect } from "react";
import { Terminal, Plane, Calendar, DollarSign, Sparkles, CheckCircle2, Wrench, ShieldAlert, Cpu } from "lucide-react";

export interface StreamLogItem {
  id: string;
  type: "step" | "tool_call" | "chunk" | "done" | "error";
  agent?: string;
  title?: string;
  message?: string;
  tool?: string;
  summary?: string;
  timestamp: string;
}

interface AgentStreamLogsProps {
  logs: StreamLogItem[];
  activeAgent: string | null;
  isStreaming: boolean;
}

export const AgentStreamLogs: React.FC<AgentStreamLogsProps> = ({ logs, activeAgent, isStreaming }) => {
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const agents = [
    {
      id: "travel_orchestrator",
      name: "מוביל התזמור",
      role: "סוכן ראשי וסינתזה",
      icon: Sparkles,
      color: "text-purple-400",
      activeBg: "from-purple-600/30 to-indigo-600/20 border-purple-500",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
    {
      id: "flight_hotel_agent",
      name: "טיסות ולינה",
      role: "איתור כרטיסים ומלונות",
      icon: Plane,
      color: "text-blue-400",
      activeBg: "from-blue-600/30 to-cyan-600/20 border-blue-500",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    {
      id: "itinerary_agent",
      name: "מסלולים ואטרקציות",
      role: "תכנון יומי וקולינריה",
      icon: Calendar,
      color: "text-cyan-400",
      activeBg: "from-cyan-600/30 to-teal-600/20 border-cyan-500",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    },
    {
      id: "budget_agent",
      name: "מבקר תקציב פיננסי",
      role: "ביקורת עלויות ואישור",
      icon: DollarSign,
      color: "text-emerald-400",
      activeBg: "from-emerald-600/30 to-teal-600/20 border-emerald-500",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 border border-white/10 relative overflow-hidden" dir="rtl">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-white tracking-wide">
              מוניטור חשיבה וביצוע של סוכני ה-AI
            </h3>
            <p className="text-[11px] text-slate-400">טלמטריה, שיקולים והפעלת כלים בזמן אמת דרך הזרמת SSE</p>
          </div>
        </div>
        <div>
          {isStreaming ? (
            <span className="flex items-center gap-2 text-xs text-cyan-300 font-semibold bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 shadow-sm shadow-cyan-500/20">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              הסוכנים מתאמים...
            </span>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800">
              המתנה / מוכן
            </span>
          )}
        </div>
      </div>

      {/* Specialist Team Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isActive = activeAgent === agent.id;
          const isFinished = !isStreaming && logs.some((l) => l.agent === agent.id);

          return (
            <div
              key={agent.id}
              className={`p-3 rounded-2xl border text-right transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? `bg-gradient-to-b ${agent.activeBg} shadow-lg shadow-indigo-500/10 scale-[1.02]`
                  : isFinished
                  ? "bg-slate-900/90 border-slate-700/80 text-slate-200"
                  : "bg-slate-900/60 border-slate-800/80 text-slate-400 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg bg-slate-800/80 ${agent.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isActive && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                )}
                {isFinished && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="font-bold text-xs text-white truncate">{agent.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{agent.role}</div>
            </div>
          );
        })}
      </div>

      {/* Terminal Output Container */}
      <div className="rounded-2xl bg-[#070b14] border border-slate-800/90 overflow-hidden shadow-inner font-mono text-xs text-right">
        {/* Terminal Titlebar */}
        <div className="bg-[#0b101c] px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-[11px] text-slate-400 mr-2 font-sans font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              יומן פעולות חי - voyage-agent-stream.log
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">{logs.length} אירועים נרשמו</span>
        </div>

        {/* Terminal Logs Area */}
        <div className="p-4 max-h-72 overflow-y-auto space-y-2.5">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-sans">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p className="text-xs">ממתין להזנת פרמטרים ולחיצה על שיגור...</p>
              <p className="text-[11px] text-slate-400 mt-1">
                הגדר מוצא, יעד ותקציב כדי לצפות בהליך קבלת ההחלטות האוטונומי של הסוכנים.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              if (log.type === "step") {
                return (
                  <div key={log.id} className="flex items-start gap-2.5 text-slate-200">
                    <span className="text-slate-400 text-[10px] whitespace-nowrap mt-0.5">{log.timestamp}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      שלב
                    </span>
                    <div>
                      <span className="font-semibold text-white font-sans text-xs">{log.title}</span>
                      {log.message && <p className="text-slate-400 font-sans text-xs mt-0.5">{log.message}</p>}
                    </div>
                  </div>
                );
              }

              if (log.type === "tool_call") {
                return (
                  <div key={log.id} className="flex items-start gap-2.5 text-cyan-300 bg-cyan-950/20 p-2 rounded-xl border border-cyan-800/30">
                    <span className="text-cyan-400 text-[10px] whitespace-nowrap mt-0.5">{log.timestamp}</span>
                    <Wrench className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-xs font-mono text-cyan-200">{log.tool}()</span>
                      {log.summary && <p className="text-slate-300 font-sans text-xs mt-0.5">{log.summary}</p>}
                    </div>
                  </div>
                );
              }

              if (log.type === "done") {
                return (
                  <div key={log.id} className="flex items-start gap-2.5 text-emerald-300 bg-emerald-950/20 p-2 rounded-xl border border-emerald-800/30">
                    <span className="text-emerald-400 text-[10px] whitespace-nowrap mt-0.5">{log.timestamp}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-xs font-sans text-emerald-200">{log.title}</span>
                      {log.message && <p className="text-emerald-300/80 font-sans text-xs mt-0.5">{log.message}</p>}
                    </div>
                  </div>
                );
              }

              if (log.type === "error") {
                return (
                  <div key={log.id} className="flex items-start gap-2.5 text-rose-300 bg-rose-950/20 p-2 rounded-xl border border-rose-800/30">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-xs font-sans text-rose-200">{log.title}</span>
                      {log.message && <p className="text-rose-300/80 font-sans text-xs mt-0.5">{log.message}</p>}
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}
          <div ref={terminalBottomRef} />
        </div>
      </div>
    </div>
  );
};
