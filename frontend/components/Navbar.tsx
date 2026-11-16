"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mountain, Search, Globe, ArrowLeft, Menu, X, Check, User as UserIcon, LogOut } from "lucide-react";
import { SearchModal } from "@/components/SearchModal";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useCurrency, CURRENCIES, CurrencyCode } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

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
  const { locale, dir, toggleLocale, t } = useLocale();

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
    { label: t("דף הבית", "Home"), href: "/" },
    { label: t("גילוי ודילים ✨", "Discover & Deals ✨"), href: "/discover" },
    { label: t("טיסות חגים TLV ✈️", "TLV Holidays ✈️"), href: "/flights" },
    { label: t("יעדים", "Destinations"), href: "/destinations" },
    { label: t("חוויות", "Experiences"), href: "/experiences" },
    { label: t("מסלולים", "Trips"), href: "/trips" },
    { label: t("אודות", "About"), href: "/about" },
    { label: t("בלוג", "Blog"), href: "/blog" },
  ];

  const currencyList = Object.values(CURRENCIES);

  return (
    <>
      <header className="relative z-30 w-full px-3.5 sm:px-8 lg:px-12 xl:px-14 py-3 sm:py-4 border-b border-white/10 bg-[#060b14]/88 backdrop-blur-2xl sticky top-0 shadow-[0_8px_32px_rgba(0,0,0,0.45)]" dir={dir}>
        <div className="w-full max-w-[1850px] mx-auto flex items-center justify-between gap-2 sm:gap-6">
          {/* Logo (Right side in RTL) */}
          <a href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-mint-400/20 to-white/5 backdrop-blur-md border border-white/20 text-mint-400 group-hover:scale-105 transition-transform shadow-inner">
              <Mountain className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="font-heading font-black text-xs xs:text-sm sm:text-xl tracking-[0.06em] sm:tracking-[0.15em] text-white block truncate">
                WANDERLUST VOYAGES
              </span>
              <span className="text-[7px] sm:text-[9px] tracking-[0.16em] sm:tracking-[0.25em] text-slate-300/90 font-medium block truncate">
                TAILORED GLOBAL TRAVEL
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links (Center) */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-8 xl:gap-10 text-sm font-medium text-slate-200">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`transition py-1 relative whitespace-nowrap ${
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

          {/* Left Controls (Search, Locale, Currency, Plan Button) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* BiDi Locale Toggle (HE | EN) */}
            <button
              type="button"
              onClick={toggleLocale}
              title={t("החלף שפה (עברית / English)", "Switch Language (HE / EN)")}
              aria-label="Toggle Locale"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/20 border border-white/15 text-[11px] font-bold text-slate-200 transition"
            >
              <Globe className="w-3.5 h-3.5 text-mint-400" />
              <span className={locale === "he" ? "text-mint-300" : "text-slate-400"}>HE</span>
              <span className="text-slate-600">|</span>
              <span className={locale === "en" ? "text-mint-300" : "text-slate-400"}>EN</span>
            </button>

            {/* Compact Mobile Currency Pill */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="sm:hidden flex items-center gap-1 px-2.5 py-2 rounded-full bg-white/[0.07] border border-white/15 text-[11px] font-bold text-slate-200"
              aria-label="מטבע נוכחי"
            >
              <span>{currencyConfig.flag}</span>
              <span>{currencyConfig.symbol}</span>
            </button>

            {/* Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              title={t("חיפוש יעדים", "Search Destinations")}
              aria-label={t("חיפוש יעדים", "Search Destinations")}
              className="w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 backdrop-blur-md border border-white/10 transition flex items-center justify-center"
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
                    title={user.full_name || user.email || "פרופיל משתמש"}
                  >
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.full_name || "User"}
                        className="w-7 h-7 rounded-full object-cover border border-mint-400/60 shadow-sm"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.triedFallback) {
                            target.dataset.triedFallback = "true";
                            target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email || user.full_name || "wanderlust")}`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                        {((user.full_name || user.email || "W").trim().charAt(0) || "W").toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-white max-w-[100px] truncate text-right">
                      {user.full_name?.trim() || (user.email ? user.email.split("@")[0] : "מטייל")}
                    </span>
                    <span className="text-[10px] text-slate-400">▾</span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 rounded-2xl wanderlust-glass border border-white/15 p-2 shadow-2xl space-y-1 z-50 animate-fade-in bg-[#0c121e]/95 backdrop-blur-xl text-right">
                      <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-3">
                        {user.picture ? (
                          <img
                            src={user.picture}
                            alt={user.full_name || "User"}
                            className="w-11 h-11 rounded-full object-cover border-2 border-mint-400 shadow-md shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.dataset.triedFallback) {
                                target.dataset.triedFallback = "true";
                                target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email || user.full_name || "wanderlust")}`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center shrink-0">
                            {((user.full_name || user.email || "W").trim().charAt(0) || "W").toUpperCase()}
                          </div>
                        )}
                        <div className="overflow-hidden flex-1 text-right">
                          <span className="block text-white text-xs font-bold truncate">
                            {user.full_name || "מטייל רשום"}
                          </span>
                          <span className="block text-[11px] text-slate-400 truncate font-mono" dir="ltr">
                            {user.email || ""}
                          </span>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-mint-500/15 border border-mint-500/30 text-[10px] text-mint-300 font-medium">
                            {user.auth_provider === "google" ? "Google OAuth" : "Wanderlust User"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          router.push("/profile");
                        }}
                        className="w-full px-3 py-2 rounded-xl text-right text-xs font-semibold hover:bg-mint-500/15 text-mint-300 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-mint-400" />
                          <span>הפרופיל שלי והגדרות</span>
                        </div>
                        <span className="text-[10px] bg-mint-500/20 px-1.5 py-0.5 rounded text-mint-300">חדש</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          router.push("/profile?tab=bookings");
                        }}
                        className="w-full px-3 py-2 rounded-xl text-right text-xs font-medium hover:bg-white/10 text-slate-200 transition flex items-center justify-between"
                      >
                        <span>ההזמנות והכרטיסים שלי</span>
                      </button>

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
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white md:hidden flex items-center justify-center transition"
              aria-label={isMobileMenuOpen ? "סגור תפריט" : "פתח תפריט"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-3 pt-4 border-t border-white/10 space-y-3.5 max-h-[calc(100dvh-76px)] overflow-y-auto pb-4 animate-fade-in">
            {/* Mobile User Profile Section */}
            {isAuthenticated && user ? (
              <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="flex items-center gap-2.5 flex-1 text-right min-w-0 min-h-[44px] rounded-xl hover:bg-white/5 px-1 transition"
                  title="עבור לפרופיל שלי"
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.full_name || "User"}
                      className="w-9 h-9 rounded-full object-cover border border-mint-400 shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.triedFallback) {
                          target.dataset.triedFallback = "true";
                          target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email || user.full_name || "wanderlust")}`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                      {((user.full_name || user.email || "W").trim().charAt(0) || "W").toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block text-white text-xs font-bold truncate">
                      {user.full_name || user.email || "מטייל רשום"}
                    </span>
                    <span className="block text-[10px] text-mint-300">
                      {user.auth_provider === "google" ? "פרופיל Google • לחץ לצפייה" : "לפרופיל והזמנות שלי ←"}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="px-3 py-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/25 text-xs font-semibold flex items-center gap-1 shrink-0 min-h-[40px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>התנתק</span>
                </button>
              </div>
            ) : (
              <div className="pt-1">
                <a
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 text-white font-bold text-xs border border-white/15"
                >
                  <UserIcon className="w-4 h-4 text-mint-400" />
                  <span>כניסה / הרשמה למערכת</span>
                </a>
              </div>
            )}

            {/* 2-Column Mobile Nav Tiles */}
            <div className="grid grid-cols-2 gap-2">
              {NAV_LINKS.map((link, idx) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    idx === 0 ? "col-span-2" : ""
                  } ${
                    pathname === link.href
                      ? "bg-mint-500/20 text-mint-300 border border-mint-500/35 shadow-sm"
                      : "bg-white/[0.04] text-slate-200 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span>{link.label}</span>
                  {pathname === link.href && (
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-400" />
                  )}
                </a>
              ))}
            </div>

            {/* Mobile Currency Selector */}
            <div className="pt-2.5 border-t border-white/10">
              <span className="text-xs text-slate-400 block mb-2 font-medium">מטבע תשלום לתצוגה:</span>
              <div className="grid grid-cols-3 gap-2">
                {currencyList.map((curr) => {
                  const isSelected = currency === curr.code;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => setCurrency(curr.code as CurrencyCode)}
                      className={`min-h-[44px] p-2 rounded-xl text-center border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
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

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (pathname === "/") {
                    document.getElementById("planner-form")?.scrollIntoView({ behavior: "smooth" });
                  } else {
                    router.push("/#planner-form");
                  }
                }}
                className="w-full btn-mint py-3.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 min-h-[46px]"
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

      {/* Mobile Floating Bottom Navigation Bar */}
      <MobileBottomNav />
    </>
  );
};
