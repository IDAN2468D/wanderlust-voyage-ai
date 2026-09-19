"use client";

import React, { useState, useEffect } from "react";
import {
  Plane,
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  ArrowLeft,
  ArrowRightLeft,
  Sparkles,
  Hotel,
  Compass,
  Check,
  Users,
  Minus,
  Plus,
  Luggage,
  ShoppingBag,
  Utensils,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useCurrency, CurrencyCode } from "@/context/CurrencyContext";

export interface TripFormData {
  origin: string;
  destination: string;
  startDate: string;
  durationDays: number;
  totalBudget: number;
  interests: string[];
  travelStyle: "budget" | "balanced" | "luxury";
  travelers?: number;
  nonstopOnly?: boolean;
  checkedBagNeeded?: boolean;
  kosherOnly?: boolean;
  shoppingPriority?: boolean;
}

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  isLoading: boolean;
  selectedDestination?: string;
}

const POPULAR_DESTINATIONS = [
  { name: "רומא, איטליה", short: "רומא", emoji: "🏛️" },
  { name: "פריז, צרפת", short: "פריז", emoji: "🗼" },
  { name: "סנטוריני, יוון", short: "סנטוריני", emoji: "🏖️" },
  { name: "טוקיו, יפן", short: "טוקיו", emoji: "🍣" },
  { name: "באלי, אינדונזיה", short: "באלי", emoji: "🏝️" },
  { name: "ברצלונה, ספרד", short: "ברצלונה", emoji: "🇪🇸" },
  { name: "לונדון, אנגליה", short: "לונדון", emoji: "🇬🇧" },
  { name: "ניו יורק, ארה\"ב", short: "ניו יורק", emoji: "🗽" },
  { name: "דובאי, איחוד האמירויות", short: "דובאי", emoji: "🕌" },
];

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
  const { currency, currencyConfig, setCurrency, convert, convertToUsd } = useCurrency();
  const [activeTab, setActiveTab] = useState<"all_in_one" | "flights" | "hotels">("all_in_one");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Quick feature toggles that directly activate specialist agent logic
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [checkedBagNeeded, setCheckedBagNeeded] = useState(true);
  const [kosherOnly, setKosherOnly] = useState(false);
  const [shoppingPriority, setShoppingPriority] = useState(false);

  // Passenger count
  const [travelers, setTravelers] = useState<number>(2);

  // Default budget based on currency
  const getDefaultBudget = () => {
    if (currency === "ILS") return 8800;
    if (currency === "EUR") return 2200;
    return 2400;
  };

  const [enteredBudget, setEnteredBudget] = useState<number>(getDefaultBudget());

  // Update budget when currency changes
  useEffect(() => {
    setEnteredBudget((prev) => {
      return convert(convertToUsd(prev)) || getDefaultBudget();
    });
  }, [currency]);

  // Main Form Data State
  const [formData, setFormData] = useState<TripFormData>({
    origin: "תל אביב (TLV)",
    destination: selectedDestination || "באלי, אינדונזיה",
    startDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    durationDays: 7,
    totalBudget: 2400,
    interests: ["🌲 טבע ונופים", "🏖️ חופים ורוגע", "🍷 קולינריה ויין"],
    travelStyle: "balanced",
    travelers: 2,
  });

  // Update destination if external prop changes
  useEffect(() => {
    if (selectedDestination) {
      setFormData((prev) => ({ ...prev, destination: selectedDestination }));
    }
  }, [selectedDestination]);

  // Compute return date string in Israeli DD/MM/YYYY format
  const getReturnDateFormatted = () => {
    try {
      const dt = new Date(formData.startDate);
      dt.setDate(dt.getDate() + formData.durationDays);
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = dt.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return "";
    }
  };

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

  const adjustDays = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      durationDays: Math.min(30, Math.max(1, prev.durationDays + delta)),
    }));
  };

  const adjustTravelers = (delta: number) => {
    const next = Math.min(10, Math.max(1, travelers + delta));
    setTravelers(next);
    setFormData((prev) => ({ ...prev, travelers: next }));
  };

  const selectBudgetPreset = (tier: "budget" | "balanced" | "luxury") => {
    let amount = 2400;
    if (tier === "budget") {
      amount = currency === "ILS" ? 4500 : currency === "EUR" ? 1100 : 1200;
    } else if (tier === "balanced") {
      amount = currency === "ILS" ? 9000 : currency === "EUR" ? 2200 : 2400;
    } else {
      amount = currency === "ILS" ? 18000 : currency === "EUR" ? 4500 : 5000;
    }
    setEnteredBudget(amount);
    setFormData((prev) => ({ ...prev, travelStyle: tier }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination.trim()) return;

    // Build enriched interests list based on active toggles
    let activeInterests = [...formData.interests];
    if (kosherOnly && !activeInterests.includes("כשרות וחב\"ד")) {
      activeInterests.push("כשרות וחב\"ד");
    }
    if (shoppingPriority && !activeInterests.includes("🛍️ קניות ושווקים")) {
      activeInterests.push("🛍️ קניות ושווקים");
    }

    const budgetInUsd = convertToUsd(enteredBudget);
    onSubmit({
      ...formData,
      totalBudget: budgetInUsd,
      interests: activeInterests,
      travelers,
      nonstopOnly,
      checkedBagNeeded,
      kosherOnly,
      shoppingPriority,
    });
  };

  return (
    <div className="wanderlust-glass rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 shadow-2xl relative border border-white/15 text-right font-sans w-full">
      {/* Header & Tabs Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
              לאן היעד הבא שלך?
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-500/15 border border-mint-400/30 text-mint-300 text-xs font-semibold shrink-0 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse" />
              <span>13 סוכני AI פעילים</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            תכנון חופשה אוטונומי, השוואת טיסות מנתב"ג, מלונות בוטיק, ניווט, כשרות, שופינג ללא מע"מ וסנכרון יומן
          </p>
        </div>

        {/* Tabs Row (Mode selector) */}
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("all_in_one")}
            className={`py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "all_in_one"
                ? "bg-mint-400 text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>חבילה מלאה (All-in-One)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("flights")}
            className={`py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "flights"
                ? "bg-mint-400 text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>טיסות ונתב"ג</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("hotels")}
            className={`py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "hotels"
                ? "bg-mint-400 text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Hotel className="w-3.5 h-3.5" />
            <span>מלונות וקולינריה</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Trending Destination Chips Strip */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 rounded-2xl bg-white/[0.02] border border-white/5 scrollbar-none text-xs">
          <span className="text-slate-400 text-xs shrink-0 font-medium ml-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-mint-400" />
            יעדים מבוקשים בלחיצה:
          </span>
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.name}
              type="button"
              onClick={() => setFormData({ ...formData, destination: dest.name })}
              className={`px-3 py-1.5 rounded-full shrink-0 transition border flex items-center gap-1.5 font-medium ${
                formData.destination === dest.name
                  ? "bg-mint-400 text-slate-950 border-mint-400 font-bold shadow-sm scale-105"
                  : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:border-mint-400/30"
              }`}
            >
              <span>{dest.emoji}</span>
              <span>{dest.short}</span>
            </button>
          ))}
        </div>

        {/* PRIMARY SEARCH ROW 1 (4 Wide Panoramic Cards: Origin, Destination, Dates, Duration) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {/* Card 1: Origin */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/25 transition flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-cyan-400" />
                מאיפה (מוצא)
              </span>
              <button
                type="button"
                onClick={handleSwap}
                title="החלף מוצא ויעד"
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-mint-400 hover:rotate-180 transition-all duration-300"
              >
                <ArrowRightLeft className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <input
                type="text"
                required
                disabled={isLoading}
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                placeholder="תל אביב (TLV)"
                className="bg-transparent border-none text-white text-sm font-semibold focus:outline-none w-full placeholder-slate-500"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400">
              <span>קיצור מהיר:</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, origin: "תל אביב (TLV)" })}
                className="hover:text-cyan-300 transition underline font-medium"
              >
                נתב"ג (TLV)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, origin: "רמון אילת (ETM)" })}
                className="hover:text-cyan-300 transition underline font-medium"
              >
                רמון (ETM)
              </button>
            </div>
          </div>

          {/* Card 2: Destination */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-mint-400/40 transition flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                אל (יעד החופשה)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">כל העולם</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <input
                type="text"
                required
                disabled={isLoading}
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="באלי, רומא, פריז, טוקיו..."
                className="bg-transparent border-none text-white text-sm font-semibold focus:outline-none w-full placeholder-slate-500"
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/5 truncate">
              {formData.destination ? `יעד נבחר: ${formData.destination}` : "הקלד עיר, אי, חוף או מדינה"}
            </div>
          </div>

          {/* Card 3: Departure Date & Return Date */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/25 transition flex flex-col justify-between shadow-inner">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-mint-400" />
              תאריך המראה
            </span>
            <input
              type="date"
              required
              disabled={isLoading}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="bg-transparent border-none text-white text-xs font-semibold focus:outline-none w-full mt-2"
            />
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
              <span>חזרה משוערת:</span>
              <span className="text-white font-medium">{getReturnDateFormatted()}</span>
            </div>
          </div>

          {/* Card 4: Duration Stepper */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/25 transition flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-mint-400" />
                משך החופשה (ימים)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, durationDays: 4 })}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 hover:text-white"
                >
                  סופ"ש
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, durationDays: 7 })}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 hover:text-white"
                >
                  שבוע
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, durationDays: 14 })}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 hover:text-white"
                >
                  14
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={() => adjustDays(-1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="text-sm font-bold text-white font-mono">
                {formData.durationDays} <span className="text-xs font-normal text-slate-400">ימים</span>
              </div>
              <button
                type="button"
                onClick={() => adjustDays(1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/5">
              {formData.durationDays <= 4 ? "גיחה קצרה" : formData.durationDays <= 9 ? "חופשה שבועית קלאסית" : "מסע עומק מקיף"}
            </div>
          </div>
        </div>

        {/* PRIMARY SEARCH ROW 2 (4 Wide Panoramic Cards: Travelers, Travel Style, Budget, Submit CTA) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 5: Travelers */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/25 transition flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-mint-400" />
                הרכב נוסעים
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setTravelers(1); setFormData((p) => ({ ...p, travelers: 1 })); }}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 hover:text-white"
                >
                  יחיד
                </button>
                <button
                  type="button"
                  onClick={() => { setTravelers(2); setFormData((p) => ({ ...p, travelers: 2 })); }}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 hover:text-white"
                >
                  זוג
                </button>
                <button
                  type="button"
                  onClick={() => { setTravelers(4); setFormData((p) => ({ ...p, travelers: 4 })); }}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 hover:text-white"
                >
                  משפחה
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={() => adjustTravelers(-1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="text-sm font-bold text-white">
                {travelers} {travelers === 1 ? "נוסע יחיד" : "נוסעים"}
              </div>
              <button
                type="button"
                onClick={() => adjustTravelers(1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/5">
              חישוב עלות טיסה ומלונות לכל הנוסעים
            </div>
          </div>

          {/* Card 6: Travel Style */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/25 transition flex flex-col justify-between shadow-inner">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-mint-400" />
              סגנון נסיעה ולינה
            </span>
            <select
              value={formData.travelStyle}
              onChange={(e) => setFormData({ ...formData, travelStyle: e.target.value as any })}
              disabled={isLoading}
              className="bg-black/50 border border-white/10 rounded-xl px-2 py-1.5 text-white text-xs font-semibold focus:outline-none w-full mt-2 cursor-pointer"
            >
              <option value="balanced" className="bg-slate-900 text-white">מאוזן (מלונות 3-4 כוכבים, מרכזי)</option>
              <option value="budget" className="bg-slate-900 text-white">חסכוני (הוסטלים, דירות, תחבורה ציבורית)</option>
              <option value="luxury" className="bg-slate-900 text-white">יוקרתי (ריזורטים ומלונות 5 כוכבים, פרימיום)</option>
            </select>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/5">
              התאמת מלונות ודירוג כוכבים
            </div>
          </div>

          {/* Card 7: Budget & Currency */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/25 transition flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                תקציב כולל
              </span>

              {/* Currency switcher pills */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10 text-[10px]">
                {(["ILS", "USD", "EUR"] as CurrencyCode[]).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setCurrency(cur)}
                    className={`px-1.5 py-0.5 rounded-md font-bold transition ${
                      currency === cur ? "bg-mint-400 text-slate-950 shadow-sm" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {cur === "ILS" ? "₪ ILS" : cur === "USD" ? "$ USD" : "€ EUR"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                <input
                  type="number"
                  min={currency === "ILS" ? 1000 : 200}
                  step={currency === "ILS" ? 250 : 50}
                  required
                  disabled={isLoading}
                  value={enteredBudget}
                  onChange={(e) => setEnteredBudget(parseInt(e.target.value) || 0)}
                  className="bg-transparent border-none text-white text-sm font-bold font-mono focus:outline-none w-full"
                />
                <span className="text-xs font-bold text-mint-400 font-mono">{currencyConfig.symbol}</span>
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center gap-1 shrink-0 text-[9px]">
                <button
                  type="button"
                  onClick={() => selectBudgetPreset("budget")}
                  className="px-1.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 transition"
                >
                  חסכוני
                </button>
                <button
                  type="button"
                  onClick={() => selectBudgetPreset("balanced")}
                  className="px-1.5 py-1 rounded-md bg-white/10 hover:bg-white/15 text-mint-300 font-bold transition"
                >
                  מאוזן
                </button>
                <button
                  type="button"
                  onClick={() => selectBudgetPreset("luxury")}
                  className="px-1.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-purple-300 transition"
                >
                  פרימיום
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/5 font-mono truncate">
              {currency !== "USD"
                ? `~${Math.round(convertToUsd(enteredBudget)).toLocaleString()} USD (כולל 10% בלת"ם)`
                : 'כולל הקצאת 10% כרית בלת"ם'}
            </div>
          </div>

          {/* Card 8: Large Dynamic CTA Button */}
          <div className="flex flex-col justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-full min-h-[96px] p-4 rounded-2xl btn-mint text-slate-950 font-bold text-sm flex flex-col items-center justify-center gap-1.5 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed group transition-all"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span className="text-xs font-bold">13 הסוכנים מתכננים עבורך...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-slate-950 fill-current animate-pulse" />
                    <span className="text-sm font-black">הפעל 13 סוכנים ותכנן מסע</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </div>
                  <div className="text-[11px] opacity-85 font-medium bg-slate-950/15 px-2.5 py-0.5 rounded-full">
                    {formData.origin.split(" ")[0]} ➔ {formData.destination ? formData.destination.split(",")[0] : "היעד"} • {formData.durationDays} ימים • {travelers} נוסעים
                  </div>
                </>
              )}
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: 4 Practical Specialist Agent Toggles + Interests Accordion */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-mint-400" />
              <span>פילטרים מהירים לסוכנים החכמים (התאמה אישית בלחיצה):</span>
            </div>

            {/* Interests Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-mint-400 hover:text-mint-300 transition flex items-center gap-1 font-semibold"
            >
              <span>{showAdvanced ? "הסתר תחומי עניין אישיים" : "+ התאם תחומי עניין אישיים"}</span>
              <span className="text-slate-400 font-normal">({formData.interests.length})</span>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setKosherOnly(!kosherOnly)}
              className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2.5 ${
                kosherOnly
                  ? "bg-blue-500/20 border-blue-400 text-blue-200 font-semibold shadow-inner"
                  : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base">✡️</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">כשרות ושבת</span>
                <span className="text-[9px] opacity-75">מסעדות גלאט, חב"ד והליכה</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setNonstopOnly(!nonstopOnly)}
              className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2.5 ${
                nonstopOnly
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold shadow-inner"
                  : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base">✈️</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">טיסות ישירות</span>
                <span className="text-[9px] opacity-75">ללא קונקשנים מנתב"ג</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCheckedBagNeeded(!checkedBagNeeded)}
              className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2.5 ${
                checkedBagNeeded
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 font-semibold shadow-inner"
                  : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base">🧳</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">כולל כבודה 23kg</span>
                <span className="text-[9px] opacity-75">תמחור שקוף ללא תוספות</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShoppingPriority(!shoppingPriority)}
              className={`p-2.5 rounded-xl border text-right transition flex items-center gap-2.5 ${
                shoppingPriority
                  ? "bg-pink-500/20 border-pink-400 text-pink-200 font-semibold shadow-inner"
                  : "bg-black/30 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-base">🛍️</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold">שופינג ו-Tax-Free</span>
                <span className="text-[9px] opacity-75">אאוטלטים ודלפקי החזר</span>
              </div>
            </button>
          </div>

          {/* Advanced Personal Interests Drawer */}
          {showAdvanced && (
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10 animate-in fade-in duration-200">
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = formData.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    disabled={isLoading}
                    onClick={() => toggleInterest(interest)}
                    className={`text-[11px] px-3 py-1 rounded-full border transition font-medium ${
                      isSelected
                        ? "bg-mint-500/25 text-mint-200 border-mint-400/60 font-semibold"
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
      </form>
    </div>
  );
};
