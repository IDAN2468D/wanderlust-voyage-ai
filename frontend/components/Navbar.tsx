"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mountain, Search, Globe, ArrowLeft, Menu, X, Check, User as UserIcon, LogOut } from "lucide-react";
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

  const NAV_LINKS = [
    { label: "דף הבית", href: "/" },
    { label: "טיסות חגים TLV ✈️", href: "/flights" },
    { label: "יעדים", href: "/destinations" },
    { label: "חוויות", href: "/experiences" },
    { label: "מסלולים", href: "/trips" },
    { label: "אודות", href: "/about" },
    { label: "בלוג", href: "/blog" },
  ];

  const currencyList = Object.values(CURRENCIES);

  return (
    <>
      <header className="relative z-30 w-full px-6 sm:px-12 lg:px-16 py-5 border-b border-white/5 bg-[#070c12]/80 backdrop-blur-xl sticky top-0" dir="rtl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo (Right side in RTL) */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-mint-400 group-hover:scale-105 transition-transform">
              <Mountain className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="font-heading font-black text-lg sm:text-xl tracking-[0.2em] text-white block">
                WANDERLUST
              </span>
              <span className="text-[8px] sm:text-[9px] tracking-[0.25em] text-slate-300 font-medium block">
                EXPLORE. DREAM. DISCOVER.
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links (Center) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-200">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`transition py-1 relative ${
                    isActive ? "text-mint-400 font-bold" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-mint-400 rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Left Controls (Search, Currency, Plan Button) */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              title="חיפוש יעדים"
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 backdrop-blur-md border border-white/10 transition"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Currency Selector Dropdown (Desktop) */}
            <div className="relative hidden sm:block" ref={currencyDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full border border-white/10 backdrop-blur-md transition shadow-sm"
                aria-label="בחר מטבע תשלום"
              >
                <span className="text-sm leading-none">{currencyConfig.flag}</span>
                <span className="font-medium text-white">{currencyConfig.label}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>

              {isCurrencyOpen && (
                <div className="absolute left-0 mt-2 w-44 rounded-2xl wanderlust-glass border border-white/15 p-1.5 shadow-2xl space-y-1 z-50 animate-fade-in bg-[#0c121e]/95 backdrop-blur-xl">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 border-b border-white/10 text-right">
                    בחר מטבע תשלום
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
                        className={`w-full px-3 py-2 rounded-xl text-right text-xs font-medium transition flex items-center justify-between ${
                          isSelected
                            ? "bg-mint-500/20 text-mint-300 font-bold border border-mint-500/30"
                            : "hover:bg-white/10 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{curr.flag}</span>
                          <div className="text-right">
                            <span className="block text-white text-xs">{curr.label}</span>
                            <span className="block text-[10px] text-slate-400">{curr.hebrewName}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-mint-400 shrink-0" />}
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
                    className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 pl-3 pr-2 py-1.5 rounded-full border border-white/15 backdrop-blur-md transition shadow-sm group"
                    title={user.full_name || user.email}
                  >
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.full_name || "User"}
                        className="w-6 h-6 rounded-full object-cover border border-mint-400/50"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-bold text-[11px] flex items-center justify-center">
                        {(user.full_name || user.email)[0].toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-white max-w-[100px] truncate text-right">
                      {user.full_name || user.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] text-slate-400">▾</span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 rounded-2xl wanderlust-glass border border-white/15 p-2 shadow-2xl space-y-1 z-50 animate-fade-in bg-[#0c121e]/95 backdrop-blur-xl text-right">
                      <div className="px-3 py-2 border-b border-white/10">
                        <span className="block text-white text-xs font-bold truncate">
                          {user.full_name || "מטייל רשום"}
                        </span>
                        <span className="block text-[11px] text-slate-400 truncate" dir="ltr">
                          {user.email}
                        </span>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-mint-500/15 border border-mint-500/30 text-[10px] text-mint-300 font-medium">
                          {user.auth_provider === "google" ? "Google OAuth" : "Wanderlust User"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          router.push("/trips");
                        }}
                        className="w-full px-3 py-2 rounded-xl text-right text-xs font-medium hover:bg-white/10 text-slate-200 transition flex items-center justify-between"
                      >
                        <span>המסלולים השמורים שלי</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full px-3 py-2 rounded-xl text-right text-xs font-medium hover:bg-rose-500/20 text-rose-300 transition flex items-center justify-between border-t border-white/5 pt-2"
                      >
                        <span>התנתק מהמערכת</span>
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <a
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full border border-white/15 backdrop-blur-md transition"
                >
                  <UserIcon className="w-3.5 h-3.5 text-mint-400" />
                  <span>התחברות</span>
                </a>
              )}
            </div>

            {/* Plan Button */}
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
              className="btn-mint hidden sm:flex px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold tracking-wide items-center gap-2"
            >
              <span>תכנן טיול</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-full bg-white/10 text-white md:hidden"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-3 animate-fade-in">
            {/* Mobile User Profile Section */}
            {isAuthenticated && user ? (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.full_name || "User"}
                      className="w-8 h-8 rounded-full object-cover border border-mint-400"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      {(user.full_name || user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-right">
                    <span className="block text-white text-xs font-bold truncate max-w-[160px]">
                      {user.full_name || user.email}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {user.auth_provider === "google" ? "מחובר עם Google" : "משתמש מחובר"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="p-2 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-medium flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>התנתק</span>
                </button>
              </div>
            ) : (
              <div className="pt-1 pb-2">
                <a
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 text-white font-bold text-xs border border-white/15"
                >
                  <UserIcon className="w-4 h-4 text-mint-400" />
                  <span>כניסה / הרשמה למערכת</span>
                </a>
              </div>
            )}

            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-xl text-sm font-semibold ${
                  pathname === link.href
                    ? "bg-mint-500/20 text-mint-300 border border-mint-500/30"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {link.label}
              </a>
            ))}

            {/* Mobile Currency Selector */}
            <div className="pt-2 border-t border-white/10">
              <span className="text-xs text-slate-400 block mb-2 font-medium">מטבע תשלום לתצוגה:</span>
              <div className="grid grid-cols-3 gap-2">
                {currencyList.map((curr) => {
                  const isSelected = currency === curr.code;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => setCurrency(curr.code as CurrencyCode)}
                      className={`p-2 rounded-xl text-center border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-mint-500/20 text-mint-300 border-mint-500/40 shadow-sm"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <span>{curr.flag}</span>
                      <span>{curr.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push("/#planner-form");
                }}
                className="w-full btn-mint py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>תכנן את הטיול שלך עם AI</span>
                <ArrowLeft className="w-3.5 h-3.5" />
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
