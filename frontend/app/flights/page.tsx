"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Plane,
  Calendar,
  AlertTriangle,
  Luggage,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Users,
  Compass,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface HolidayItem {
  key: string;
  name_he: string;
  name_en: string;
  depart_window: [string, string];
  return_window: [string, string];
  school_break: string;
  peak_season: boolean;
  peak_surcharge_window: string;
  airport_arrival_recommendation: string;
}

interface CostMath {
  bag_included: boolean;
  bag_rule_note: string;
  base_fare_usd: number;
  base_fare_nis: number;
  bag_fee_roundtrip_usd: number;
  bag_fee_roundtrip_nis: number;
  fx_fee_usd: number;
  fx_fee_nis: number;
  true_total_per_person_usd: number;
  true_total_per_person_nis: number;
  passengers: number;
  infants: number;
  total_family_usd: number;
  total_family_nis: number;
  usd_ils_rate: number;
}

interface FlightOption {
  rank: number;
  airline: string;
  tier_name: string;
  flight_number: string;
  route: string;
  destination_name: string;
  destination_code: string;
  stops: number;
  stops_text: string;
  depart_time: string;
  return_time: string;
  depart_date: string;
  return_date: string;
  duration: string;
  base_fare_usd: number;
  base_fare_nis: number;
  bag_fee_nis: number;
  bag_included: boolean;
  true_total_nis: number;
  family_total_nis: number;
  cost_math: CostMath;
  source: string;
  booking_url: string;
  shabbat_compliant: boolean;
}

interface StreamLog {
  id: string;
  stage: string;
  agent: string;
  message: string;
  type: "step_start" | "thought" | "complete";
  timestamp: string;
}

interface BoardResponse {
  holiday: {
    holiday_key: string;
    name_he: string;
    name_en: string;
    depart_date: string;
    return_date: string;
    school_break: string;
    peak_season: boolean;
    peak_surcharge_window: string;
    airport_arrival_recommendation: string;
  };
  shabbat_audit: {
    has_shabbat_or_holiday_conflict: boolean;
    conflicts: Array<{
      direction: string;
      date: string;
      reason: string;
      el_al_operates: boolean;
      israir_operates: boolean;
      arkia_foreign_operates: boolean;
      alternatives: { earlier: string; later: string };
      advisory: string;
    }>;
    summary: string;
  };
  search_links: {
    google_flights: string;
    skyscanner: string;
    kayak: string;
  };
  passengers: {
    adults: number;
    children: number;
    infants: number;
    total_passengers: number;
    checked_bag_needed: boolean;
  };
  rates_disclaimer: {
    usd_ils_rate: number;
    fx_fee_percent: number;
    source: string;
  };
  top_picks: {
    best_value?: FlightOption;
    best_for_families?: FlightOption;
    cheapest_nonstop?: FlightOption;
  };
  board_flights: FlightOption[];
  holiday_warnings: string[];
}

const QUICK_DESTINATIONS = [
  { label: "לכל יעד זול (Anywhere)", value: "anywhere" },
  { label: "אתונה (ATH)", value: "אתונה" },
  { label: "לרנקה (LCA)", value: "לרנקה" },
  { label: "בודפשט (BUD)", value: "בודפשט" },
  { label: "בוקרשט (OTP)", value: "בוקרשט" },
  { label: "פראג (PRG)", value: "פראג" },
  { label: "רומא (FCO)", value: "רומא" },
  { label: "פריז (CDG)", value: "פריז" },
];

