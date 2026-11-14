"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw, Trash2, Mountain } from "lucide-react";

function clearLocalSessionAndRedirect() {
  try {
    const keysToClear = [
      "wanderlust_auth_token",
      "wanderlust_user",
      "wanderlust_user_bookings",
      "wanderlust_last_planned_trip",
    ];
    for (const key of keysToClear) {
      localStorage.removeItem(key);
    }
    document.cookie = "wanderlust_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "wanderlust_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  } catch {
    // Ignore storage access errors
  }
  window.location.href = "/login";
}

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Wanderlust route error caught by error boundary:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen bg-[#050811] text-white flex items-center justify-center p-6 font-sans"
      dir="rtl"
    >
      <div className="max-w-md w-full rounded-3xl bg-white/[0.04] border border-white/15 backdrop-blur-2xl p-8 text-center shadow-2xl space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-mint-400 tracking-wider uppercase">
            <Mountain className="w-3.5 h-3.5" />
            <span>WANDERLUST VOYAGE AI</span>
          </div>
          <h2 className="text-xl font-bold text-white">אופס! אירעה שגיאה בטעינת הדף</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            נתקלנו בשגיאה בלתי צפויה בדפדפן. ניתן לנסות לרענן את התצוגה או לאפס את נתוני ההתחברות המקומיים.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 btn-mint py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>נסה שוב</span>
          </button>

          <button
            type="button"
            onClick={clearLocalSessionAndRedirect}
            className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-300" />
            <span>אפס סשן והתחבר מחדש</span>
          </button>
        </div>
      </div>
    </div>
  );
}
