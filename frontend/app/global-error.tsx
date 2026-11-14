"use client";

import React, { useEffect } from "react";

function resetSessionAndReload() {
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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Wanderlust global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="he" dir="rtl" className="dark">
      <body className="min-h-screen bg-[#050811] text-slate-100 flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full rounded-3xl bg-white/5 border border-white/15 p-8 text-center shadow-2xl space-y-5">
          <div className="text-xs font-bold tracking-[0.2em] text-emerald-300">
            WANDERLUST VOYAGE AI
          </div>
          <h2 className="text-xl font-bold text-white">אירעה שגיאה מערכתית בטעינת האפליקציה</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            ייתכן שנתוני הפעלה ישנים בדפדפן גרמו לתקלה. ניתן לנסות שוב או לנקות את מטמון ההתחברות.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              נסה שוב
            </button>
            <button
              type="button"
              onClick={resetSessionAndReload}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition cursor-pointer"
            >
              נקה מטמון והתחבר מחדש
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
