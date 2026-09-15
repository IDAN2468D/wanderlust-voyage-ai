"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Sparkles,
  ArrowLeft,
  Compass,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  Flame,
  Star,
} from "lucide-react";

interface ExperienceItem {
  id: string;
  title: string;
  subtitle: string;
  category: "nature" | "wellness" | "culinary" | "adventure" | "culture";
  image: string;
  duration: string;
  groupType: string;
  rating: number;
  highlight: string;
  features: string[];
  suggestedDestinations: string;
  defaultInterests: string;
}

const EXPERIENCES_DATA: ExperienceItem[] = [
  {
    id: "safari",
    title: "ספארי יוקרה ושמורות טבע פראיות",
    subtitle: "מפגש בלתי אמצעי עם 'חמשת הגדולים' בלודג'ים מפוארים תחת כיפת השמיים",
    category: "nature",
    image: "/images/hero-bg.jpg",
    duration: "5 - 8 ימים",
    groupType: "זוגות ומשפחות",
    rating: 4.97,
    highlight: "כולל טיסת כדור פורח עם ארוחת שמפניה בזריחה",
    features: ["מדריכי שטח פרטיים מוסמכים", "רכבי 4x4 פתוחים וממוזגים", "אירוח ברמת 5 כוכבים פראי"],
    suggestedDestinations: "סרנגטי, טנזניה / קרוגר, דרום אפריקה",
    defaultInterests: "טבע וחיות בר, צילום, יוקרה, הרפתקאות",
  },
  {
    id: "diving",
    title: "צלילות עמוקות ולגונות בודדות",
    subtitle: "שוניות אלמוגים מרהיבות, כרישי לווייתן ומים צלולים כבדולח",
    category: "adventure",
    image: "/images/maldives.jpg",
    duration: "6 - 10 ימים",
    groupType: "חובבי ים וצלילה",
    rating: 4.93,
    highlight: "שייט פרטי בסירת קטמרן בין אטולים מבודדים",
    features: ["ציוד צלילה מקצועי מסופק", "אתרי צלילה בלעדיים ללא קהל", "מדריך צלילה PADI צמוד"],
    suggestedDestinations: "האיים המלדיביים / שונית המחסום הגדולה",
    defaultInterests: "ספורט ימי, צלילה, חופים, שלווה",
  },
  {
    id: "culinary",
    title: "סיורי יין וגסטרונומיה עילית",
    subtitle: "סדנאות שף פרטיות, יקבי בוטיק ומסעדות מכוכבות מישלן",
    category: "culinary",
    image: "/images/santorini.jpg",
    duration: "4 - 7 ימים",
    groupType: "חובבי אוכל וזוגות",
    rating: 4.95,
    highlight: "טעימות חביות יין נדירות עם היינן הראשי",
    features: ["הזמנות מובטחות למסעדות מישלן", "סדנאות בישול מקומיות בוטיקיות", "נסיעות נוף בכרמים"],
    suggestedDestinations: "טוסקנה, איטליה / בורדו, צרפת",
    defaultInterests: "קולינריה, יין, סיורי שווקים, תרבות",
  },
  {
    id: "ski",
    title: "סקי פסגות ובקתות חורף אלפיניות",
    subtitle: "מדרונות שלג בתוליים, סאונות מחוממות המשקיפות לרכסים לבנים ואפרה-סקי יוקרתי",
    category: "adventure",
    image: "/images/swiss_alps.jpg",
    duration: "6 - 9 ימים",
    groupType: "חובבי שלג וספורט חורף",
    rating: 4.91,
    highlight: "גישה ישירה מהבקתה אל המסלולים (Ski-in / Ski-out)",
    features: ["כרטיס סקי פס כלול", "ציוד פרימיום מותאם אישית", "מרכזי ספא וסאונה פנורמיים"],
    suggestedDestinations: "צרמט, שוויץ / שמוני, צרפת",
    defaultInterests: "סקי, סנובורד, נופי חורף, ספא והרפיה",
  },
  {
    id: "wellness",
    title: "ריטריט שלווה, יוגה ו-Wellness",
    subtitle: "התנתקות מוחלטת מהרעש העירוני, מעיינות מרפא וטיפולים הוליסטיים",
    category: "wellness",
    image: "/images/bali.jpg",
    duration: "7 - 14 ימים",
    groupType: "יחידים, זוגות וקבוצות קטנות",
    rating: 4.98,
    highlight: "תפריט תזונה מותאם אישית ומפגשי מדיטציה מודרכים",
    features: ["עיסויים וטיפולי ספא יומיים", "מרכזי יוגה פתוחים לטבע", "סביבה נטולת מסכים"],
    suggestedDestinations: "אובוד, באלי / קיוטו, יפן",
    defaultInterests: "וולנס, יוגה, מדיטציה, רוגע, תזונה בריאה",
  },
  {
    id: "culture",
    title: "מסעות בעקבות תרבויות וממלכות עתיקות",
    subtitle: "חשיפת סודות הארכיטקטורה, המיתולוגיה והאוצרות ההיסטוריים בליווי היסטוריונים",
    category: "culture",
    image: "/images/hero-bg.jpg",
    duration: "7 - 12 ימים",
    groupType: "חוקרים ושוחרי תרבות",
    rating: 4.92,
    highlight: "כניסה מוקדמת ובלעדית לאתרים היסטוריים לפני פתיחתם לציבור",
    features: ["מדריכים אקדמיים דוברי עברית/אנגלית", "אירוח במבנים היסטוריים משוחזרים", "קבוצות אינטימיות"],
    suggestedDestinations: "רומא ואתונה / קיוטו ונארה, יפן",
    defaultInterests: "היסטוריה, אמנות, מוזיאונים, אדריכלות",
  },
];

