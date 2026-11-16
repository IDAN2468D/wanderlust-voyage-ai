"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Wallet, RefreshCw, TrendingDown } from "lucide-react";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

interface PolicyItem {
  policy_id: string;
  booking_ref: string;
  destination: string;
  paid_amount_ils: number;
  lowest_observed_ils: number;
  refunded_total_ils: number;
  coverage_days: number;
  status: string;
}

interface WalletEntry {
  entry_id: string;
  amount_ils: number;
  description_he: string;
}

export const PriceGuardShieldCard: React.FC = () => {
  const { user } = useAuth();
  const { dir, t } = useLocale();
  const userId = user?.id || "usr_demo123";

  const [walletIls, setWalletIls] = useState(0);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/price-guard?user_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const json = await res.json();
        setWalletIls(json.wallet_balance_ils || 0);
        setPolicies(json.policies || []);
        setEntries(json.wallet_entries || []);
      }
    } catch {}
  }, [userId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleScanDrop = async (target?: PolicyItem) => {
    setScanning(true);
    try {
      const res = await fetch("/api/track-h", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "price-guard-scan",
          payload: {
            user_id: userId,
            booking_ref: target?.booking_ref || "WL-DEMO-30D",
            destination: target?.destination || "Santorini",
            paid_amount_ils: target?.paid_amount_ils || 4480,
            sku_code: "PKG-TLV-JTR-5D",
            vip_tier: "PLATINUM",
            simulated_market_drop_pct: 9.5,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setLastMsg(json.message_he || "הסריקה הושלמה");
        await loadOverview();
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="wanderlust-glass rounded-3xl border border-emerald-400/25 p-4 sm:p-6 space-y-4" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base">
              {t("מוגן בערבות מחיר ל-30 יום (Price Drop Guard)", "30-Day Post-Booking Price Drop Guard")}
            </h3>
            <p className="text-xs text-slate-400">
              {t("זיכוי הפרשי מחיר אוטומטי ישירות לארנק הנסיעות בשקלים (₪)", "Auto-credits flight & hotel fare drops directly to your ₪ Travel Wallet")}
            </p>
          </div>
        </div>
        <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-300" />
          <div className="text-xs">
            <span className="text-slate-300 block text-[10px]">{t("יתרת ארנק שנצברה", "Wallet Credits")}</span>
            <span className="text-emerald-300 font-extrabold text-sm">₪{walletIls.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {lastMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 shrink-0" />
          <span>{lastMsg}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-300">
          {policies.length} {t("פוליסות הגנת מחיר פעילות", "Active Protection Policies")}
        </span>
        <button
          type="button"
          onClick={() => handleScanDrop(policies[0])}
          disabled={scanning}
          className="btn-mint px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? t("סורק ירידות מחיר...", "Scanning Drops...") : t("בדוק ירידת מחיר וזכה ארנק", "Scan Drops & Credit Wallet")}
        </button>
      </div>

      {policies.length > 0 && (
        <div className="space-y-2">
          {policies.slice(0, 3).map((p) => (
            <div key={p.policy_id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-white">{p.destination}</span>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="font-mono text-[11px] text-mint-300">{p.booking_ref}</span>
              </div>
              <div className="text-slate-200">
                שולם ₪{p.paid_amount_ils.toLocaleString()} • זוכה <span className="text-emerald-300 font-bold">₪{p.refunded_total_ils.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div className="pt-2 border-t border-white/10 space-y-1">
          {entries.slice(0, 2).map((e) => (
            <div key={e.entry_id} className="text-[11px] text-emerald-200/90 flex justify-between">
              <span>{e.description_he}</span>
              <span className="font-bold">+₪{e.amount_ils.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
