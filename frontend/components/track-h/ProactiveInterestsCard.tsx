"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Radar, Sparkles, Trash2, RefreshCw, ShieldCheck } from "lucide-react";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

interface MatchedAlert {
  sku_code: string;
  title: string;
  destination: string;
  current_price_ils: number;
  semantic_match_score: number;
  auto_reserved_vip_until?: string | null;
  match_reason_he: string;
}

interface Watcher {
  interest_id: string;
  raw_prompt_hebrew: string;
  target_category: string;
  max_price_ils: number;
  auto_reserve_vip: boolean;
  status: string;
  matched_alerts: MatchedAlert[];
}

export const ProactiveInterestsCard: React.FC = () => {
  const { user } = useAuth();
  const { dir, t } = useLocale();
  const userId = user?.id || "usr_demo123";

  const [prompt, setPrompt] = useState("טיסות לטוקיו עם מזוודה מתחת ל-3,500 ₪ או סוויטה בסנטוריני");
  const [category, setCategory] = useState("ALL");
  const [maxPriceIls, setMaxPriceIls] = useState(3900);
  const [autoReserveVip, setAutoReserveVip] = useState(true);
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWatchers = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/interests?user_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const json = await res.json();
        setWatchers(json.watchers || []);
      }
    } catch {}
  }, [userId]);

  useEffect(() => {
    loadWatchers();
  }, [loadWatchers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length < 4) return;
    setLoading(true);
    try {
      const res = await fetch("/api/track-h", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-interest",
          payload: {
            user_id: userId,
            raw_prompt_hebrew: prompt.trim(),
            target_category: category,
            max_price_ils: Number(maxPriceIls),
            auto_reserve_vip: autoReserveVip,
          },
        }),
      });
      if (res.ok) {
        await loadWatchers();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (interestId: string) => {
    await fetch(`${getApiBaseUrl()}/api/v1/interests/${encodeURIComponent(interestId)}/evaluate`, { method: "POST" });
    await loadWatchers();
  };

  const handleDelete = async (interestId: string) => {
    await fetch(`${getApiBaseUrl()}/api/v1/interests/${encodeURIComponent(interestId)}`, { method: "DELETE" });
    setWatchers((prev) => prev.filter((w) => w.interest_id !== interestId));
  };

  return (
    <div className="wanderlust-glass rounded-3xl border border-white/15 p-4 sm:p-6 space-y-4" dir={dir}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base">
              {t("מכ\"ם תחומי עניין וטיסות פרואקטיבי", "Proactive Travel Interests Radar")}
            </h3>
            <p className="text-xs text-slate-400">
              {t("ניטור אוטומטי של טיסות ומלונות מתאימים מנתב\"ג + שמירת הצעת מחיר VIP ל-15 דק'", "Natural-language fare & villa radar with 15-min VIP auto-hold")}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[11px] font-bold border border-cyan-400/30">
          {watchers.length} {t("חיישנים פעילים", "Active")}
        </span>
      </div>

      <form onSubmit={handleCreate} className="space-y-3">
        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-mint-400"
          placeholder={t("תאר את חופשת החלומות שלך והתקציב בשקלים...", "Describe your travel wish & max ILS budget...")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
          >
            <option value="ALL">כל הקטגוריות</option>
            <option value="FLIGHTS">טיסות TLV</option>
            <option value="PACKAGES">חבילות נופש</option>
            <option value="SHABBAT_FRIENDLY">שומר שבת וכשר</option>
            <option value="LUXURY">יוקרה ווילות</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs">
            <span className="text-slate-400 shrink-0">תקרה ₪</span>
            <input
              type="number"
              min={100}
              max={50000}
              value={maxPriceIls}
              onChange={(e) => setMaxPriceIls(Number(e.target.value))}
              className="w-full bg-transparent text-white font-bold focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer px-2">
            <input
              type="checkbox"
              checked={autoReserveVip}
              onChange={(e) => setAutoReserveVip(e.target.checked)}
              className="accent-teal-400"
            />
            <span>{t("שריון אוטומטי VIP", "VIP 15m Auto-Hold")}</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto btn-mint px-5 py-2 rounded-xl text-xs font-extrabold text-slate-950 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? t("סורק...", "Scanning...") : t("הפעל מכ\"ם עניין פרואקטיבי", "Activate Interest Radar")}
        </button>
      </form>

      <div className="space-y-2.5">
        {watchers.slice(0, 4).map((w) => (
          <div key={w.interest_id} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs font-semibold text-white">{w.raw_prompt_hebrew}</div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={() => handleEvaluate(w.interest_id)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-mint-300" title="סרוק מחדש">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDelete(w.interest_id)} className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-300" title="מחק">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {w.matched_alerts.map((m) => (
              <div key={m.sku_code} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-emerald-200 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {m.title} ({Math.round(m.semantic_match_score * 100)}%)
                </span>
                <span className="text-white font-extrabold">₪{m.current_price_ils.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
