"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  BookOpen,
  Clock,
  User,
  ArrowLeft,
  Sparkles,
  Tag,
  Search,
} from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  author: string;
  readTime: string;
  date: string;
  destinationTarget: string;
  tags: string[];
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: "santorini-secrets",
    title: "מדריך סנטוריני 2026: המקומות הסודיים שרוב התיירים מפספסים",
    excerpt: "מעבר לכיפות הכחולות של אויה: כפרים ציוריים ללא עומס מבקרים, טברנות משפחתיות אותנטיות ושבילי הליכה המשקיפים ללוע הר הגעש.",
    category: "יעדים סודיים",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop",
    author: "צוות אדריכלי המסלול",
    readTime: "5 דק' קריאה",
    date: "ספטמבר 2026",
    destinationTarget: "סנטוריני, יוון",
    tags: ["יוון", "שקיעות", "רומנטיקה", "סודות מקומיים"],
  },
  {
    id: "bali-luxury-budget",
    title: "איך לחוות יוקרה עוצרת נשימה בבאלי מבלי לחרוג מהתקציב?",
    excerpt: "סוכן התקציב שלנו חושף: וילות פרטיות עם בריכות אינפיניטי בג'ונגל, שפים פרטיים וטיפולי ספא יומיים במחיר של מלון פשוט באירופה.",
    category: "טיפים וחיסכון",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
    author: "מבקר התקציב הפיננסי",
    readTime: "7 דק' קריאה",
    date: "אוגוסט 2026",
    destinationTarget: "באלי, אינדונזיה",
    tags: ["באלי", "וילות פרטיות", "חיסכון חכם", "ספא"],
  },
  {
    id: "swiss-trains-guide",
    title: "האלפים השוויצריים: מדריך לרכבות הנוף הפנורמיות היפות בתבל",
    excerpt: "מסע ברכבת 'גליישר אקספרס' מצרמט לסנט מוריץ, חלונות תקרה פנורמיים ומעבר מעל 291 גשרים בלב הפסגות המושלגות.",
    category: "מסלולים",
    image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop",
    author: "מומחה הטיסות והתחבורה",
    readTime: "6 דק' קריאה",
    date: "יולי 2026",
    destinationTarget: "האלפים השוויצריים, שוויץ",
    tags: ["שוויץ", "רכבות נוף", "טבע", "אלפים"],
  },
  {
    id: "maldives-off-season",
    title: "האיים המלדיביים בעונות מעבר: איך לחסוך עד 40% על וילות מים?",
    excerpt: "מתי כדאי להזמין, איך להתנהל מול מזג האוויר הטרופי ומדוע עונות המעבר הן הסוד השמור ביותר של צוללנים וחובבי שקט.",
    category: "טיפים וחיסכון",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1200&auto=format&fit=crop",
    author: "סוכן המלונות והתעופה",
    readTime: "4 דק' קריאה",
    date: "יוני 2026",
    destinationTarget: "האיים המלדיביים",
    tags: ["המלדיביים", "וילות מים", "עונות מעבר", "צלילה"],
  },
];

export default function BlogPage() {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesTag = selectedTag === "all" || post.tags.includes(selectedTag);
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTag && matchesSearch;
  });

  const handlePlanForArticle = (dest: string) => {
    router.push(`/?destination=${encodeURIComponent(dest)}#planner-form`);
  };

  return (
    <div className="min-h-screen bg-[#070c12] text-white selection:bg-mint-400 selection:text-slate-950 font-sans" dir="rtl">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative py-20 px-6 sm:px-12 lg:px-16 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0 opacity-20">
          <Image
            src="/images/hero-bg.jpg"
            alt="Blog Background"
            fill
            unoptimized
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070c12]/85 via-[#070c12] to-[#070c12]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-[0.2em] bg-mint-500/10 px-4 py-1.5 rounded-full border border-mint-500/20">
            <BookOpen className="w-4 h-4" />
            <span>מגזין המטיילים של Wanderlust</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            סיפורים, טיפים והשראה מהעולם
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            מאמרים מעמיקים, המלצות סודיות ותובנות ייחודיות מתוך מיליוני נתוני טיסות, מלונות ומסלולים שנותחו על ידי סוכני ה-AI שלנו.
          </p>

          {/* Search bar inside header */}
          <div className="max-w-xl mx-auto pt-4">
            <div className="wanderlust-glass rounded-2xl p-2 flex items-center gap-3 border border-white/15">
              <Search className="w-4 h-4 text-mint-400 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש כתבות לפי מילות מפתח, יעד או נושא..."
                className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder-slate-400 focus:outline-none text-right"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-14 space-y-12">
        {/* Tag Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {["all", "יוון", "באלי", "שוויץ", "המלדיביים", "חיסכון חכם", "שקיעות"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTag(t)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                selectedTag === t
                  ? "btn-mint shadow-md"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              }`}
            >
              {t === "all" ? "כל הנושאים" : `#${t}`}
            </button>
          ))}
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="wanderlust-glass-card rounded-3xl overflow-hidden border border-white/15 hover:border-mint-500/30 transition-all flex flex-col justify-between group"
            >
              {/* Cover Image */}
              <div className="relative h-64 w-full overflow-hidden">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070c12] via-black/20 to-transparent" />

                {/* Category Badge */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-xs font-bold text-mint-400">
                  {post.category}
                </div>

                {/* Date & Read time */}
                <div className="absolute bottom-4 right-4 flex items-center gap-3 text-xs text-slate-200 bg-black/60 px-3 py-1 rounded-lg backdrop-blur-md">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-mint-400" />
                    {post.readTime}
                  </span>
                  <span>·</span>
                  <span>{post.date}</span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-8 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <User className="w-3.5 h-3.5 text-mint-400" />
                    <span>{post.author}</span>
                  </div>

                  <h2 className="font-serif text-2xl font-bold text-white group-hover:text-mint-300 transition-colors leading-snug">
                    {post.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {post.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {post.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/5"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Plan Trip based on this article button */}
                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handlePlanForArticle(post.destinationTarget)}
                    className="btn-mint px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 group/btn"
                  >
                    <span>תכנן מסלול ליעד זה עם AI</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover/btn:-translate-x-1 transition-transform" />
                  </button>

                  <span className="text-xs text-slate-400 font-medium cursor-pointer hover:text-white transition">
                    קרא את המאמר המלא ◂
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
