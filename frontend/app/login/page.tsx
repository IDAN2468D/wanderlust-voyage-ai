"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mountain,
  Heart,
  Eye,
  EyeOff,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Compass,
  Mail,
  Lock,
  User as UserIcon,
  Home,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// יעדי תיירות מרהיבים עבור הקרוסלה בצד ימין (כולל תיאורים ושמות בעברית)
const SCENIC_SLIDES = [
  {
    id: 1,
    title: "צאו מהשגרה, אמצו את המסע!",
    subtitle: "תכנון מסלול אלפיני אוטונומי",
    cardTitle: "לטייל, לגלות, לחוות.",
    cardDesc:
      "גלו מקומות עוצרי נשימה, צאו להרפתקאות מסעירות וצרו זיכרונות בלתי נשכחים בכל רחבי העולם.",
    imageUrl: "/demo_preview.jpg",
    location: "פסגות האלפים המושלגות",
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
    subtitle: "לנשום את אוויר הפסגות הצלול",
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

  const { login, register, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotSubmitted, setForgotSubmitted] = useState<boolean>(false);

  // וידאו רקע Google Flow
  const videoRef = useRef<HTMLVideoElement>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [customVideoUrl]);

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
    }
  };

  // בדיקת שגיאות שהוחזרו מה-Callback של Google OAuth
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const messageParam = searchParams.get("message");
    if (errorParam) {
      if (errorParam === "google_access_denied") {
        setErrorMessage("ההתחברות באמצעות Google בוטלה על ידי המשתמש.");
      } else {
        setErrorMessage(
          messageParam ? decodeURIComponent(messageParam) : "אימות חשבון Google נכשל. אנא נסה שוב."
        );
      }
    }
  }, [searchParams]);

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

  // התחברות ישירה ומאומתת באמצעות Google OAuth הרשמי
  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    const clientId =
      (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.trim()) ||
      "239218305388-1uebns92vqun03dg2k60toe2iatukuqm.apps.googleusercontent.com";

    const rawOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const origin = (!rawOrigin || rawOrigin.includes("0.0.0.0"))
      ? "http://localhost:3000"
      : rawOrigin;

    const callbackUrl = `${origin}/api/auth/callback/google`;
    const state = encodeURIComponent(redirectTarget);

    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      callbackUrl
    )}&response_type=code&scope=openid%20email%20profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&access_type=offline&prompt=select_account&state=${state}`;

    window.location.href = googleOAuthUrl;
  };

  // טיפול בשליחת טופס התחברות / הרשמה
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("נא למלא כתובת אימייל וסיסמה");
      return;
    }

    if (activeTab === "register") {
      if (!fullName.trim()) {
        setErrorMessage("נא להזין שם מלא");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("הסיסמה חייבת להכיל לפחות 6 תווים");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("הסיסמאות אינן תואמות");
        return;
      }
      if (!termsAccepted) {
        setErrorMessage("יש לאשר את תנאי השימוש ומדיניות הפרטיות להמשך");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const effectiveEmail = trimmedEmail.includes("@")
        ? trimmedEmail.toLowerCase()
        : `${trimmedEmail.toLowerCase()}@travelplanner.ai`;

      if (activeTab === "login") {
        const res = await login(effectiveEmail, password);
        if (res.success) {
          setSuccessMessage("התחברת בהצלחה! מעביר אותך למערכת...");
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 350);
        } else {
          setErrorMessage(res.error || "כתובת אימייל או סיסמה שגויים");
        }
      } else {
        const res = await register(effectiveEmail, password, fullName.trim());
        if (res.success) {
          setSuccessMessage("החשבון נוצר בהצלחה! ברוך הבא ל-Wanderlust...");
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 350);
        } else {
          setErrorMessage(res.error || "שגיאה ביצירת החשבון במערכת");
        }
      }
    } catch (err) {
      setErrorMessage("שגיאת תקשורת בלתי צפויה מול השרת. אנא נסה שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes("@")) {
      alert("נא להזין כתובת אימייל תקינה");
      return;
    }
    setForgotSubmitted(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSubmitted(false);
      setSuccessMessage(`קישור לאיפוס סיסמה נשלח אל ${forgotEmail}`);
    }, 1500);
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 selection:bg-teal-400 selection:text-slate-900 overflow-hidden font-sans"
      dir="rtl"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropVideo}
    >
      {/* ====================================================================== */}
      {/* AMBIENT BACKGROUND & AURORA GLOWS                                      */}
      {/* ====================================================================== */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/demo_preview.jpg')" }}
      >
        <video
          ref={videoRef}
          key={customVideoUrl || "flow-ambient"}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/demo_preview.jpg"
          className="w-full h-full object-cover"
        >
          <source src={customVideoUrl || "/videos/demo.mp4"} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a10]/80 via-[#070c14]/40 to-[#070c14]/60 pointer-events-none" />
      </div>

      {/* Luminous Atmospheric Glows */}
      <div className="absolute w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-teal-500/20 via-cyan-400/15 to-transparent blur-[140px] pointer-events-none -top-36 -right-20 z-0 mix-blend-screen" />
      <div className="absolute w-[620px] h-[620px] rounded-full bg-gradient-to-bl from-indigo-500/20 via-emerald-500/15 to-transparent blur-[130px] pointer-events-none -bottom-36 -left-20 z-0 mix-blend-screen" />

      {/* Top Floating Navigation: Back to Home */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-8 z-20">
        <a
          href="/"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-slate-200 hover:text-white border border-white/15 backdrop-blur-md transition shadow-lg text-xs font-medium group"
        >
          <Home className="w-3.5 h-3.5 text-mint-400 group-hover:scale-110 transition-transform" />
          <span>חזרה לדף הבית</span>
        </a>
      </div>

      {/* ====================================================================== */}
      {/* CENTER MASTER CARD (SPLIT-SCREEN LUXURY LIQUID GLASS)                  */}
      {/* ====================================================================== */}
      <div className="w-full max-w-[1060px] bg-white rounded-[2.5rem] shadow-[0_35px_100px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/30 backdrop-blur-xl">
        
        {/* ====================================================================== */}
        {/* RIGHT COLUMN IN RTL (AUTHENTICATION FORM)                              */}
        {/* ====================================================================== */}
        <div className="w-full md:w-[48%] lg:w-[46%] p-8 sm:p-11 flex flex-col justify-between bg-white text-slate-900 text-right">
          
          <div>
            {/* Original Brand Header: Wanderlust Voyage AI */}
            <div className="text-right mb-6">
              <a href="/" className="inline-flex items-center gap-2.5 group mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md group-hover:scale-105 transition-transform">
                  <Mountain className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-heading font-black text-xl tracking-[0.16em] text-slate-900 block leading-tight">
                    WANDERLUST <span className="text-teal-600 text-xs font-bold px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200">AI</span>
                  </span>
                  <span className="text-[9px] tracking-[0.22em] text-slate-400 font-semibold block">
                    VOYAGE & TRAVEL PLANNER
                  </span>
                </div>
              </a>
              <p className="text-xs text-slate-500 font-normal mt-1">
                הפלטפורמה האוטונומית המובילה לתכנון מסעות חכמים.
              </p>
            </div>

            {/* Segmented Sign Up / Log In Toggle */}
            <div className="flex items-center gap-2 mb-6 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
                  activeTab === "login"
                    ? "bg-slate-950 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                התחברות
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
                  activeTab === "register"
                    ? "bg-slate-950 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                הרשמה
              </button>
            </div>

            {/* Title Section */}
            <div className="mb-5 text-right">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{activeTab === "login" ? "ברוכים השבים" : "הצטרפות ל-Wanderlust"}</span>
                <Sparkles className="w-5 h-5 text-teal-500" />
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {activeTab === "login"
                  ? "התחבר לחשבונך כדי לגשת לכל המסלולים והטיסות השמורים"
                  : "צור חשבון חדש תוך שניות וצא למסע הבא שלך"}
              </p>
            </div>

            {/* Primary Google Sign-In Button */}
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSubmitting}
                className="w-full py-3 px-4 rounded-2xl border border-slate-300 hover:border-teal-500 bg-white hover:bg-slate-50/80 text-slate-800 text-xs font-bold transition shadow-sm hover:shadow-md flex items-center justify-center gap-3 disabled:opacity-50 group cursor-pointer"
                title="התחבר באופן מיידי ומאובטח באמצעות חשבון Google"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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
                )}
                <span>
                  {activeTab === "login"
                    ? "המשך עם חשבון Google"
                    : "הרשמה מהירה עם Google"}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-5 select-none">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <div className="absolute px-3 py-0.5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <span>או באמצעות אימייל וסיסמה</span>
              </div>
            </div>

            {/* Error / Success Alerts */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="flex-1">{successMessage}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-right">
              
              {/* Full Name (Registration only) */}
              {activeTab === "register" && (
                <div className="relative">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    שם מלא
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="ישראל ישראלי"
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition text-right bg-slate-50/50 focus:bg-white"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  כתובת אימייל
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition text-right bg-slate-50/50 focus:bg-white"
                    dir="ltr"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  סיסמה
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition text-right bg-slate-50/50 focus:bg-white"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                    tabIndex={-1}
                    aria-label="הצג או הסתר סיסמה"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Registration only) */}
              {activeTab === "register" && (
                <div className="relative">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    אימות סיסמה
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition text-right bg-slate-50/50 focus:bg-white"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                      tabIndex={-1}
                      aria-label="הצג או הסתר סיסמה"
                    >
                      {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Options Row (Remember Me & Forgot Password / Terms) */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                {activeTab === "login" ? (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600"
                      />
                      <span>זכור אותי במכשיר זה</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-teal-700 hover:text-teal-900 font-semibold transition cursor-pointer"
                    >
                      שכחת סיסמה?
                    </button>
                  </>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600"
                    />
                    <span className="text-[11px]">
                      קראתי ואני מאשר/ת את תנאי השימוש ומדיניות הפרטיות
                    </span>
                  </label>
                )}
              </div>

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isGoogleLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 mt-3 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span>מעבד נתונים...</span>
                  </>
                ) : activeTab === "login" ? (
                  <>
                    <span>התחברות למערכת</span>
                    <ArrowLeft className="w-4 h-4 text-teal-400" />
                  </>
                ) : (
                  <>
                    <span>יצירת חשבון והתחלת מסע</span>
                    <Sparkles className="w-4 h-4 text-teal-400" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Clean Security Badge Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>התחברות מאובטחת תחת תקן SSL & TLS 256-bit</span>
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
            {/* Scenic Dark Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-black/20 to-black/35 pointer-events-none" />

            {/* Characteristic Designer Scalloped Corner Cutouts */}
            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white z-20 pointer-events-none shadow-sm" />
            <div className="absolute top-2 -right-3 w-5 h-5 rounded-full bg-white z-20 pointer-events-none" />
            <div className="absolute -bottom-3 -left-3 w-8 h-8 rounded-full bg-white z-20 pointer-events-none shadow-sm" />
            <div className="absolute bottom-2 -left-3 w-5 h-5 rounded-full bg-white z-20 pointer-events-none" />

            {/* Top Floating Badge Card */}
            <div className="relative z-10 self-start max-w-[240px]">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/40 text-right relative animate-fade-in">
                <div className="absolute top-3.5 left-3.5 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-sm">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </div>

                <h4 className="font-bold text-[13px] text-slate-900 pl-7 leading-tight">
                  {currentSlide.cardTitle}
                </h4>
                <p className="text-[10px] text-slate-500 leading-snug mt-1 mb-2.5">
                  {currentSlide.cardDesc}
                </p>

                <div className="flex items-center justify-start text-[10px] font-semibold text-teal-700 gap-1">
                  <Compass className="w-3 h-3 text-teal-600" />
                  <span>{currentSlide.location}</span>
                </div>
              </div>
            </div>

            {/* Bottom Content & Navigation */}
            <div className="relative z-10 mt-auto pt-12 text-right">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-md max-w-sm mb-3">
                {currentSlide.title}
              </h2>

              <div className="flex items-center gap-2 mb-6">
                <span className="inline-block px-3.5 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/35 text-white text-xs font-medium transition">
                  {currentSlide.subtitle}
                </span>
                <span className="text-white/60 text-xs">•</span>
                <span className="text-white/80 text-xs font-light">{currentSlide.location}</span>
              </div>

              {/* Slide Navigation & Dots */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {SCENIC_SLIDES.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentSlideIndex
                          ? "w-7 bg-mint-400"
                          : "w-2 bg-white/40 hover:bg-white/70"
                      }`}
                      aria-label={`עבור לשקופית ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 transition shadow-md group cursor-pointer"
                    aria-label="יעד הבא"
                    title="היעד הבא"
                  >
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 transition shadow-md group cursor-pointer"
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

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-white/20 text-right">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-base">איפוס סיסמה</h4>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              הזן את כתובת האימייל שאיתה נרשמת ל-Wanderlust ונשלח אליך קישור מאובטח לאיפוס סיסמתך.
            </p>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-right"
                dir="ltr"
              />
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={forgotSubmitted}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition"
                >
                  {forgotSubmitted ? "שולח קישור..." : "שלח קישור לאיפוס"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subtle Bottom Ambient Watermark */}
      <div className="absolute bottom-3 text-center text-[10px] text-slate-400/70 flex items-center gap-2 select-none">
        <span className="flex items-center gap-1">
          <Compass className="w-3 h-3 text-teal-400/80" />
          <span>מונע בטכנולוגיית Google Flow & Multi-Agent AI</span>
        </span>
        <span>•</span>
        <span>Wanderlust Voyage AI © 2026</span>
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
