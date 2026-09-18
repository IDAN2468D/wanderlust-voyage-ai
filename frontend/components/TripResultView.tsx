"use client";

import React, { useState } from "react";
import {
  Plane,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Printer,
  Sparkles,
  BedDouble,
  PieChart,
  CreditCard,
  Lock,
  ArrowLeft,
  CloudSun,
  ShieldCheck,
  Compass,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mail,
  FileText,
  PhoneCall,
  Luggage,
  Thermometer,
  Zap,
  Info,
  Layers,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { BookingPaymentModal } from "@/components/BookingPaymentModal";

interface DaySchedule {
  day_number: number;
  date_formatted: string;
  title: string;
  morning: {
    time: string;
    activity: string;
    highlight: string;
    cost_usd: number;
    maps_url?: string;
    rating?: number;
  };
  afternoon: {
    time: string;
    dining: string;
    signature_dish: string;
    neighborhood: string;
    dining_maps_url?: string;
    activity: string;
    activity_maps_url?: string;
  };
  evening: {
    time: string;
    activity: string;
    highlight: string;
  };
  local_tip: string;
}

interface PackingCategory {
  category: string;
  items: {
    id: string;
    name: string;
    checked: boolean;
    critical: boolean;
  }[];
}

interface TripResultViewProps {
  markdownPlan: string;
  budgetStatus: string | null;
  totalEstimated: number | null;
  remainingBalance: number | null;
  flightCost: number | null;
  hotelCost: number | null;
  breakdown: Record<string, { amount_usd: number; percentage: number }> | null;
  destination: string;
  durationDays: number;
  weatherMetrics?: any;
  packingChecklist?: PackingCategory[];
  safetyInfo?: any;
  seasonalEvents?: any;
  structuredDays?: DaySchedule[];
  recommendedFlight?: any;
  selectedHotel?: any;
  startDateFormatted?: string;
}

export const TripResultView: React.FC<TripResultViewProps> = ({
  markdownPlan,
  budgetStatus,
  totalEstimated,
  remainingBalance,
  flightCost,
  hotelCost,
  breakdown,
  destination,
  durationDays,
  weatherMetrics,
  packingChecklist: initialChecklist,
  safetyInfo,
  seasonalEvents,
  structuredDays,
  recommendedFlight,
  selectedHotel,
  startDateFormatted,
}) => {
  const [activeTab, setActiveTab] = useState<"itinerary" | "weather" | "safety" | "events" | "budget" | "raw">("itinerary");
  const [copied, setCopied] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 1: true, 2: true });

  const { user } = useAuth();

  // Workspace Sync State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [calendarSyncLoading, setCalendarSyncLoading] = useState(false);

  // Auto-populate email from logged-in user
  React.useEffect(() => {
    if (user?.email && !emailInput) {
      setEmailInput(user.email);
    }
  }, [user?.email, emailInput]);

  // Interactive Checklist State
  const [checklist, setChecklist] = useState<PackingCategory[]>(initialChecklist || []);

  // Update checklist if prop changes
  React.useEffect(() => {
    if (initialChecklist && initialChecklist.length > 0) {
      setChecklist(initialChecklist);
    }
  }, [initialChecklist]);

  const toggleChecklistItem = (catIdx: number, itemIdx: number) => {
    setChecklist((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[catIdx].items[itemIdx].checked = !copy[catIdx].items[itemIdx].checked;
      return copy;
    });
  };

  const totalItemsCount = checklist.reduce((acc, cat) => acc + cat.items.length, 0);
  const checkedItemsCount = checklist.reduce((acc, cat) => acc + cat.items.filter((i) => i.checked).length, 0);

  const toggleDay = (dayNum: number) => {
    setOpenDays((prev) => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const { currency, currencyConfig, formatPrice } = useCurrency();

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownPlan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Google Calendar 1-Click Sync
  const handleCalendarSync = async () => {
    setCalendarSyncLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://wanderlust-voyage-ai.onrender.com";
      const res = await fetch(`${apiBase}/api/v1/workspace/sync-calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          start_date: new Date().toISOString().split("T")[0],
          duration_days: durationDays,
          flight_number: recommendedFlight?.flight_number || "LY-081",
          hotel_name: selectedHotel?.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Open Google Calendar event link in new tab
        window.open(data.google_calendar_url, "_blank");

        // Also offer iCal file download
        const blob = new Blob([data.ical_data], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute("download", `wanderlust-${destination.replace(/[^a-zA-Z0-9]/g, "_")}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("שגיאה בסנכרון יומן:", err);
      // Fallback: direct Google Calendar link
      const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("חופשה ב" + destination)}&details=${encodeURIComponent("תוכנית מסע מבית Wanderlust Voyage AI")}&location=${encodeURIComponent(destination)}`;
      window.open(calUrl, "_blank");
    } finally {
      setCalendarSyncLoading(false);
    }
  };

  // Google Flow / Resend Email Briefing Dispatch
  const handleSendGmailBriefing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setEmailStatus("loading");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://wanderlust-voyage-ai.onrender.com";
      const res = await fetch(`${apiBase}/api/v1/workspace/send-briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          duration_days: durationDays,
          recipient_email: emailInput,
          markdown_plan: markdownPlan,
          total_estimated_usd: totalEstimated || 2400,
        }),
      });

      if (res.ok) {
        setEmailStatus("sent");
        setTimeout(() => {
          setIsEmailModalOpen(false);
          setEmailStatus("idle");
        }, 3000);
      } else {
        setEmailStatus("error");
      }
    } catch (err) {
      setEmailStatus("error");
    }
  };

  // Google Docs Export
  const handleExportGoogleDoc = () => {
    const docTitle = `Wanderlust AI Itinerary - ${destination}`;
    const docsUrl = `https://docs.google.com/document/create?title=${encodeURIComponent(docTitle)}`;
    window.open(docsUrl, "_blank");
  };

  const isApproved = budgetStatus === "APPROVED";

  return (
    <>
      <div className="wanderlust-glass rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-7 border border-white/15 relative overflow-hidden font-sans" dir="rtl">
        {/* Accent Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-mint-400 via-teal-400 to-indigo-500 shadow-sm" />

        {/* Top Header & Fast Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] px-3 py-1 rounded-full bg-mint-500/15 text-mint-300 border border-mint-400/30 font-bold tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-mint-400" />
                תוכנית אוטונומית סונתזה על ידי 7 סוכנים
              </span>
              {budgetStatus && (
                <span
                  className={`text-[11px] px-3 py-1 rounded-full font-bold flex items-center gap-1.5 border tracking-wider ${
                    isApproved
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/20"
                      : "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-500/20"
                  }`}
                >
                  {isApproved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                  {isApproved ? "מאושר בתקציב (כולל 10% בלת\"ם)" : "חריגה מהתקציב"}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              חופשת החלומות ב{destination} ({durationDays} ימים)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              תאריך יציאה: <span className="text-slate-200 font-semibold">{startDateFormatted || "מתוכנן"}</span> | מבוסס מחירים מאומתים ועדכוני אקלים שוטפים
            </p>
          </div>

          {/* Primary CTA & Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            {totalEstimated !== null && (
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="btn-mint flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl hover:scale-105 transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>הזמן הכל עכשיו ({formatPrice(totalEstimated)})</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition font-medium"
              title="העתק תוכנית מסע"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? "הועתק!" : "העתק"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition font-medium"
              title="הדפסה או שמירה כקובץ PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>הדפס / PDF</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            GOOGLE WORKSPACE 1-CLICK SYNC HUB (Google Flow MCP Integration)
        ========================================================================= */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-transparent border border-mint-400/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-right">
            <div className="p-2.5 rounded-xl bg-mint-400/15 text-mint-300 border border-mint-400/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>סנכרון חכם ל-Google Workspace</span>
                <span className="text-[9px] px-2 py-0.2 rounded-full bg-mint-400/20 text-mint-300 font-mono">Google Flow MCP</span>
              </div>
              <div className="text-[11px] text-slate-400">
                ייצאו את לוח הטיסות, המלונות והתדריך ישירות לחשבון הגוגל שלכם בלחיצה אחת.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCalendarSync}
              disabled={calendarSyncLoading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition hover:scale-105"
            >
              <Calendar className="w-3.5 h-3.5 text-mint-400" />
              <span>{calendarSyncLoading ? "מסנכרן..." : "📅 סנכרן ליומן גוגל"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEmailModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition hover:scale-105"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>✉️ שלח תדריך למייל</span>
            </button>

            <button
              type="button"
              onClick={handleExportGoogleDoc}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition hover:scale-105"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>📄 פתח ב-Google Docs</span>
            </button>
          </div>
        </div>

        {/* Metrics Banner with Currency Conversion */}
        {totalEstimated !== null && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-mint-400/40 transition-colors text-right">
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                עלות כוללת משוערת
              </div>
              <div className="text-xl font-serif font-black text-white">
                {formatPrice(totalEstimated)}{" "}
                <span className="text-xs font-normal text-slate-400">{currencyConfig.code}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-indigo-400/40 transition-colors text-right">
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                עודף / כרית ביטחון 10%
              </div>
              <div
                className={`text-xl font-serif font-black ${
                  (remainingBalance ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {(remainingBalance ?? 0) >= 0 ? "+" : "-"}
                {formatPrice(Math.abs(remainingBalance ?? 0))}{" "}
                <span className="text-xs font-normal text-slate-400">{currencyConfig.code}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-blue-400/40 transition-colors text-right">
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
                <Plane className="w-4 h-4 text-blue-400" />
                הקצאת טיסות
              </div>
              <div className="text-xl font-serif font-black text-white">
                {flightCost ? formatPrice(flightCost) : "כלול"}{" "}
                <span className="text-xs font-normal text-slate-400">{currencyConfig.code}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-400/40 transition-colors text-right">
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
                <BedDouble className="w-4 h-4 text-cyan-400" />
                הקצאת מלונות ולינה
              </div>
              <div className="text-xl font-serif font-black text-white">
                {hotelCost ? formatPrice(hotelCost) : "כלול"}{" "}
                <span className="text-xs font-normal text-slate-400">{currencyConfig.code}</span>
              </div>
            </div>
          </div>
        )}

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("itinerary")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === "itinerary"
                ? "bg-mint-500/20 text-mint-300 border border-mint-400/40 shadow-md"
                : "text-slate-400 hover:text-white bg-white/5 border border-transparent"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>לוח זמנים יומי</span>
          </button>

          <button
            onClick={() => setActiveTab("weather")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === "weather"
                ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-md"
                : "text-slate-400 hover:text-white bg-white/5 border border-transparent"
            }`}
          >
            <CloudSun className="w-3.5 h-3.5" />
            <span>אקלים ורשימת אריזה ({checkedItemsCount}/{totalItemsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab("safety")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === "safety"
                ? "bg-rose-500/20 text-rose-300 border border-rose-400/40 shadow-md"
                : "text-slate-400 hover:text-white bg-white/5 border border-transparent"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ביטחון, ויזות וחירום</span>
          </button>

          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === "events"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-md"
                : "text-slate-400 hover:text-white bg-white/5 border border-transparent"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>פנינות נסתרות ואירועים</span>
          </button>

          <button
            onClick={() => setActiveTab("budget")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === "budget"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-md"
                : "text-slate-400 hover:text-white bg-white/5 border border-transparent"
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>ביקורת תקציב פיננסי</span>
          </button>

          <button
            onClick={() => setActiveTab("raw")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              activeTab === "raw"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white bg-white/5 border border-transparent"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>קוד מקור</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: ITINERARY (Interactive Liquid Glass Day Cards & Booking Deep Links)
        ========================================================================= */}
        {activeTab === "itinerary" && (
          <div className="space-y-6">
            {/* Recommended Flight Card */}
            {recommendedFlight && (
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-blue-400/40 transition text-right relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{recommendedFlight.airline}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-mono">
                          {recommendedFlight.flight_number}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{recommendedFlight.tier}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400">מחיר משוער</div>
                      <div className="text-base font-black text-white">{formatPrice(recommendedFlight.price_usd)}</div>
                    </div>
                    {recommendedFlight.booking_url && (
                      <a
                        href={recommendedFlight.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-mint px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition"
                      >
                        <span>הזמן טיסה ב-Google Flights</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 block">זמן יציאה</span>
                    <span className="font-semibold">{recommendedFlight.departure_time || "בוקר"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">משך טיסה ועצירות</span>
                    <span className="font-semibold">{recommendedFlight.duration} ({recommendedFlight.stops === 0 ? "ישיר" : `${recommendedFlight.stops} עצירה`})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">מחלקה</span>
                    <span className="font-semibold">{recommendedFlight.cabin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">בדיקת מחיר שוק</span>
                    <span className="text-emerald-400 font-semibold">{recommendedFlight.benchmark_note || "תחרותי"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Hotel Card */}
            {selectedHotel && (
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-400/40 transition text-right relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                      <BedDouble className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{selectedHotel.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold">
                          ★ {selectedHotel.rating} / 5.0
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{selectedHotel.neighborhood}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400">לילה / סה"כ ל-{durationDays} לילות</div>
                      <div className="text-base font-black text-white">
                        {formatPrice(selectedHotel.nightly_rate_usd)} / {formatPrice(selectedHotel.nightly_rate_usd * durationDays)}
                      </div>
                    </div>
                    {selectedHotel.google_maps_url && (
                      <a
                        href={selectedHotel.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition hover:scale-105"
                      >
                        <MapPin className="w-3.5 h-3.5 text-mint-400" />
                        <span>צפה במפה</span>
                      </a>
                    )}
                  </div>
                </div>

                {selectedHotel.amenities && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                    {selectedHotel.amenities.map((amenity: string, idx: number) => (
                      <span key={idx} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Structured Daily Schedule Accordion */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-bold text-white">תוכנית יומית מפורטת</h3>
                <span className="text-xs text-slate-400">{durationDays} ימים מתוכננים בהתאמה אישית</span>
              </div>

              {structuredDays && structuredDays.length > 0 ? (
                structuredDays.map((day) => {
                  const isOpen = openDays[day.day_number] ?? true;
                  return (
                    <div
                      key={day.day_number}
                      className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-lg transition-all"
                    >
                      {/* Accordion Day Header */}
                      <button
                        type="button"
                        onClick={() => toggleDay(day.day_number)}
                        className="w-full p-4.5 px-5 flex items-center justify-between text-right bg-white/[0.03] hover:bg-white/[0.06] transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-mint-500/20 text-mint-300 border border-mint-400/30 flex items-center justify-center font-bold text-xs">
                            {day.day_number}
                          </span>
                          <div>
                            <div className="font-bold text-sm text-white">{day.title}</div>
                            <div className="text-[11px] text-slate-400">{day.date_formatted}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Day Details */}
                      {isOpen && (
                        <div className="p-5 space-y-4 border-t border-white/5 text-xs">
                          {/* Morning */}
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-mint-300 font-bold">
                              <span>🌅 בוקר ({day.morning.time})</span>
                              {day.morning.maps_url && (
                                <a
                                  href={day.morning.maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-mint-400 hover:underline flex items-center gap-1"
                                >
                                  <MapPin className="w-3 h-3" />
                                  <span>נווט ב-Google Maps</span>
                                </a>
                              )}
                            </div>
                            <div className="font-semibold text-white text-sm">{day.morning.activity}</div>
                            <p className="text-slate-300 leading-relaxed">{day.morning.highlight}</p>
                            <div className="text-[10px] text-slate-400">
                              עלות כניסה: ${day.morning.cost_usd} USD {day.morning.rating && `| דירוג מטיילים: ★ ${day.morning.rating}/5.0`}
                            </div>
                          </div>

                          {/* Afternoon */}
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-amber-300 font-bold">
                              <span>☀️ צהריים ({day.afternoon.time})</span>
                              {day.afternoon.dining_maps_url && (
                                <a
                                  href={day.afternoon.dining_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                                >
                                  <MapPin className="w-3 h-3" />
                                  <span>מסעדת {day.afternoon.dining} במפה</span>
                                </a>
                              )}
                            </div>
                            <div className="font-semibold text-white text-sm">
                              ארוחת צהריים ב-{day.afternoon.dining} ({day.afternoon.neighborhood})
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                              מנת הדגל המומלצת: <em>{day.afternoon.signature_dish}</em>. לאחר מכן המשך ביקור ב-{day.afternoon.activity}.
                            </p>
                          </div>

                          {/* Evening */}
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <div className="text-indigo-300 font-bold">🌙 ערב ({day.evening.time})</div>
                            <div className="font-semibold text-white text-sm">{day.evening.activity}</div>
                            <p className="text-slate-300 leading-relaxed">{day.evening.highlight}</p>
                          </div>

                          {/* Local Tip */}
                          {day.local_tip && (
                            <div className="p-3 rounded-xl bg-mint-950/25 border border-mint-500/25 text-mint-200 flex items-start gap-2">
                              <span className="text-base shrink-0">💡</span>
                              <div>
                                <span className="font-bold block mb-0.5">טיפ סודי של סוכן המסלולים:</span>
                                <span>{day.local_tip}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-2xl bg-[#060a10] border border-white/10 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {markdownPlan}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: WEATHER & INTERACTIVE PACKING CHECKLIST
        ========================================================================= */}
        {activeTab === "weather" && (
          <div className="space-y-6">
            {/* Weather Metrics Card */}
            {weatherMetrics && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-400/25 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CloudSun className="w-6 h-6 text-amber-400" />
                    <div>
                      <h3 className="font-bold text-white text-base">תחזית אקלים עבור {destination}</h3>
                      <p className="text-xs text-amber-200/80">{weatherMetrics.condition}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-white">{weatherMetrics.temp_high}°C</span>
                    <span className="text-xs text-slate-400 mr-1">/ {weatherMetrics.temp_low}°C</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-200 pt-2 border-t border-white/10">
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">סיכוי למשקעים</span>
                    <span className="font-bold text-amber-300">{weatherMetrics.rain_chance}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">מדד קרינת שמש (UV)</span>
                    <span className="font-bold text-amber-300">{weatherMetrics.uv_index} מתוך 11</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">לחות ממוצעת</span>
                    <span className="font-bold text-amber-300">{weatherMetrics.humidity}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">מתאם חשמל ושקע</span>
                    <span className="font-bold text-amber-300">{weatherMetrics.plug_type}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>המלצת ביגוד:</strong> {weatherMetrics.clothing_tip}</span>
                </div>
              </div>
            )}

            {/* Interactive Checklist */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-mint-400" />
                    <span>רשימת אריזה חכמה ואינטראקטיבית</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">סמנו ב-V כל פריט שנארז לתיק</p>
                </div>

                <div className="text-xs font-bold text-mint-300 bg-mint-500/15 px-3 py-1 rounded-full border border-mint-400/30">
                  נארזו: {checkedItemsCount} מתוך {totalItemsCount} ({Math.round((checkedItemsCount / Math.max(1, totalItemsCount)) * 100)}%)
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(checkedItemsCount / Math.max(1, totalItemsCount)) * 100}%` }}
                  className="h-full bg-gradient-to-r from-teal-400 to-mint-400 transition-all duration-300 rounded-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {checklist.map((cat, catIdx) => (
                  <div key={catIdx} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                    <h4 className="font-bold text-xs text-mint-300 border-b border-white/5 pb-2">
                      {cat.category}
                    </h4>

                    <div className="space-y-2">
                      {cat.items.map((item, itemIdx) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer p-1.5 rounded-lg hover:bg-white/5 transition"
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleChecklistItem(catIdx, itemIdx)}
                            className="w-4 h-4 rounded border-white/20 text-mint-500 focus:ring-mint-400 cursor-pointer"
                          />
                          <span className={item.checked ? "line-through text-slate-500" : ""}>
                            {item.name}
                          </span>
                          {item.critical && !item.checked && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 mr-auto">
                              חובה
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: SAFETY, VISAS & EMERGENCY CONTACTS
        ========================================================================= */}
        {activeTab === "safety" && (
          <div className="space-y-6">
            {safetyInfo ? (
              <>
                {/* Visa & Security Alert Box */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-500/10 via-red-500/10 to-transparent border border-rose-400/25 space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-rose-400" />
                    <div>
                      <h3 className="font-bold text-white text-base">הנחיות כניסה וביטחון: {safetyInfo.country_name}</h3>
                      <p className="text-xs text-rose-200/80">{safetyInfo.safety_level}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
                    <div className="font-bold text-rose-300">דרישות דרכון ואשרת כניסה (ויזה):</div>
                    <p className="text-slate-300 leading-relaxed">{safetyInfo.visa_requirement}</p>
                  </div>
                </div>

                {/* Emergency Numbers Grid */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-mint-400" />
                    <span>מוקדי חירום ושגרירות (חיוג מיידי בלחיצה)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <a
                      href={`tel:${safetyInfo.emergency_numbers.police}`}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-mint-400/50 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="text-[10px] text-slate-400">משטרה מקומית</div>
                        <div className="text-sm font-bold text-white">{safetyInfo.emergency_numbers.police}</div>
                      </div>
                      <PhoneCall className="w-4 h-4 text-mint-400" />
                    </a>

                    <a
                      href={`tel:${safetyInfo.emergency_numbers.ambulance}`}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-mint-400/50 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="text-[10px] text-slate-400">אמבולנס / רפואה</div>
                        <div className="text-sm font-bold text-white">{safetyInfo.emergency_numbers.ambulance}</div>
                      </div>
                      <PhoneCall className="w-4 h-4 text-rose-400" />
                    </a>

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 sm:col-span-2">
                      <div className="text-[10px] text-slate-400">שגרירות וסיוע קונסולרי</div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">{safetyInfo.emergency_numbers.embassy_contact}</div>
                    </div>
                  </div>
                </div>

                {/* Scams & Etiquette */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <div className="font-bold text-amber-300">⚠️ טיפים למניעת הונאות תיירותיות:</div>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                      {safetyInfo.scam_alerts?.map((scam: string, i: number) => (
                        <li key={i}>{scam}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <div className="font-bold text-cyan-300">🤝 כללי נימוס ותרבות מקומיים:</div>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                      {safetyInfo.cultural_etiquette?.map((tip: string, i: number) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-xs">מידע הביטחון נטען...</p>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: SECRET GEMS & FESTIVALS
        ========================================================================= */}
        {activeTab === "events" && (
          <div className="space-y-6">
            {seasonalEvents ? (
              <>
                {/* Secret Gems */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-serif font-bold text-base text-white">פנינות נסתרות (Hidden Gems) הרחק מההמונים</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {seasonalEvents.secret_gems?.map((gem: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="font-bold text-white text-xs">{gem.name}</div>
                          <div className="text-[10px] text-indigo-300 mt-0.5">{gem.location}</div>
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed">{gem.why_special}</p>
                        </div>
                        {gem.maps_query && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gem.maps_query)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 text-[11px] text-mint-400 hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>מיקום ב-Google Maps</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Festivals */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-mint-400" />
                    <h3 className="font-serif font-bold text-base text-white">פסטיבלים ואירועים תרבותיים ביעד</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {seasonalEvents.festivals?.map((fest: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{fest.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint-500/15 text-mint-300">{fest.tag}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{fest.frequency}</div>
                        <p className="text-xs text-slate-300 leading-relaxed">{fest.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-xs">אירועים נטענים...</p>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: BUDGET AUDIT & ITEMIZATION
        ========================================================================= */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            {breakdown && (
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-400" />
                    מטריצת חלוקת תקציב וכרית ביטחון 10%
                  </span>
                  <span className={isApproved ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                    סטטוס ביקורת: {isApproved ? "אושר בהצלחה" : "חריגה מהתקציב"}
                  </span>
                </div>

                {/* Multi-segment progress bar */}
                <div className="h-4 w-full rounded-full bg-slate-800 overflow-hidden flex p-0.5 border border-white/10">
                  <div style={{ width: `${breakdown.flights?.percentage || 30}%` }} className="h-full bg-blue-500 rounded-r-full" title={`טיסות: ${breakdown.flights?.percentage}%`} />
                  <div style={{ width: `${breakdown.accommodation?.percentage || 35}%` }} className="h-full bg-indigo-500" title={`לינה: ${breakdown.accommodation?.percentage}%`} />
                  <div style={{ width: `${breakdown.food_and_dining?.percentage || 15}%` }} className="h-full bg-amber-500" title={`אוכל: ${breakdown.food_and_dining?.percentage}%`} />
                  <div style={{ width: `${breakdown.activities_and_tours?.percentage || 10}%` }} className="h-full bg-cyan-500" title={`אטרקציות: ${breakdown.activities_and_tours?.percentage}%`} />
                  <div style={{ width: `${breakdown.contingency_buffer?.percentage || 10}%` }} className="h-full bg-emerald-400 rounded-l-full" title={`כרית ביטחון: ${breakdown.contingency_buffer?.percentage}%`} />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-300 pt-1">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> טיסות ({breakdown.flights?.percentage}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> לינה ({breakdown.accommodation?.percentage}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> אוכל ({breakdown.food_and_dining?.percentage}%)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> סיורים ({breakdown.activities_and_tours?.percentage}%)</span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> כרית ביטחון ({breakdown.contingency_buffer?.percentage}%)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 6: RAW MARKDOWN VIEW
        ========================================================================= */}
        {activeTab === "raw" && (
          <div className="rounded-2xl bg-[#060a10] border border-white/10 p-5 shadow-inner text-left" dir="ltr">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {markdownPlan}
            </pre>
          </div>
        )}

        {/* Bottom Checkout Callout Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-mint-500/15 via-indigo-500/10 to-transparent border border-mint-400/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-2 text-mint-400 text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>הבטחת מחיר ותשלום מאובטח בתקן מחמיר</span>
            </div>
            <div className="text-white font-bold text-base">
              מוכנים לצאת להרפתקה ב-{destination}?
            </div>
            <div className="text-xs text-slate-300">
              הזמינו את כל הטיסות והמלונות במחיר של{" "}
              <strong className="text-mint-400 font-black">{formatPrice(totalEstimated)}</strong> ({currencyConfig.hebrewName})
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="btn-mint px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl whitespace-nowrap hover:scale-105 transition"
          >
            <span>מעבר להזמנה ותשלום</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gmail / Resend Briefing Dispatch Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="wanderlust-glass rounded-3xl p-6 sm:p-7 max-w-md w-full border border-white/20 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-white">שליחת תדריך נסיעה למייל</h3>
                <p className="text-xs text-slate-400">מופעל באמצעות Resend & Google Flow MCP</p>
              </div>
            </div>

            {emailStatus === "sent" ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                <div className="font-bold text-white text-sm">התדריך נשלח בהצלחה לכתובת {emailInput}!</div>
                <p className="text-xs text-slate-400">בדקו את תיבת הדואר הנכנס לקבלת סיכום הטיול המלא והמעוצב.</p>
              </div>
            ) : (
              <form onSubmit={handleSendGmailBriefing} className="space-y-4">
                {emailStatus === "error" && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>חלה שגיאה בשליחת המייל. אנא ודאו את הכתובת ונסו שוב.</span>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-300 block mb-1.5 font-medium">כתובת מייל לקבלת התדריך המלא:</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full p-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-mint-400 transition"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={emailStatus === "loading"}
                    className="flex-1 btn-mint py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <span>{emailStatus === "loading" ? "שולח כעת..." : "שלח תדריך עכשיו"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmailModalOpen(false);
                      setEmailStatus("idle");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Booking and Payment Modal */}
      <BookingPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        tripDetails={{
          destination,
          durationDays,
          totalUsd: totalEstimated || 2400,
          flightCostUsd: flightCost,
          hotelCostUsd: hotelCost,
        }}
      />
    </>
  );
};
