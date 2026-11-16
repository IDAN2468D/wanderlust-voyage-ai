"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ScanSearch, Sparkles, CheckCircle2, ArrowLeft, Volume2, Upload, AlertTriangle } from "lucide-react";
import { getApiBaseUrl } from "@/utils/apiConfig";
import { useLocale } from "@/context/LocaleContext";
import { SCENES, VisionLookbookData, playSpatialPing, buildDynamicVisionFallback, readAndCompressImageFile, extractClipboardImageUrl } from "./lookbookPresets";

interface Props { isOpen: boolean; onClose: () => void; onSelectDestination?: (destination: string, budgetIls: number) => void; }
interface ScanOverrides { sceneType?: string; imageUrl?: string; imageBase64?: string; fileName?: string; customHint?: string; }

export const ScreenshotLookbookModal: React.FC<Props> = ({ isOpen, onClose, onSelectDestination }) => {
  const { dir, t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scene, setScene] = useState<string>("SANTORINI_CLIFFSIDE");
  const [customUrl, setCustomUrl] = useState("");
  const [uploadedB64, setUploadedB64] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [customHint, setCustomHint] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [fitPct, setFitPct] = useState<number | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [data, setData] = useState<VisionLookbookData | null>(null);

  const runScan = useCallback(async (ov: ScanOverrides = {}) => {
    setScanning(true);
    const targetScene = ov.sceneType ?? scene;
    const imgUrl = (ov.imageUrl !== undefined ? ov.imageUrl : customUrl).trim();
    const imgB64 = ov.imageBase64 !== undefined ? ov.imageBase64 : uploadedB64;
    const fName = ov.fileName !== undefined ? ov.fileName : fileName;
    const hint = (ov.customHint !== undefined ? ov.customHint : customHint).trim();
    const bodyPayload = {
      scene_type: targetScene,
      scene_key: targetScene,
      image_source_url: imgUrl || undefined,
      image_base64: imgB64 || undefined,
      file_name: fName || undefined,
      custom_hint: hint || undefined,
      travelers: 2,
      budget_ceiling_ils: 8500,
    };
    try {
      const api = getApiBaseUrl();
      const decRes = await fetch(`${api}/api/v1/vision-trip/decompose-screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (decRes.ok) {
        const parsed: VisionLookbookData = await decRes.json();
        setData(parsed);
        setActiveHotspot(parsed.hotspots?.[0]?.id || null);
        if (typeof parsed.fit_accuracy_pct === "number") setFitPct(parsed.fit_accuracy_pct);
        playSpatialPing();
        if (!parsed.needs_visual_hint) {
          const fitRes = await fetch(`${api}/api/v1/vision-trip/fit-assessment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scene_type: parsed.scene_type, custom_hint: parsed.destination, travelers: 2, budget_ceiling_ils: 8500 }),
          });
          if (fitRes.ok) setFitPct((await fitRes.json()).fit_accuracy_pct ?? parsed.fit_accuracy_pct ?? null);
        }
      } else {
        const fb = buildDynamicVisionFallback({ image_source_url: imgUrl, image_base64: imgB64, file_name: fName, custom_hint: hint });
        if (fb) setData(fb);
      }
    } catch {
      const fb = buildDynamicVisionFallback({ image_source_url: imgUrl, image_base64: imgB64, file_name: fName, custom_hint: hint });
      if (fb) { setData(fb); setActiveHotspot(fb.hotspots[0]?.id || null); }
    } finally {
      setScanning(false);
    }
  }, [scene, customUrl, uploadedB64, fileName, customHint]);

  const handleImageFile = useCallback(async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const b64 = await readAndCompressImageFile(file);
      const nextName = file.name || "pasted-screenshot.png";
      setCustomUrl("");
      setCustomHint("");
      setUploadedB64(b64);
      setFileName(nextName);
      setData((prev) => (prev ? { ...prev, image_url: b64, is_dynamic_detection: true } : prev));
      runScan({ imageUrl: "", imageBase64: b64, fileName: nextName, customHint: "" });
    } catch {}
  }, [runScan]);

  useEffect(() => { if (isOpen && !data) runScan({ sceneType: scene }); }, [isOpen, data, runScan, scene]);

  useEffect(() => {
    if (!isOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile() || Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith("image/"));
      if (file) { e.preventDefault(); handleImageFile(file); return; }
      const urlFromClip = extractClipboardImageUrl(e.clipboardData);
      if (urlFromClip && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setCustomUrl(urlFromClip); setUploadedB64(""); setFileName(""); setCustomHint("");
        runScan({ imageUrl: urlFromClip, imageBase64: "", fileName: "", customHint: "" });
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isOpen, handleImageFile, runScan]);

  if (!isOpen) return null;
  const isDynamic = Boolean(data?.is_dynamic_detection);
  const needsHint = Boolean(data?.needs_visual_hint);
  const badgeText = data?.detection_source === "exif_gps" ? t("זוהה ממיקום התמונה:", "GPS Detected:") : t("זוהה מהתמונה:", "Detected from photo:");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl" dir={dir}>
      <div className="wanderlust-glass w-full max-w-4xl rounded-3xl border border-white/20 p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-mint-500/20 text-mint-300 border border-mint-400/30"><ScanSearch className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">{t("תכנון חופשה מתמונה (-10% בהזמנת חבילה)", "Photo-to-Trip Planner (-10% Bundle Deal)")}</h3>
              <p className="text-xs text-slate-400">{t("הדבק קישור לתמונה, העלה קובץ או לחץ Ctrl+V להדבקת צילום מסך", "Paste an image URL, upload a file, or Ctrl+V a screenshot")}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SCENES.map((s) => (
            <button key={s.id} type="button" onClick={() => { setScene(s.id); setCustomUrl(""); setUploadedB64(""); setFileName(""); setCustomHint(""); runScan({ sceneType: s.id, imageUrl: "", imageBase64: "", fileName: "", customHint: "" }); }} className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${!isDynamic && scene === s.id ? "bg-mint-500 text-slate-950" : "bg-white/10 text-slate-200 hover:bg-white/20"}`}>{s.label}</button>
          ))}
          {isDynamic && data && !needsHint && (
            <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-teal-400/25 to-cyan-400/25 text-teal-200 border border-teal-400/40 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />✨ {badgeText} {data.destination_label_he || data.destination}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input type="url" value={customUrl} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runScan(); } }} onPaste={(e) => { const txt = e.clipboardData?.getData("text/plain")?.trim() || ""; if (/^https?:\/\//i.test(txt)) { e.preventDefault(); setCustomUrl(txt); setUploadedB64(""); setFileName(""); setCustomHint(""); runScan({ imageUrl: txt, imageBase64: "", fileName: "", customHint: "" }); } }} onChange={(e) => { setCustomUrl(e.target.value); setUploadedB64(""); setFileName(""); }} placeholder={t("הדבק קישור לתמונת יעד...", "Paste destination image URL...")} className="md:col-span-2 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-slate-100 flex items-center justify-center gap-1.5"><Upload className="w-3.5 h-3.5 text-teal-300" />{t("העלה צילום / גרור", "Upload / Drop")}</button>
          <button type="button" onClick={() => runScan()} disabled={scanning} className="btn-mint px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 flex items-center justify-center gap-1.5"><Volume2 className="w-3.5 h-3.5" />{scanning ? t("מזהה יעד...", "Identifying...") : t("זהה יעד ומחיר", "Identify Trip")}</button>
        </div>

        {needsHint && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs">
            <div className="flex items-start gap-2 text-amber-200 flex-1"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{data?.detection_warning_he || t("הקלד שם עיר או אתר להשלמת הזיהוי:", "Enter a city or landmark hint:")}</span></div>
            <div className="flex gap-2 shrink-0"><input type="text" value={customHint} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runScan({ customHint }); } }} onChange={(e) => setCustomHint(e.target.value)} placeholder={t("למשל: רומא, פריז, אייפל...", "e.g. Rome, Paris, Eiffel...")} className="px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/40 text-xs text-white w-44" /><button type="button" onClick={() => runScan({ customHint })} disabled={scanning || !customHint.trim()} className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold disabled:opacity-50">{t("זהה עם רמז", "Identify")}</button></div>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); handleImageFile(e.dataTransfer.files?.[0]); }} className={`lg:col-span-3 relative rounded-2xl overflow-hidden border aspect-[16/10] bg-slate-900 transform-gpu transition ${dragOver ? "border-teal-400 ring-2 ring-teal-400/50" : "border-white/15"}`}>
              <img src={data.image_url} alt={data.title_he} className="w-full h-full object-cover opacity-90" />
              {!needsHint && data.hotspots.map((hs, idx) => (
                <button key={hs.id} type="button" onClick={() => { setActiveHotspot(hs.id); playSpatialPing(); }} style={{ left: `${hs.box.x * 100}%`, top: `${hs.box.y * 100}%`, width: `${hs.box.w * 100}%`, height: `${hs.box.h * 100}%` }} className={`absolute rounded-xl border-2 transition-all transform-gpu flex items-end p-1.5 ${activeHotspot === hs.id ? "border-mint-300 bg-mint-500/25 shadow-[0_0_20px_rgba(45,212,191,0.5)]" : "border-white/50 bg-black/25 hover:bg-mint-500/15"}`}>
                  <span className="px-2 py-0.5 rounded-full bg-slate-950/85 text-[10px] font-bold text-mint-300 border border-mint-400/40">#{idx + 1} ₪{hs.scaled_price_ils.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div className="lg:col-span-2 space-y-2.5">
              <div className="flex items-center justify-between text-xs bg-white/5 p-2.5 rounded-xl border border-white/10">
                <div><span className="font-bold text-white block">{data.title_he}</span>{data.landmark_detected_he && <span className="text-[11px] text-teal-300">{data.landmark_detected_he}</span>}</div>
                {fitPct !== null && !needsHint && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold shrink-0">{t(`התאמה ${fitPct}%`, `${fitPct}% Match`)}</span>}
              </div>
              {data.hotspots.map((hs) => (
                <div key={hs.id} onClick={() => setActiveHotspot(hs.id)} className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${activeHotspot === hs.id ? "bg-mint-500/15 border-mint-400/50" : "bg-white/5 border-white/10"}`}>
                  <div className="flex justify-between font-bold text-white"><span>{hs.label_he}</span><span className="text-mint-300">₪{hs.scaled_price_ils.toLocaleString()}</span></div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t(`ביטחון זיהוי ${Math.round(hs.confidence * 100)}%`, `Match confidence ${Math.round(hs.confidence * 100)}%`)}</div>
                </div>
              ))}
              {!needsHint && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 space-y-2">
                  <div className="flex items-center justify-between text-xs"><span className="text-emerald-300 font-bold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {t("חיסכון בהזמנת חבילה 10%", "10% Bundle Savings")}</span><span className="text-white font-extrabold text-sm">₪{data.bundle_total_ils.toLocaleString()}</span></div>
                  <p className="text-[11px] text-slate-300">{data.summary_he}</p>
                  <button type="button" onClick={() => { onSelectDestination?.(data.destination, data.bundle_total_ils); onClose(); }} className="w-full btn-mint py-2 rounded-xl text-xs font-extrabold text-slate-950 flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{t(`שגר מסלול מלא ל-${data.destination}`, `Launch Full Trip to ${data.destination}`)}<ArrowLeft className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