export default function ExperiencesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filtered = EXPERIENCES_DATA.filter(
    (exp) => selectedCategory === "all" || exp.category === selectedCategory
  );

  const handlePlanExperience = (item: ExperienceItem) => {
    const dest = item.suggestedDestinations.split("/")[0].trim();
    const query = new URLSearchParams({
      destination: dest,
      interests: item.defaultInterests,
    }).toString();

    router.push(`/?${query}#planner-form`);
  };

  return (
    <div className="min-h-screen bg-[#070c12] text-white selection:bg-mint-400 selection:text-slate-950 font-sans" dir="rtl">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative py-20 px-6 sm:px-12 lg:px-16 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0 opacity-20">
          <Image
            src="/images/bali.jpg"
            alt="Experiences Background"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070c12]/85 via-[#070c12] to-[#070c12]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-[0.2em] bg-mint-500/10 px-4 py-1.5 rounded-full border border-mint-500/20">
            <Flame className="w-4 h-4" />
            <span>חוויות יוצאות דופן</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            מסעות שנבנים סביב התשוקות שלך
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            אנחנו לא מוכרים חבילות תיירות גנריות. כל חוויה מתוכננת על ידי סוכני ה-AI שלנו בדיוק לפי תחומי העניין שלך — מקולינריה ועד אקסטרים.
          </p>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-6">
            {[
              { id: "all", label: "כל החוויות" },
              { id: "adventure", label: "🏄 אקסטרים והרפתקאות" },
              { id: "wellness", label: "🧘 ספא, יוגה ושלווה" },
              { id: "culinary", label: "🍷 גסטרונומיה ויין" },
              { id: "nature", label: "🦁 טבע וספארי" },
              { id: "culture", label: "🏛️ מורשת והיסטוריה" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === tab.id
                    ? "btn-mint shadow-lg shadow-mint-500/20 scale-105"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Experience Cards */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-14 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="wanderlust-glass-card rounded-3xl overflow-hidden border border-white/15 hover:border-mint-500/30 transition-all flex flex-col justify-between group"
            >
              {/* Image with overlay */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070c12] via-black/30 to-transparent" />

                {/* Rating Badge */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 flex items-center gap-1.5 text-xs font-bold text-white">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{item.rating}</span>
                </div>

                {/* Duration & Group size badges */}
                <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 text-xs">
                  <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 flex items-center gap-1.5 text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-mint-400" />
                    <span>{item.duration}</span>
                  </div>
                  <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 flex items-center gap-1.5 text-slate-200">
                    <Users className="w-3.5 h-3.5 text-mint-400" />
                    <span>{item.groupType}</span>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-white group-hover:text-mint-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>

                  {/* Golden Highlight Box */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-2.5 text-amber-300 text-xs font-semibold">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{item.highlight}</span>
                  </div>

                  {/* Bullet points */}
                  <div className="space-y-2 pt-1">
                    {item.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-mint-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Suggested Destinations */}
                  <div className="pt-2 text-xs text-slate-400">
                    <span className="font-bold text-white">יעדים מומלצים לחוויה זו: </span>
                    <span>{item.suggestedDestinations}</span>
                  </div>
                </div>

                {/* Plan Button */}
                <div className="pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handlePlanExperience(item)}
                    className="w-full btn-mint py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 group/btn shadow-lg"
                  >
                    <span>תכנן חופשה בסגנון זה עם AI</span>
                    <ArrowLeft className="w-4 h-4 group-hover/btn:-translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quality Guarantee Strip */}
        <section className="wanderlust-glass rounded-3xl p-8 border border-white/15 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <ShieldCheck className="w-10 h-10 text-mint-400 mx-auto" />
            <h3 className="font-serif text-2xl font-bold text-white">
              הבטחת החוויה המושלמת של Wanderlust
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              כל חוויה שסוכני ה-AI שלנו ממליצים עליה נבדקת מול מאגרי דירוגים מאומתים, ביקורות בזמן אמת וקריטריוני בטיחות בינלאומיים מחמירים.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
