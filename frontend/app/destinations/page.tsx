"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  MapPin,
  Star,
  ArrowLeft,
  Sparkles,
  Calendar,
  DollarSign,
  Compass,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

interface DestinationItem {
  id: string;
  name: string;
  country: string;
  category: "tropical" | "europe" | "nature" | "asia";
  rating: number;
  reviewsCount: number;
  image: string;
  priceFrom: number;
  bestSeason: string;
  description: string;
  tags: string[];
}

const DESTINATIONS_DATA: DestinationItem[] = [
  {
    id: "santorini",
    name: "סנטוריני",
    country: "יוון",
    category: "europe",
    rating: 4.9,
    reviewsCount: 340,
    image: "/images/santorini.jpg",
    priceFrom: 1850,
    bestSeason: "מאי - אוקטובר",
    description: "בתים לבנים בוהקים, כיפות כחולות המשקיפות אל לוע הר הגעש והשקיעות המפורסמות בעולם.",
    tags: ["רומנטיקה", "נופי ים", "קולינריה ים-תיכונית", "מלונות מערה"],
  },
  {
    id: "maldives",
    name: "האיים המלדיביים",
    country: "האוקיינוס ההודי",
    category: "tropical",
    rating: 4.95,
    reviewsCount: 520,
    image: "/images/maldives.jpg",
    priceFrom: 3200,
    bestSeason: "נובמבר - אפריל",
    description: "וילות יוקרה על המים, לגונות טורקיז צלולות ועולם תת-ימי עשיר בשוניות אלמוגים נדירות.",
    tags: ["יוקרה אולטימטיבית", "שנורקלינג וצלילה", "שלווה מוחלטת", "ירח דבש"],
  },
  {
    id: "swiss_alps",
    name: "האלפים השוויצריים",
    country: "שוויץ",
    category: "nature",
    rating: 4.85,
    reviewsCount: 290,
    image: "/images/swiss_alps.jpg",
    priceFrom: 2400,
    bestSeason: "יוני - ספטמבר (או דצמבר-מרץ לסקי)",
    description: "פסגות דרמטיות, אגמי טורקיז אלפיניים, רכבות פנורמיות וכפרי עץ ציוריים בלב הטבע.",
    tags: ["טרקים וטבע", "סקי", "רכבות נוף", "אוויר פסגות"],
  },
  {
    id: "bali",
    name: "באלי",
    country: "אינדונזיה",
    category: "asia",
    rating: 4.88,
    reviewsCount: 610,
    image: "/images/bali.jpg",
    priceFrom: 1450,
    bestSeason: "אפריל - אוקטובר",
    description: "מקדשים עתיקים, טרסות אורז ירוקות עד האופק, גלישת גלים ותרבות רוחנית מרגיעה.",
    tags: ["תרבות ומקדשים", "וילות פרטיות", "ספא ויוגה", "גלישה"],
  },
  {
    id: "amalfi",
    name: "חוף אמאלפי וקאפרי",
    country: "איטליה",
    category: "europe",
    rating: 4.92,
    reviewsCount: 410,
    image: "/images/santorini.jpg",
    priceFrom: 2100,
    bestSeason: "מאי - ספטמבר",
    description: "מצוקים תלולים הנושקים לים הטירני, מטעי לימונים ריחניים ופסטה טרייה בכפרים תלויים.",
    tags: ["קולינריה עילית", "יאכטות", "נופים דרמטיים", "היסטוריה"],
  },
  {
    id: "kyoto",
    name: "קיוטו וטוקיו",
    country: "יפן",
    category: "asia",
    rating: 4.96,
    reviewsCount: 780,
    image: "/images/hero-bg.jpg",
    priceFrom: 2900,
    bestSeason: "מרץ - מאי / אוקטובר - נובמבר",
    description: "שילוב מהפנט בין עתידנות טכנולוגית לבין גני זן שלווים, מקדשי שינטו ואירוח מסורתי.",
    tags: ["מסורת מול קידמה", "גורמה יפני", "מקדשים עתיקים", "רכבות מהירות"],
  },
];

