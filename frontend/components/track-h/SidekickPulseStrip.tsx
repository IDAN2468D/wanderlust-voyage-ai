"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Zap, CheckCircle2, Sparkles } from "lucide-react";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

interface PulseCard {
  action_id: string;
  skill_name: string;
  severity: string;
  title_he: string;
  summary_he: string;
  cta_label_he: string;
  estimated_savings_ils: number;
  executed?: boolean;
}

export const SidekickPulseStrip: React.FC = () => {
  const { user } = useAuth();
  const { dir, t } = useLocale();
  const userId = user?.id || "usr_demo123";

  const [cards, setCards] = useState<PulseCard[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadPulse = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/pulse/actions`);
      if (res.ok) {
        const json = await res.json();
        setCards(json.cards || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadPulse();
  }, [loadPulse]);

  const runSkill = async (actionId: string) => {
    setExecutingId(actionId);
    try {
      const res = await fetch("/api/track-h", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pulse-execute", action_id: actionId, user_id: userId }),
      });
      if (res.ok) {
        const json = await res.json();
        setToast(json.outcome_summary_he || "בוצע");
        setCards((prev) => prev.map((c) => (c.action_id === actionId ? { ...c, executed: true } : c)));
      }
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="wanderlust-glass rounded-3xl border border-amber-400/25 p-4 sm:p-5 space-y-3" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base">
              {t("המלצות חיסכון ושדרוגים לחופשה שלך", "Smart Trip Savings & Upgrades")}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t("הפעלת מעקב שער מט\"ח, הגנת ירידת מחיר ושדרוגי כשרות ושבת בלחיצה", "1-Click Currency Alerts, Price Guard & Shabbat Upgrades")}
            </p>
          </div>
        </div>
        {toast && (
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/30">
            {toast}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.action_id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold">
                  {card.severity}
                </span>
                <span className="text-[11px] font-bold text-emerald-300">
                  +₪{card.estimated_savings_ils.toLocaleString()}
                </span>
              </div>
              <div className="font-bold text-xs text-white leading-snug">{card.title_he}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{card.summary_he}</p>
            </div>
            <button
              type="button"
              onClick={() => runSkill(card.action_id)}
              disabled={executingId === card.action_id}
              className={`w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                card.executed
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                  : "btn-mint text-slate-950"
              }`}
            >
              {card.executed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {executingId === card.action_id
                ? t("מפעיל...", "Running...")
                : card.executed
                ? t("אוטומציה פעילה", "Executed")
                : card.cta_label_he}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
