"use client";

import React, { useState } from "react";
import { Search, X, MapPin, Sparkles, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-xl wanderlust-glass rounded-3xl p-6 border border-white/20 shadow-2xl relative text-right">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Search Input Bar */}
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

        {/* Search Results / Suggestions */}
        <div className="mt-5 space-y-3">
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
