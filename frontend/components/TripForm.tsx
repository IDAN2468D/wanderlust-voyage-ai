"use client";

import React, { useState } from "react";
import { Plane, Calendar, DollarSign, Clock, MapPin, ArrowLeft, ArrowRightLeft, Sparkles, Hotel, Compass, Check } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export interface TripFormData {
  origin: string;
  destination: string;
  startDate: string;
  durationDays: number;
  totalBudget: number;
  interests: string[];
  travelStyle: "budget" | "balanced" | "luxury";
}

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  isLoading: boolean;
  selectedDestination?: string;
}

const AVAILABLE_INTERESTS = [
  "🏛️ היסטוריה ותרבות",
  "🍷 קולינריה ויין",
  "🎨 אמנות ומוזיאונים",
  "🌲 טבע ונופים",
  "🏖️ חופים ורוגע",
  "🍸 חיי לילה ומועדונים",
  "🛍️ קניות ושווקים",
  "🗺️ מקומות סודיים",
];

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading, selectedDestination }) => {
  const { currency, currencyConfig, convert, convertToUsd } = useCurrency();
  const [activeTab, setActiveTab] = useState<"flights" | "hotels" | "experiences">("flights");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Default budget based on currency
  const getDefaultBudget = () => {
    if (currency === "ILS") return 8800;
    if (currency === "EUR") return 2200;
    return 2400;
  };

  const [enteredBudget, setEnteredBudget] = useState<number>(getDefaultBudget());

  // Update budget when currency changes if user hasn't heavily modified it
  React.useEffect(() => {
    setEnteredBudget((prev) => {
      // Scale nicely to the new currency
      return convert(convertToUsd(prev)) || getDefaultBudget();
    });
  }, [currency]);

  const [formData, setFormData] = useState<TripFormData>({
    origin: "תל אביב (TLV)",
    destination: selectedDestination || "באלי, אינדונזיה",
    startDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    durationDays: 7,
    totalBudget: 2400,
    interests: ["🌲 טבע ונופים", "🏖️ חופים ורוגע", "🍷 קולינריה ויין"],
    travelStyle: "balanced",
  });

  // Update destination if external prop changes
  React.useEffect(() => {
    if (selectedDestination) {
      setFormData((prev) => ({ ...prev, destination: selectedDestination }));
    }
  }, [selectedDestination]);

  const handleSwap = () => {
    setFormData((prev) => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  const toggleInterest = (interest: string) => {
    if (isLoading) return;
    setFormData((prev) => {
      const exists = prev.interests.includes(interest);
      return {
        ...prev,
        interests: exists ? prev.interests.filter((i) => i !== interest) : [...prev.interests, interest],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination.trim()) return;
    const budgetInUsd = convertToUsd(enteredBudget);
    onSubmit({
      ...formData,
      totalBudget: budgetInUsd,
    });
  };

  return (
    <div className="wanderlust-glass rounded-[28px] p-6 sm:p-7 shadow-2xl relative border border-white/15 text-right font-sans">
      {/* Card Header */}
      <div className="mb-5">
        <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
          לאן היעד הבא שלך?
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          מצא את החופשה המושלמת בעזרת צוות סוכני ה-AI
        </p>
      </div>

      {/* Tabs Row (Flights, Hotels, Experiences) */}
      <div className="flex items-center gap-6 border-b border-white/10 pb-3.5 mb-5 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("flights")}
          className={`flex items-center gap-2 transition pb-1 relative ${
            activeTab === "flights" ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Plane className="w-3.5 h-3.5 text-mint-400" />
          <span>טיסות</span>
          {activeTab === "flights" && (
            <span className="absolute -bottom-3.5 left-0 right-0 h-0.5 bg-mint-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hotels")}
          className={`flex items-center gap-2 transition pb-1 relative ${
            activeTab === "hotels" ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Hotel className="w-3.5 h-3.5 text-mint-400" />
          <span>מלונות</span>
          {activeTab === "hotels" && (
            <span className="absolute -bottom-3.5 left-0 right-0 h-0.5 bg-mint-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("experiences")}
          className={`flex items-center gap-2 transition pb-1 relative ${
            activeTab === "experiences" ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-mint-400" />
          <span>חוויות ומסלולים</span>
          {activeTab === "experiences" && (
            <span className="absolute -bottom-3.5 left-0 right-0 h-0.5 bg-mint-400 rounded-full" />
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Origin Field with swap */}
        <div className="relative">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition flex items-center justify-between">
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 font-medium block">מאיפה</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-mint-400 shrink-0" />
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  placeholder="עיר מוצא (למשל תל אביב TLV)"
                  className="bg-transparent border-none text-white text-sm font-semibold focus:outline-none w-full placeholder-slate-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSwap}
              title="החלף מוצא ויעד"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition mr-2"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Destination Field */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition">
          <span className="text-[10px] text-slate-400 font-medium block">אל</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <input
              type="text"
              required
              disabled={isLoading}
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="יעד מבוקש (למשל באלי, סנטוריני, פריז)"
              className="bg-transparent border-none text-white text-sm font-semibold focus:outline-none w-full placeholder-slate-500"
            />
          </div>
        </div>

        {/* Dates & Travelers / Budget Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Departure Date */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition">
            <span className="text-[10px] text-slate-400 font-medium block flex items-center gap-1">
              <Calendar className="w-3 h-3 text-mint-400" />
              תאריך יציאה
            </span>
            <input
              type="date"
              required
              disabled={isLoading}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="bg-transparent border-none text-white text-xs font-semibold focus:outline-none w-full mt-1"
            />
          </div>

          {/* Duration & Budget */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition">
            <span className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="text-mint-400 font-bold">{currencyConfig.symbol}</span>
                תקציב יעד ({currencyConfig.label})
              </span>
              {currency !== "USD" && (
                <span className="text-[9px] text-slate-400 font-mono">
                  ~${convertToUsd(enteredBudget)} USD
                </span>
              )}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                min={currency === "ILS" ? 1000 : 200}
                step={currency === "ILS" ? 200 : 50}
                required
                disabled={isLoading}
                value={enteredBudget}
                onChange={(e) => setEnteredBudget(parseInt(e.target.value) || 0)}
                className="bg-transparent border-none text-white text-xs font-semibold focus:outline-none w-full"
              />
              <span className="text-[11px] font-bold text-mint-400 shrink-0">{currencyConfig.label}</span>
            </div>
          </div>
        </div>

        {/* Duration Days & Travel Style Selector */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition">
            <span className="text-[10px] text-slate-400 font-medium block flex items-center gap-1">
              <Clock className="w-3 h-3 text-mint-400" />
              משך החופשה (ימים)
            </span>
            <input
              type="number"
              min={1}
              max={30}
              required
              disabled={isLoading}
              value={formData.durationDays}
              onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 1 })}
              className="bg-transparent border-none text-white text-xs font-semibold focus:outline-none w-full mt-1"
            />
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition">
            <span className="text-[10px] text-slate-400 font-medium block flex items-center gap-1">
              <Compass className="w-3 h-3 text-mint-400" />
              סגנון נסיעה
            </span>
            <select
              value={formData.travelStyle}
              onChange={(e) => setFormData({ ...formData, travelStyle: e.target.value as any })}
              disabled={isLoading}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none w-full mt-1 border-none cursor-pointer"
            >
              <option value="balanced" className="bg-slate-900 text-white">מאוזן (3-4 כוכבים)</option>
              <option value="budget" className="bg-slate-900 text-white">חסכוני (אכסניות/תחב״צ)</option>
              <option value="luxury" className="bg-slate-900 text-white">יוקרתי (5 כוכבים ונוחות)</option>
            </select>
          </div>
        </div>

        {/* Interests Drawer Button */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-mint-400 hover:text-mint-300 transition flex items-center gap-1 font-semibold"
          >
            <span>{showAdvanced ? "הסתר תחומי עניין ▲" : "+ התאם תחומי עניין אישיים ▼"}</span>
            <span className="text-slate-400">({formData.interests.length} נבחרו)</span>
          </button>

          {showAdvanced && (
            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/10">
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = formData.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    disabled={isLoading}
                    onClick={() => toggleInterest(interest)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                      isSelected
                        ? "bg-mint-500/25 text-mint-200 border-mint-400/60"
                        : "bg-black/30 text-slate-400 border-white/10 hover:text-slate-200"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Flights & Plan Trip Mint Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl btn-mint text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl disabled:opacity-60 disabled:cursor-not-allowed group transition-all"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                <span>הסוכנים מתכננים עבורך כעת...</span>
              </>
            ) : (
              <>
                <span>חפש טיסות והפעל סוכנים</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
