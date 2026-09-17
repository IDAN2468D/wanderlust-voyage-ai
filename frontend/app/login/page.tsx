"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mountain,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const { login, register, loginWithGoogle, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, redirectTarget, router]);

  // Handle standard email/password submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage("נא למלא את כל שדות החובה");
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
      if (!agreeTerms) {
        setErrorMessage("יש לאשר את תנאי השימוש ומדיניות הפרטיות");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (activeTab === "login") {
        const res = await login(email, password);
        if (res.success) {
          setSuccessMessage("התחברת בהצלחה! מעביר אותך למערכת...");
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 500);
        } else {
          setErrorMessage(res.error || "ההתחברות נכשלה");
        }
      } else {
        const res = await register(email, password, fullName);
        if (res.success) {
          setSuccessMessage("ההרשמה הושלמה בהצלחה! ברוך הבא ל-Wanderlust...");
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 500);
        } else {
          setErrorMessage(res.error || "ההרשמה נכשלה");
        }
      }
    } catch (err: any) {
      setErrorMessage("אירעה שגיאה בלתי צפויה. נסה שוב מאוחר יותר.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // One-click quick demo login
  const handleQuickDemoLogin = async () => {
    setEmail("demo@travelplanner.ai");
    setPassword("password123");
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await login("demo@travelplanner.ai", "password123");
    setIsSubmitting(false);
    if (res.success) {
      setSuccessMessage("התחברת לחשבון דמו בהצלחה!");
      setTimeout(() => {
        router.replace(redirectTarget);
      }, 400);
    } else {
      setErrorMessage(res.error || "ההתחברות לדמו נכשלה");
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Simulate real Google Sign-In profile response or popup
      const googleProfile = {
        email: "traveler.google@gmail.com",
        name: "ישראל ישראלי",
        picture: "https://lh3.googleusercontent.com/a/ACg8ocKS-DemoAvatar",
      };

      const res = await loginWithGoogle(undefined, googleProfile);
      if (res.success) {
        setSuccessMessage("התחברת עם Google בהצלחה!");
        setTimeout(() => {
          router.replace(redirectTarget);
        }, 500);
      } else {
        setErrorMessage(res.error || "שגיאה באימות מול Google");
      }
    } catch (err) {
      setErrorMessage("אירעה שגיאה בהתחברות עם Google");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12 bg-[#070c12] text-slate-100 selection:bg-teal-500/30 overflow-hidden" dir="rtl">
      {/* Dynamic Liquid Glass Background Aurora Mesh */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-teal-500/15 blur-[140px] pointer-events-none -top-40 -right-20 animate-pulse" />
      <div className="absolute w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none -bottom-20 -left-20" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Decorative Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-mint-400 shadow-2xl mb-4 hover:scale-105 transition-transform">
            <Mountain className="w-8 h-8" />
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-[0.15em] text-white">
            WANDERLUST VOYAGE AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
            כניסה מאובטחת לצוות סוכני הנסיעות האוטונומיים
          </p>
        </div>

        {/* Main Glass Card */}
        <div className="wanderlust-glass rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl backdrop-blur-2xl bg-[#0b1320]/80 relative overflow-hidden">
          {/* Subtle top edge glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-mint-400/50 to-transparent" />

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-2xl bg-white/5 p-1 border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "login"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              התחברות לחשבון
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "register"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              הרשמה חדשה
            </button>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 mb-5 group"
          >
            {/* Google SVG G-Logo */}
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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
            <span>{activeTab === "login" ? "התחבר באמצעות Google" : "הירשם באמצעות Google"}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0c1421] px-3 text-[11px] text-slate-400 font-medium">
              או באמצעות דואר אלקטרוני
            </span>
            <div className="border-t border-white/10 w-full" />
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Only on Register) */}
            {activeTab === "register" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  שם מלא
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-mint-400 transition"
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                כתובת אימייל
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@domain.com"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-mint-400 transition text-left"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  סיסמה
                </label>
                {activeTab === "login" && (
                  <button
                    type="button"
                    onClick={() => alert("לאיפוס סיסמה, אנא פנה למנהל המערכת או השתמש בחשבון הדמו.")}
                    className="text-[11px] text-mint-400 hover:text-mint-300 transition"
                  >
                    שכחת סיסמה?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-mint-400 transition text-left"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-white absolute left-3 top-1/2 -translate-y-1/2 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register tab only) */}
            {activeTab === "register" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  אימות סיסמה
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-mint-400 transition text-left"
                    dir="ltr"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Checkboxes */}
            {activeTab === "login" ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-mint-500 focus:ring-mint-500"
                />
                <label htmlFor="remember-me" className="text-xs text-slate-300 cursor-pointer">
                  זכור אותי במכשיר זה
                </label>
              </div>
            ) : (
              <div className="flex items-start gap-2 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-mint-500 focus:ring-mint-500 mt-0.5"
                />
                <label htmlFor="terms" className="text-[11px] text-slate-300 leading-tight cursor-pointer">
                  אני מאשר את תנאי השימוש ומדיניות הפרטיות של Wanderlust Voyage AI
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-400 via-emerald-400 to-mint-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-teal-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>מעבד בקשה...</span>
                </>
              ) : activeTab === "login" ? (
                <>
                  <span>התחבר למערכת</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>צור חשבון והתחל</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-[11px] text-slate-400 mb-2.5">
              רוצה לבדוק את הפלטפורמה ללא הרשמה?
            </p>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-mint-500/10 hover:bg-mint-500/20 border border-mint-500/30 text-mint-300 font-semibold text-xs transition flex items-center justify-center gap-2 group"
            >
              <ShieldCheck className="w-4 h-4 text-mint-400 group-hover:scale-110 transition-transform" />
              <span>התחברות מהירה בלחיצה אחת (חשבון דמו)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-mint-400/80" />
            <span>5-Layer Autonomous Agent Stack</span>
          </span>
          <span>•</span>
          <span>מוגן בהצפנת SSL/TLS 256-bit</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070c12] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-mint-400 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