export default function TLVHolidayFlightBoardPage() {
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [selectedHolidayKey, setSelectedHolidayKey] = useState<string>("sukkot");
  const [destination, setDestination] = useState<string>("anywhere");
  const [departDate, setDepartDate] = useState<string>("2026-10-04");
  const [returnDate, setReturnDate] = useState<string>("2026-10-13");
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(2);
  const [infants, setInfants] = useState<number>(0);
  const [checkedBagNeeded, setCheckedBagNeeded] = useState<boolean>(true);
  const [nonstopOnly, setNonstopOnly] = useState<boolean>(false);
  const [budgetCeilingNis, setBudgetCeilingNis] = useState<string>("");

  // Flight filter state
  const [filterAirline, setFilterAirline] = useState<string>("all");
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  // Streaming & Execution State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [boardData, setBoardData] = useState<BoardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const boardResultsRef = useRef<HTMLDivElement>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch canonical 2026 holidays list on mount
  useEffect(() => {
    async function loadHolidays() {
      try {
        const res = await fetch(`${apiBase}/api/v1/flights/holidays`);
        if (res.ok) {
          const data = await res.json();
          if (data.holidays && Array.isArray(data.holidays)) {
            setHolidays(data.holidays);
            const defaultH = data.holidays.find((h: HolidayItem) => h.key === "sukkot") || data.holidays[0];
            if (defaultH) {
              setSelectedHolidayKey(defaultH.key);
              setDepartDate(defaultH.depart_window[0]);
              setReturnDate(defaultH.return_window[1]);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load holidays, using built-in presets", err);
      }
    }
    loadHolidays();
  }, [apiBase]);

  // Handle holiday change
  const handleHolidaySelect = (hKey: string) => {
    setSelectedHolidayKey(hKey);
    const found = holidays.find((h) => h.key === hKey);
    if (found) {
      setDepartDate(found.depart_window[0]);
      setReturnDate(found.return_window[1]);
    }
  };

  // Scroll logs automatically
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Execute Flight Board Search with live SSE stream
  const handleRunSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStreaming(true);
    setLogs([]);
    setErrorMessage(null);
    setBoardData(null);

    const payload = {
      holiday_name_or_key: selectedHolidayKey,
      destination: destination.trim() || "anywhere",
      depart_date: departDate,
      return_date: returnDate,
      adults: Number(adults),
      children: Number(children),
      infants: Number(infants),
      checked_bag_needed: checkedBagNeeded,
      nonstop_only: nonstopOnly,
      budget_ceiling_nis: budgetCeilingNis ? parseFloat(budgetCeilingNis) : null,
      session_id: `tlv_board_${Date.now()}`,
    };

    try {
      const response = await fetch(`${apiBase}/api/v1/flights/tlv-holiday-board/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`שרת הטיסות החזיר שגיאה: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("לא התקבל זרם נתונים מהשרת.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.replace("data: ", ""));
              if (parsed.type === "complete" && parsed.data) {
                setBoardData(parsed.data);
                setTimeout(() => {
                  boardResultsRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 400);
              } else {
                setLogs((prev) => [
                  ...prev,
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    stage: parsed.stage || "planning",
                    agent: parsed.agent || "סוכן נתב״ג",
                    message: parsed.message || "",
                    type: parsed.type || "thought",
                    timestamp: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                  },
                ]);
              }
            } catch (jsonErr) {
              console.error("Error parsing SSE event:", jsonErr, trimmed);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to stream TLV flight board:", err);
      setErrorMessage(err.message || "אירעה שגיאה בבניית לוח ההמראות. נסה שנית.");
    } finally {
      setIsStreaming(false);
    }
  };

  // Filter flights by selected airline tab
  const filteredFlights = (boardData?.board_flights || []).filter((flight) => {
    if (filterAirline === "all") return true;
    if (filterAirline === "elal") return flight.airline.includes("אל על");
    if (filterAirline === "israeli") return flight.airline.includes("אל על") || flight.airline.includes("ישראייר") || flight.airline.includes("ארקיע");
    if (filterAirline === "direct") return flight.stops === 0;
    if (filterAirline === "shabbat") return flight.shabbat_compliant;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#05080e] text-slate-100 selection:bg-cyan-500/30 font-sans" dir="rtl">
      <Navbar />

      {/* Hero Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[650px] h-[650px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[160px]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        {/* Page Title & Intro */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold mb-4 backdrop-blur-md">
            <Plane className="w-3.5 h-3.5 animate-pulse" />
            <span>סוכן נתב״ג החכם • TLV Live Holiday Flight Board</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            לוח טיסות חגים מנתב״ג
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            חישוב עלות אמת מדויק לחגים: השוואת אל על, ישראייר, ארקיע וחברות זרות, בדיקת מגבלות שבת וחג, נרמול דמי כבודה מלאים ולינקים חיים להזמנה.
          </p>
        </div>

        {/* Holiday Selection Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              בחר חופשה או חג ישראלי (2026):
            </span>
            <span className="text-xs text-cyan-400">תאריכים קנוניים רשמיים</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {[
              { key: "pesach", name: "פסח 2026", dates: "01/04 - 16/04" },
              { key: "lag_baomer", name: "ל״ג בעומר", dates: "15/05 - 18/05" },
              { key: "shavuot", name: "שבועות 2026", dates: "21/05 - 24/05" },
              { key: "summer", name: "חופש גדול", dates: "01/07 - 25/07" },
              { key: "rosh_hashana", name: "ראש השנה", dates: "20/09 - 24/09" },
              { key: "sukkot", name: "סוכות 2026", dates: "04/10 - 13/10" },
              { key: "hanukkah", name: "חנוכה 2026", dates: "14/12 - 23/12" },
            ].map((h) => {
              const isSelected = selectedHolidayKey === h.key;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => handleHolidaySelect(h.key)}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all border text-center ${
                    isSelected
                      ? "bg-gradient-to-b from-cyan-500/20 to-teal-500/10 border-cyan-400/40 text-white shadow-lg shadow-cyan-500/10 scale-[1.02]"
                      : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold block mb-0.5">{h.name}</span>
                  <span className="text-[10px] text-slate-400 block">{h.dates}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Interactive Filter Card (Liquid Glass) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl mb-12">
          <form onSubmit={handleRunSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Destination Input & Quick Pick */}
              <div className="md:col-span-1 space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  יעד מבוקש (עיר, קוד או Anywhere):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="למשל: אתונה, לרנקה או anywhere"
                    className="w-full bg-[#0a101b]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition"
                  />
                </div>
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_DESTINATIONS.map((qd) => (
                    <button
                      key={qd.value}
                      type="button"
                      onClick={() => setDestination(qd.value)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                        destination === qd.value
                          ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-slate-400"
                      }`}
                    >
                      {qd.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Departure & Return Dates */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  תאריכי יציאה וחזרה מנתב״ג:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">המראה:</span>
                    <input
                      type="date"
                      value={departDate}
                      onChange={(e) => setDepartDate(e.target.value)}
                      className="w-full bg-[#0a101b]/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/60 transition"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">חזרה:</span>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full bg-[#0a101b]/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/60 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Passengers Count */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  הרכב נוסעים:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#0a101b]/60 border border-white/10 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400 block">מבוגרים</span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-6 h-6 rounded-md bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-cyan-300">{adults}</span>
                      <button
                        type="button"
                        onClick={() => setAdults(Math.min(9, adults + 1))}
                        className="w-6 h-6 rounded-md bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0a101b]/60 border border-white/10 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400 block">ילדים</span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-6 h-6 rounded-md bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-cyan-300">{children}</span>
                      <button
                        type="button"
                        onClick={() => setChildren(Math.min(9, children + 1))}
                        className="w-6 h-6 rounded-md bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0a101b]/60 border border-white/10 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400 block">תינוקות</span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setInfants(Math.max(0, infants - 1))}
                        className="w-6 h-6 rounded-md bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-cyan-300">{infants}</span>
                      <button
                        type="button"
                        onClick={() => setInfants(Math.min(4, infants + 1))}
                        className="w-6 h-6 rounded-md bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Luggage, Direct Flight, and Budget Ceiling */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
              {/* Baggage Switcher */}
              <div
                onClick={() => setCheckedBagNeeded(!checkedBagNeeded)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  checkedBagNeeded
                    ? "bg-cyan-500/10 border-cyan-400/30 text-white"
                    : "bg-white/[0.02] border-white/10 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Luggage className={`w-4 h-4 ${checkedBagNeeded ? "text-cyan-400" : "text-slate-500"}`} />
                  <div>
                    <span className="text-xs font-bold block">דרושה מזוודה (20-23 ק״ג)</span>
                    <span className="text-[10px] text-slate-400 block">חישוב תוספת עלות מלאה לכל נוסע</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  checkedBagNeeded ? "bg-cyan-400 border-cyan-400 text-black font-bold" : "border-white/20"
                }`}>
                  {checkedBagNeeded && "✓"}
                </div>
              </div>

              {/* Nonstop Only Switcher */}
              <div
                onClick={() => setNonstopOnly(!nonstopOnly)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  nonstopOnly
                    ? "bg-teal-500/10 border-teal-400/30 text-white"
                    : "bg-white/[0.02] border-white/10 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Plane className={`w-4 h-4 ${nonstopOnly ? "text-teal-400" : "text-slate-500"}`} />
                  <div>
                    <span className="text-xs font-bold block">טיסות ישירות בלבד (Nonstop)</span>
                    <span className="text-[10px] text-slate-400 block">סינון טיסות ללא עצירת ביניים</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  nonstopOnly ? "bg-teal-400 border-teal-400 text-black font-bold" : "border-white/20"
                }`}>
                  {nonstopOnly && "✓"}
                </div>
              </div>

              {/* Budget Ceiling */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  תקרת תקציב בשקלים לאדם (אופציונלי):
                </label>
                <input
                  type="number"
                  value={budgetCeilingNis}
                  onChange={(e) => setBudgetCeilingNis(e.target.value)}
                  placeholder="ללא הגבלה (או הזן סכום בשקלים)"
                  className="w-full bg-[#0a101b]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2 flex justify-center">
              <button
                type="submit"
                disabled={isStreaming}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-400 text-black font-extrabold text-sm tracking-wide shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-3 cursor-pointer"
              >
                {isStreaming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>סוכן נתב״ג מנתח טיסות, שבתות וכבודה...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>הפעל סוכן נתב״ג ובנה לוח המראות חי ✈️</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Real-time Agent Thought Stream Console */}
        {(isStreaming || logs.length > 0) && (
          <div className="mb-12 p-6 rounded-3xl bg-[#070c14]/90 border border-cyan-500/20 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold text-cyan-300">
                  קונסולת הזרמת מחשבות סוכן (7-Step Thought Stream)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isStreaming ? "חישוב רציף בזמן אמת..." : "החישוב הושלם בהצלחה ✓"}
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs font-mono pr-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-1 border-b border-white/[0.03] text-slate-300"
                >
                  <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold shrink-0">
                    [{log.agent}]
                  </span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        )}

        {/* Error Message Alert */}
        {errorMessage && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Flight Board Results Section */}
        {boardData && (
          <div ref={boardResultsRef} className="space-y-10">
            {/* Top Picks Hero Cards (3-column) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Best Value */}
              {boardData.top_picks.best_value && (
                <div className="p-6 rounded-3xl bg-gradient-to-b from-cyan-500/15 to-transparent border border-cyan-400/30 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-cyan-400 text-black text-[10px] font-black uppercase tracking-wider">
                    Best Value
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-cyan-300 text-xs font-bold">
                    <span>🏆</span>
                    <span>הבחירה המשתלמת ביותר</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {boardData.top_picks.best_value.airline}
                  </h3>
                  <p className="text-xs text-slate-300 mb-4">
                    {boardData.top_picks.best_value.route} ({boardData.top_picks.best_value.duration})
                  </p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-black text-cyan-300">
                      ₪{boardData.top_picks.best_value.true_total_nis.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">לאדם (עלות אמיתית סופית)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    {boardData.top_picks.best_value.cost_math.bag_rule_note}
                  </p>
                  <a
                    href={boardData.top_picks.best_value.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white transition"
                  >
                    <span>הזמן ב-Google Flights</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* 2. Best for Families with Bags */}
              {boardData.top_picks.best_for_families && (
                <div className="p-6 rounded-3xl bg-gradient-to-b from-teal-500/15 to-transparent border border-teal-400/30 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-teal-400 text-black text-[10px] font-black uppercase tracking-wider">
                    Family Choice
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-teal-300 text-xs font-bold">
                    <span>🧳</span>
                    <span>הכי מומלץ למשפחה עם כבודה</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {boardData.top_picks.best_for_families.airline}
                  </h3>
                  <p className="text-xs text-slate-300 mb-4">
                    {boardData.top_picks.best_for_families.tier_name}
                  </p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-black text-teal-300">
                      ₪{boardData.top_picks.best_for_families.family_total_nis.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">
                      סך הכל למשפחה ({boardData.passengers.total_passengers} נפשות)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    {boardData.top_picks.best_for_families.cost_math.bag_included
                      ? "כבודה מלאה 23 ק״ג כלולה בכל כרטיס — מנצח את הלואו-קוסט לאחר הוספת מזוודות."
                      : boardData.top_picks.best_for_families.cost_math.bag_rule_note}
                  </p>
                  <a
                    href={boardData.top_picks.best_for_families.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 hover:text-white transition"
                  >
                    <span>השווה ב-Skyscanner</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* 3. Cheapest Nonstop */}
              {boardData.top_picks.cheapest_nonstop && (
                <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-500/15 to-transparent border border-blue-400/30 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-blue-400 text-black text-[10px] font-black uppercase tracking-wider">
                    Nonstop
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-blue-300 text-xs font-bold">
                    <span>⚡</span>
                    <span>הטיסה הישירה הזולה ביותר</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {boardData.top_picks.cheapest_nonstop.airline}
                  </h3>
                  <p className="text-xs text-slate-300 mb-4">
                    {boardData.top_picks.cheapest_nonstop.route} (ללא עצירות)
                  </p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-black text-blue-300">
                      ₪{boardData.top_picks.cheapest_nonstop.true_total_nis.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">לאדם</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    זמן טיסה מינימלי ללא קונקשן — אידיאלי לנסיעות קצרות עם ילדים.
                  </p>
                  <a
                    href={boardData.top_picks.cheapest_nonstop.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-white transition"
                  >
                    <span>בדוק ב-KAYAK</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Shabbat & Jewish Holiday Conflict Warning (Step 2 of Skill) */}
            {boardData.shabbat_audit.has_shabbat_or_holiday_conflict && (
              <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-3 font-bold text-sm text-amber-300">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>אזהרת מגבלת שבת / חג (אי-טיסה של אל על וישראייר)</span>
                </div>
                <div className="space-y-2 text-xs leading-relaxed text-amber-100">
                  {boardData.shabbat_audit.conflicts.map((c, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/30 border border-amber-500/20">
                      <p className="font-semibold text-amber-300 mb-1">
                        📍 {c.direction} בתאריך {c.date} ({c.reason}):
                      </p>
                      <p className="mb-2">{c.advisory}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                        <span>תאריך חלופי מומלץ לאל על/ישראייר:</span>
                        <span className="font-bold text-white px-2 py-0.5 rounded bg-amber-500/20">
                          הקדמה ל-{c.alternatives.earlier}
                        </span>
                        <span>או</span>
                        <span className="font-bold text-white px-2 py-0.5 rounded bg-amber-500/20">
                          דחייה ל-{c.alternatives.later}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Departure Board Table (Step 6 of Skill) */}
            <div className="rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-2xl overflow-hidden shadow-2xl">
              {/* Header & Tabs */}
              <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Plane className="w-5 h-5 text-cyan-400" />
                    <span>לוח המראות מדורג לחג: {boardData.holiday.name_he}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    ממוין לפי העלות האמיתית הכוללת לאדם (True Total Cost כולל כבודה והמרת מט״ח)
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "all", label: "כל הטיסות" },
                    { key: "israeli", label: "חברות ישראליות" },
                    { key: "elal", label: "אל על בלבד" },
                    { key: "direct", label: "ישיר בלבד" },
                    { key: "shabbat", label: "טסות בשבת" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterAirline(tab.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                        filterAirline === tab.key
                          ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300 font-bold"
                          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-slate-400"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flights Rows */}
              <div className="divide-y divide-white/5">
                {filteredFlights.map((flight) => {
                  const isExpanded = expandedDetailsId === `${flight.flight_number}_${flight.rank}`;
                  return (
                    <div
                      key={`${flight.flight_number}_${flight.rank}`}
                      className="p-5 sm:p-6 hover:bg-white/[0.02] transition"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Rank & Airline Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-black text-sm flex items-center justify-center shrink-0">
                            #{flight.rank}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-base">{flight.airline}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                                {flight.flight_number}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300">
                                {flight.stops_text}
                              </span>
                              {flight.bag_included && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300">
                                  מזוודה כלולה
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {flight.route} • {flight.tier_name} • משך טיסה: {flight.duration}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                              <span>🛫 המראה: {flight.depart_date} ב-{flight.depart_time}</span>
                              <span>🛬 חזרה: {flight.return_date} ב-{flight.return_time}</span>
                            </div>
                          </div>
                        </div>

                        {/* Cost & Booking Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 self-end lg:self-center">
                          <div className="text-left sm:text-right">
                            <div className="text-xs text-slate-400">עלות אמיתית לאדם:</div>
                            <div className="text-xl font-black text-cyan-300">
                              ₪{flight.true_total_nis.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              סה״כ למשפחה: <span className="text-white font-bold">₪{flight.family_total_nis.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedDetailsId(isExpanded ? null : `${flight.flight_number}_${flight.rank}`)}
                              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition flex items-center gap-1"
                            >
                              <span>פירוט כבודה</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <a
                              href={flight.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-wide transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 cursor-pointer"
                            >
                              <span>הזמן עכשיו</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Luggage & Fee Math */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-300 bg-[#070c14]/40 p-4 rounded-2xl">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2 font-mono">
                            <div>
                              <span className="text-slate-500 block">מחיר בסיס:</span>
                              <span className="font-bold text-white">₪{flight.base_fare_nis.toLocaleString()} (${flight.base_fare_usd})</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">תוספת כבודה (20-23 ק״ג):</span>
                              <span className="font-bold text-white">
                                {flight.bag_included ? "0 ₪ (כלול בכרטיס)" : `₪${flight.bag_fee_nis.toLocaleString()} (${flight.cost_math.bag_fee_roundtrip_usd}$)`}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">עמלת המרת מט״ח (~3%):</span>
                              <span className="font-bold text-white">₪{flight.cost_math.fx_fee_nis} (${flight.cost_math.fx_fee_usd})</span>
                            </div>
                          </div>
                          <p className="text-cyan-300/90 text-[11px] mt-2">
                            💡 {flight.cost_math.bag_rule_note}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Multi-Platform Deep Links Box (Step 3 of Skill) */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>קישורי חיפוש ישירים מוכנים להשוואת מחירים (Step 3):</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                כל הקישורים מוגדרים מראש בשקלים (curr=ILS&gl=IL&hl=he) ומובילים להשוואת תעריפים חיים באתרי ההזמנות הגלובליים:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={boardData.search_links.google_flights}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold flex items-center justify-between transition group"
                >
                  <span>Google Flights (ישיר)</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
                </a>
                <a
                  href={boardData.search_links.skyscanner}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold flex items-center justify-between transition group"
                >
                  <span>Skyscanner ישראל</span>
                  <ArrowRight className="w-4 h-4 text-teal-400 group-hover:-translate-x-1 transition-transform" />
                </a>
                <a
                  href={boardData.search_links.kayak}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold flex items-center justify-between transition group"
                >
                  <span>KAYAK ישראל (il.kayak.com)</span>
                  <ArrowRight className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Official Ben Gurion Warnings & Guidelines (Step 7 of Skill) */}
            <div className="p-6 rounded-3xl bg-[#0a0f19] border border-white/10 text-xs space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>הנחיות התייצבות בנתב״ג והתראות חגים רשמיות:</span>
              </h3>
              <ul className="space-y-2 text-slate-300">
                {boardData.holiday_warnings.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-cyan-400 font-bold shrink-0">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 text-[11px] text-slate-500 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                <span>שער חליפין בסיסי: 3.70 ₪ / USD (בנק ישראל)</span>
                <span>כולל ~3% עמלת המרת מט״ח בכרטיסי אשראי ישראליים</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
