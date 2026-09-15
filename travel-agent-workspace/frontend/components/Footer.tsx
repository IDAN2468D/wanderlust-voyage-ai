"use client";

import React, { useState } from "react";
import { Mountain, Mail, ArrowLeft, ShieldCheck, Heart, Sparkles, Check } from "lucide-react";

export const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="w-full bg-[#05080d] border-t border-white/10 text-right font-sans text-slate-300 pt-16 pb-12" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 space-y-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col (2 cols on large) */}
          <div className="lg:col-span-2 space-y-4">
            <a href="/" className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-mint-400">
                <Mountain className="w-6 h-6" />
              </div>
              <div>
                <span className="font-heading font-black text-xl tracking-[0.2em] text-white block">
                  WANDERLUST
                </span>
                <span className="text-[9px] tracking-[0.25em] text-slate-400 font-medium block">
                  EXPLORE. DREAM. DISCOVER.
                </span>
              </div>
            </a>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              הפלטפורמה המתקדמת בעולם לתכנון חופשות ומסעות אוטונומיים — מופעלת על ידי צוות סוכני בינה מלאכותית מומחים הדואגים לטיסות, מלונות, מסלול יומי וביקורת תקציב מדויקת.
            </p>

            {/* Newsletter Subscription Box */}
            <div className="pt-2">
              <span className="text-xs font-bold text-white block mb-2">
                קבל הצעות ליעדים סודיים וטיפים שבועיים:
              </span>
              <form onSubmit={handleSubscribe} className="flex items-center gap-2 max-w-sm">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="הזן את כתובת המייל שלך..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-mint-400 text-right"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-mint px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5"
                >
                  <span>הרשם</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </form>
              {subscribed && (
                <div className="text-[11px] text-mint-300 mt-2 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>תודה שנרשמת! מדריך היעדים הראשון בדרך לתיבת המייל שלך.</span>
                </div>
              )}
            </div>
          </div>

          {/* Col 1: יעדים מובילים */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white font-serif tracking-wide">יעדים מובילים</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/destinations" className="hover:text-mint-400 transition">באלי, אינדונזיה</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition">סנטוריני, יוון</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition">האלפים השוויצריים</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition">האיים המלדיביים</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition">טוקיו וקיוטו, יפן</a></li>
              <li><a href="/destinations" className="hover:text-mint-400 transition">רומא וחוף אמלפי</a></li>
            </ul>
          </div>

          {/* Col 2: חוויות ומסלולים */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white font-serif tracking-wide">חוויות וסגנונות</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/experiences" className="hover:text-mint-400 transition">ספארי וחיות בר</a></li>
              <li><a href="/experiences" className="hover:text-mint-400 transition">צלילה ולגונות כחולות</a></li>
              <li><a href="/experiences" className="hover:text-mint-400 transition">סיורי יין וקולינריה</a></li>
              <li><a href="/experiences" className="hover:text-mint-400 transition">סקי ופסגות מושלגות</a></li>
              <li><a href="/trips" className="hover:text-mint-400 transition">מסלולי 7 ימים מומלצים</a></li>
              <li><a href="/trips" className="hover:text-mint-400 transition">חופשות רומנטיות</a></li>
            </ul>
          </div>

          {/* Col 3: החברה והסוכנים */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white font-serif tracking-wide">Wanderlust AI</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/about" className="hover:text-mint-400 transition">אודות המיזם והחזון</a></li>
              <li><a href="/about" className="hover:text-mint-400 transition">צוות 4 סוכני ה-AI</a></li>
              <li><a href="/blog" className="hover:text-mint-400 transition">מגזין ובלוג המטיילים</a></li>
              <li><a href="/about" className="hover:text-mint-400 transition">אבטחה ופרטיות מידע</a></li>
              <li><a href="/about" className="hover:text-mint-400 transition">תמיכה וסיוע 24/7</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Wanderlust VoyageAI. כל הזכויות שמורות.</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1 text-slate-400">
              נבנה באהבה עבור מטיילים ברחבי תבל <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs text-slate-400">
            <span className="hover:text-mint-400 transition cursor-pointer">תנאי שימוש</span>
            <span>·</span>
            <span className="hover:text-mint-400 transition cursor-pointer">מדיניות פרטיות</span>
            <span>·</span>
            <span className="hover:text-mint-400 transition cursor-pointer">אבטחת מידע</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
