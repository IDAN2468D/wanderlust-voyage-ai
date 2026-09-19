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
  Briefcase
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
    { label: "דף הבית", href: "/" },
    { label: "טיסות חגים TLV ✈️", href: "/flights", isSpecial: true },
    { label: "יעדים", href: "/destinations" },
    { label: "חוויות", href: "/experiences" },
    { label: "מסלולים", href: "/trips" },
    { label: "אודות", href: "/about" },
    { label: "בלוג", href: "/blog" },
  ];

  const currencyList = Object.values(CURRENCIES);

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full bg-[#070b13]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_10px_35px_-5px_rgba(0,0,0,0.6)] transition-all duration-300"
        dir="rtl"
      >
        {/* Top ambient luxury accent line */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-mint-400/60 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-3 sm:py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo (Right side in RTL) */}
          <a
            href="/"
            className="flex items-center gap-3 group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-400 rounded-2xl"
          >
            <div className="relative p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-mint-500/20 via-teal-500/10 to-emerald-500/20 border border-mint-400/30 shadow-[0_0_20px_rgba(45,212,191,0.2)] group-hover:shadow-[0_0_30px_rgba(45,212,191,0.45)] group-hover:border-mint-400/60 group-hover:scale-105 transition-all duration-300">
              <Mountain className="w-5 h-5 sm:w-6 sm:h-6 text-mint-400 group-hover:rotate-6 transition-transform duration-300" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-mint-400 animate-ping opacity-75" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-mint-400 border-2 border-[#070b13]" />
            </div>
            <div className="flex flex-col text-right">
              <span className="font-heading font-black text-base sm:text-lg tracking-[0.14em] bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:text-white transition-colors block">
                AGENT TRAVEL PLANNER
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] tracking-[0.22em] text-slate-400 font-semibold block">
                  AUTONOMOUS AI VOYAGES
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-mint-500/15 border border-mint-400/30 text-[8.5px] font-bold text-mint-300 tracking-wider">
                  13 AGENTS
                </span>
              </div>
            </div>
          </a>

          {/* Desktop Navigation Floating Dock (Center) */}
          <nav className="hidden lg:flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-xl">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              
              if (link.isSpecial) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-cyan-200 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                        : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-100 border border-cyan-500/20"
                    }`}
                  >
                    <span>{link.label}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
                  </a>
                );
              }

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-mint-500/20 text-mint-300 border border-mint-400/35 shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.07]"
                  }`}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-400 shadow-[0_0_6px_#2dd4bf]" />
                  )}
                  <span>{link.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Left Controls (Search, Currency, User Profile, CTA Button) */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Sleek Search Button (Capsule with Ctrl+K shortcut on XL) */}
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

                    {/* Full Name without ugly truncation */}
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
              className="relative group overflow-hidden hidden sm:inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-teal-400 via-mint-400 to-emerald-400 text-slate-950 font-black text-xs tracking-wider shadow-[0_0_22px_rgba(45,212,191,0.35)] hover:shadow-[0_0_32px_rgba(45,212,191,0.55)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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

            {/* Mobile Nav Links */}
            <div className="space-y-1 pt-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    pathname === link.href
                      ? "bg-mint-500/20 text-mint-300 border border-mint-500/30"
                      : link.isSpecial
                      ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </a>
              ))}
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
