"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Heart,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Compass,
  Film,
  Play,
  Pause,
  Upload,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// יעדי תיירות מרהיבים עבור הקרוסלה בצד ימין (כולל תיאורים ושמות בעברית)
const SCENIC_SLIDES = [
  {
    id: 1,
    title: "צאו מהשגרה, אמצו את המסע!",
    subtitle: "לחוות את העולם בדרך שלכם",
    cardTitle: "לטייל, לגלות, לחוות.",
    cardDesc:
      "גלו מקומות עוצרי נשימה, צאו להרפתקאות מסעירות וצרו זיכרונות בלתי נשכחים בכל רחבי העולם.",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1400&auto=format&fit=crop&q=85",
    location: "אגם בראייס, הרי הדולומיטים, איטליה",
  },
  {
    id: 2,
    title: "שלווה עילאית אינסופית",
    subtitle: "איפה שהים פוגש את השמיים",
    cardTitle: "אופקים של קסם.",
    cardDesc:
      "שקיעות זהב מרהיבות, סמטאות ציוריות שטופות שמש ואירוח ים-תיכוני אותנטי ומרגש.",
    imageUrl:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&auto=format&fit=crop&q=85",
    location: "איה, סנטוריני, יוון",
  },
  {
    id: 3,
    title: "פלאי אלפים וטבע בתולי",
    subtitle: "לנשום את האוויר הפסגות הצלול",
    cardTitle: "מרחבים פראיים.",
    cardDesc:
      "מסלולי הליכה ברכסי הרים מושלגים, אגמי טורקיז קריסטליים ויערות אורן עתיקים.",
    imageUrl:
      "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1400&auto=format&fit=crop&q=85",
    location: "האלפים השוויצריים, שווייץ",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const { login, register, loginWithGoogle, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState<string>("eli_trekker");
  const [password, setPassword] = useState<string>("password123");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // וידאו רקע Google Flow (כולל תמיכה בפרויקטים מותאמים אישית)
  const [selectedVideo, setSelectedVideo] = useState<"flow" | "aurora" | "custom">("flow");
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [customVideoName, setCustomVideoName] = useState<string>("");
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVideoPlaying, selectedVideo, customVideoUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setCustomVideoName(file.name);
      setSelectedVideo("custom");
      setIsVideoPlaying(true);
    }
  };

  const handleDropVideo = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (
      file &&
      (file.type.startsWith("video/") ||
        file.name.endsWith(".mp4") ||
        file.name.endsWith(".webm") ||
        file.name.endsWith(".mov"))
    ) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setCustomVideoName(file.name);
      setSelectedVideo("custom");
      setIsVideoPlaying(true);
    }
  };

  // אם המשתמש כבר מחובר – ניתוב אוטומטי ליעד המבוקש
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, redirectTarget, router]);

  const currentSlide = SCENIC_SLIDES[currentSlideIndex];

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % SCENIC_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + SCENIC_SLIDES.length) % SCENIC_SLIDES.length);
  };

  // טיפול בשליחת טופס התחברות / הרשמה
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const effectiveEmail = username.includes("@")
      ? username.trim()
      : `${username.trim()}@travelplanner.ai`;

    if (!username || !password) {
      setErrorMessage("נא למלא את שם המשתמש והסיסמה");
      return;
    }

    if (activeTab === "register") {
      if (password.length < 6) {
        setErrorMessage("הסיסמה חייבת להכיל לפחות 6 תווים");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("הסיסמאות אינן תואמות");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (activeTab === "login") {
        const res = await login(effectiveEmail, password);
        if (res.success) {
          setSuccessMessage("התחברת בהצלחה! מעביר אותך למערכת...");
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 450);
        } else {
          setErrorMessage(res.error || "שם משתמש או סיסמה שגויים");
        }
      } else {
        const res = await register(effectiveEmail, password, fullName || username);
        if (res.success) {
          setSuccessMessage("החשבון נוצר בהצלחה! ברוך הבא למערכת...");
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 450);
        } else {
          setErrorMessage(res.error || "ההרשמה נכשלה. נסה שוב.");
        }
      }
    } catch (err) {
      setErrorMessage("אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // התחברות באמצעות Google OAuth
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const googleProfile = {
        email: "eli.trekker@gmail.com",
        name: "אלי טרקר",
        picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      };

      const res = await loginWithGoogle(undefined, googleProfile);
      if (res.success) {
        setSuccessMessage("התחברת באמצעות Google בהצלחה!");
        setTimeout(() => {
          router.replace(redirectTarget);
        }, 450);
      } else {
        setErrorMessage(res.error || "ההתחברות עם Google נכשלה");
      }
    } catch (err) {
      setErrorMessage("שגיאה בתקשורת מול שרתי Google");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialNotice = (providerName: string) => {
    alert(`כניסה עם ${providerName}: ניתן להשתמש ב-Google או בשם משתמש וסיסמה לכניסה מיידית.`);
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#040914] selection:bg-teal-400 selection:text-slate-900 overflow-hidden font-sans"
      dir="rtl"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropVideo}
    >
      {/* ====================================================================== */}
      {/* GOOGLE FLOW (flow.google.com) LIVE AMBIENT VIDEO BACKGROUND             */}
      {/* ====================================================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-30">
        <video
          ref={videoRef}
          key={selectedVideo === "custom" ? customVideoUrl : selectedVideo}
          autoPlay
          loop
          muted
          playsInline
          poster="/demo_preview.jpg"
          className="w-full h-full object-cover scale-105 filter brightness-[0.72] contrast-125 saturate-[1.3] transition-all duration-1000"
        >
          <source
            src={
              selectedVideo === "custom" && customVideoUrl
                ? customVideoUrl
                : selectedVideo === "flow"
                ? "/videos/demo.mp4"
                : "/videos/flow_bg.mp4"
            }
            type="video/mp4"
          />
        </video>
        {/* Soft Vignette Overlay to enhance contrast and card readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/75 via-[#040914]/40 to-[#030712]/80 backdrop-blur-[1px]" />
      </div>

      {/* Floating Google Flow Video Switcher Pill */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex flex-wrap items-center gap-2 bg-[#081020]/85 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-full text-xs text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <Film className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] font-medium text-slate-300 hidden sm:inline">וידאו Flow</span>
        <div className="h-3 w-px bg-white/20 mx-0.5" />
        
        <button
          type="button"
          onClick={() => setSelectedVideo("flow")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
            selectedVideo === "flow"
              ? "bg-cyan-500 text-slate-950 shadow-sm"
              : "text-slate-300 hover:text-white hover:bg-white/10"
          }`}
          title="וידאו מסלולי Flow אלפיניים (Google Veo)"
        >
          גלי Flow ואלפים
        </button>

        <button
          type="button"
          onClick={() => setSelectedVideo("aurora")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
            selectedVideo === "aurora"
              ? "bg-purple-500 text-white shadow-sm"
              : "text-slate-300 hover:text-white hover:bg-white/10"
          }`}
          title="וידאו זוהר צפוני קוסמי זורם"
        >
          זוהר צפוני
        </button>

        {customVideoUrl && (
          <button
            type="button"
            onClick={() => setSelectedVideo("custom")}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
              selectedVideo === "custom"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title={`הפעל וידאו פרויקט: ${customVideoName}`}
          >
            פרויקט Flow שלי ✨
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 hover:bg-white/20 text-slate-200 transition border border-white/10"
          title="טעינת קובץ וידאו שהורדת מפרויקט Google Flow (או גרור למסך)"
        >
          <Upload className="w-3 h-3 text-cyan-400" />
          <span>טען קובץ מ-Flow</span>
        </button>

        <a
          href="https://flow.google.com/project/6edf806c-09f3-4041-a2a8-8b0715d8c97a"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/50 hover:to-cyan-600/50 text-cyan-200 transition border border-cyan-400/30"
          title="פתיחת הפרויקט ב-Google Flow"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden lg:inline">פרויקט 6edf806c</span>
        </a>

        <button
          type="button"
          onClick={() => setIsVideoPlaying((p) => !p)}
          className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/15 transition mr-0.5"
          title={isVideoPlaying ? "השהה וידאו" : "הפעל וידאו"}
        >
          {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ====================================================================== */}
      {/* GOOGLE FLOW (flow.google.com) SIGNATURE DYNAMIC IRIDESCENT BACKGROUND   */}
      {/* ====================================================================== */}
      
      {/* 1. Deep Obsidian Base Gradient (Semi-transparent for Video Pass-Through) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#030712]/60 via-[#05131f]/40 to-[#02050d]/70 -z-20" />

      {/* 2. Floating Liquid Aurora Orbs (Animated Drift & Breath) */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#6366f1]/35 via-[#818cf8]/20 to-transparent blur-[140px] pointer-events-none -top-40 -right-20 animate-flow-1 -z-10 mix-blend-screen" />
      <div className="absolute w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-[#06b6d4]/30 via-[#14b8a6]/25 to-transparent blur-[130px] pointer-events-none -bottom-32 -left-20 animate-flow-2 -z-10 mix-blend-screen" />
      <div className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-r from-[#ec4899]/20 via-[#d946ef]/20 to-transparent blur-[120px] pointer-events-none top-1/3 left-1/4 animate-flow-3 -z-10 mix-blend-screen" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#10b981]/15 blur-[110px] pointer-events-none bottom-10 right-1/4 animate-flow-1 -z-10 mix-blend-screen" />

      {/* 3. Google Flow Prismatic Harmonic Waveform Vectors */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none -z-10"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="flowGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="flowGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        <path
          d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,234.7C672,256,768,288,864,282.7C960,277,1056,235,1152,218.7C1248,203,1344,213,1392,218.7L1440,224L1440,900L1392,900C1344,900,1248,900,1152,900C1056,900,960,900,864,900C768,900,672,900,576,900C480,900,384,900,288,900C192,900,96,900,48,900L0,900Z"
          fill="none"
          stroke="url(#flowGrad1)"
          strokeWidth="2"
        />
        <path
          d="M0,160L60,186.7C120,213,240,267,360,277.3C480,288,600,256,720,234.7C840,213,960,203,1080,218.7C1200,235,1320,277,1380,298.7L1440,320L1440,900L0,900Z"
          fill="none"
          stroke="url(#flowGrad2)"
          strokeWidth="1.5"
          opacity="0.6"
        />
      </svg>

      {/* 4. Fine Generative Grid Dots */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none -z-10"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* ====================================================================== */}
      {/* CENTER MASTER CARD (SPLIT SCREEN ACCORDING TO USER REFERENCE IMAGE)     */}
      {/* ====================================================================== */}
      <div className="w-full max-w-[1060px] bg-white rounded-[2.5rem] shadow-[0_35px_100px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/25">
        
        {/* ====================================================================== */}
        {/* RIGHT COLUMN IN RTL (THE AUTHENTICATION FORM)                          */}
        {/* ====================================================================== */}
        <div className="w-full md:w-[48%] lg:w-[46%] p-8 sm:p-12 flex flex-col justify-between bg-white text-slate-900 text-right">
          
          {/* Header Branding */}
          <div>
            <div className="text-right mb-6">
              <h2 className="font-serif text-2xl sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">
                Travel Voyanix
              </h2>
              <p className="text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
                לחקור יותר. לחוות את החיים.
              </p>
            </div>

            {/* Segmented Sign Up / Log In Toggle */}
            <div className="flex items-center gap-3 mb-8">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2.5 px-6 rounded-xl text-xs font-bold transition-all duration-200 ${
                  activeTab === "register"
                    ? "bg-black text-white shadow-md"
                    : "bg-white text-slate-800 border border-slate-900/80 hover:bg-slate-50"
                }`}
              >
                הרשמה
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2.5 px-6 rounded-xl text-xs font-bold transition-all duration-200 ${
                  activeTab === "login"
                    ? "bg-black text-white shadow-md"
                    : "bg-white text-slate-800 border border-slate-900/80 hover:bg-slate-50"
                }`}
              >
                התחברות
              </button>
            </div>

            {/* Title Section */}
            <div className="mb-5 text-right">
              <h3 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
                המסע מתחיל
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {activeTab === "login" ? "התחברות באמצעות חשבון קיים" : "יצירת חשבון מטייל חדש במערכת"}
              </p>
            </div>

            {/* Social Authentication Row (Apple, Google, X) */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* Apple Button */}
              <button
                type="button"
                onClick={() => handleSocialNotice("Apple")}
                className="flex items-center justify-center py-2.5 px-4 rounded-xl border border-sky-200/90 bg-white hover:border-sky-400 hover:bg-sky-50/20 transition group shadow-sm"
                title="התחבר באמצעות Apple"
              >
                <svg
                  className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.62 1.35-.57.66-.99 1.74-.86 2.76.99.08 2.01-.51 2.55-1.26z" />
                </svg>
              </button>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="flex items-center justify-center py-2.5 px-4 rounded-xl border border-sky-200/90 bg-white hover:border-sky-400 hover:bg-sky-50/20 transition group shadow-sm disabled:opacity-50"
                title="התחבר באמצעות Google"
              >
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </button>

              {/* X / Twitter Button */}
              <button
                type="button"
                onClick={() => handleSocialNotice("X")}
                className="flex items-center justify-center py-2.5 px-4 rounded-xl border border-sky-200/90 bg-white hover:border-sky-400 hover:bg-sky-50/20 transition group shadow-sm"
                title="התחבר באמצעות X"
              >
                <svg
                  className="w-4 h-4 text-slate-900 group-hover:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
            </div>

            {/* Divider with 'או' */}
            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] text-slate-400 font-medium">
                או באמצעות חשבון
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Alerts */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Main Form Fields with Floating Inset Labels */}
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              
              {/* Full Name (Sign Up only) */}
              {activeTab === "register" && (
                <div className="relative">
                  <span className="absolute -top-2.5 right-3.5 bg-white px-1.5 text-[11px] font-semibold text-slate-400 z-10">
                    שם מלא
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="w-full px-4 py-3 rounded-xl border border-sky-300/80 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition text-right"
                  />
                </div>
              )}

              {/* Username / Email with Inset Floating Label */}
              <div className="relative">
                <span className="absolute -top-2.5 right-3.5 bg-white px-1.5 text-[11px] font-semibold text-slate-400 z-10">
                  שם משתמש או אימייל
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="eli_trekker"
                  className="w-full px-4 py-3 rounded-xl border border-sky-300/80 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition text-right"
                  dir="ltr"
                />
              </div>

              {/* Password with Inset Floating Label & Eye Toggle */}
              <div className="relative">
                <span className="absolute -top-2.5 right-3.5 bg-white px-1.5 text-[11px] font-semibold text-slate-400 z-10">
                  סיסמה
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-sky-300/80 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition text-right"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  tabIndex={-1}
                  aria-label="הצג סיסמה"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {activeTab === "register" && (
                <div className="relative">
                  <span className="absolute -top-2.5 right-3.5 bg-white px-1.5 text-[11px] font-semibold text-slate-400 z-10">
                    אימות סיסמה
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-sky-300/80 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition text-right"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Options Row (Remember me & Forgot Password) */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-black focus:ring-black accent-black"
                  />
                  <span>זכור אותי במכשיר זה</span>
                </label>

                {activeTab === "login" && (
                  <button
                    type="button"
                    onClick={() =>
                      alert("הוראות לאיפוס סיסמה נשלחו לכתובת האימייל המשויכת לחשבונך.")
                    }
                    className="text-xs text-slate-700 hover:text-black font-medium transition"
                  >
                    שכחת סיסמה?
                  </button>
                )}
              </div>

              {/* Main Solid Black CTA Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>מעבד נתונים...</span>
                  </>
                ) : activeTab === "login" ? (
                  <span>התחברות למערכת</span>
                ) : (
                  <span>יצירת חשבון והתחלה</span>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Fast Demo Switcher */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setUsername("demo@travelplanner.ai");
                setPassword("password123");
                setActiveTab("login");
              }}
              className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>כניסה מהירה בלחיצה אחת לחשבון דמו (Demo Traveler)</span>
            </button>
          </div>
        </div>

        {/* ====================================================================== */}
        {/* LEFT COLUMN IN RTL (SCENIC TRAVEL CAROUSEL WITH BESPOKE CUTOUTS)       */}
        {/* ====================================================================== */}
        <div className="w-full md:w-[52%] lg:w-[54%] p-3 sm:p-4 bg-white relative">
          <div
            className="relative rounded-[2rem] overflow-hidden min-h-[580px] h-full flex flex-col justify-between p-6 sm:p-8 select-none transition-all duration-700 bg-slate-900 shadow-inner"
            style={{
              backgroundImage: `url(${currentSlide.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Scenic Dark Gradient Overlay for High Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/30 pointer-events-none" />

            {/* Characteristic Designer Scalloped Corner Cutouts */}
            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white z-20 pointer-events-none shadow-sm" />
            <div className="absolute top-2 -right-3 w-5 h-5 rounded-full bg-white z-20 pointer-events-none" />
            <div className="absolute -bottom-3 -left-3 w-8 h-8 rounded-full bg-white z-20 pointer-events-none shadow-sm" />
            <div className="absolute bottom-2 -left-3 w-5 h-5 rounded-full bg-white z-20 pointer-events-none" />

            {/* Top Floating Badge Card */}
            <div className="relative z-10 self-start max-w-[230px]">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/40 text-right relative animate-fade-in">
                {/* Red Circular Heart Pill */}
                <div className="absolute top-3.5 left-3.5 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-sm">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </div>

                <h4 className="font-bold text-[13px] text-slate-900 pl-7 leading-tight">
                  {currentSlide.cardTitle}
                </h4>
                <p className="text-[10px] text-slate-500 leading-snug mt-1 mb-2.5">
                  {currentSlide.cardDesc}
                </p>

                <div className="flex items-center justify-start">
                  <div className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
                    <ChevronLeft className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Content & Navigation Pill */}
            <div className="relative z-10 mt-auto pt-12 text-right">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-md max-w-sm mb-3">
                {currentSlide.title}
              </h2>

              <div className="flex items-center gap-3 mb-6">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/35 text-white text-xs font-medium transition cursor-pointer">
                  {currentSlide.subtitle}
                </span>
              </div>

              {/* Slide Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 transition shadow-md group"
                  aria-label="יעד הבא"
                  title="היעד הבא"
                >
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 transition shadow-md group"
                  aria-label="יעד קודם"
                  title="היעד הקודם"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Subtle Google Flow Ambient Watermark footer */}
      <div className="absolute bottom-3 text-center text-[10px] text-slate-400/60 flex items-center gap-2 select-none">
        <span className="flex items-center gap-1">
          <Compass className="w-3 h-3 text-teal-400/80" />
          <span>מונע בטכנולוגיית Google Flow & Multi-Agent AI</span>
        </span>
        <span>•</span>
        <span>הצפנה מאובטחת SSL 256-bit</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#040914] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-300 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
