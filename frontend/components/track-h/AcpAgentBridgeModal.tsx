"use client";

import React, { useState } from "react";
import { Bot, KeyRound, CheckCircle2, Handshake, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

export const AcpAgentBridgeCard: React.FC = () => {
  const { user } = useAuth();
  const { dir, t } = useLocale();
  const userId = user?.id || "usr_demo123";

  const [provider, setProvider] = useState("OPENAI_ACP");
  const [destination, setDestination] = useState("Santorini");
  const [maxIls, setMaxIls] = useState(5500);
  const [tokenInfo, setTokenInfo] = useState<{ delegated_token: string; expires_at: string } | null>(null);
  const [checkoutRes, setCheckoutRes] = useState<{ status: string; booking_ref?: string; executed_total_ils: number; message_he: string } | null>(null);
  const [negotiateRes, setNegotiateRes] = useState<{ approved_discount_pct: number; final_total_ils: number; savings_ils: number; rationale_he: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const issueToken = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/track-h", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acp-delegate",
          payload: {
            external_agent_provider: provider,
            user_id: userId,
            max_authorized_ils: Number(maxIls),
            allowed_categories: ["FLIGHT", "HOTEL", "PACKAGE"],
            ttl_minutes: 60,
          },
        }),
      });
      if (res.ok) setTokenInfo(await res.json());
    } finally {
      setBusy(false);
    }
  };

  const runAtomicCheckout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/track-h", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acp-checkout",
          payload: {
            external_agent_provider: provider,
            user_id: userId,
            delegated_token: tokenInfo?.delegated_token,
            max_authorized_ils: Number(maxIls),
            destination,
            origin: "TLV",
            duration_days: 5,
            sku_codes: ["FLT-TLV-JTR", "HTL-OIA-CLIFF"],
            fulfillment_mode: "DIGITAL_VOUCHER",
            shabbat_safe_mode: true,
          },
        }),
      });
      if (res.ok) setCheckoutRes(await res.json());
    } finally {
      setBusy(false);
    }
  };

  const runNegotiate = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/track-h", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "negotiate-bundle",
          payload: {
            destination,
            base_total_ils: Number(maxIls),
            travelers: 2,
            components: ["FLIGHT", "BOUTIQUE_HOTEL", "TRANSFER_ESIM"],
            loyalty_tier: "PLATINUM",
            target_discount_pct: 12,
          },
        }),
      });
      if (res.ok) setNegotiateRes(await res.json());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wanderlust-glass rounded-3xl border border-indigo-400/25 p-4 sm:p-6 space-y-4" dir={dir}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base">
              {t("שמירת מחיר, תקרת תקציב והטבת חבילה -12%", "Trip Budget Cap, Instant Hold & 12% Bundle Deal")}
            </h3>
            <p className="text-xs text-slate-400">
              {t("הגדירו תקציב מקסימלי בשקלים, נעלו מחיר מובטח וקבלו הנחת חבילה מלאה", "Set your max ₪ trip budget, lock your rate, and apply an instant bundle discount")}
            </p>
          </div>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-400/30">
          {t("התחייבות תקציב", "Budget Guard")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
        >
          <option value="OPENAI_ACP">{t("טיסה + מלון בוטיק", "Flight + Boutique Hotel")}</option>
          <option value="PERPLEXITY_PRO">{t("חופשת משפחות VIP", "Family VIP Package")}</option>
          <option value="GOOGLE_UCP">{t("סופ\"ש זוגי מהיר", "Weekend Getaway")}</option>
          <option value="AMAZON_BUY_FOR_ME">{t("כשר ושומר שבת", "Kosher & Shabbat Friendly")}</option>
          <option value="CLAUDE_MCP">{t("מסלול גמיש מלא", "Flexible Full Trip")}</option>
        </select>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
          placeholder={t("יעד החופשה", "Destination")}
        />
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs">
          <span className="text-slate-400 shrink-0">תקרה ₪</span>
          <input
            type="number"
            value={maxIls}
            onChange={(e) => setMaxIls(Number(e.target.value))}
            className="w-full bg-transparent text-white font-bold focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={issueToken} disabled={busy} className="px-4 py-2 rounded-xl bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/40 text-xs font-bold text-indigo-100 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" /> {t("נעל תקרת תקציב", "Lock Budget Cap")}
        </button>
        <button type="button" onClick={runAtomicCheckout} disabled={busy} className="btn-mint px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> {t("שריין חבילה עכשיו", "Reserve Package Now")}
        </button>
        <button type="button" onClick={runNegotiate} disabled={busy} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5">
          <Handshake className="w-3.5 h-3.5 text-mint-300" /> {t("בקש הנחת חבילה -12%", "Apply -12% Bundle Deal")}
        </button>
      </div>

      {tokenInfo && (
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-400/30 text-[11px] text-indigo-200 flex items-center justify-between gap-2">
          <span>{t("תקרת התקציב אושרה ונשמרה:", "Budget authorization locked:")} <b className="font-mono">{tokenInfo.delegated_token}</b></span>
        </div>
      )}

      {checkoutRes && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
          checkoutRes.status === "COMPLETED"
            ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-200"
            : "bg-rose-500/15 border-rose-400/35 text-rose-200"
        }`}>
          {checkoutRes.status === "COMPLETED" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
          <span>{checkoutRes.message_he}</span>
        </div>
      )}

      {negotiateRes && (
        <div className="p-3 rounded-xl bg-mint-500/10 border border-mint-400/30 text-xs text-mint-100 space-y-1">
          <div className="font-bold">הצעה מאושרת: -{negotiateRes.approved_discount_pct}% • ₪{negotiateRes.final_total_ils.toLocaleString()} (חיסכון ₪{negotiateRes.savings_ils.toLocaleString()})</div>
          <div className="text-[11px] text-slate-300">{negotiateRes.rationale_he}</div>
        </div>
      )}
    </div>
  );
};
