"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, ScanSearch, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLocale } from "@/context/LocaleContext";
import { SidekickPulseStrip } from "@/components/track-h/SidekickPulseStrip";
import { ProactiveInterestsCard } from "@/components/track-h/ProactiveInterestsCard";
import { PriceGuardShieldCard } from "@/components/track-h/PriceGuardShieldCard";
import { AcpAgentBridgeCard } from "@/components/track-h/AcpAgentBridgeModal";
import { ScreenshotLookbookModal } from "@/components/track-h/ScreenshotLookbookModal";
import { ElasticVacationSearchModal } from "@/components/track-h/ElasticVacationSearchModal";

export default function DiscoverTrackHPage() {
  const router = useRouter();
  const { dir, t } = useLocale();
  const [lookbookOpen, setLookbookOpen] = useState(false);
  const [elasticOpen, setElasticOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col" dir={dir}>
      <Navbar />
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 pb-24">
        <section className="wanderlust-glass rounded-3xl border border-white/15 p-5 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-500/15 border border-mint-400/30 text-mint-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              {t("32 מומחי נסיעות אישיים לשירותך", "32 Personal Travel Specialists")}
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl font-black text-white leading-tight">
              {t("מרכז הגילוי והמבצעים לחופשה הבאה שלך", "Travel Discovery & Smart Deals Hub")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t(
                "חיפוש חופשות מתקדם לפי תקציב, קרבה לאטרקציות וכשרות, הזמנת חבילות מותאמות, התראות דילים מנתב\"ג, תכנון חופשה מצילום מסך והגנת ירידת מחיר ל-30 יום.",
                "Smart vacation search by budget, landmarks & kosher options, instant deal alerts from TLV, photo-to-trip planning & 30-day Price Drop Protection."
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setElasticOpen(true)}
              className="px-4 py-3 rounded-2xl text-xs sm:text-sm font-extrabold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 flex items-center justify-center gap-2 transition"
            >
              <Database className="w-4 h-4" />
              {t("חיפוש חופשות מתקדם", "Smart Vacation Search")}
            </button>
            <button
              type="button"
              onClick={() => setLookbookOpen(true)}
              className="btn-mint px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-950 flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-teal-500/20"
            >
              <ScanSearch className="w-4 h-4" />
              {t("תכנן חופשה מתמונה", "Plan Trip From Photo")}
            </button>
          </div>
        </section>

        <SidekickPulseStrip />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ProactiveInterestsCard />
          <PriceGuardShieldCard />
        </div>

        <AcpAgentBridgeCard />
      </main>

      <ScreenshotLookbookModal
        isOpen={lookbookOpen}
        onClose={() => setLookbookOpen(false)}
        onSelectDestination={(dest) => router.push(`/?destination=${encodeURIComponent(dest)}#planner-form`)}
      />
      <ElasticVacationSearchModal
        isOpen={elasticOpen}
        onClose={() => setElasticOpen(false)}
        onSelectDestination={(dest) => router.push(`/?destination=${encodeURIComponent(dest)}#planner-form`)}
      />
      <Footer />
    </div>
  );
}
