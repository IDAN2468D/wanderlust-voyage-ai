"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Heart,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Curated high-resolution travel destinations for the right-side carousel
const SCENIC_SLIDES = [
  {
    id: 1,
    title: "Escape the Ordinary, Embrace the Journey!",
    subtitle: "Experience the world your way!",
    cardTitle: "Wander, Explore, Experience.",
    cardDesc:
      "Discover new places, embrace adventures, & create unforgettable travel memories worldwide.",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1400&auto=format&fit=crop&q=85",
    location: "Lago di Braies, Dolomites",
  },
  {
    id: 2,
    title: "Find Peace Where Sea Meets Sky",
    subtitle: "Discover Aegean sunlit cliffs",
    cardTitle: "Breathtaking Horizons.",
    cardDesc:
      "Witness golden sunsets, whitewashed villages, and authentic Mediterranean charm.",
    imageUrl:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&auto=format&fit=crop&q=85",
    location: "Oia, Santorini, Greece",
  },
  {
    id: 3,
    title: "Alpine Wonders & Pure Serenity",
    subtitle: "Breathe the alpine freshness",
    cardTitle: "Uncharted Wilderness.",
    cardDesc:
      "Hike pristine mountain ridges, crystal turquoise waters, and ancient pine forests.",
    imageUrl:
      "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1400&auto=format&fit=crop&q=85",
    location: "Swiss Alps, Switzerland",
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

  // If already authenticated, navigate away
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

  // Email / Password submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Map username to email format if user entered simple handle
    const effectiveEmail = username.includes("@")
      ? username.trim()
      : `${username.trim()}@travelplanner.ai`;

    if (!username || !password) {
      setErrorMessage("Please enter both username/email and password");
      return;
    }

    if (activeTab === "register") {
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (activeTab === "login") {
        const res = await login(effectiveEmail, password);
        if (res.success) {
          setSuccessMessage("Welcome back! Entering Wanderlust...");
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 450);
        } else {
          setErrorMessage(res.error || "Invalid username or password");
        }
      } else {
        const res = await register(effectiveEmail, password, fullName || username);
        if (res.success) {
          setSuccessMessage("Account created successfully! Welcome aboard...");
          setTimeout(() => {
            router.replace(redirectTarget);
          }, 450);
        } else {
          setErrorMessage(res.error || "Registration failed");
        }
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth button handler
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const googleProfile = {
        email: "eli.trekker@gmail.com",
        name: "Eli Trekker",
        picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      };

      const res = await loginWithGoogle(undefined, googleProfile);
      if (res.success) {
        setSuccessMessage("Connected with Google! Redirecting...");
        setTimeout(() => {
          router.replace(redirectTarget);
        }, 450);
      } else {
        setErrorMessage(res.error || "Google authentication failed");
      }
    } catch (err) {
      setErrorMessage("Error connecting to Google authentication");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Social info buttons (Apple & X)
  const handleSocialNotice = (provider: string) => {
    alert(`${provider} sign-in: Use Google or direct Email/Password login for immediate access.`);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#0a3844] selection:bg-teal-400 selection:text-slate-900 overflow-hidden font-sans">
      {/* Deep Teal Fluid Wave Organic Background Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#06242c] via-[#0a3844] to-[#041a20] -z-10" />

      {/* Subtle organic SVG contour lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none -z-10"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <path
          d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,234.7C672,256,768,288,864,282.7C960,277,1056,235,1152,218.7C1248,203,1344,213,1392,218.7L1440,224L1440,900L1392,900C1344,900,1248,900,1152,900C1056,900,960,900,864,900C768,900,672,900,576,900C480,900,384,900,288,900C192,900,96,900,48,900L0,900Z"
          fill="none"
          stroke="#5eead4"
          strokeWidth="1.5"
        />
        <path
          d="M0,128L60,154.7C120,181,240,235,360,245.3C480,256,600,224,720,202.7C840,181,960,171,1080,186.7C1200,203,1320,245,1380,266.7L1440,288L1440,900L0,900Z"
          fill="none"
          stroke="#99f6e4"
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>

      {/* Center White Master Card with Splitted Form & Scalloped Image */}
      <div className="w-full max-w-[1040px] bg-white rounded-[2.5rem] shadow-[0_30px_90px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/20">
        
        {/* ====================================================================== */}
        {/* LEFT COLUMN: AUTHENTICATION FORM                                       */}
        {/* ====================================================================== */}
        <div className="w-full md:w-[48%] lg:w-[46%] p-8 sm:p-12 flex flex-col justify-between bg-white text-slate-900">
          
          {/* Header Branding */}
          <div>
            <div className="text-left mb-6">
              <h2 className="font-serif text-2xl sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-tight">
                Travel Voyanix
              </h2>
              <p className="text-[13px] text-slate-400 font-normal tracking-wide mt-0.5">
                Explore More, Experience Life.
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
                Sign Up
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
                Log In
              </button>
            </div>

            {/* Title Section */}
            <div className="mb-5 text-left">
              <h3 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
                Journey Begins
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {activeTab === "login" ? "Log In with Open account" : "Create your traveler account"}
              </p>
            </div>

            {/* Social Authentication Row (Apple, Google, X) */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* Apple Button */}
              <button
                type="button"
                onClick={() => handleSocialNotice("Apple")}
                className="flex items-center justify-center py-2.5 px-4 rounded-xl border border-sky-200/90 bg-white hover:border-sky-400 hover:bg-sky-50/20 transition group shadow-sm"
                title="Sign in with Apple"
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
                title="Sign in with Google"
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
                title="Sign in with X"
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

            {/* Divider with 'or' */}
            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] text-slate-400 font-medium lowercase">
                or
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Error / Success Feedback Alerts */}
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

            {/* Main Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name (Sign Up only) */}
              {activeTab === "register" && (
                <div className="relative">
                  <span className="absolute -top-2.5 left-3.5 bg-white px-1 text-[11px] font-semibold text-slate-400 z-10">
                    Full Name
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Eli Cohen"
                    className="w-full px-4 py-3 rounded-xl border border-sky-300/80 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  />
                </div>
              )}

              {/* Username Input with Inset Floating Label */}
              <div className="relative">
                <span className="absolute -top-2.5 left-3.5 bg-white px-1 text-[11px] font-semibold text-slate-400 z-10">
                  Username
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="eli_trekker"
                  className="w-full px-4 py-3 rounded-xl border border-sky-300/80 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>

              {/* Password Input with Inset Floating Label & Eye Icon */}
              <div className="relative">
                <span className="absolute -top-2.5 left-3.5 bg-white px-1 text-[11px] font-semibold text-slate-400 z-10">
                  Password
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-sky-300/80 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {activeTab === "register" && (
                <div className="relative">
                  <span className="absolute -top-2.5 left-3.5 bg-white px-1 text-[11px] font-semibold text-slate-400 z-10">
                    Confirm Password
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-sky-300/80 text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
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
                  <span>Remember me</span>
                </label>

                {activeTab === "login" && (
                  <button
                    type="button"
                    onClick={() =>
                      alert("Password reset instructions have been dispatched to your registered email.")
                    }
                    className="text-xs text-slate-700 hover:text-black font-medium transition"
                  >
                    Forgot Password?
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
                    <span>Processing...</span>
                  </>
                ) : activeTab === "login" ? (
                  <span>Log In</span>
                ) : (
                  <span>Sign Up</span>
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
              <span>כניסה מהירה לחשבון דמו (Demo Traveler)</span>
            </button>
          </div>
        </div>

        {/* ====================================================================== */}
        {/* RIGHT COLUMN: SCENIC TRAVEL CAROUSEL WITH BESPOKE CUTOUT CORNERS       */}
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
            {/* Dark & Cyan Scenic Overlay for Maximum Contrast & Atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/25 pointer-events-none" />

            {/* Characteristic Designer Scalloped Corner Cutouts (from reference) */}
            {/* Top-Left Scallop Cutout */}
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-white z-20 pointer-events-none shadow-sm" />
            <div className="absolute top-2 -left-3 w-5 h-5 rounded-full bg-white z-20 pointer-events-none" />

            {/* Bottom-Right Scallop Cutout */}
            <div className="absolute -bottom-3 -right-3 w-8 h-8 rounded-full bg-white z-20 pointer-events-none shadow-sm" />
            <div className="absolute bottom-2 -right-3 w-5 h-5 rounded-full bg-white z-20 pointer-events-none" />

            {/* Top Floating Badge Card */}
            <div className="relative z-10 self-end max-w-[220px]">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/40 text-left relative animate-fade-in">
                {/* Red Circular Heart Pill */}
                <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-sm">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </div>

                <h4 className="font-bold text-[13px] text-slate-900 pr-7 leading-tight">
                  {currentSlide.cardTitle}
                </h4>
                <p className="text-[10px] text-slate-500 leading-snug mt-1 mb-2.5">
                  {currentSlide.cardDesc}
                </p>

                <div className="flex items-center justify-end">
                  <div className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition">
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Content & Navigation Pill */}
            <div className="relative z-10 mt-auto pt-12 text-left">
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
                  onClick={handlePrevSlide}
                  className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 transition shadow-md group"
                  aria-label="Previous destination"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 transition shadow-md group"
                  aria-label="Next destination"
                >
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a3844] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-300 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
