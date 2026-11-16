"use client";

import React, { useEffect, useState } from "react";
import { Compass, Database, MapPin, Navigation, Search, Sparkles, Star, X, Zap } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
import {
  AutocompleteSuggestion,
  ElasticSearchResponse,
  ElasticVacationHit,
  GEO_ANCHORS,
  VIBE_LABEL_MAP,
  buildLocalElasticFallback,
} from "./elasticSearchTypes";

interface ElasticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (destination: string, maxBudgetIls?: number) => void;
}

export const ElasticVacationSearchModal: React.FC<ElasticModalProps> = ({ isOpen, onClose, onSelectDestination }) => {
  const { dir, locale, t } = useLocale();
  const [query, setQuery] = useState("חופשת חורף רומנטית עם שלג וספא");
  const [maxPrice, setMaxPrice] = useState(5500);
  const [selectedVibe, setSelectedVibe] = useState("");
  const [shabbatOnly, setShabbatOnly] = useState(false);
  const [geoAnchorId, setGeoAnchorId] = useState("");
  const [radiusKm, setRadiusKm] = useState(25);
  const [data, setData] = useState<ElasticSearchResponse | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [autoMs, setAutoMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = async (overrideQ?: string) => {
    setLoading(true);
    const activeQ = overrideQ ?? query;
    try {
      const res = await fetch("/api/elastic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          payload: {
            query: activeQ,
            max_price_ils: maxPrice,
            vibe_tags: selectedVibe ? [selectedVibe] : undefined,
            shabbat_only: shabbatOnly,
            geo_filter: geoAnchorId ? { anchor_id: geoAnchorId, radius_km: radiusKm } : undefined,
            use_hybrid_rrf: true,
            limit: 8,
            sort_by: geoAnchorId ? "distance" : "rrf",
          },
        }),
      });
      setData(res.ok ? await res.json() : buildLocalElasticFallback(activeQ, maxPrice, shabbatOnly, selectedVibe));
    } catch {
      setData(buildLocalElasticFallback(activeQ, maxPrice, shabbatOnly, selectedVibe));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, maxPrice, selectedVibe, shabbatOnly, geoAnchorId, radiusKm]);

  useEffect(() => {
    if (!isOpen || !query.trim()) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/elastic-search?action=autocomplete&q=${encodeURIComponent(query)}&limit=5`);
        if (res.ok) { const j = await res.json(); setSuggestions(j.suggestions || []); setAutoMs(j.took_ms ?? null); }
      } catch { setSuggestions([]); }
    }, 120);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5" dir={dir}>
      <div className="w-full max-w-5xl wanderlust-glass rounded-3xl border border-white/20 p-4 sm:p-6 max-h-[90dvh] overflow-y-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold">
              <Database className="w-3.5 h-3.5" />
              {t("חיפוש חופשות מותאם אישית • 32 מומחים", "Smart Vacation Finder • 32 Travel Specialists")}
            </span>
            <h2 className="font-serif text-lg sm:text-2xl font-black text-white mt-1">
              {t("מצא את החופשה המושלמת לפי סגנון ותקציב", "Find Your Ideal Vacation by Style & Budget")}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="relative flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-mint-400 absolute top-3.5 start-3.5" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t("תאר את החופשה שבא לך: חופשת חורף רומנטית עם שלג וספא...", "Describe your trip: romantic winter chalet & spa...")}
              className="w-full rounded-2xl bg-black/50 border border-white/15 ps-10 pe-4 py-2.5 text-sm text-white focus:border-mint-400 outline-none" />
            {autoMs !== null && <span className="absolute top-2.5 end-3 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">{t("הצעות מהירות", "Instant suggestions")}</span>}
          </div>
          <button type="submit" disabled={loading} className="btn-mint px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black text-slate-950 flex items-center justify-center gap-1.5 shrink-0">
            <Zap className="w-4 h-4" />{loading ? t("מחפש חבילות...", "Searching...") : t("חפש חופשות", "Search Trips")}
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center text-[11px]">
            <span className="text-slate-400">{t("יעדים מתאימים:", "Suggested destinations:")}</span>
            {suggestions.map((s) => (
              <button key={s.package_id} type="button" onClick={() => { const d = locale === "he" ? s.destination_he : s.destination_en; setQuery(d); runSearch(d); }}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-mint-500/20 border border-white/10 text-slate-200 flex items-center gap-1">
                <span>{locale === "he" ? s.destination_he : s.destination_en}</span>
                <span className="text-mint-300 font-mono">({s.iata_code}) ₪{s.price_ils.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-white/5 rounded-2xl p-3 border border-white/10 text-xs">
          <label className="space-y-1">
            <span className="text-slate-300 flex justify-between"><span>{t("תקרת מחיר:", "Max Budget:")}</span><b className="text-mint-300">₪{maxPrice.toLocaleString()}</b></span>
            <input type="range" min={2500} max={10000} step={250} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-teal-400" />
          </label>
          <label className="space-y-1">
            <span className="text-slate-300 flex items-center gap-1"><Navigation className="w-3.5 h-3.5 text-cyan-400" />{t("קרוב לאטרקציה:", "Near Landmark:")}</span>
            <select value={geoAnchorId} onChange={(e) => setGeoAnchorId(e.target.value)} className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-1.5 text-white">
              {GEO_ANCHORS.map((g) => <option key={g.id} value={g.id}>{locale === "he" ? g.labelHe : g.labelEn}</option>)}
            </select>
          </label>
          <div className="flex items-end justify-between gap-2">
            <label className="flex-1 space-y-1">
              <span className="text-slate-300">{t("מרחק בק\"מ:", "Max Distance (km):")}</span>
              <input type="number" min={1} max={1500} value={radiusKm} disabled={!geoAnchorId} onChange={(e) => setRadiusKm(Number(e.target.value) || 25)} className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-1.5 text-white disabled:opacity-40" />
            </label>
            <button type="button" onClick={() => setShabbatOnly(!shabbatOnly)} className={`px-3 py-1.5 rounded-xl border font-bold ${shabbatOnly ? "bg-amber-500/20 border-amber-400/50 text-amber-200" : "bg-black/40 border-white/15 text-slate-300"}`}>
              {t("שומר שבת", "Kosher")}
            </button>
          </div>
        </div>

        {data?.facets?.vibes && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setSelectedVibe("")} className={`px-2.5 py-1 rounded-full text-[11px] border ${!selectedVibe ? "bg-mint-500/25 border-mint-400 text-mint-200 font-bold" : "bg-white/5 border-white/10 text-slate-300"}`}>
              {t("כל הסגנונות", "All Styles")} ({data.total_hits})
            </button>
            {data.facets.vibes.slice(0, 7).map((v) => (
              <button key={v.key} type="button" onClick={() => setSelectedVibe(selectedVibe === v.key ? "" : v.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${selectedVibe === v.key ? "bg-mint-500/25 border-mint-400 text-mint-200 font-bold" : "bg-white/5 border-white/10 text-slate-300"}`}>
                {locale === "he" ? (VIBE_LABEL_MAP[v.key]?.he || v.label_he) : (VIBE_LABEL_MAP[v.key]?.en || v.key)} ({v.count})
              </button>
            ))}
            <span className="ms-auto text-[11px] text-slate-400 flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-cyan-400" />{data.total_hits} {t("חבילות תואמות", "matching packages")}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.results || []).map((pkg: ElasticVacationHit) => (
            <div key={pkg.package_id} className="rounded-2xl bg-white/5 border border-white/10 hover:border-mint-400/40 p-3.5 flex flex-col justify-between gap-2.5 transition">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-mint-300">
                    <MapPin className="w-3.5 h-3.5" />
                    {locale === "he" ? `${pkg.destination_he}, ${pkg.country_he}` : `${pkg.destination_en}, ${pkg.country_en}`} ({pkg.iata_code})
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-400/30">
                    {t(`התאמה ${Math.min(99, Math.max(78, Math.round(pkg.knn_score * 100)))}%`, `${Math.min(99, Math.max(78, Math.round(pkg.knn_score * 100)))}% Match`)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug">{locale === "he" ? pkg.title_he : pkg.title_en}</h3>
                <p className="text-[11px] text-slate-300 line-clamp-2">{pkg.description_he}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="font-black text-base text-white">₪{pkg.price_ils.toLocaleString()}</span>
                  <span className="flex items-center gap-0.5 text-amber-300"><Star className="w-3 h-3 fill-amber-300" />{pkg.star_rating}</span>
                  {pkg.distance_km != null && <span className="text-cyan-300">{pkg.distance_km} {t("ק\"מ", "km")}</span>}
                </div>
                <button type="button" onClick={() => { onClose(); onSelectDestination(pkg.destination_en, pkg.price_ils); }}
                  className="px-3 py-1.5 rounded-xl bg-mint-500/20 hover:bg-mint-500/35 text-mint-200 border border-mint-400/40 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />{t("תכנן חופשה", "Plan Trip")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
