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
  KeyRound,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// יעדי תיירות מרהיבים עבור הקרוסלה בצד ימין (כולל תיאורים ושמות בעברית)
const SCENIC_SLIDES = [
  {
    id: 1,
    title: "צאו מהשגרה, אמצו את המסע!",
    subtitle: "AI Travel Planner over Alps (Google Flow)",
    cardTitle: "לטייל, לגלות, לחוות.",
    cardDesc:
      "גלו מקומות עוצרי נשימה, צאו להרפתקאות מסעירות וצרו זיכרונות בלתי נשכחים בכל רחבי העולם.",
    imageUrl:
      "/demo_preview.jpg",
    location: "פסגות האלפים המושלגות (Google Flow & Veo)",
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
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

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

  // התחברות באמצעות Google OAuth 2.0 (מבוסס מפתחות המערכת)
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      // 1. בדיקה מול השרת האם GOOGLE_CLIENT_ID מוגדר וקבלת URL מוכן
      let authUrl: string | null = null;
      try {
        const callbackUrl = `${window.location.origin}/api/auth/callback/google`;
        const res = await fetch(
          `${apiBase}/api/auth/google/url?redirect_uri=${encodeURIComponent(callbackUrl)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.configured && data.url) {
            authUrl = data.url;
          }
        }
      } catch (err) {
        console.warn("Could not query backend for Google OAuth URL:", err);
      }

      // 2. אם השרת לא החזיר URL אך קיים NEXT_PUBLIC_GOOGLE_CLIENT_ID בקליינט
      if (!authUrl && envClientId && envClientId.trim() !== "") {
        const callbackUrl = `${window.location.origin}/api/auth/callback/google`;
        const state = encodeURIComponent(redirectTarget);
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          envClientId.trim()
        )}&redirect_uri=${encodeURIComponent(
          callbackUrl
        )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account&state=${state}`;
      }

      // 3. אם יש URL תקף – הפניה מיידית למסך ההסכמה הרשמי של Google
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }

      // 4. אם המפתחות ריקים – פתיחת מודאל הדרכה וסטטוס מפתחות עם אפשרות כניסת דמו
      setShowConfigModal(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrorMessage("שגיאה באתחול תהליך ההתחברות מול Google");
      setIsSubmitting(false);
    }
  };

  // כניסה מהירה במצב דמו עבור בדיקות
  const handleDemoGoogleSignIn = async () => {
    setIsSubmitting(true);
    setShowConfigModal(false);
    setErrorMessage(null);

    try {
      const googleProfile = {
        email: "eli.trekker@gmail.com",
        name: "אלי טרקר (Google Sandbox)",
        picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      };

      const res = await loginWithGoogle(undefined, googleProfile);
      if (res.success) {
        setSuccessMessage("התחברת בהצלחה (מצב Google Sandbox)!");
        setTimeout(() => {
          router.replace(redirectTarget);
        }, 450);
      } else {
        setErrorMessage(res.error || "ההתחברות נכשלה");
      }
    } catch (err) {
      setErrorMessage("שגיאה בתקשורת מול השרת");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialNotice = (providerName: string) => {
    alert(`כניסה עם ${providerName}: ניתן להשתמש ב-Google או בשם משתמש וסיסמה לכניסה מיידית.`);
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 selection:bg-teal-400 selection:text-slate-900 overflow-hidden font-sans"
      dir="rtl"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropVideo}
    >
      {/* ====================================================================== */}
      {/* GOOGLE FLOW (flow.google.com) LIVE AMBIENT VIDEO BACKGROUND             */}
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
        {/* Soft, minimal cinematic tint so the card pops while the background remains 100% visible and vivid */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* Subtle Luminous Aurora Glows around edges */}
      <div className="absolute w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-indigo-500/20 via-cyan-400/15 to-transparent blur-[140px] pointer-events-none -top-36 -right-20 z-0 mix-blend-screen" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-teal-400/20 via-emerald-500/15 to-transparent blur-[130px] pointer-events-none -bottom-36 -left-20 z-0 mix-blend-screen" />

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

            {/* Redesigned Luxury Divider */}
            <div className="relative flex items-center justify-center my-6 select-none">
              {/* Soft Gradient Separator Line */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              
              {/* Refined Pill Badge with Micro-Accents */}
              <div className="absolute px-3.5 py-1 rounded-full bg-white/95 border border-slate-200/80 shadow-sm flex items-center gap-2 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-[11px] font-medium text-slate-500 tracking-wide">
                  או באמצעות חשבון
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              </div>
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

      {/* ====================================================================== */}
      {/* GOOGLE OAUTH CONFIGURATION & SANDBOX MODAL                             */}
      {/* ====================================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900/95 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] text-right text-white">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="absolute top-5 left-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">חיבור Google OAuth 2.0</h3>
                <p className="text-xs text-slate-400">הגדרת מפתחות ההזדהות במערכת</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              מנגנון ההתחברות באמצעות Google הוגדר וממתין להזנת מפתחות ה-OAuth שלך בקובצי הסביבה:
            </p>

            {/* Code Block with Keys */}
            <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 font-mono text-xs text-teal-300 space-y-1 select-all mb-4 text-left dir-ltr" dir="ltr">
              <div>GOOGLE_CLIENT_ID=&lt;your_client_id&gt;</div>
              <div>GOOGLE_CLIENT_SECRET=&lt;your_client_secret&gt;</div>
              <div>GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google</div>
              <div>NEXT_PUBLIC_GOOGLE_CLIENT_ID=&lt;your_client_id&gt;</div>
            </div>

            <p className="text-[11px] text-slate-400 mb-6 leading-normal">
              💡 הדבק את המפתחות בתוך <span className="text-teal-300 font-mono">backend/.env</span> ו-<span className="text-teal-300 font-mono">frontend/.env.local</span>. לאחר מכן לחיצה על כפתור Google תפנה ישירות לחשבון Google שלך.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleDemoGoogleSignIn}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>התחבר עכשיו במצב Google Sandbox</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 transition"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

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
