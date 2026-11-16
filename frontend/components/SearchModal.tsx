"use client";

import React, { useState } from "react";
import { Search, X, MapPin, Sparkles, ArrowLeft, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { ElasticVacationSearchModal } from "@/components/track-h/ElasticVacationSearchModal";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SEARCHES = [
  { label: "באלי, אינדונזיה", category: "איים טרופיים" },
  { label: "סנטוריני, יוון", category: "רומנטיקה וחופים" },
  { label: "האלפים השוויצריים", category: "טבע והרים" },
  { label: "האיים המלדיביים", category: "יוקרה ורוגע" },
  { label: "טוקיו, יפן", category: "תרבות וטכנולוגיה" },
  { label: "רומא, איטליה", category: "היסטוריה וקולינריה" },
];

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [elasticOpen, setElasticOpen] = useState(false);
  const router = useRouter();

  if (elasticOpen) {
    return (
      <ElasticVacationSearchModal
        isOpen={true}
        onClose={() => {
          setElasticOpen(false);
          onClose();
        }}
        onSelectDestination={(dest) => {
          setElasticOpen(false);
          onClose();
          router.push(`/?destination=${encodeURIComponent(dest)}`);
        }}
      />
    );
  }

  if (!isOpen) return null;

  const handleSelect = (dest: string) => {
    onClose();
    router.push(`/?destination=${encodeURIComponent(dest)}`);
  };

  const filteredSearches = POPULAR_SEARCHES.filter((s) =>
    s.label.toLowerCase().includes(query.toLowerCase()) ||
    s.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-24 px-3 sm:px-4 bg-black/75 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-xl wanderlust-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl relative text-right max-h-[88dvh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 sm:top-5 sm:left-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
          aria-label="סגור חיפוש"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-white/10 mt-1">
          <Search className="w-5 h-5 text-mint-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפש עיר, מדינה, חוויה או סגנון טיול..."
            className="w-full bg-transparent text-white text-base font-semibold focus:outline-none placeholder-slate-400"
          />
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setElasticOpen(true)}
            className="w-full p-2.5 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-200 text-xs font-bold flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-300" />
              פתח מנוע חיפוש היברידי Elasticsearch 8 (BM25 + 768d + Geo + פאסטים)
            </span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-mint-400" />
            <span>יעדים פופולריים והצעות חיפוש</span>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {filteredSearches.length > 0 ? (
              filteredSearches.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(item.label)}
                  className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-between transition group text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-mint-500/10 text-mint-400 group-hover:bg-mint-500/20 transition">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-mint-300 transition">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.category}</div>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-mint-400 group-hover:-translate-x-1 transition" />
                </button>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                לא נמצאו תוצאות עבור &quot;{query}&quot;
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
