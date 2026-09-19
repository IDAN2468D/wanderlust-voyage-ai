"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Mountain,
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
  Compass,
  BookmarkCheck,
  Briefcase,
  Home,
  Map,
  Info,
  BookOpen,
  Navigation as NavigationIcon,
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
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { currency, setCurrency, currencyConfig } = useCurrency();
  const { user, isAuthenticated, logout } = useAuth();

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

  const NAV_LINKS = [
    { label: "דף הבית", href: "/", icon: Home },
    { label: "טיסות חגים TLV ✈️", href: "/flights", icon: Plane, isSpecial: true },
    { label: "מקומות ויעדים", href: "/#discover-places", icon: Compass },
    { label: "חוויות", href: "/experiences", icon: Sparkles },
    { label: "מסלולים", href: "/trips", icon: Map },
    { label: "אודות", href: "/about", icon: Info },
    { label: "בלוג", href: "/blog", icon: BookOpen },
  ];

  const currencyList = Object.values(CURRENCIES);

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full bg-[#070b13]/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_12px_35px_-5px_rgba(0,0,0,0.65)] transition-all duration-300"
        dir="rtl"
      >
        {/* Top ambient luxury accent line with animated shimmer */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-mint-400/70 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-3 sm:py-3.5 flex items-center justify-between gap-4">
          
          {/* ========================================================
              ANIMATED LOGO & BRANDING (Liquid Glass 4.0 Pro)
          ======================================================== */}
          <a
            href="/"
            className="flex items-center gap-3.5 group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-400 rounded-2xl select-none"
            title="Agent Travel Planner - דף הבית"
          >
            {/* Logo Emblem with Rotating Orbital Rings & Glow Effects */}
            <div className="relative">
              {/* Breathing ambient neon underglow */}
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-mint-500/40 via-cyan-500/35 to-emerald-400/40 blur-xl opacity-75 group-hover:opacity-100 group-hover:scale-115 transition-all duration-500 animate-pulse-glow pointer-events-none" />

              {/* Rotating outer orbital dashed radar ring */}
              <div className="absolute -inset-1 rounded-2xl border border-dashed border-mint-400/40 group-hover:border-mint-400/70 animate-spin-slow pointer-events-none transition-colors" />
              
              {/* Counter-rotating subtle orbital ring */}
              <div className="absolute -inset-2 rounded-full border border-dotted border-cyan-400/25 animate-spin-reverse-slow pointer-events-none" />

              {/* Orbiting celestial satellite dot */}
              <div className="absolute -top-1.5 -left-1.5 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9] animate-pulse pointer-events-none" />

              {/* Central Glass Emblem Badge */}
              <div className="relative p-2.5 sm:p-3 rounded-2xl bg-[#090f19]/90 border border-mint-400/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_0_20px_rgba(45,212,191,0.25)] group-hover:border-mint-400 group-hover:shadow-[0_0_30px_rgba(45,212,191,0.55)] group-hover:scale-105 transition-all duration-300 flex items-center justify-center overflow-hidden">
                {/* Background Rotating Compass/Radar SVG */}
                <Compass className="w-8 h-8 text-mint-500/25 animate-spin-slow absolute inset-auto pointer-events-none" />
                
                {/* Supersonic Climbing AI Plane */}
                <Plane className="w-3.5 h-3.5 text-cyan-300 absolute top-1 left-1 transform -rotate-45 animate-plane-float drop-shadow-[0_0_6px_#22d3ee] pointer-events-none" />

                {/* Main Stylized Mountain Peak */}
                <Mountain className="w-5 h-5 sm:w-6 sm:h-6 text-mint-300 drop-shadow-[0_0_10px_rgba(45,212,191,0.9)] group-hover:scale-110 transition-transform duration-300 relative z-10" />

                {/* Radar Sweep Effect inside emblem */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-mint-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none animate-radar-sweep" />
              </div>

              {/* Live Active Online Beacon */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-[#070b13] shadow-[0_0_8px_#34d399]" />
              </span>
            </div>

            {/* Typography & AI Agent Status Badges */}
            <div className="flex flex-col text-right">
              <span className="font-heading font-black text-base sm:text-lg tracking-[0.14em] bg-gradient-to-r from-white via-mint-100 to-cyan-200 bg-[length:200%_auto] animate-text-shimmer bg-clip-text text-transparent group-hover:brightness-125 transition-all block">
                AGENT TRAVEL PLANNER
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8.5px] sm:text-[9.5px] tracking-[0.24em] text-slate-300 font-semibold block">
                  AUTONOMOUS AI VOYAGES
                </span>
                {/* 13 Active Agents Pill Badge */}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-mint-500/15 border border-emerald-400/40 text-[9px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>13 סוכני AI פעילים</span>
                </span>
              </div>
            </div>
          </a>

          {/* ========================================================
              REDESIGNED NAVIGATION DOCK (Icons, Tooltips, Glass)
          ======================================================== */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.035] hover:bg-white/[0.05] border border-white/[0.09] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_10px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              
              if (link.isSpecial) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`relative group px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/25 text-cyan-100 border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.35)]"
                        : "bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500/25 hover:to-blue-500/25 text-cyan-300 hover:text-cyan-100 border border-cyan-500/30 hover:border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.18)]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-300 animate-plane-float shrink-0" />
                    <span>{link.label}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                  </a>
                );
              }

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`group relative px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? "bg-gradient-to-r from-mint-500/25 to-teal-500/20 text-mint-200 font-bold border border-mint-400/50 shadow-[0_0_20px_rgba(45,212,191,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border hover:border-white/10"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                      isActive ? "text-mint-300" : "text-slate-400 group-hover:text-mint-400"
                    }`}
                  />
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-400 shadow-[0_0_8px_#2dd4bf] animate-pulse" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* ========================================================
              CONTROLS (Search, Currency, User Profile, CTA)
          ======================================================== */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Quick Search Capsule Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              title="חיפוש מהיר (Ctrl + K)"
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/20 backdrop-blur-md transition-all duration-200 group shadow-sm focus:outline-none focus:ring-2 focus:ring-mint-400/50"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-mint-400 group-hover:scale-110 transition-transform" />
              <span className="hidden xl:inline text-xs font-medium text-slate-400 group-hover:text-slate-200">
                חפש יעד...
              </span>
              <span className="hidden xl:inline text-[9px] font-mono font-bold bg-white/[0.08] text-slate-400 px-1.5 py-0.5 rounded border border-white/10">
                ⌘K
              </span>
            </button>

            {/* Currency Selector Dropdown (Desktop) */}
            <div className="relative hidden sm:block" ref={currencyDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 sm:py-2 rounded-xl border backdrop-blur-md transition-all duration-200 shadow-sm ${
                  isCurrencyOpen
                    ? "bg-white/[0.12] text-white border-mint-400/40 shadow-[0_0_15px_rgba(45,212,191,0.15)]"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border-white/[0.08] hover:border-white/20"
                }`}
                aria-label="בחר מטבע תשלום"
              >
                <span className="text-sm leading-none drop-shadow-sm">{currencyConfig.flag}</span>
                <span className="font-bold text-white tracking-wide">{currencyConfig.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isCurrencyOpen ? "rotate-180 text-mint-400" : ""
                  }`}
                />
              </button>

              {isCurrencyOpen && (
                <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-[#0c121e]/95 backdrop-blur-2xl border border-white/15 p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.7)] space-y-1 z-50 animate-fade-in text-right">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-white/[0.08] flex items-center justify-between">
                    <span>מטבע תצוגה והמרה</span>
                    <span className="text-[9px] text-mint-400 font-mono">LIVE FX</span>
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
                            ? "bg-mint-500/20 text-mint-300 font-bold border border-mint-500/30 shadow-[0_0_10px_rgba(45,212,191,0.15)]"
                            : "hover:bg-white/[0.08] text-slate-200 hover:text-white"
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
                        {isSelected && <Check className="w-4 h-4 text-mint-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Profile / Auth Button (Desktop) */}
            <div className="relative hidden sm:block" ref={userMenuRef}>
              {isAuthenticated && user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`flex items-center gap-2 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 shadow-sm group ${
                      isUserMenuOpen
                        ? "bg-white/[0.12] border-mint-400/40 shadow-[0_0_15px_rgba(45,212,191,0.15)]"
                        : "bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.08] hover:border-white/20"
                    }`}
                    title={user.full_name || user.email}
                  >
                    <div className="relative">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={user.full_name || "User"}
                          className="w-7 h-7 rounded-xl object-cover border border-mint-400/60 shadow-sm"
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
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
                          {(user.full_name || user.email)[0].toUpperCase()}
                        </div>
                      )}
                      {/* Active online glowing beacon */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070b13] shadow-[0_0_6px_#34d399]" />
                    </div>

                    {/* Full Name display without awkward cutoff */}
                    <span className="font-semibold text-white max-w-[140px] sm:max-w-[170px] truncate text-right">
                      {user.full_name || user.email.split("@")[0]}
                    </span>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isUserMenuOpen ? "rotate-180 text-mint-400" : ""
                      }`}
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-[#0c121e]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-1.5 z-50 animate-fade-in text-right">
                      {/* User Card Header */}
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-3">
                        {user.picture ? (
                          <img
                            src={user.picture}
                            alt={user.full_name || "User"}
                            className="w-10 h-10 rounded-xl object-cover border-2 border-mint-400 shadow-md shrink-0"
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
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
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
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-mint-500/15 border border-mint-500/30 text-[10px] text-mint-300 font-semibold">
                            {user.auth_provider === "google" ? "Google Connected" : "Wanderlust User"}
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
                          className="w-full px-3 py-2 rounded-xl text-right text-xs font-semibold hover:bg-mint-500/15 text-mint-300 transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-3.5 h-3.5 text-mint-400 group-hover:scale-110 transition-transform" />
                            <span>הפרופיל שלי והגדרות</span>
                          </div>
                          <span className="text-[10px] bg-mint-500/20 px-1.5 py-0.5 rounded font-bold text-mint-300">
                            ראשי
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push("/profile?tab=bookings");
                          }}
                          className="w-full px-3 py-2 rounded-xl text-right text-xs font-medium hover:bg-white/[0.08] text-slate-200 transition-all flex items-center justify-between"
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
                          className="w-full px-3 py-2 rounded-xl text-right text-xs font-medium hover:bg-white/[0.08] text-slate-200 transition-all flex items-center justify-between"
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
                          className="w-full px-3 py-2 rounded-xl text-right text-xs font-semibold hover:bg-rose-500/15 text-rose-300 transition-all flex items-center justify-between border-t border-white/[0.08] pt-2 mt-1"
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
                  className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] px-3.5 py-1.5 sm:py-2 rounded-xl border border-white/[0.08] hover:border-white/20 backdrop-blur-md transition-all shadow-sm group"
                >
                  <UserIcon className="w-3.5 h-3.5 text-mint-400 group-hover:scale-110 transition-transform" />
                  <span>התחברות</span>
                </a>
              )}
            </div>

            {/* Specular Liquid Glass CTA Button ("תכנן טיול") */}
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
              className="relative group overflow-hidden hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-black text-xs tracking-wider shadow-[0_0_22px_rgba(245,158,11,0.4)] hover:shadow-[0_0_32px_rgba(245,158,11,0.65)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-white/25 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <Sparkles className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>תכנן טיול</span>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 sm:p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08] lg:hidden transition-colors"
              aria-label="תפריט ניווט"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-mint-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden px-4 py-4 border-t border-white/[0.08] bg-[#070c14]/95 backdrop-blur-2xl space-y-3 animate-fade-in text-right">
            {/* Mobile User Profile Section */}
            {isAuthenticated && user ? (
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.full_name || "User"}
                      className="w-9 h-9 rounded-xl object-cover border border-mint-400"
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
                    <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      {(user.full_name || user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="cursor-pointer p-1 rounded-xl"
                    title="עבור לפרופיל שלי"
                  >
                    <span className="block text-white text-xs font-bold truncate max-w-[160px]">
                      {user.full_name || user.email}
                    </span>
                    <span className="block text-[10px] text-mint-300 font-mono">
                      {user.auth_provider === "google" ? "Google Connected" : "Wanderlust User"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="p-2 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5"
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold text-xs border border-white/15 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-mint-400" />
                  <span>כניסה / הרשמה למערכת</span>
                </a>
              </div>
            )}

            {/* Mobile Nav Links with Icons */}
            <div className="space-y-1.5 pt-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-mint-500/20 text-mint-300 border border-mint-500/35 shadow-sm"
                        : link.isSpecial
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-mint-400" : "text-slate-400"}`} />
                    <span className="flex-1 text-right">{link.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-mint-400 shadow-[0_0_6px_#2dd4bf]" />
                    )}
                  </a>
                );
              })}
            </div>

            {/* Mobile Currency Selector */}
            <div className="pt-2 border-t border-white/[0.08]">
              <span className="text-[11px] text-slate-400 block mb-2 font-semibold">מטבע תשלום לתצוגה:</span>
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
                          ? "bg-mint-500/20 text-mint-300 border-mint-500/40 shadow-sm"
                          : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]"
                      }`}
                    >
                      <span>{curr.flag}</span>
                      <span>{curr.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push("/#planner-form");
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-400 via-mint-400 to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(45,212,191,0.35)]"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>תכנן את הטיול שלך עם AI</span>
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
