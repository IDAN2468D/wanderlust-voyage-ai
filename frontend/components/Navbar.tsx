"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ArrowLeft,
  Menu,
  X,
  Check,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Sparkles,
  Plane,
  Briefcase,
  BookmarkCheck,
} from "lucide-react";
import { SearchModal } from "@/components/SearchModal";
import { useCurrency, CURRENCIES, CurrencyCode } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { currency, setCurrency, currencyConfig } = useCurrency();
  const { user, isAuthenticated, logout } = useAuth();

  const isHomePage = pathname === "/";

  // Scroll detection for transparent-to-glass transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCurrencyOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    if (isCurrencyOpen || isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCurrencyOpen, isUserMenuOpen]);

  // Keyboard shortcut Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Navigation items matching GlobalVista reference image
  const NAV_LINKS = [
    { label: "Home", hebrewLabel: "דף הבית", href: "/", isActive: pathname === "/" },
    { label: "Destinations", hebrewLabel: "יעדים", href: "/#discover-places", isActive: pathname === "/destinations" },
    { label: "Packages", hebrewLabel: "חבילות ומסלולים", href: "/trips", isActive: pathname === "/trips" },
    { label: "Contact", hebrewLabel: "צור קשר", href: "/about", isActive: pathname === "/about" },
  ];

  const currencyList = Object.values(CURRENCIES);

  return (
    <>
      <header
        className={`w-full transition-all duration-300 ${
          isHomePage
            ? `fixed top-0 inset-x-0 z-50 ${
                isScrolled
                  ? "bg-[#050811]/85 backdrop-blur-2xl border-b border-white/10 shadow-[0_12px_35px_-5px_rgba(0,0,0,0.7)] py-3"
                  : "bg-gradient-to-b from-black/50 via-black/20 to-transparent border-b border-transparent py-4 sm:py-5"
              }`
            : "sticky top-0 z-50 bg-[#070b13]/95 backdrop-blur-2xl border-b border-white/[0.1] shadow-xl py-3"
        }`}
        dir="ltr"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-4">
          
          {/* ========================================================
              LEFT: GLOBALVISTA LOGO & BRANDING (Exact Reference Image)
          ======================================================== */}
          <a
            href="/"
            className="flex items-center gap-3 group shrink-0 focus:outline-none select-none"
            title="GlobalVista - Your Journey, Our Expertise"
          >
            {/* Custom SVG: Blue Globe with Orbiting Jet */}
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-1.5 rounded-full bg-sky-400/25 blur-md opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
              
              <svg
                className="w-10 h-10 sm:w-11 sm:h-11 drop-shadow-[0_2px_12px_rgba(56,189,248,0.55)] group-hover:scale-105 transition-transform duration-300"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <radialGradient id="gvGlobeGrad" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="55%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#035486" />
                  </radialGradient>
                  <linearGradient id="gvOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {/* Atmospheric edge ring */}
                <circle cx="24" cy="24" r="17" stroke="#7dd3fc" strokeWidth="0.8" strokeOpacity="0.6" />

                {/* Solid Globe Sphere */}
                <circle cx="24" cy="24" r="15.5" fill="url(#gvGlobeGrad)" />

                {/* Stylized Continents */}
                <path
                  d="M15 16c1.5-2.5 4.5-2 6-0.5 1.5 1.5 3 0.5 4.5-1.5 1-1.5 3-1 4 0.5s-0.5 3.5-2 4.5-3 3-4.5 3.5-3.5-1.5-5-3-2-2-3-3.5z"
                  fill="#ffffff"
                  fillOpacity="0.9"
                />
                <path
                  d="M26 26c1.2 1.5 2.5 3.5 4.5 3s2.5-2.5 2-4-2-2.5-3.5-2-2 1.5-3 3z"
                  fill="#ffffff"
                  fillOpacity="0.88"
                />
                <path
                  d="M13 25c1 1 2 2.5 3 2s2-2 1-3.5-2-1.5-3-0.5-1 1-1 2z"
                  fill="#ffffff"
                  fillOpacity="0.8"
                />

                {/* Orbiting Flight Trail Ring */}
                <ellipse
                  cx="24"
                  cy="24"
                  rx="19.5"
                  ry="7.5"
                  stroke="url(#gvOrbitGrad)"
                  strokeWidth="1.8"
                  transform="rotate(-28 24 24)"
                />

                {/* Supersonic Jet on the Orbit Trail */}
                <g transform="translate(37, 12) rotate(32) scale(0.68)">
                  <path
                    d="M12 2L3 21l9-4.5 9 4.5L12 2z"
                    fill="#ffffff"
                    className="drop-shadow-[0_0_6px_#ffffff]"
                  />
                </g>
              </svg>
            </div>

            {/* Typography */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-xl sm:text-2xl text-white tracking-tight leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
                  GlobalVista
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-bold text-sky-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  13 AI Agents
                </span>
              </div>
              <span className="text-[10.5px] sm:text-[11.5px] text-white/85 font-medium tracking-wide drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] mt-0.5">
                Your Journey, Our Expertise
              </span>
            </div>
          </a>

          {/* ========================================================
              CENTER: CLEAN NAVIGATION LINKS WITH ACTIVE WHITE UNDERLINE
          ======================================================== */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10">
            {NAV_LINKS.map((link) => {
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="group flex flex-col items-center focus:outline-none transition-all duration-200"
                  title={link.hebrewLabel}
                >
                  <span
                    className={`text-sm lg:text-[15px] transition-colors duration-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] ${
                      link.isActive
                        ? "text-white font-bold tracking-wide"
                        : "text-white/80 group-hover:text-white font-medium"
                    }`}
                  >
                    {link.label}
                  </span>
                  {/* Clean active indicator underline matching GlobalVista reference */}
                  <span
                    className={`h-[2.5px] rounded-full mt-1 transition-all duration-200 ${
                      link.isActive
                        ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                        : "w-0 group-hover:w-4 bg-white/60"
                    }`}
                  />
                </a>
              );
            })}

            {/* Special Quick Link: Flights TLV */}
            <a
              href="/flights"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-bold text-sky-200 hover:text-white transition-all shadow-sm group"
              title="לוח טיסות וחופשות נתב״ג"
            >
              <Plane className="w-3 h-3 text-sky-300 group-hover:scale-110 transition-transform" />
              <span>Flights TLV</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </a>
          </nav>

          {/* ========================================================
              RIGHT: UTILITY CONTROLS (Search, Currency, User, CTA)
          ======================================================== */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Search Button (⌘K) */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              title="Quick Search (Ctrl + K)"
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all duration-200 group shadow-sm focus:outline-none"
            >
              <Search className="w-4 h-4 text-sky-300 group-hover:scale-110 transition-transform" />
              <span className="hidden xl:inline text-xs font-medium text-white/80 group-hover:text-white">
                Search
              </span>
              <span className="hidden xl:inline text-[9px] font-mono font-bold bg-white/15 text-white/90 px-1.5 py-0.5 rounded border border-white/20">
                ⌘K
              </span>
            </button>

            {/* Currency Selector Dropdown */}
            <div className="relative hidden sm:block" ref={currencyDropdownRef} dir="rtl">
              <button
                type="button"
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 sm:py-2 rounded-xl border backdrop-blur-md transition-all duration-200 shadow-sm ${
                  isCurrencyOpen
                    ? "bg-white/25 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                }`}
                aria-label="Select currency"
              >
                <span className="text-sm leading-none">{currencyConfig.flag}</span>
                <span className="font-bold text-white">{currencyConfig.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${
                    isCurrencyOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </button>

              {isCurrencyOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#090f19]/95 backdrop-blur-2xl border border-white/20 p-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.8)] space-y-1 z-50 animate-fade-in text-right">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-white/10 flex items-center justify-between">
                    <span>מטבע תצוגה והמרה</span>
                    <span className="text-[9px] text-sky-400 font-mono">LIVE FX</span>
                  </div>
                  {currencyList.map((curr) => {
                    const isSelected = currency === curr.code;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => {
                          setCurrency(curr.code as CurrencyCode);
                          setIsCurrencyOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-right text-xs font-medium transition-all duration-150 flex items-center justify-between ${
                          isSelected
                            ? "bg-sky-500/25 text-sky-200 font-bold border border-sky-400/40 shadow-sm"
                            : "hover:bg-white/10 text-slate-200 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{curr.flag}</span>
                          <div className="text-right">
                            <span className="block text-white text-xs font-bold leading-tight">
                              {curr.label}
                            </span>
                            <span className="block text-[10px] text-slate-400 leading-tight">
                              {curr.hebrewName}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Profile / Auth Button */}
            <div className="relative hidden sm:block" ref={userMenuRef} dir="rtl">
              {isAuthenticated && user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 shadow-sm group ${
                      isUserMenuOpen
                        ? "bg-white/25 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        : "bg-white/10 hover:bg-white/20 border-white/20"
                    }`}
                    title={user.full_name || user.email}
                  >
                    <div className="relative">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={user.full_name || "User"}
                          className="w-7 h-7 rounded-full object-cover border border-white/60 shadow-sm"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.triedFallback) {
                              target.dataset.triedFallback = "true";
                              target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          {(user.full_name || user.email)[0].toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#070b13]" />
                    </div>

                    <span className="font-semibold text-white max-w-[110px] truncate text-right">
                      {user.full_name || user.email.split("@")[0]}
                    </span>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${
                        isUserMenuOpen ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#090f19]/95 backdrop-blur-2xl border border-white/20 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-1.5 z-50 animate-fade-in text-right">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                        {user.picture ? (
                          <img
                            src={user.picture}
                            alt={user.full_name || "User"}
                            className="w-10 h-10 rounded-full object-cover border-2 border-sky-400 shadow-md shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.dataset.triedFallback) {
                                target.dataset.triedFallback = "true";
                                target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
                            {(user.full_name || user.email)[0].toUpperCase()}
                          </div>
                        )}
                        <div className="overflow-hidden flex-1 text-right">
                          <span className="block text-white text-xs font-bold truncate">
                            {user.full_name || "מטייל רשום"}
                          </span>
                          <span className="block text-[11px] text-slate-400 truncate font-mono" dir="ltr">
                            {user.email}
                          </span>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/30 text-[10px] text-sky-200 font-semibold">
                            {user.auth_provider === "google" ? "Google Connected" : "GlobalVista User"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push("/profile");
                          }}
                          className="w-full px-3 py-2 rounded-xl text-right text-xs font-semibold hover:bg-sky-500/20 text-sky-200 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                            <span>הפרופיל שלי והגדרות</span>
                          </div>
                          <span className="text-[10px] bg-sky-500/20 px-1.5 py-0.5 rounded font-bold text-sky-300">
                            ראשי
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push("/profile?tab=bookings");
                          }}
                          className="w-full px-3 py-2 rounded-xl text-right text-xs font-medium hover:bg-white/10 text-slate-200 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>ההזמנות והכרטיסים שלי</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push("/trips");
                          }}
                          className="w-full px-3 py-2 rounded-xl text-right text-xs font-medium hover:bg-white/10 text-slate-200 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <BookmarkCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>המסלולים השמורים שלי</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full px-3 py-2 rounded-xl text-right text-xs font-semibold hover:bg-rose-500/20 text-rose-300 transition-all flex items-center justify-between border-t border-white/10 pt-2 mt-1"
                        >
                          <span>התנתק מהמערכת</span>
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <a
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 sm:py-2 rounded-xl border border-white/20 backdrop-blur-md transition-all shadow-sm group"
                >
                  <UserIcon className="w-3.5 h-3.5 text-sky-300 group-hover:scale-110 transition-transform" />
                  <span>Sign In</span>
                </a>
              )}
            </div>

            {/* Primary Action Button (Start Your Journey) */}
            <button
              type="button"
              onClick={() => {
                if (pathname === "/") {
                  const formEl = document.getElementById("planner-form");
                  formEl?.scrollIntoView({ behavior: "smooth" });
                } else {
                  router.push("/#planner-form");
                }
              }}
              className="relative group overflow-hidden hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-blue-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(2,132,199,0.5)] hover:shadow-[0_0_28px_rgba(2,132,199,0.75)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-sky-400/40"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200 animate-pulse" />
              <span>Start Journey</span>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 md:hidden transition-colors"
              aria-label="Open Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-sky-300" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ========================================================
            MOBILE NAVIGATION DRAWER
        ======================================================== */}
        {isMobileMenuOpen && (
          <div className="md:hidden px-4 py-4 border-t border-white/10 bg-[#070c14]/95 backdrop-blur-2xl space-y-3 animate-fade-in text-right" dir="rtl">
            {/* Mobile User Profile */}
            {isAuthenticated && user ? (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.full_name || "User"}
                      className="w-9 h-9 rounded-full object-cover border border-sky-400"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.triedFallback) {
                          target.dataset.triedFallback = "true";
                          target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center">
                      {(user.full_name || user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="cursor-pointer text-right"
                  >
                    <span className="block text-white text-xs font-bold truncate max-w-[160px]">
                      {user.full_name || user.email}
                    </span>
                    <span className="block text-[10px] text-sky-300 font-mono">
                      {user.auth_provider === "google" ? "Google Connected" : "GlobalVista User"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="p-2 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/25 text-xs font-semibold flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>התנתק</span>
                </button>
              </div>
            ) : (
              <div className="pt-1 pb-1">
                <a
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-sky-300" />
                  <span>כניסה / הרשמה למערכת</span>
                </a>
              </div>
            )}

            {/* Mobile Nav Links */}
            <div className="space-y-1.5 pt-1">
              {NAV_LINKS.map((link) => {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      link.isActive
                        ? "bg-sky-500/25 text-white border border-sky-400/40 shadow-sm"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{link.label} ({link.hebrewLabel})</span>
                    {link.isActive && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                    )}
                  </a>
                );
              })}

              <a
                href="/flights"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-200 border border-sky-400/30"
              >
                <div className="flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5 text-sky-300" />
                  <span>לוח טיסות חגים נתב״ג (TLV)</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </a>
            </div>

            {/* Mobile Currency Selector */}
            <div className="pt-2 border-t border-white/10">
              <span className="text-[11px] text-slate-400 block mb-2 font-semibold">מטבע תשלום:</span>
              <div className="grid grid-cols-3 gap-2">
                {currencyList.map((curr) => {
                  const isSelected = currency === curr.code;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => setCurrency(curr.code as CurrencyCode)}
                      className={`p-2 rounded-xl text-center border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-sky-500/25 text-sky-200 border-sky-400/50 shadow-sm"
                          : "bg-white/5 text-slate-300 border-white/10"
                      }`}
                    >
                      <span>{curr.flag}</span>
                      <span>{curr.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push("/#planner-form");
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(2,132,199,0.5)] border border-sky-400/40"
              >
                <Sparkles className="w-4 h-4 text-sky-200" />
                <span>Start Your Journey With AI</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Quick Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
