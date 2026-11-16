"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Compass,
  Plane,
  ShieldCheck,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const AGENTS_DETAILS = [
  {
    role: "Head Travel Planner",
    title: "מנהל המסלול ומתאם החופשה",
    icon: Compass,
    color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    desc: "מנתח את העדפות החופשה שלך, מפרק את המסע לשלבים ומתאם בין כל 32 מומחי הנסיעות שלנו עד לקבלת תוכנית מדויקת.",
    skills: ["התאמה אישית לפרופיל המטייל", "תזמון ולוחות זמנים נוחים", "בניית תדריך מסע מלא"],
  },
  {
    role: "Flights & Stays Specialist",
    title: "מומחה טיסות ומלונות",
    icon: Plane,
    color: "from-mint-500/20 to-emerald-500/20 text-mint-400 border-mint-500/30",
    desc: "סורק נתיבי טיסה מנתב\"ג, מאתר טיסות ישירות ומשתלמות ובוחר מלונות בוטיק וריזורטים במיקומים מרכזיים עם ביקורות מובילות.",
    skills: ["איתור טיסות ישירות ומשתלמות", "סינון מלונות לפי ביקורות ומיקום", "בדיקת זמינות וטווח מחירים"],
  },
  {
    role: "Itinerary & Culinary Curator",
    title: "אדריכל המסלול והחוויות",
    icon: CalendarCheck,
    color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    desc: "בונה מסלול יום-אחר-יום עם היגיון גיאוגרפי כדי לחסוך נסיעות מיותרות, ומשלב אטרקציות ייחודיות, מסעדות כשרות וזמני מנוחה.",
    skills: ["קיצור זמני נסיעה בין אתרים", "התאמה לתחומי עניין אישיים", "שילוב מסעדות, כשרות וחוויות"],
  },
  {
    role: "Budget & Savings Advisor",
    title: "מבקר התקציב והחיסכון",
    icon: ShieldCheck,
    color: "from-rose-500/20 to-purple-500/20 text-rose-400 border-rose-500/30",
    desc: "מבצע בקרה מדויקת של כל סעיף עלות (טיסות, לינה, אוכל, תחבורה ואטרקציות) ומוודא עמידה במסגרת התקציב שהוגדרה מראש.",
    skills: ["פירוט עלויות שקוף מראש", "מניעת חריגות תקציב", "הקצאת יתרות ביטחון למטייל"],
  },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-[#050811] text-white selection:bg-mint-400 selection:text-slate-950 font-sans" dir="rtl">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative py-12 sm:py-20 px-4 sm:px-12 lg:px-16 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0 opacity-20">
          <Image
            src="/images/hero-bg.jpg"
            alt="About Background"
            fill
            unoptimized
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050811]/85 via-[#050811] to-[#050811]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-[0.2em] bg-mint-500/10 px-4 py-1.5 rounded-full border border-mint-500/20">
            <Compass className="w-4 h-4" />
            <span>חופשות מותאמות אישית מנתב&quot;ג</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            אודות Wanderlust VoyageAI
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            אנחנו מחליפים עשרות שעות של חיפושים מתישים, השוואות מחירים ועשרות לשוניות דפדפן פתוחות — בצוות סוכני AI אוטונומיים שמתכננים את החופשה הבאה שלך תוך שניות.
          </p>
        </div>
      </section>

      {/* Story & Vision */}
      <main className="max-w-7xl mx-auto px-4 sm:px-12 lg:px-16 py-10 sm:py-16 space-y-14 sm:space-y-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>החזון שלנו</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white leading-tight">
              תכנון טיולים כבר לא צריך להיות עבודה במשרה מלאה.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              לפני Wanderlust, תכנון חופשה מורכבת דרש ימים של חיפוש טיסות, קריאת מאות ביקורות על מלונות, חישובי תקציב מייגעים באקסל וניסיונות להרכיב לו&quot;ז שלא יתיש אותך בנסיעות.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              הקמנו את Wanderlust במטרה להעמיד לרשות כל מטייל <strong>צוות תכנון חופשות אישי</strong>. 32 מומחי נסיעות חכמים — מטיסות נתב&quot;ג ושבת ועד מלונות, קולינריה ותקציב — משתפים פעולה בזמן אמת כדי להרכיב עבורך מסע מדויק, מרגש ובטוח כלכלית.
            </p>

            <div className="pt-2 flex flex-wrap gap-2.5 sm:gap-4 text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-mint-400 shrink-0" /> שקיפות מלאה בזמן אמת
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-mint-400 shrink-0" /> אפס עמלות תיווך נסתרות
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-mint-400 shrink-0" /> עמידה קפדנית בתקציב
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 relative h-72 sm:h-96 rounded-3xl overflow-hidden border border-white/15 shadow-2xl">
            <Image
              src="https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop"
              alt="Our vision"
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-transparent to-transparent" />
            <div className="absolute bottom-4 right-4 left-4 sm:bottom-6 sm:right-6 sm:left-6 wanderlust-glass p-4 rounded-2xl border border-white/15">
              <div className="text-xs font-bold text-white mb-1">
                צוות 32 מומחי הנסיעות שלך — בסנכרון מלא
              </div>
              <div className="text-[11px] text-slate-300">
                כל מומחה מתמקד בהיבט אחד של הטיול — טיסות, לינה, שבת/כשרות, אטרקציות ותקציב — עד ליצירת מסלול מושלם.
              </div>
            </div>
          </div>
        </div>

        {/* Core Agents Section */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs px-3 py-1 rounded-full bg-mint-500/10 text-mint-300 border border-mint-500/20 font-bold uppercase tracking-wider">
              נבחרת המומחים שלך
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white">
              הכירו את ליבת המומחים שמתכננים עבורכם
            </h2>
            <p className="text-xs text-slate-400">
              32 מומחים משלימים שדואגים לכל פרט קטן בטיול כדי שתוכלו לטוס בראש שקט.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {AGENTS_DETAILS.map((agent, idx) => {
              const IconComp = agent.icon;

              return (
                <div
                  key={idx}
                  className="wanderlust-glass-card rounded-3xl p-5 sm:p-8 border border-white/15 space-y-4 hover:border-mint-500/30 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br border ${agent.color} shrink-0`}>
                        <IconComp className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                          {agent.title}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          {agent.role}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {agent.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      תחומי אחריות עיקריים:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-200 border border-white/5"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Traveler Benefits & Promises */}
        <section className="wanderlust-glass rounded-3xl p-5 sm:p-12 border border-white/15 space-y-6 sm:space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              למה מטיילים מישראל בוחרים בנו
            </h3>
            <p className="text-xs text-slate-400">
              כל מה שחשוב לחופשה מושלמת — מתכנון הלו&quot;ז ועד החזרה הביתה.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-right">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
              <Plane className="w-6 h-6 text-mint-400" />
              <div className="font-bold text-sm text-white">מותאם לטיסות מנתב&quot;ג</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                השוואת טיסות ישירות וקונקשנים, תמחור כבודה אמיתי מראש והתחשבות בחגים ושבת.
              </p>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
              <ShieldCheck className="w-6 h-6 text-mint-400" />
              <div className="font-bold text-sm text-white">הגנת ירידת מחיר ל-30 יום</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                הזמנתם ומחיר הטיסה או המלון ירד? תקבלו זיכוי אוטומטי בשקלים לארנק החופשות.
              </p>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
              <CalendarCheck className="w-6 h-6 text-mint-400" />
              <div className="font-bold text-sm text-white">מסלול מאוזן וקל לעדכון</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                שילוב חכם של אטרקציות, מסעדות כשרות, קרבה לחב&quot;ד ויכולת החלפת ימים בלחיצה.
              </p>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
              <Compass className="w-6 h-6 text-mint-400" />
              <div className="font-bold text-sm text-white">גישה מכל מקום וייצוא ליומן</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                כרטיסי עלייה למטוס זמינים גם אופליין, שיתוף לוואטסאפ וסנכרון ליומן גוגל.
              </p>
            </div>
          </div>
        </section>

        {/* CTA to start planning */}
        <section className="text-center space-y-5 pt-2 sm:pt-4">
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white">
            מוכנים לצאת למסע הבא שלכם?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            תנו ל-32 מומחי הנסיעות שלנו לבנות עבורכם חופשה חלומית — הזינו יעד ותקציב ותוך רגעים תקבלו מסלול מלא.
          </p>
          <button
            type="button"
            onClick={() => router.push("/#planner-form")}
            className="btn-mint w-full sm:w-auto px-8 py-4 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xl"
          >
            <span>התחל תכנון טיול עם AI עכשיו</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
