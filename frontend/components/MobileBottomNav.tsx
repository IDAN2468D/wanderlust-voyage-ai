"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Plane, Sparkles, Compass, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handlePlanClick = () => {
    if (pathname === "/") {
      const formEl = document.getElementById("planner-form");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    router.push("/#planner-form");
  };

  const navItems = [
    {
      label: "בית",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
      onClick: () => router.push("/"),
    },
    {
      label: "טיסות",
      href: "/flights",
      icon: Plane,
      isActive: pathname === "/flights",
      onClick: () => router.push("/flights"),
    },
    {
      label: "תכנן AI",
      href: "/#planner-form",
      icon: Sparkles,
      isPrimary: true,
      isActive: false,
      onClick: handlePlanClick,
    },
    {
      label: "מסלולים",
      href: "/trips",
      icon: Compass,
      isActive: pathname === "/trips" || pathname === "/destinations",
      onClick: () => router.push("/trips"),
    },
    {
      label: isAuthenticated ? "פרופיל" : "התחבר",
      href: isAuthenticated ? "/profile" : "/login",
      icon: User,
      isActive: pathname === "/profile" || pathname === "/login",
      onClick: () => router.push(isAuthenticated ? "/profile" : "/login"),
    },
  ];

  return (
    <nav
      aria-label="ניווט מהיר במובייל"
      dir="rtl"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pt-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-[#09101d]/92 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.1)] px-2 py-1.5 grid grid-cols-5 items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isPrimary) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center -mt-3.5 group"
                aria-label={item.label}
              >
                <span className="w-11 h-11 rounded-2xl btn-mint flex items-center justify-center shadow-lg shadow-teal-500/35 border border-white/30 group-active:scale-95 transition">
                  <Icon className="w-5 h-5 text-slate-950" />
                </span>
                <span className="text-[10px] font-extrabold text-mint-300 mt-1 leading-none">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`min-h-[46px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                item.isActive
                  ? "bg-mint-500/15 text-mint-300 border border-mint-400/25 shadow-inner"
                  : "text-slate-400 hover:text-white active:bg-white/5 border border-transparent"
              }`}
              aria-label={item.label}
            >
              <Icon className={`w-4 h-4 ${item.isActive ? "text-mint-400" : ""}`} />
              <span className="text-[10px] font-bold leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
