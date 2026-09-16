"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Play,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Star,
  ShieldCheck,
  Headphones,
  CalendarCheck,
  Lock,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VideoModal } from "@/components/VideoModal";
import { TripForm, TripFormData } from "@/components/TripForm";
import { AgentStreamLogs, StreamLogItem } from "@/components/AgentStreamLogs";
import { TripResultView } from "@/components/TripResultView";

const ALL_POPULAR_DESTINATIONS = [
  {
    id: "santorini",
    name: "סנטוריני",
    location: "יוון",
    rating: 4.8,
    image: "/images/santorini.jpg",
  },
  {
    id: "maldives",
    name: "האיים המלדיביים",
    location: "האוקיינוס ההודי",
    rating: 4.9,
    image: "/images/maldives.jpg",
  },
  {
    id: "swiss_alps",
    name: "האלפים השוויצריים",
    location: "שוויץ",
    rating: 4.7,
    image: "/images/swiss_alps.jpg",
  },
  {
    id: "bali",
    name: "באלי",
    location: "אינדונזיה",
    rating: 4.8,
    image: "/images/bali.jpg",
  },
];

export default function Home() {
  const router = useRouter();
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [logs, setLogs] = useState<StreamLogItem[]>([]);
  const [markdownPlan, setMarkdownPlan] = useState<string>("");
  const [budgetStatus, setBudgetStatus] = useState<string | null>(null);
  const [totalEstimated, setTotalEstimated] = useState<number | null>(null);
  const [remainingBalance, setRemainingBalance] = useState<number | null>(null);
  const [flightCost, setFlightCost] = useState<number | null>(null);
  const [hotelCost, setHotelCost] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, { amount_usd: number; percentage: number }> | null>(null);
  const [currentDestination, setCurrentDestination] = useState<string>("באלי, אינדונזיה");
  const [currentDuration, setCurrentDuration] = useState<number>(7);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [carouselIndex, setCarouselIndex] = useState<number>(0);

  // Specialist Agents Extra Data
  const [weatherMetrics, setWeatherMetrics] = useState<any>(null);
  const [packingChecklist, setPackingChecklist] = useState<any[]>([]);
  const [safetyInfo, setSafetyInfo] = useState<any>(null);
  const [seasonalEvents, setSeasonalEvents] = useState<any>(null);
  const [structuredDays, setStructuredDays] = useState<any[]>([]);
  const [recommendedFlight, setRecommendedFlight] = useState<any>(null);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [startDateFormatted, setStartDateFormatted] = useState<string>("");

  const agentSectionRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Check URL search parameters on mount (e.g., from destinations / trips / search modal)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const destParam = params.get("destination");
      const durationParam = params.get("duration");

      if (destParam) {
        setCurrentDestination(destParam);
      }
      if (durationParam) {
        const d = parseInt(durationParam, 10);
        if (!isNaN(d) && d > 0) setCurrentDuration(d);
      }

      if (window.location.hash === "#planner-form") {
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, []);

  const handleSelectDestination = (destName: string, locName: string) => {
    setCurrentDestination(`${destName}, ${locName}`);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleNextDestination = () => {
    setCarouselIndex((prev) => (prev + 1) % ALL_POPULAR_DESTINATIONS.length);
  };

  const handlePrevDestination = () => {
    setCarouselIndex((prev) => (prev - 1 + ALL_POPULAR_DESTINATIONS.length) % ALL_POPULAR_DESTINATIONS.length);
  };

  const handleTripSubmit = async (formData: TripFormData) => {
    setIsStreaming(true);
    setActiveAgent("travel_orchestrator");
    setLogs([]);
    setMarkdownPlan("");
    setBudgetStatus(null);
    setTotalEstimated(null);
    setRemainingBalance(null);
    setFlightCost(null);
    setHotelCost(null);
    setBreakdown(null);
    setWeatherMetrics(null);
    setPackingChecklist([]);
    setSafetyInfo(null);
    setSeasonalEvents(null);
    setStructuredDays([]);
    setRecommendedFlight(null);
    setSelectedHotel(null);
    setStartDateFormatted("");
    setCurrentDestination(formData.destination);
    setCurrentDuration(formData.durationDays);

    // Scroll to agent telemetry section
    setTimeout(() => {
      agentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://wanderlust-voyage-ai.onrender.com";
    const streamUrl = `${apiBase}/api/v1/trips/plan/stream`;

    const requestPayload = {
      origin: formData.origin,
      destination: formData.destination,
      start_date: formData.startDate,
      duration_days: formData.durationDays,
      total_budget: formData.totalBudget,
      interests: formData.interests,
      travel_style: formData.travelStyle,
    };

    try {
      let response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(requestPayload),
      });

      // If /trips/plan/stream not available, fallback to /plan-trip/stream
      if (!response.ok && response.status === 404) {
        response = await fetch(`${apiBase}/api/v1/plan-trip/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(requestPayload),
        });
      }

      if (!response.ok || !response.body) {
        throw new Error(`שרת ה-API החזיר שגיאה: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = "message";
          let eventDataRaw = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              eventType = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              eventDataRaw = line.replace("data:", "").trim();
            }
          }

          if (!eventDataRaw) continue;

          try {
            const data = JSON.parse(eventDataRaw);
            const nowTime = new Date().toLocaleTimeString("he-IL");

            if (eventType === "step") {
              setActiveAgent(data.agent || null);
              setLogs((prev) => [
                ...prev,
                {
                  id: Math.random().toString(),
                  type: "step",
                  agent: data.agent,
                  stage: data.stage,
                  title: data.title,
                  message: data.message,
                  timestamp: nowTime,
                },
              ]);
            } else if (eventType === "tool_call") {
              setLogs((prev) => [
                ...prev,
                {
                  id: Math.random().toString(),
                  type: "tool_call",
                  agent: data.agent,
                  tool: data.tool,
                  summary: data.summary,
                  timestamp: nowTime,
                },
              ]);
            } else if (eventType === "chunk") {
              setMarkdownPlan((prev) => prev + (data.text || ""));
            } else if (eventType === "done") {
              setBudgetStatus(data.budget_status);
              setTotalEstimated(data.total_estimated);
              setRemainingBalance(data.remaining_balance);
              setFlightCost(data.flight_cost);
              setHotelCost(data.hotel_cost);
              setBreakdown(data.breakdown);
              setWeatherMetrics(data.weather_metrics || null);
              setPackingChecklist(data.packing_checklist || []);
              setSafetyInfo(data.safety_info || null);
              setSeasonalEvents(data.seasonal_events || null);
              setStructuredDays(data.structured_days || []);
              setRecommendedFlight(data.recommended_flight || null);
              setSelectedHotel(data.selected_hotel || null);
              setStartDateFormatted(data.start_date_formatted || "");
              setActiveAgent(null);
              setLogs((prev) => [
                ...prev,
                {
                  id: Math.random().toString(),
                  type: "done",
                  agent: "travel_orchestrator",
                  stage: "COMPLETE",
                  title: "התוכנית הושלמה בהצלחה ע\"י 7 סוכני ה-AI",
                  message: `כל משימות הסוכנים סוכמו במלואן. סטטוס תקציב: ${data.budget_status === "APPROVED" ? "מאושר (כולל 10% בלת\"ם)" : "חריגה"}`,
                  timestamp: nowTime,
                },
              ]);
            }
          } catch (err) {
            console.error("שגיאה בפענוח בלוק SSE:", err);
          }
        }
      }
    } catch (error) {
      console.warn("שגיאה בהזרמת SSE, מנסה מסלול ישיר:", error);
      try {
        const syncUrl = `${apiBase}/api/v1/trips/plan`;
        let res = await fetch(syncUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });
        if (!res.ok && res.status === 404) {
          res = await fetch(`${apiBase}/api/v1/plan-trip`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload),
          });
        }
        if (res.ok) {
          const syncData = await res.json();
          setMarkdownPlan(syncData.markdown_plan);
          setBudgetStatus(syncData.budget_status);
          setTotalEstimated(syncData.total_estimated);
          setRemainingBalance(syncData.remaining_balance);
          setFlightCost(syncData.flight_cost);
          setHotelCost(syncData.hotel_cost);
          setBreakdown(syncData.itemized_breakdown);
          setWeatherMetrics(syncData.weather_metrics || null);
          setPackingChecklist(syncData.packing_checklist || []);
          setSafetyInfo(syncData.safety_info || null);
          setSeasonalEvents(syncData.seasonal_events || null);
          setStructuredDays(syncData.structured_days || []);
          setRecommendedFlight(syncData.recommended_flight || null);
          setSelectedHotel(syncData.selected_hotel || null);
          setStartDateFormatted(syncData.start_date_formatted || "");
        }
      } catch (fallbackErr) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            type: "error",
            title: "שגיאת תקשורת",
            message: `לא ניתן להתחבר לשרת בכתובת ${apiBase}. ודא ששרת ה-Backend פעיל.`,
            timestamp: new Date().toLocaleTimeString("he-IL"),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setActiveAgent(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#070c12] text-white selection:bg-mint-400 selection:text-slate-950 font-sans" dir="rtl">
      {/* Global Shared Header Navbar */}
      <Navbar />

      {/* ========================================================
          HERO WRAPPER WITH FULL BLEED BACKGROUND IMAGE
      ======================================================== */}
      <div className="relative min-h-[920px] lg:min-h-[1000px] w-full overflow-hidden flex flex-col justify-between">
        {/* Background Image with Vignette & Gradients */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-bg.jpg"
            alt="Wanderlust Coastline"
            fill
            priority
            className="object-cover object-center scale-105"
          />
          {/* Gradients for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070c12] via-[#070c12]/50 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070c12]/80 via-transparent to-[#070c12]/70" />
        </div>

        {/* ========================================================
            HERO MAIN CONTENT (Split: Heading Right, Form Left)
        ======================================================== */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-12 lg:py-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Right Column: Hero Headline & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow */}
              <div className="flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-[0.2em]">
                <span className="w-6 h-0.5 bg-mint-400 inline-block" />
                <span>העולם מחכה לך</span>
              </div>

              {/* Massive Editorial Serif Heading */}
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.12]">
                הרפתקאות <br />
                שנשארות איתך <br />
                <span className="italic font-normal text-slate-200">לנצח</span>
              </h1>

              {/* Subtitle */}
              <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
                גלה יעדים עוצרי נשימה, חוויות בלתי נשכחות ומסלולים שנבנים במיוחד עבורך על ידי צוות סוכני בינה מלאכותית אוטונומיים — מטיסות ועד אחרון הפרטים.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="btn-mint px-7 py-3.5 rounded-full text-sm font-bold flex items-center gap-2"
                >
                  <span>חקור יעדים</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white text-sm font-semibold transition group"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-mint-400 shadow-inner group-hover:scale-110 transition-transform">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                  <span>צפה בהדגמה</span>
                </button>
              </div>
            </div>

            {/* Left Column: Floating Wanderlust Booking Card */}
            <div className="lg:col-span-5" id="planner-form" ref={formRef}>
              <TripForm
                onSubmit={handleTripSubmit}
                isLoading={isStreaming}
                selectedDestination={currentDestination}
              />
            </div>
          </div>
        </div>

        {/* ========================================================
            HERO BOTTOM BAR: Popular Destinations Carousel + Guarantees
        ======================================================== */}
        <div id="destinations" className="relative z-10 w-full px-6 sm:px-12 lg:px-16 pb-8 pt-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              {/* Popular Destinations (Cards) */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-bold text-white font-serif">יעדים פופולריים</h4>
                    <a
                      href="/destinations"
                      className="text-xs text-mint-400 font-semibold cursor-pointer hover:underline"
                    >
                      צפה בהכל
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevDestination}
                      title="קודם"
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center border border-white/10 backdrop-blur-md transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextDestination}
                      title="הבא"
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center border border-white/10 backdrop-blur-md transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 4 Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ALL_POPULAR_DESTINATIONS.map((dest, idx) => (
                    <div
                      key={dest.id}
                      onClick={() => handleSelectDestination(dest.name, dest.location)}
                      className={`group relative h-36 rounded-2xl overflow-hidden cursor-pointer border shadow-lg dest-card-zoom transition-all ${
                        carouselIndex === idx ? "border-mint-400/80 ring-2 ring-mint-400/40" : "border-white/15"
                      }`}
                    >
                      <Image
                        src={dest.image}
                        alt={dest.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-end justify-between">
                        <div>
                          <div className="font-bold text-xs text-white group-hover:text-mint-400 transition-colors">
                            {dest.name}
                          </div>
                          <div className="text-[10px] text-slate-300">{dest.location}</div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-md backdrop-blur-sm border border-white/10">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>{dest.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guarantees Strip */}
              <div className="lg:col-span-4 wanderlust-glass-card rounded-2xl p-3.5 border border-white/10 shadow-lg">
                <div className="grid grid-cols-2 gap-3 text-right">
                  <div className="flex items-center gap-2.5 p-1.5">
                    <div className="p-2 rounded-xl bg-white/5 text-mint-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">הבטחת מחיר</div>
                      <div className="text-[10px] text-slate-400">המחיר הטוב ביותר</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-1.5">
                    <div className="p-2 rounded-xl bg-white/5 text-mint-400">
                      <Headphones className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">תמיכה 24/7</div>
                      <div className="text-[10px] text-slate-400">סוכני AI זמינים</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-1.5">
                    <div className="p-2 rounded-xl bg-white/5 text-mint-400">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">גמישות מרבית</div>
                      <div className="text-[10px] text-slate-400">שינויים והתאמות</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-1.5">
                    <div className="p-2 rounded-xl bg-white/5 text-mint-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">תשלום מאובטח</div>
                      <div className="text-[10px] text-slate-400">הצפנה מקצה לקצה</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Proof Numbers Strip */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="font-serif text-2xl font-black text-white tracking-tight">500+</div>
                <div className="text-xs text-slate-400 mt-0.5">יעדים ברחבי תבל</div>
              </div>
              <div>
                <div className="font-serif text-2xl font-black text-white tracking-tight">10K+</div>
                <div className="text-xs text-slate-400 mt-0.5">מטיילים מרוצים</div>
              </div>
              <div>
                <div className="font-serif text-2xl font-black text-white tracking-tight">150+</div>
                <div className="text-xs text-slate-400 mt-0.5">מומחי תיירות וסוכני AI</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-2xl font-black text-white tracking-tight">4.9</span>
                  <div className="flex text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">דירוג שביעות רצון</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          MULTI-AGENT EXECUTION & TELEMETRY STREAM SECTION
      ======================================================== */}
      {(isStreaming || logs.length > 0 || markdownPlan) && (
        <section ref={agentSectionRef} className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-14 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs px-3 py-1 rounded-full bg-mint-500/15 text-mint-300 border border-mint-500/30 font-bold uppercase tracking-wider">
              חדר המבצעים האוטונומי
            </span>
            <h2 className="text-3xl font-serif font-bold text-white">
              תהליך התכנון והסינתזה של סוכני ה-AI
            </h2>
            <p className="text-xs text-slate-400">
              מעקב חי אחר קריאות לכלים, בירור לוחות זמנים ואישור תקציב בזמן אמת.
            </p>
          </div>

          <AgentStreamLogs logs={logs} activeAgent={activeAgent} isStreaming={isStreaming} />

          {markdownPlan && (
            <TripResultView
              markdownPlan={markdownPlan}
              budgetStatus={budgetStatus}
              totalEstimated={totalEstimated}
              remainingBalance={remainingBalance}
              flightCost={flightCost}
              hotelCost={hotelCost}
              breakdown={breakdown}
              destination={currentDestination}
              durationDays={currentDuration}
              weatherMetrics={weatherMetrics}
              packingChecklist={packingChecklist}
              safetyInfo={safetyInfo}
              seasonalEvents={seasonalEvents}
              structuredDays={structuredDays}
              recommendedFlight={recommendedFlight}
              selectedHotel={selectedHotel}
              startDateFormatted={startDateFormatted}
            />
          )}
        </section>
      )}

      {/* Interactive Video Demonstration Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onStartPlanning={() => {
          formRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* Global Shared Footer */}
      <Footer />
    </main>
  );
}
