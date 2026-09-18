"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  User,
  Plane,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Phone,
  FileText,
  MapPin,
  Clock,
  Sparkles,
  ArrowLeft,
  LogOut,
  Download,
  Send,
  Lock,
  Compass,
  Star,
  Settings,
  AlertCircle,
  Check,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Tag,
  Eye,
  EyeOff,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCurrency, CURRENCIES, CurrencyCode } from "@/context/CurrencyContext";

interface BookingRecord {
  booking_ref: string;
  destination: string;
  duration_days: number;
  total_amount: number;
  currency: string;
  recipient_email: string;
  customer_name: string;
  payment_method: string;
  installments?: number;
  booking_date: string;
  status: string;
  flight_portion?: number;
  hotel_portion?: number;
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { currency, setCurrency, formatRaw } = useCurrency();

  const tabParam = searchParams.get("tab") || "bookings";
  const [activeTab, setActiveTab] = useState<"bookings" | "personal" | "saved" | "preferences" | "security">(
    (tabParam as any) || "bookings"
  );

  // Bookings state from localStorage
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [resendingRef, setResendingRef] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Personal details state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("ישראל (ישראלית)");
  const [showPassport, setShowPassport] = useState(false);
  const [personalSaveStatus, setPersonalSaveStatus] = useState<"idle" | "saved">("idle");

  // Preferences state
  const [seatingPreference, setSeatingPreference] = useState("window");
  const [dietary, setDietary] = useState("standard");
  const [autoBuffer, setAutoBuffer] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [prefSaveStatus, setPrefSaveStatus] = useState<"idle" | "saved">("idle");

  // Saved Trips state
  const [savedTrip, setSavedTrip] = useState<any>(null);

  // Modal for Viewing Voucher
  const [activeVoucher, setActiveVoucher] = useState<BookingRecord | null>(null);

