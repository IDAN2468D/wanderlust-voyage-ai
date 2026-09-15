"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mountain, Search, Globe, ArrowLeft, Menu, X, Check } from "lucide-react";
import { SearchModal } from "@/components/SearchModal";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD $");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NAV_LINKS = [
    { label: "דף הבית", href: "/" },
    { label: "יעדים", href: "/destinations" },
    { label: "חוויות", href: "/experiences" },
    { label: "מסלולים", href: "/trips" },
    { label: "אודות", href: "/about" },
    { label: "בלוג", href: "/blog" },
  ];

  const CURRENCIES = ["USD $", "ILS ₪", "EUR €"];

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

            {/* Currency Selector Dropdown */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full border border-white/10 backdrop-blur-md transition"
              >
                <Globe className="w-3.5 h-3.5 text-mint-400" />
                <span>{selectedCurrency} ▾</span>
              </button>

              {isCurrencyOpen && (
                <div className="absolute left-0 mt-2 w-32 rounded-2xl wanderlust-glass border border-white/15 p-1.5 shadow-xl space-y-1 z-50 animate-fade-in">
                  {CURRENCIES.map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => {
                        setSelectedCurrency(curr);
                        setIsCurrencyOpen(false);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl text-right text-xs font-medium hover:bg-white/10 text-white flex items-center justify-between"
                    >
                      <span>{curr}</span>
                      {selectedCurrency === curr && <Check className="w-3 h-3 text-mint-400" />}
                    </button>
                  ))}
                </div>
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
          <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-2 animate-fade-in">
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