export default function DestinationsPage() {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredDestinations = DESTINATIONS_DATA.filter((dest) => {
    const matchesCategory = activeCategory === "all" || dest.category === activeCategory;
    const matchesQuery =
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const handlePlanWithAI = (destName: string, country: string) => {
    const fullDest = `${destName}, ${country}`;
    router.push(`/?destination=${encodeURIComponent(fullDest)}#planner-form`);
  };

  return (
    <div className="min-h-screen bg-[#070c12] text-white selection:bg-mint-400 selection:text-slate-950 font-sans" dir="rtl">
      <Navbar />

      {/* Header Banner */}
      <section className="relative py-20 px-6 sm:px-12 lg:px-16 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0 opacity-25">
          <Image
            src="/images/hero-bg.jpg"
            alt="Destinations background"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070c12]/80 via-[#070c12] to-[#070c12]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-[0.2em] bg-mint-500/10 px-4 py-1.5 rounded-full border border-mint-500/20">
            <Compass className="w-4 h-4" />
            <span>העולם בכף ידך</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            יעדים נבחרים בעולם
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            מאיי טורקיז בודדים ועד פסגות אלפיניות מושלגות. בחר את היעד המושלם עבורך, וסוכני ה-AI שלנו ירכיבו תוכנית מפורטת המותאמת לתקציב ולהעדפות שלך.
          </p>

          {/* Search bar inside header */}
          <div className="max-w-xl mx-auto pt-4">
            <div className="wanderlust-glass rounded-2xl p-2 flex items-center gap-3 border border-white/15">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש לפי יעד, מדינה, או עניין (למשל: סקי, רומנטיקה, צלילה)..."
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none text-right"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-slate-400 hover:text-white px-2"
                >
                  נקה
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-12 space-y-10">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {[
            { id: "all", label: "כל היעדים" },
            { id: "tropical", label: "🏝️ איים טרופיים וחופים" },
            { id: "europe", label: "🏛️ אירופה קלאסית" },
            { id: "nature", label: "🏔️ הרים וטבע פראי" },
            { id: "asia", label: "⛩️ אסיה והמזרח" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === cat.id
                  ? "btn-mint shadow-lg shadow-mint-500/20 scale-105"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/5 pb-4">
          <span>נמצאו {filteredDestinations.length} יעדים מובילים</span>
          <span className="flex items-center gap-1.5 text-mint-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            מחושב ומותאם אישית ע&quot;י בינה מלאכותית
          </span>
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              className="wanderlust-glass-card rounded-3xl overflow-hidden border border-white/15 group hover:border-mint-500/40 transition-all flex flex-col justify-between"
            >
              {/* Image Container */}
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070c12] via-black/25 to-transparent" />

                {/* Rating Badge */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 flex items-center gap-1.5 text-xs font-bold text-white">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{dest.rating}</span>
                  <span className="text-[10px] text-slate-300">({dest.reviewsCount})</span>
                </div>

                {/* Country Badge */}
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-white">
                  <MapPin className="w-4 h-4 text-mint-400" />
                  <span className="text-sm font-semibold">{dest.country}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl font-bold text-white group-hover:text-mint-300 transition-colors">
                    {dest.name}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {dest.description}
                  </p>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-1.5 text-slate-300">
                      <DollarSign className="w-3.5 h-3.5 text-mint-400 shrink-0" />
                      <span>החל מ-<strong>{formatPrice(dest.priceFrom)}</strong></span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-1.5 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-mint-400 shrink-0" />
                      <span className="truncate">{dest.bestSeason}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {dest.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Plan Trip CTA */}
                <div className="pt-5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handlePlanWithAI(dest.name, dest.country)}
                    className="w-full btn-mint py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 group/btn shadow-md"
                  >
                    <span>תכנן טיול ליעד זה עם AI</span>
                    <ArrowLeft className="w-4 h-4 group-hover/btn:-translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Destination Banner */}
        <section className="wanderlust-glass rounded-3xl p-8 sm:p-12 border border-white/20 text-center relative overflow-hidden my-12">
          <div className="absolute inset-0 bg-gradient-to-r from-mint-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-mint-400/20 text-mint-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              לא מצאת את היעד שחלמת עליו?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              סוכני ה-AI שלנו מסוגלים לחקור, לתכנן ולמצוא טיסות ומלונות עבור כל עיר, כפר או שמורת טבע בכל רחבי הגלובוס.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push("/#planner-form")}
                className="btn-mint px-8 py-3.5 rounded-full text-xs font-bold inline-flex items-center gap-2 shadow-xl"
              >
                <span>הזן יעד אישי במערכת</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