  // Load profile data and bookings on mount
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
    }

    // Load personal info from localStorage if present
    try {
      const storedPersonal = localStorage.getItem("wanderlust_user_profile_details");
      if (storedPersonal) {
        const parsed = JSON.parse(storedPersonal);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.passportNumber) setPassportNumber(parsed.passportNumber);
        if (parsed.passportExpiry) setPassportExpiry(parsed.passportExpiry);
        if (parsed.birthDate) setBirthDate(parsed.birthDate);
        if (parsed.nationality) setNationality(parsed.nationality);
      }
    } catch (e) {}

    // Load preferences
    try {
      const storedPref = localStorage.getItem("wanderlust_user_preferences");
      if (storedPref) {
        const parsed = JSON.parse(storedPref);
        if (parsed.seatingPreference) setSeatingPreference(parsed.seatingPreference);
        if (parsed.dietary) setDietary(parsed.dietary);
        if (parsed.autoBuffer !== undefined) setAutoBuffer(parsed.autoBuffer);
        if (parsed.emailNotifications !== undefined) setEmailNotifications(parsed.emailNotifications);
      }
    } catch (e) {}

    // Load bookings
    try {
      const storedBookings = localStorage.getItem("wanderlust_user_bookings");
      if (storedBookings) {
        const parsed = JSON.parse(storedBookings);
        setBookings(parsed);
      } else {
        // Sample default booking for demo delight if fresh user
        const sampleBooking: BookingRecord = {
          booking_ref: "WNDR-782914",
          destination: "באלי, אינדונזיה",
          duration_days: 8,
          total_amount: 1750,
          currency: "USD",
          recipient_email: user?.email || "traveler@example.com",
          customer_name: user?.full_name || "ישראל ישראלי",
          payment_method: "card",
          installments: 1,
          booking_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          status: "CONFIRMED",
          flight_portion: 665,
          hotel_portion: 735,
        };
        setBookings([sampleBooking]);
      }
    } catch (e) {}

    // Load saved last trip
    try {
      const lastTrip = localStorage.getItem("wanderlust_last_planned_trip");
      if (lastTrip) {
        setSavedTrip(JSON.parse(lastTrip));
      }
    } catch (e) {}
  }, [user]);

  // Handle Save Personal Details
  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        "wanderlust_user_profile_details",
        JSON.stringify({
          phone,
          passportNumber,
          passportExpiry,
          birthDate,
          nationality,
        })
      );
      setPersonalSaveStatus("saved");
      setTimeout(() => setPersonalSaveStatus("idle"), 3000);
    } catch (e) {}
  };

  // Handle Save Preferences
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        "wanderlust_user_preferences",
        JSON.stringify({
          seatingPreference,
          dietary,
          autoBuffer,
          emailNotifications,
        })
      );
      setPrefSaveStatus("saved");
      setTimeout(() => setPrefSaveStatus("idle"), 3000);
    } catch (e) {}
  };

  // Resend booking confirmation voucher to email
  const handleResendVoucher = async (booking: BookingRecord) => {
    setResendingRef(booking.booking_ref);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://wanderlust-voyage-ai.onrender.com";
      await fetch(`${apiBase}/api/v1/workspace/booking-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_ref: booking.booking_ref,
          destination: booking.destination,
          duration_days: booking.duration_days,
          total_amount: booking.total_amount,
          currency: booking.currency,
          recipient_email: booking.recipient_email,
          customer_name: booking.customer_name,
          flight_portion: booking.flight_portion,
          hotel_portion: booking.hotel_portion,
          payment_method: booking.payment_method,
          installments: booking.installments,
        }),
      });
      setResendSuccess(booking.booking_ref);
      setTimeout(() => setResendSuccess(null), 4000);
    } catch (err) {
      console.warn("Could not resend voucher:", err);
    } finally {
      setResendingRef(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#050811] text-white selection:bg-mint-400 selection:text-slate-950 font-sans relative pb-20" dir="rtl">
      {/* Background Liquid Aurora */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[140px]" />
        <div className="absolute top-2/3 -left-40 w-[550px] h-[550px] rounded-full bg-mint-500/10 blur-[130px]" />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 pt-8 space-y-8">
        {/* ========================================================
            PROFILE HEADER BANNER (Liquid Glass 4.0 Pro)
        ======================================================== */}
        <div className="wanderlust-glass rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-mint-500/15 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
            {/* User Avatar & Identity */}
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-right">
              <div className="relative">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.full_name || "User"}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-mint-400/80 shadow-2xl shadow-mint-500/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-teal-500 via-emerald-400 to-mint-300 text-slate-950 font-black text-3xl sm:text-4xl flex items-center justify-center shadow-2xl shadow-mint-500/20">
                    {(user?.full_name || user?.email || "W")[0].toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-emerald-500 text-slate-950 shadow-lg border border-white/20">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                    {user?.full_name || "מטייל Wanderlust"}
                  </h1>
                  <span className="px-3 py-0.5 rounded-full bg-mint-500/15 border border-mint-500/30 text-mint-300 text-[11px] font-bold">
                    חבר VIP מועדון נוסעים
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 font-mono" dir="ltr">
                  {user?.email}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-mint-400" />
                    <span>{user?.auth_provider === "google" ? "אימות מלא מול Google" : "חשבון מאומת"}</span>
                  </span>
                  <span className="text-white/20">•</span>
                  <span>הצטרף ב-2026</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/#planner-form")}
                className="btn-mint px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition"
              >
                <Compass className="w-4 h-4" />
                <span>תכנן טיול חדש</span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-2 transition"
                title="התנתק מהחשבון"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">התנתק</span>
              </button>
            </div>
          </div>

          {/* 4 Stats Metrics Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10 text-right">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>הזמנות מאושרות</span>
                <Plane className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{bookings.length}</div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>מסלולים שמורים</span>
                <FileText className="w-3.5 h-3.5 text-mint-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">{savedTrip ? 1 : 0}</div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>חיסכון מוערך ב-AI</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400 font-mono">₪4,850</div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>נקודות מועדון</span>
                <Star className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-300 font-mono">1,250 מייל</div>
            </div>
          </div>
        </div>

        {/* ========================================================
            NAVIGATION TABS (Bookings, Personal, Saved, Preferences, Security)
        ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
          {[
            { id: "bookings", label: "ההזמנות והכרטיסים שלי", icon: Plane, count: bookings.length },
            { id: "personal", label: "פרטים אישיים ודרכון", icon: User },
            { id: "saved", label: "מסלולים שמורים", icon: FileText, count: savedTrip ? 1 : 0 },
            { id: "preferences", label: "העדפות נסיעה וסוכנים", icon: Settings },
            { id: "security", label: "אבטחה והתחברות", icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  isCurrent
                    ? "bg-mint-500/20 text-mint-300 border border-mint-400/60 shadow-lg shadow-mint-500/10"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? "text-mint-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================
            TAB 1: MY BOOKINGS & TICKETS
        ======================================================== */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-right">
              <div>
                <h3 className="text-xl font-serif font-bold text-white">ההזמנות ושובריי הנסיעה שלך</h3>
                <p className="text-xs text-slate-400">
                  כל ההזמנות שבוצעו באתר כולל שובר כרטוס, סימוכין בינלאומי ואפשרות שיגור מחודש למייל.
                </p>
              </div>
            </div>

            {resendSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>שובר ההזמנה (סימוכין {resendSuccess}) שוגר בהצלחה מחדש ישירות לתיבת הדואר שלך!</span>
              </div>
            )}

            {bookings.length === 0 ? (
              <div className="wanderlust-glass rounded-3xl p-12 text-center space-y-4 border border-white/10">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                  <Plane className="w-8 h-8 opacity-60" />
                </div>
                <h4 className="text-lg font-bold text-white">עדיין אין לך הזמנות פעילות</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  מתכננים חופשה? תנו ל-7 סוכני ה-AI לבנות עבורכם את המסלול המושלם עם טיסות מאומתות ומלונות מובילים.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/#planner-form")}
                  className="btn-mint px-6 py-3 rounded-full text-xs font-bold"
                >
                  התחל תכנון טיול עכשיו
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {bookings.map((b, idx) => (
                  <div
                    key={idx}
                    className="wanderlust-glass-card rounded-3xl p-5 sm:p-6 border border-white/15 hover:border-mint-400/40 shadow-xl transition flex flex-col md:flex-row md:items-center justify-between gap-5 text-right"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-mint-300 bg-mint-500/15 border border-mint-500/30 px-3 py-1 rounded-xl">
                          {b.booking_ref}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>כרטיסים ושובר הונפקו</span>
                        </span>
                        <span className="text-xs text-slate-400">
                          הוזמן ב: {new Date(b.booking_date).toLocaleDateString("he-IL")}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xl font-serif font-bold text-white">
                          חופשת נופש ב-{b.destination} ({b.duration_days} ימים)
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-1">
                          <span>נוסע ראשי: <strong className="text-white">{b.customer_name}</strong></span>
                          <span className="text-white/20">•</span>
                          <span>אימייל שנרשם: <strong className="text-mint-300 font-mono" dir="ltr">{b.recipient_email}</strong></span>
                          <span className="text-white/20">•</span>
                          <span>
                            אמצעי תשלום:{" "}
                            {b.payment_method === "card"
                              ? "כרטיס אשראי"
                              : b.payment_method === "apple_pay"
                              ? "Apple Pay"
                              : b.payment_method === "google_pay"
                              ? "Google Pay"
                              : "ביט bit"}
                            {b.installments && b.installments > 1 ? ` (${b.installments} תשלומים)` : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-end sm:items-center md:items-end lg:items-center justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block">סכום שחויב:</span>
                        <span className="text-xl font-heading font-black text-mint-400">
                          {formatRaw(b.total_amount, true)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveVoucher(b)}
                          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-mint-400" />
                          <span>צפה בשובר</span>
                        </button>

                        <button
                          type="button"
                          disabled={resendingRef === b.booking_ref}
                          onClick={() => handleResendVoucher(b)}
                          className="btn-mint px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                        >
                          {resendingRef === b.booking_ref ? (
                            <span>שולח...</span>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>שלח למייל</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: PERSONAL & PASSPORT DETAILS
        ======================================================== */}
        {activeTab === "personal" && (
          <form onSubmit={handleSavePersonal} className="wanderlust-glass rounded-3xl p-6 sm:p-8 border border-white/15 space-y-6 text-right">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-serif font-bold text-white">פרטי נוסע ראשי ודרכון</h3>
              <p className="text-xs text-slate-400">
                פרטים אלו נשמרים בדפדפן שלך ומאכלסים אוטומטית את שלב הסליקה וההזמנה (כדי שלא תצטרך להקליד שוב).
              </p>
            </div>

            {personalSaveStatus === "saved" && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>פרטי הנוסע והדרכון נשמרו בהצלחה!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-medium">שם מלא (באנגלית ובעברית):</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ישראל ישראלי / ISRAEL ISRAELI"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-mint-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-medium">כתובת אימייל:</label>
                <input
                  type="email"
                  required
                  value={email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/10 text-slate-400 text-xs font-mono cursor-not-allowed"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-medium">טלפון נייד לקבלת הודעות חופשה:</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="050-1234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-mint-400 transition"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-medium">אזרחות:</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="ישראלית"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-mint-400 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-300 font-medium">מספר דרכון:</label>
                  <button
                    type="button"
                    onClick={() => setShowPassport(!showPassport)}
                    className="text-[10px] text-mint-400 flex items-center gap-1 hover:underline"
                  >
                    {showPassport ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-mint-400" />}
                    <span>{showPassport ? "הסתר" : "הצג"}</span>
                  </button>
                </div>
                <input
                  type={showPassport ? "text" : "password"}
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="A12345678"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-mint-400 transition"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-medium">תוקף דרכון (חייב 6 חודשים ממועד הטיול):</label>
                <input
                  type="date"
                  value={passportExpiry}
                  onChange={(e) => setPassportExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-mint-400 transition"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                className="btn-mint px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition"
              >
                <Check className="w-4 h-4" />
                <span>שמור פרטים לשימוש בהזמנות עתידיות</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            TAB 3: SAVED ITINERARIES
        ======================================================== */}
        {activeTab === "saved" && (
          <div className="space-y-4 text-right">
            <div>
              <h3 className="text-xl font-serif font-bold text-white">מסלולים שתוכננו ונשמרו</h3>
              <p className="text-xs text-slate-400">
                המסלולים האחרונים שיוצרו עבורך על ידי סוכני ה-AI של Wanderlust.
              </p>
            </div>

            {savedTrip ? (
              <div className="wanderlust-glass-card rounded-3xl p-6 border border-white/15 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-mint-500/20 text-mint-300 border border-mint-500/30 font-bold uppercase">
                      מסלול AI מוכן
                    </span>
                    <h4 className="text-xl font-serif font-bold text-white mt-1">
                      {savedTrip.destination} • {savedTrip.duration_days} ימים
                    </h4>
                    <p className="text-xs text-slate-400">
                      תקציב משוער: ${savedTrip.total_estimated_usd?.toLocaleString() || "2,400"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/?destination=${encodeURIComponent(savedTrip.destination)}&duration=${savedTrip.duration_days}`)}
                      className="btn-mint px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <Compass className="w-4 h-4" />
                      <span>פתח והמשך תכנון</span>
                    </button>
                  </div>
                </div>

                {savedTrip.markdown_plan && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
                    <pre className="whitespace-pre-wrap font-sans text-xs">{savedTrip.markdown_plan.slice(0, 500)}...</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="wanderlust-glass rounded-3xl p-10 text-center space-y-3 border border-white/10">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-base font-bold text-white">אין מסלולים שמורים כרגע</h4>
                <p className="text-xs text-slate-400">
                  השתמשו במנוע החיפוש בדף הבית כדי לתכנן מסלול ראשון.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: TRAVEL PREFERENCES & AI AGENTS
        ======================================================== */}
        {activeTab === "preferences" && (
          <form onSubmit={handleSavePreferences} className="wanderlust-glass rounded-3xl p-6 sm:p-8 border border-white/15 space-y-6 text-right">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-serif font-bold text-white">העדפות מסע וסוכני בינה מלאכותית</h3>
              <p className="text-xs text-slate-400">
                הגדרות אלו ינחו את 7 הסוכנים בכל תכנון עתידי שתבצע באתר.
              </p>
            </div>

            {prefSaveStatus === "saved" && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>העדפות המסע עודכנו בהצלחה!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">העדפת הושבה בטיסות:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "window", label: "🪟 חלון (Window)" },
                    { id: "aisle", label: "🚶 מעבר (Aisle)" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSeatingPreference(s.id)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                        seatingPreference === s.id
                          ? "bg-mint-500/20 text-mint-300 border-mint-400"
                          : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">העדפות תזונה וקולינריה:</label>
                <select
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-mint-400"
                >
                  <option value="standard" className="bg-slate-900">הכל / ללא הגבלות</option>
                  <option value="kosher" className="bg-slate-900">כשר (Kosher-Friendly)</option>
                  <option value="vegetarian" className="bg-slate-900">צמחוני (Vegetarian)</option>
                  <option value="vegan" className="bg-slate-900">טבעוני (Vegan)</option>
                  <option value="gluten_free" className="bg-slate-900">ללא גלוטן (Gluten-Free)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">מטבע תצוגה מועדף:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ILS", "USD", "EUR"] as CurrencyCode[]).map((code) => {
                    const item = CURRENCIES[code];
                    const isSelected = currency === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCurrency(code)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-mint-500/25 text-mint-300 border-mint-400 shadow-md shadow-mint-500/10"
                            : "bg-black/30 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <span>{item.flag}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBuffer}
                    onChange={(e) => setAutoBuffer(e.target.checked)}
                    className="w-4 h-4 rounded accent-teal-400"
                  />
                  <span className="text-xs text-slate-200">
                    הקצאת 10% בלת״ם קבועה ע״י סוכן התקציב (למניעת חריגות)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 rounded accent-teal-400"
                  />
                  <span className="text-xs text-slate-200">
                    קבלת התראות על ירידת מחירי טיסות ואישורי שובר במייל
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="submit"
                className="btn-mint px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl"
              >
                <Check className="w-4 h-4" />
                <span>שמור העדפות מסע</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            TAB 5: SECURITY & AUTH
        ======================================================== */}
        {activeTab === "security" && (
          <div className="wanderlust-glass rounded-3xl p-6 sm:p-8 border border-white/15 space-y-6 text-right">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-serif font-bold text-white">אבטחה, אימות והפעלת סשנים</h3>
              <p className="text-xs text-slate-400">
                פרטי ההתחברות שלך מאובטחים בהצפנה מקצה לקצה בתקן SSL/TLS 256-Bit.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-mint-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">חיבור מאומת לחשבון</h4>
                    <span className="text-xs text-slate-400">
                      {user?.auth_provider === "google" ? "מחובר באמצעות Google OAuth 2.0 מאובטח" : "משתמש רשום מקומי"}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  פעיל ומאומת
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">איפוס סיסמה למייל</h4>
                    <span className="text-xs text-slate-400">קבלת קישור איפוס מאובטח ל-60 דקות באמצעות Resend</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/login?action=forgot-password")}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                >
                  שלח קישור איפוס
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          VOUCHER PREVIEW MODAL
      ======================================================== */}
      {activeVoucher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          dir="rtl"
        >
          <div className="relative w-full max-w-lg wanderlust-glass rounded-3xl border border-white/20 shadow-2xl p-6 text-white space-y-5 bg-[#0a101b]/95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-mint-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>שובר הזמנה רשמי (Official Voucher)</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVoucher(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl p-5 border border-white/15 space-y-3 text-right">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-xs text-slate-400">סימוכין בינלאומי:</span>
                <span className="font-mono font-black text-mint-300 text-sm bg-mint-500/10 px-2.5 py-1 rounded-lg border border-mint-500/20">
                  {activeVoucher.booking_ref}
                </span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">יעד ומסלול:</span>
                <span className="font-bold text-white">{activeVoucher.destination} ({activeVoucher.duration_days} ימים)</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">נוסע ראשי:</span>
                <span className="font-bold text-white">{activeVoucher.customer_name}</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">אימייל לקבלת כרטיסים:</span>
                <span className="font-mono text-mint-300" dir="ltr">{activeVoucher.recipient_email}</span>
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-slate-400">סכום שחויב:</span>
                <span className="font-black text-emerald-400 text-base">{formatRaw(activeVoucher.total_amount, true)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleResendVoucher(activeVoucher)}
                className="flex-1 btn-mint py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>שגר שוב למייל המזמין</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVoucher(null)}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050811] flex items-center justify-center text-white">
          <div className="animate-spin w-8 h-8 border-2 border-mint-400 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
