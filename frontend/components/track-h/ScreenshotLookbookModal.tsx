"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ScanSearch, Sparkles, CheckCircle2, ArrowLeft, Volume2 } from "lucide-react";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { useLocale } from "@/context/LocaleContext";

interface Hotspot {
  id: string;
  label_he: string;
  category: string;
  sku_code: string;
  scaled_price_ils: number;
  confidence: number;
  box: { x: number; y: number; w: number; h: number };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination?: (destination: string, budgetIls: number) => void;
}

const SCENES = [
  { id: "SANTORINI_CLIFFSIDE", label: "סנטוריני אויה" },
  { id: "TOKYO_NEON_FOOD", label: "טוקיו ניאון" },
  { id: "SWISS_ALPINE_CHALET", label: "שוויץ צרמט" },
  { id: "AMALFI_COAST_LUXURY", label: "אמלפי ורומא" },
  { id: "BALI_JUNGLE_VILLA", label: "באלי אובוד" },
] as const;

function playSpatialPing() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {}
}

export const ScreenshotLookbookModal: React.FC<Props> = ({ isOpen, onClose, onSelectDestination }) => {
  const { dir, t } = useLocale();
  const [scene, setScene] = useState<string>("SANTORINI_CLIFFSIDE");
  const [customUrl, setCustomUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [fitPct, setFitPct] = useState<number | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [data, setData] = useState<{
    title_he: string;
    destination: string;
    image_url: string;
    hotspots: Hotspot[];
    bundle_total_ils: number;
    summary_he: string;
  } | null>(null);

  const runScan = useCallback(async (targetScene: string) => {
    setScanning(true);
    try {
      const api = getApiBaseUrl();
      const [decRes, fitRes] = await Promise.all([
        fetch(`${api}/api/v1/vision-trip/decompose-screenshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scene_type: targetScene, image_source_url: customUrl.trim() || undefined, travelers: 2, budget_ceiling_ils: 8500 }),
        }),
        fetch(`${api}/api/v1/vision-trip/fit-assessment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scene_type: targetScene, travelers: 2, budget_ceiling_ils: 8500 }),
        }),
      ]);
      if (decRes.ok) {
        const parsed = await decRes.json();
        setData(parsed);
        setActiveHotspot(parsed.hotspots?.[0]?.id || null);
        playSpatialPing();
      }
      if (fitRes.ok) setFitPct((await fitRes.json()).fit_accuracy_pct ?? null);
    } finally {
      setScanning(false);
    }
  }, [customUrl]);

  useEffect(() => {
    if (isOpen && !data) runScan(scene);
  }, [isOpen, data, runScan, scene]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl" dir={dir}>
      <div className="wanderlust-glass w-full max-w-4xl rounded-3xl border border-white/20 p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-mint-500/20 text-mint-300 border border-mint-400/30"><ScanSearch className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">{t("תכנון מצילום מסך & Vision Match (-10% באנדל)", "Screenshot-to-Trip & Vision Match (-10% Bundle)")}</h3>
              <p className="text-xs text-slate-400">{t("פירוק ויזואלי לטיסה, מלון וחוויות בלחיצה אחת", "Visual decomposition into flight, hotel & experiences")}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-wrap gap-2">
          {SCENES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setScene(s.id); runScan(s.id); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${scene === s.id ? "bg-mint-500 text-slate-950" : "bg-white/10 text-slate-200 hover:bg-white/20"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder={t("או הדבק קישור לתמונת השראה (URL)...", "Or paste inspiration image URL...")}
            className="md:col-span-2 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
          />
          <button type="button" onClick={() => runScan(scene)} disabled={scanning} className="btn-mint px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 flex items-center justify-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            {scanning ? t("סורק תמונה...", "Scanning...") : t("סרוק ופרק סצנה", "Scan & Decompose")}
          </button>
        </div>

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            <div className="lg:col-span-3 relative rounded-2xl overflow-hidden border border-white/15 aspect-[16/10] bg-slate-900 transform-gpu">
              <img src={data.image_url} alt={data.title_he} className="w-full h-full object-cover opacity-90" />
              {data.hotspots.map((hs, idx) => (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() => { setActiveHotspot(hs.id); playSpatialPing(); }}
                  style={{ left: `${hs.box.x * 100}%`, top: `${hs.box.y * 100}%`, width: `${hs.box.w * 100}%`, height: `${hs.box.h * 100}%` }}
                  className={`absolute rounded-xl border-2 transition-all transform-gpu flex items-end p-1.5 ${activeHotspot === hs.id ? "border-mint-300 bg-mint-500/25 shadow-[0_0_20px_rgba(45,212,191,0.5)]" : "border-white/50 bg-black/25 hover:bg-mint-500/15"}`}
                >
                  <span className="px-2 py-0.5 rounded-full bg-slate-950/85 text-[10px] font-bold text-mint-300 border border-mint-400/40">#{idx + 1} ₪{hs.scaled_price_ils.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div className="lg:col-span-2 space-y-2.5">
              <div className="flex items-center justify-between text-xs bg-white/5 p-2.5 rounded-xl border border-white/10">
                <span className="font-bold text-white">{data.title_he}</span>
                {fitPct !== null && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">Fit {fitPct}%</span>}
              </div>
              {data.hotspots.map((hs) => (
                <div key={hs.id} onClick={() => setActiveHotspot(hs.id)} className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${activeHotspot === hs.id ? "bg-mint-500/15 border-mint-400/50" : "bg-white/5 border-white/10"}`}>
                  <div className="flex justify-between font-bold text-white"><span>{hs.label_he}</span><span className="text-mint-300">₪{hs.scaled_price_ils.toLocaleString()}</span></div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{hs.sku_code} • ביטחון זיהוי {Math.round(hs.confidence * 100)}%</div>
                </div>
              ))}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-bold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> חיסכון באנדל 10%</span>
                  <span className="text-white font-extrabold text-sm">₪{data.bundle_total_ils.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-slate-300">{data.summary_he}</p>
                <button type="button" onClick={() => { onSelectDestination?.(data.destination, data.bundle_total_ils); onClose(); }} className="w-full btn-mint py-2 rounded-xl text-xs font-extrabold text-slate-950 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />{t("שגר מסלול מלא ליעד זה", "Launch Full Trip for Lookbook")}<ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
