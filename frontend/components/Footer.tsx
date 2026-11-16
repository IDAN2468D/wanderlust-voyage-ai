"use client";

import React, { useState } from "react";
import {
  Mountain,
  ArrowLeft,
  Sparkles,
  Check,
  Heart,
  Loader2,
  AlertCircle,
  Newspaper,
  Eye,
  X,
} from "lucide-react";
import { getApiBaseUrl } from "@/utils/apiConfig";

interface NewsletterResponse {
  status: string;
  message: string;
  email: string;
  edition_number: number;
  edition_id: string;
  edition_badge: string;
  edition_title: string;
  dispatch_date: string;
  email_delivery_status: string;
  headlines: string[];
  preview_html?: string;
}

export const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [subscriptionResult, setSubscriptionResult] = useState<NewsletterResponse | null>(null);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim();
    if (!targetEmail) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/v1/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "שגיאה בהרשמה לניוזלטר");
      }

      setSubscriptionResult(data as NewsletterResponse);
    } catch (err: any) {
      setErrorMsg(err?.message || "לא ניתן היה לשלוח את הניוזלטר כרגע. נסה שוב בעוד רגע.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="w-full bg-[#05080d] border-t border-white/10 text-right font-sans text-slate-300 pt-12 sm:pt-16 pb-28 md:pb-12" dir="rtl">
      <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-14 space-y-10 sm:space-y-12">
        {/* Top Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand Col (2 cols on large, full width on mobile/tablet) */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2 space-y-4">
            <a href="/" className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-mint-400">
                <Mountain className="w-6 h-6" />
              </div>
              <div>
                <span className="font-heading font-black text-lg sm:text-xl tracking-[0.12em] sm:tracking-[0.15em] text-white block">
                  AGENT TRAVEL PLANNER
                </span>
                <span className="text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.25em] text-slate-400 font-medium block">
                  AUTONOMOUS AI VOYAGES
                </span>
              </div>
            </a>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              הפלטפורמה המתקדמת בעולם לתכנון חופשות ומסעות אוטונומיים — מופעלת על ידי צוות סוכני בינה מלאכותית מומחים הדואגים לטיסות, מלונות, מסלול יומי וביקורת תקציב מדויקת.
            </p>

            {/* Newsletter Subscription Box */}
            <div className="pt-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                <Newspaper className="w-3.5 h-3.5 text-mint-400 shrink-0" />
                <span>קבל מייל מעוצב עם חדשות תעופה, יעדים סודיים ודילים מתחלפים:</span>
              </span>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-md">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="הזן את כתובת המייל שלך..."
                    aria-label="כתובת מייל לניוזלטר"
                    className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 text-base sm:text-xs focus:outline-none focus:border-mint-400 text-right"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-mint px-5 py-3 sm:py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-60 min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>שולח...</span>
                    </>
                  ) : (
                    <>
                      <span>{subscriptionResult ? "שלח מהדורה הבאה" : "הרשם ושלח מייל"}</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {errorMsg && (
                <div className="text-[11px] text-rose-300 mt-2.5 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2 max-w-md">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {subscriptionResult && (
                <div className="mt-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 max-w-md space-y-2 text-right">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-mint-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        מהדורה #{subscriptionResult.edition_number} • {subscriptionResult.edition_badge}
                      </span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                      {subscriptionResult.dispatch_date}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white leading-snug">
                    {subscriptionResult.edition_title}
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {subscriptionResult.message}
                  </p>
                  {subscriptionResult.headlines?.length > 0 && (
                    <ul className="space-y-1 pt-1 border-t border-white/10 text-[10.5px] text-slate-300">
                      {subscriptionResult.headlines.slice(0, 3).map((hl, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Sparkles className="w-3 h-3 text-mint-400 shrink-0 mt-0.5" />
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {subscriptionResult.preview_html && (
                      <button
                        type="button"
                        onClick={() => setShowEmailPreviewModal(true)}
                        className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition py-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>צפה בעיצוב המייל שנשלח</span>
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400">
                      לחיצה נוספת תשלח את המהדורה המתחלפת הבאה
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Col 1: יעדים מובילים */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white font-serif tracking-wide">יעדים מובילים</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/destinations" className="hover:text-mint-400 transition inline-block py-0.5">באלי, אינדונזיה</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition inline-block py-0.5">סנטוריני, יוון</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition inline-block py-0.5">האלפים השוויצריים</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition inline-block py-0.5">האיים המלדיביים</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition inline-block py-0.5">טוקיו וקיוטו, יפן</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition inline-block py-0.5">רומא וחוף אמלפי</a></li>
            </ul>
          </div>

          {/* Col 2: חוויות ומסלולים */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white font-serif tracking-wide">חוויות וסגנונות</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/experiences" className="hover:text-mint-400 transition inline-block py-0.5">ספארי וחיות בר</a></li>
              <li><a href="/experiences" className="hover:text-mint-400 transition inline-block py-0.5">צלילה ולגונות כחולות</a></li>
              <li><a href="/experiences" className="hover:text-mint-400 transition inline-block py-0.5">סיורי יין וקולינריה</a></li>
              <li><a href="/experiences" className="hover:text-mint-400 transition inline-block py-0.5">סקי ופסגות מושלגות</a></li>
              <li><a href="/trips" className="hover:text-mint-400 transition inline-block py-0.5">מסלולי 7 ימים מומלצים</a></li>
              <li><a href="/trips" className="hover:text-mint-400 transition inline-block py-0.5">חופשות רומנטיות</a></li>
            </ul>
          </div>

          {/* Col 3: החברה והסוכנים */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <h4 className="text-sm font-bold text-white font-serif tracking-wide">AgentTravelPlanner</h4>
            <ul className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-2 text-xs text-slate-400">
              <li><a href="/about" className="hover:text-mint-400 transition inline-block py-0.5">אודות המיזם והחזון</a></li>
              <li><a href="/about" className="hover:text-mint-400 transition inline-block py-0.5">צוות 32 מומחי הנסיעות שלנו</a></li>
              <li><a href="/blog" className="hover:text-mint-400 transition inline-block py-0.5">מגזין ובלוג המטיילים</a></li>
              <li><a href="/about" className="hover:text-mint-400 transition inline-block py-0.5">אבטחה ופרטיות מידע</a></li>
              <li><a href="/about" className="hover:text-mint-400 transition inline-block py-0.5">תמיכה וסיוע 24/7</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-right">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>© {new Date().getFullYear()} AgentTravelPlanner. כל הזכויות שמורות.</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1 text-slate-400">
              נבנה באהבה עבור מטיילים ברחבי תבל <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-5 text-xs text-slate-400">
            <span className="hover:text-mint-400 transition cursor-pointer">תנאי שימוש</span>
            <span>·</span>
            <span className="hover:text-mint-400 transition cursor-pointer">מדיניות פרטיות</span>
            <span>·</span>
            <span className="hover:text-mint-400 transition cursor-pointer">אבטחת מידע</span>
          </div>
        </div>
      </div>

      {/* Interactive Newsletter Email Preview Modal */}
      {showEmailPreviewModal && subscriptionResult?.preview_html && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md"
          dir="rtl"
        >
          <div className="relative w-full max-w-3xl rounded-2xl sm:rounded-3xl border border-white/20 bg-[#0b101b] shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/10 bg-black/40 gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white truncate">
                <Newspaper className="w-4 h-4 text-mint-400 shrink-0" />
                <span className="truncate">
                  תצוגה מקדימה • מהדורה #{subscriptionResult.edition_number}: {subscriptionResult.edition_badge}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailPreviewModal(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition shrink-0"
                aria-label="סגור תצוגה מקדימה"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              title="תצוגת מייל ניוזלטר"
              srcDoc={subscriptionResult.preview_html}
              className="w-full h-[76dvh] sm:h-[72vh] border-0 bg-[#060911]"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>
      )}
    </footer>
  );
};
