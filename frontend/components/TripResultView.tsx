"use client";

import React, { useState } from "react";
import {
  Plane,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  Printer,
  Sparkles,
  BedDouble,
  PieChart,
} from "lucide-react";

interface TripResultViewProps {
  markdownPlan: string;
  budgetStatus: string | null;
  totalEstimated: number | null;
  remainingBalance: number | null;
  flightCost: number | null;
  hotelCost: number | null;
  breakdown: Record<string, { amount_usd: number; percentage: number }> | null;
  destination: string;
  durationDays: number;
}

export const TripResultView: React.FC<TripResultViewProps> = ({
  markdownPlan,
  budgetStatus,
  totalEstimated,
  remainingBalance,
  flightCost,
  hotelCost,
  breakdown,
  destination,
  durationDays,
}) => {
  const [activeTab, setActiveTab] = useState<"structured" | "raw">("structured");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownPlan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isApproved = budgetStatus === "APPROVED";

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 border border-white/10 relative overflow-hidden" dir="rtl">
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500" />

      {/* Top Header & Export controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 font-bold tracking-wider">
              תוכנית אוטונומית סונתזה
            </span>
            {budgetStatus && (
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 border tracking-wider ${
                  isApproved
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20"
                    : "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-500/20"
                }`}
              >
                {isApproved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                {isApproved ? "מאושר בתקציב" : "חריגה מהתקציב"}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-heading font-extrabold text-white tracking-tight">
            תוכנית ולוגיסטיקה עבור {destination} ({durationDays} ימים)
          </h2>
        </div>

        {/* View Toggle & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              onClick={() => setActiveTab("structured")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === "structured"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              תוכנית מעוצבת
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === "raw"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              קוד מקור
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition font-medium"
            title="העתק ללוח"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? "הועתק!" : "העתק"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition font-medium"
            title="הדפסה או שמירה כקובץ PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>הדפס</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {totalEstimated !== null && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/30 transition-colors text-right">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              עלות כוללת משוערת
            </div>
            <div className="text-xl font-heading font-black text-white">${totalEstimated.toLocaleString()} <span className="text-xs font-normal text-slate-400">USD</span></div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/30 transition-colors text-right">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              עודף / גירעון
            </div>
            <div
              className={`text-xl font-heading font-black ${
                (remainingBalance ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              ${(remainingBalance ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/30 transition-colors text-right">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
              <Plane className="w-4 h-4 text-blue-400" />
              הקצאת טיסות
            </div>
            <div className="text-xl font-heading font-black text-white">
              {flightCost ? `$${flightCost.toLocaleString()}` : "כלול"} <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/30 transition-colors text-right">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
              <BedDouble className="w-4 h-4 text-cyan-400" />
              הקצאת מלונות ולינה
            </div>
            <div className="text-xl font-heading font-black text-white">
              {hotelCost ? `$${hotelCost.toLocaleString()}` : "כלול"} <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === "structured" ? (
        <div className="space-y-6">
          {/* Budget Audit Visualizer */}
          {breakdown && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  מטריצת חלוקת תקציב מאת מבקר העלויות
                </span>
                <span className={isApproved ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                  סטטוס ביקורת: {isApproved ? "אושר בהצלחה" : "חריגה מהתקציב"}
                </span>
              </div>

              {/* Multi-segment progress bar */}
              <div className="h-3.5 w-full rounded-full bg-slate-800/80 overflow-hidden flex p-0.5 border border-slate-700/50">
                <div
                  style={{ width: `${breakdown.flights?.percentage || 30}%` }}
                  className="h-full bg-blue-500 rounded-r-full hover:opacity-90 transition"
                  title={`טיסות: ${breakdown.flights?.percentage}%`}
                />
                <div
                  style={{ width: `${breakdown.accommodation?.percentage || 35}%` }}
                  className="h-full bg-indigo-500 hover:opacity-90 transition"
                  title={`לינה: ${breakdown.accommodation?.percentage}%`}
                />
                <div
                  style={{ width: `${breakdown.food_and_dining?.percentage || 20}%` }}
                  className="h-full bg-amber-500 hover:opacity-90 transition"
                  title={`קולינריה: ${breakdown.food_and_dining?.percentage}%`}
                />
                <div
                  style={{ width: `${breakdown.activities_and_tours?.percentage || 10}%` }}
                  className="h-full bg-cyan-500 hover:opacity-90 transition"
                  title={`פעילויות: ${breakdown.activities_and_tours?.percentage}%`}
                />
                <div
                  style={{ width: `${breakdown.contingency_buffer?.percentage || 5}%` }}
                  className="h-full bg-emerald-500 rounded-l-full hover:opacity-90 transition"
                  title={`כרית ביטחון: ${breakdown.contingency_buffer?.percentage}%`}
                />
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> טיסות ({breakdown.flights?.percentage}%)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> לינה ({breakdown.accommodation?.percentage}%)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> קולינריה ({breakdown.food_and_dining?.percentage}%)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> אטרקציות ({breakdown.activities_and_tours?.percentage}%)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> כרית ביטחון ({breakdown.contingency_buffer?.percentage}%)
                </span>
              </div>
            </div>
          )}

          {/* Formatted Markdown Content Render */}
          <div className="prose prose-invert max-w-none text-sm leading-relaxed bg-[#070b14]/90 p-6 rounded-2xl border border-slate-800/90 shadow-inner text-right">
            <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed space-y-4">
              {markdownPlan}
            </div>
          </div>
        </div>
      ) : (
        /* Raw Markdown View */
        <div className="rounded-2xl bg-[#070b14] border border-slate-800/90 p-5 shadow-inner text-left" dir="ltr">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {markdownPlan}
          </pre>
        </div>
      )}
    </div>
  );
};
