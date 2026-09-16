"use client";

import React, { useRef, useEffect } from "react";
import {
  Terminal,
  Plane,
  Calendar,
  DollarSign,
  Sparkles,
  CheckCircle2,
  Wrench,
  ShieldAlert,
  Cpu,
  CloudSun,
  ShieldCheck,
  Compass,
} from "lucide-react";

export interface StreamLogItem {
  id: string;
  type: "step" | "tool_call" | "chunk" | "done" | "error";
  agent?: string;
  stage?: string;
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
    },
    {
      id: "flight_hotel_agent",
      name: "טיסות ולינה",
      role: "איתור כרטיסים ומלונות",
      icon: Plane,
      color: "text-blue-400",
      activeBg: "from-blue-600/30 to-cyan-600/20 border-blue-500",
    },
    {
      id: "itinerary_agent",
      name: "מסלולים ואטרקציות",
      role: "תכנון יומי וקולינריה",
      icon: Calendar,
      color: "text-cyan-400",
      activeBg: "from-cyan-600/30 to-teal-600/20 border-cyan-500",
    },
    {
      id: "weather_packing_agent",
      name: "אקלים ואריזה חכמה",
      role: "תחזית ורשימת ציוד",
      icon: CloudSun,
      color: "text-amber-400",
      activeBg: "from-amber-600/30 to-orange-600/20 border-amber-500",
    },
    {
      id: "safety_advisory_agent",
      name: "ביטחון, ויזות ובריאות",
      role: "פרוטוקול כניסה וחירום",
      icon: ShieldCheck,
      color: "text-rose-400",
      activeBg: "from-rose-600/30 to-red-600/20 border-rose-500",
    },
    {
      id: "culture_events_agent",
      name: "פנינות נסתרות ותרבות",
      role: "פסטיבלים וספוטים סודיים",
      icon: Compass,
      color: "text-indigo-400",
      activeBg: "from-indigo-600/30 to-purple-600/20 border-indigo-500",
    },
    {
      id: "budget_agent",
      name: "מבקר תקציב פיננסי",
      role: "ביקורת וכרית ביטחון 10%",
      icon: DollarSign,
      color: "text-emerald-400",
      activeBg: "from-emerald-600/30 to-teal-600/20 border-emerald-500",
    },
  ];

  // Derive current execution stage
  const latestStepWithStage = [...logs].reverse().find((l) => l.stage);
  const currentStage = latestStepWithStage?.stage || (isStreaming ? "PROCESSING" : "READY");

  return (
    <div className="wanderlust-glass rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-5 border border-white/15 relative overflow-hidden" dir="rtl">
      {/* Decorative ambient blur */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-mint-400/20 to-teal-500/10 border border-mint-400/30 text-mint-300 shadow-inner">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-white tracking-tight">
                מוניטור חשיבה וסנכרון של 7 סוכני ה-AI
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono border border-white/10">
                STAGE: {currentStage}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              טלמטריה, הפעלת כלים בזמן אמת, אימות טיסות וכרית ביטחון 10% בהזרמת SSE
            </p>
          </div>
        </div>

        <div>
          {isStreaming ? (
            <span className="flex items-center gap-2 text-xs text-mint-300 font-bold bg-mint-500/15 px-3.5 py-1.5 rounded-full border border-mint-400/40 shadow-sm shadow-mint-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-mint-400 animate-ping" />
              הסוכנים מתאמים בזמן אמת...
            </span>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-900/90 px-3.5 py-1.5 rounded-full border border-slate-800 font-medium">
              המתנה / מוכן לשיגור
            </span>
          )}
        </div>
      </div>

      {/* 7 Specialist Agents Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 relative z-10">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isActive = activeAgent === agent.id;
          const isFinished = !isStreaming && logs.some((l) => l.agent === agent.id);

          return (
            <div
              key={agent.id}
              className={`p-3 rounded-2xl border text-right transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[96px] ${
                isActive
                  ? `bg-gradient-to-b ${agent.activeBg} shadow-lg shadow-mint-500/10 scale-[1.03] ring-1 ring-mint-400/50`
                  : isFinished
                  ? "bg-[#0c141f]/90 border-slate-700/80 text-slate-200"
                  : "bg-[#090f17]/70 border-white/5 text-slate-400 opacity-75"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-xl bg-white/5 ${agent.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isActive && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-mint-400"></span>
                  </span>
                )}
                {isFinished && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div>
                <div className="font-bold text-[11px] text-white truncate">{agent.name}</div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">{agent.role}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Output Container */}
      <div className="rounded-2xl bg-[#060a10] border border-white/10 overflow-hidden shadow-2xl font-mono text-xs text-right relative z-10">
        {/* Terminal Titlebar */}
        <div className="bg-[#0c131d] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-[11px] text-slate-400 mr-2 font-sans font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-mint-400" />
              יומן פעולות חי - wanderlust-agent-stream.log
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">{logs.length} אירועים נרשמו</span>
        </div>

        {/* Terminal Logs Area */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-2.5">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-sans">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-mint-400/60" />
              <p className="text-xs font-medium">ממתין לפרמטרי נסיעה ושיגור צוות הסוכנים...</p>
              <p className="text-[11px] text-slate-500 mt-1">
                בחרו מוצא, יעד ותקציב כדי לצפות בתיאום האוטונומי של 7 הסוכנים בזמן אמת.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              if (log.type === "step") {
                return (
                  <div key={log.id} className="flex items-start gap-2.5 text-slate-200">
                    <span className="text-slate-500 text-[10px] whitespace-nowrap mt-0.5">{log.timestamp}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      שלב
                    </span>
                    <div>
                      <span className="font-semibold text-white font-sans text-xs">{log.title}</span>
                      {log.message && <p className="text-slate-400 font-sans text-xs mt-0.5 leading-relaxed">{log.message}</p>}
                    </div>
                  </div>
                );
              }

              if (log.type === "tool_call") {
                return (
                  <div key={log.id} className="flex items-start gap-2.5 text-mint-300 bg-mint-950/20 p-2.5 rounded-xl border border-mint-800/30">
                    <span className="text-mint-400 text-[10px] whitespace-nowrap mt-0.5">{log.timestamp}</span>
                    <Wrench className="w-3.5 h-3.5 text-mint-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-xs font-mono text-mint-200">{log.tool}()</span>
                      {log.summary && <p className="text-slate-300 font-sans text-xs mt-0.5 leading-relaxed">{log.summary}</p>}
                    </div>
                  </div>
                );
              }

              if (log.type === "done") {
                return (
                  <div key={log.id} className="flex items-start gap-2.5 text-emerald-300 bg-emerald-950/25 p-2.5 rounded-xl border border-emerald-700/40">
                    <span className="text-emerald-400 text-[10px] whitespace-nowrap mt-0.5">{log.timestamp}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-xs font-sans text-emerald-200">{log.title || "התוכנית הושלמה בהצלחה"}</span>
                      {log.message && <p className="text-emerald-300/80 font-sans text-xs mt-0.5 leading-relaxed">{log.message}</p>}
                    </div>
                  </div>
                );
              }

              if (log.type === "error") {
                return (
                  <div key={log.id} className="flex items-start gap-2.5 text-rose-300 bg-rose-950/25 p-2.5 rounded-xl border border-rose-800/40">
                    <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-xs font-sans text-rose-200">{log.title}</span>
                      {log.message && <p className="text-rose-300/80 font-sans text-xs mt-0.5 leading-relaxed">{log.message}</p>}
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
