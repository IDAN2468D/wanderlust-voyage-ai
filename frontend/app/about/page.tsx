"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Compass,
  Cpu,
  Bot,
  Plane,
  ShieldCheck,
  Zap,
  Lock,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const AGENTS_DETAILS = [
  {
    role: "Travel Orchestrator Lead",
    title: "מנהל המשלחת ומתאם המערכת",
    icon: Compass,
    color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    desc: "המוח המרכזי של המערכת. מנתח את רצונות המטייל, מפרק את המשימה לתתי-יעדים ומנהל את סנכרון העבודה בין כל יתר הסוכנים עד לקבלת תוכנית מושלמת.",
    skills: ["ניתוח פרופיל מטייל", "ניהול תלויות ולוחות זמנים", "סינתזת דוח סופי מקיף"],
  },
  {
    role: "Flight & Accommodation Specialist",
    title: "מומחה טיסות ומלונות",
    icon: Plane,
    color: "from-mint-500/20 to-emerald-500/20 text-mint-400 border-mint-500/30",
    desc: "סורק נתיבי טיסה, מוצא טיסות ישירות ומחברות תעופה אמינות. מאתר מלונות בוטיק וריזורטים במיקומים מרכזיים עם חוות דעת מובילות.",
    skills: ["איתור טיסות ישירות ומשתלמות", "סינון מלונות לפי ביקורות ומיקום", "בדיקת זמינות וטווח מחירים"],
  },
  {
    role: "Itinerary Specialist",
    title: "אדריכל המסלול והחוויות",
    icon: CalendarCheck,
    color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    desc: "בונה מסלול יום-אחר-יום עם היגיון גיאוגרפי (Geo-clustering) כדי לחסוך זמני נסיעה מיותרים, ומשלב אטרקציות ייחודיות, מסעדות מקומיות וזמני מנוחה.",
    skills: ["אופטימיזציה גיאוגרפית של מסלולים", "התאמה לתחומי עניין אישיים", "שילוב מסעדות ואטרקציות מומלצות"],
  },
  {
    role: "Budget Auditor",
    title: "מבקר התקציב הפיננסי",
    icon: ShieldCheck,
    color: "from-rose-500/20 to-purple-500/20 text-rose-400 border-rose-500/30",
    desc: "מבצע בקרה מתמטית בלתי מתפשרת של כל סעיף עלות (טיסות, לינה, אוכל, תחבורה ופעילויות) ומוודא עמידה קפדנית במסגרת התקציב שהוגדרה מראש.",
    skills: ["ביקורת עלויות מתמטית", "מניעת חריגות תקציב", "הקצאת יתרות ביטחון למטייל"],
  },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#070c12] text-white selection:bg-mint-400 selection:text-slate-950 font-sans" dir="rtl">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative py-20 px-6 sm:px-12 lg:px-16 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0 opacity-20">
          <Image
            src="/images/hero-bg.jpg"
            alt="About Background"
            fill
            unoptimized
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070c12]/85 via-[#070c12] to-[#070c12]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-[0.2em] bg-mint-500/10 px-4 py-1.5 rounded-full border border-mint-500/20">
            <Cpu className="w-4 h-4" />
            <span>המהפכה של עולם התיירות</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            אודות Wanderlust VoyageAI
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            אנחנו מחליפים עשרות שעות של חיפושים מתישים, השוואות מחירים ועשרות לשוניות דפדפן פתוחות — בצוות סוכני AI אוטונומיים שמתכננים את החופשה הבאה שלך תוך שניות.
          </p>
        </div>
      </section>

      {/* Story & Vision */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-16 space-y-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>החזון שלנו</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
              תכנון טיולים כבר לא צריך להיות עבודה במשרה מלאה.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              לפני Wanderlust, תכנון חופשה מורכבת דרש ימים של חיפוש טיסות, קריאת מאות ביקורות על מלונות, חישובי תקציב מייגעים באקסל וניסיונות להרכיב לו&quot;ז שלא יתיש אותך בנסיעות.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              הקמנו את Wanderlust במטרה להעמיד לרשות כל מטייל <strong>חמ&quot;ל תיירותי אוטונומי</strong>. ארבעה סוכני AI מתמחים, המופעלים על ידי מודלי השפה המתקדמים בעולם, שמשתפים פעולה בזמן אמת כדי להרכיב עבורך מסע מדויק, מרגש ובטוח כלכלית.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-mint-400" /> שקיפות מלאה בזמן אמת
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-mint-400" /> אפס עמלות תיווך נסתרות
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-mint-400" /> עמידה קפדנית בתקציב
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 relative h-96 rounded-3xl overflow-hidden border border-white/15 shadow-2xl">
            <Image
              src="https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop"
              alt="Our vision"
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070c12] via-transparent to-transparent" />
            <div className="absolute bottom-6 right-6 left-6 wanderlust-glass p-4 rounded-2xl border border-white/15">
              <div className="text-xs font-bold text-white mb-1">
                ארכיטקטורה רב-סוכנית אוטונומית (Multi-Agent System)
              </div>
              <div className="text-[11px] text-slate-300">
                כל סוכן פועל בצורה ממוקדת עם פרומפט ייעודי, כלים חיצוניים ופונקציית בקרה עצמאית.
              </div>
            </div>
          </div>
        </div>

        {/* The 4 Agents Section */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs px-3 py-1 rounded-full bg-mint-500/10 text-mint-300 border border-mint-500/20 font-bold uppercase tracking-wider">
              הצוות הדיגיטלי שלך
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              הכירו את 4 סוכני ה-AI שפועלים עבורכם
            </h2>
            <p className="text-xs text-slate-400">
              כל סוכן מומחה בתחומו ומבצע אינטראקציה הדדית עם יתר הסוכנים כדי להבטיח תוכנית נטולת פשרות.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {AGENTS_DETAILS.map((agent, idx) => {
              const IconComp = agent.icon;

              return (
                <div
                  key={idx}
                  className="wanderlust-glass-card rounded-3xl p-6 sm:p-8 border border-white/15 space-y-4 hover:border-mint-500/30 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br border ${agent.color}`}>
                        <IconComp className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-bold text-white">
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

        {/* Technology Stack & Architecture */}
        <section className="wanderlust-glass rounded-3xl p-8 sm:p-12 border border-white/15 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              הטכנולוגיה שמתחת למכסה המנוע
            </h3>
            <p className="text-xs text-slate-400">
              מערכת Enterprise הבנויה בסטנדרטים הגבוהים ביותר של ביצועים ואמינות.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
              <Bot className="w-6 h-6 text-mint-400" />
              <div className="font-bold text-sm text-white">Agno Multi-Agent</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ארכיטקטורת תיאום סוכנים אוטונומיים בעלי תפקידים, כלים וזיכרון משותף.
              </p>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
              <Zap className="w-6 h-6 text-mint-400" />
              <div className="font-bold text-sm text-white">Google Gemini 2.0</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                מודלי שפה סופר-מהירים עם הבנת הקשר רחבה ומענה יצירתי ומדויק בעברית.
              </p>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
              <Lock className="w-6 h-6 text-mint-400" />
              <div className="font-bold text-sm text-white">PostgreSQL & Asyncpg</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                מסד נתונים מאובטח לשמירת היסטוריית מסלולים, סשנים וקריאות לכלים.
              </p>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-2">
              <Cpu className="w-6 h-6 text-mint-400" />
              <div className="font-bold text-sm text-white">Next.js 15 & SSE</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                הזרמת תוצאות בזמן אמת באמצעות Server-Sent Events לחוויית משתמש חלקה.
              </p>
            </div>
          </div>
        </section>

        {/* CTA to start planning */}
        <section className="text-center space-y-6 pt-4">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
            מוכנים לצאת למסע הבא שלכם?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            תנו לסוכני ה-AI שלנו לעבוד בשבילכם כבר עכשיו. הזינו את יעד החלומות שלכם וצפו בקסם מתרחש בזמן אמת.
          </p>
          <button
            type="button"
            onClick={() => router.push("/#planner-form")}
            className="btn-mint px-8 py-4 rounded-full text-xs font-bold inline-flex items-center gap-2 shadow-2xl"
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
