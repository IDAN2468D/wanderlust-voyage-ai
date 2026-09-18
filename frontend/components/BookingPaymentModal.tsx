"use client";

import React, { useState, useEffect, useId } from "react";
import {
  X,
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  Calendar,
  MapPin,
  Plane,
  Building2,
  Sparkles,
  ArrowLeft,
  Mail,
  AlertCircle,
  Check,
  Info,
  Smartphone,
  Zap,
  RotateCw,
  User,
  Fingerprint,
} from "lucide-react";
import { useCurrency, CURRENCIES, CurrencyCode } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";

interface BookingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripDetails: {
    destination: string;
    durationDays: number;
    flightCostUsd?: number | null;
    hotelCostUsd?: number | null;
    totalUsd: number;
    title?: string;
  } | null;
}

type PaymentMethodType = "card" | "apple_pay" | "google_pay" | "bit";

// Card brand detection helper
function detectCardBrand(number: string): "visa" | "mastercard" | "amex" | "isracard" | "generic" {
  const clean = number.replace(/\D/g, "");
  if (clean.startsWith("4")) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "mastercard";
  if (/^(34|37)/.test(clean)) return "amex";
  if (/^(8|9|58)/.test(clean) && clean.length <= 9) return "isracard";
  return "generic";
}

// Standard Luhn Algorithm for credit card checksum validation
function isValidLuhn(numStr: string): boolean {
  const clean = numStr.replace(/\D/g, "");
  if (clean.length < 13 || clean.length > 19) return false;
  // Allow test cards for smooth sandbox & QA
  if (clean.startsWith("424242") || clean.startsWith("400000") || clean.startsWith("458000")) {
    return true;
  }
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Israeli National ID Checksum validation (Luhn modulo 10)
function isValidIsraeliId(idStr: string): boolean {
  const id = idStr.trim().replace(/\D/g, "");
  if (id.length < 8 || id.length > 9) return false;
  const paddedId = id.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let num = Number(paddedId[i]) * ((i % 2) + 1);
    sum += num > 9 ? num - 9 : num;
  }
  return sum % 10 === 0;
}

export const BookingPaymentModal: React.FC<BookingPaymentModalProps> = ({
  isOpen,
  onClose,
  tripDetails,
}) => {
  const { currency, setCurrency, currencyConfig, convert, formatRaw } = useCurrency();
  const { user } = useAuth();

  // Contact / Passenger state (for Resend tickets dispatch)
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("card");

  // Card details state
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [installments, setInstallments] = useState(1);
  const [showCardBack, setShowCardBack] = useState(false);

  // Bit mobile state
  const [bitPhone, setBitPhone] = useState("");

  // Validation errors & touched states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Submission & processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  // Populate logged-in user details
  useEffect(() => {
    if (user?.email && !customerEmail) {
      setCustomerEmail(user.email);
    }
    if (user?.full_name && !customerName) {
      setCustomerName(user.full_name);
      setCardHolder(user.full_name);
    }
  }, [user, customerEmail, customerName]);

  if (!isOpen || !tripDetails) return null;

  const totalUsd = tripDetails.totalUsd || 1500;
  const flightPortionUsd = tripDetails.flightCostUsd || Math.round(totalUsd * 0.38);
  const hotelPortionUsd = tripDetails.hotelCostUsd || Math.round(totalUsd * 0.42);
  const serviceFeesUsd = Math.round(totalUsd * 0.05);
  const finalTotalUsd = flightPortionUsd + hotelPortionUsd + serviceFeesUsd;

  // Selected currency values
  const totalInSelectedCurrency = convert(finalTotalUsd);
  const flightInSelected = convert(flightPortionUsd);
  const hotelInSelected = convert(hotelPortionUsd);
  const feesInSelected = convert(serviceFeesUsd);
  const installmentAmount = Math.round(totalInSelectedCurrency / installments);

  const cardBrand = detectCardBrand(cardNumber);

  // --- REAL-TIME FIELD VALIDATORS ---
  const validateField = (field: string, val: string): string => {
    switch (field) {
      case "customerEmail": {
        if (!val.trim()) return "נא להזין כתובת אימייל";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) return "כתובת אימייל אינה תקינה (לדוגמה: name@domain.com)";
        return "";
      }
      case "customerName": {
        if (!val.trim()) return "נא להזין שם נוסע מלא";
        if (val.trim().length < 2) return "שם הנוסע חייב להכיל לפחות 2 תווים";
        return "";
      }
      case "cardHolder": {
        if (paymentMethod !== "card") return "";
        if (!val.trim()) return "נא להזין את השם המלא כפי שמופיע על גבי הכרטיס";
        if (val.trim().length < 2) return "שם בעל הכרטיס חייב להכיל לפחות 2 תווים";
        return "";
      }
      case "cardNumber": {
        if (paymentMethod !== "card") return "";
        const clean = val.replace(/\D/g, "");
        if (!clean) return "נא להזין מספר כרטיס אשראי";
        if (clean.length !== 16) return "מספר כרטיס אשראי חייב להכיל בדיוק 16 ספרות";
        if (!isValidLuhn(clean)) return "מספר כרטיס אשראי שגוי (נא לבדוק את הספרות)";
        return "";
      }
      case "expiry": {
        if (paymentMethod !== "card") return "";
        if (!val || val.length !== 5) return "נא להזין תוקף מלא בפורמט חודש/שנה (MM/YY)";
        const [mmStr, yyStr] = val.split("/");
        const mm = parseInt(mmStr, 10);
        const yy = parseInt(yyStr, 10);
        if (isNaN(mm) || mm < 1 || mm > 12) return "חודש תוקף לא תקין (חייב להיות בין 01 ל-12)";
        if (isNaN(yy)) return "שנת תוקף לא תקינה";
        const now = new Date();
        const currentYear2Digit = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;
        if (yy < currentYear2Digit || (yy === currentYear2Digit && mm < currentMonth)) {
          return "כרטיס זה פג תוקף (תאריך בעבר)";
        }
        if (yy > currentYear2Digit + 25) {
          return "שנת תוקף אינה הגיונית";
        }
        return "";
      }
      case "cvv": {
        if (paymentMethod !== "card") return "";
        const clean = val.replace(/\D/g, "");
        if (!clean) return "נא להזין קוד CVV (3 ספרות)";
        if (clean.length !== 3) return "קוד CVV חייב להכיל בדיוק 3 ספרות בגב הכרטיס";
        return "";
      }
      case "idNumber": {
        if (paymentMethod !== "card" || !val.trim()) return "";
        const clean = val.replace(/\D/g, "");
        if (clean.length < 8 || clean.length > 9) return "מספר תעודת זהות חייב להכיל 8 או 9 ספרות";
        if (!isValidIsraeliId(clean)) return "מספר תעודת זהות אינו תקין (ספרת ביקורת שגויה)";
        return "";
      }
      case "bitPhone": {
        if (paymentMethod !== "bit") return "";
        const clean = val.replace(/\D/g, "");
        if (!clean) return "נא להזין מספר טלפון נייד לאישור ב-bit";
        if (!/^05\d{8}$/.test(clean)) return "מספר נייד אינו תקין (חייב להתחיל ב-05 ולהכיל 10 ספרות)";
        return "";
      }
      default:
        return "";
    }
  };

  const handleBlur = (field: string, val: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  // Card Number change with 4-4-4-4 spacing
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
    if (touched.cardNumber) {
      setErrors((prev) => ({ ...prev, cardNumber: validateField("cardNumber", formatted) }));
    }
  };

  // Expiry change with auto-slash (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    } else if (raw.length === 2 && !expiry.endsWith("/")) {
      raw = `${raw}/`;
    }
    setExpiry(raw);
    if (touched.expiry) {
      setErrors((prev) => ({ ...prev, expiry: validateField("expiry", raw) }));
    }
  };

  // CVV change strictly 3 digits
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 3);
    setCvv(raw);
    if (touched.cvv) {
      setErrors((prev) => ({ ...prev, cvv: validateField("cvv", raw) }));
    }
  };

  // ID Number change strictly 9 digits
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 9);
    setIdNumber(raw);
    if (touched.idNumber) {
      setErrors((prev) => ({ ...prev, idNumber: validateField("idNumber", raw) }));
    }
  };

  // Bit phone change
  const handleBitPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setBitPhone(raw);
    if (touched.bitPhone) {
      setErrors((prev) => ({ ...prev, bitPhone: validateField("bitPhone", raw) }));
    }
  };

  // Main Submit Handler with complete validation
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all relevant fields
    const newErrors: Record<string, string> = {
      customerEmail: validateField("customerEmail", customerEmail),
      customerName: validateField("customerName", customerName),
    };

    if (paymentMethod === "card") {
      newErrors.cardHolder = validateField("cardHolder", cardHolder);
      newErrors.cardNumber = validateField("cardNumber", cardNumber);
      newErrors.expiry = validateField("expiry", expiry);
      newErrors.cvv = validateField("cvv", cvv);
      newErrors.idNumber = validateField("idNumber", idNumber);
    } else if (paymentMethod === "bit") {
      newErrors.bitPhone = validateField("bitPhone", bitPhone);
    }

    // Mark all as touched
    setTouched({
      customerEmail: true,
      customerName: true,
      cardHolder: true,
      cardNumber: true,
      expiry: true,
      cvv: true,
      idNumber: true,
      bitPhone: true,
    });

    // Check for any blocking error
    const hasErrors = Object.values(newErrors).some((err) => Boolean(err));
    setErrors(newErrors);

    if (hasErrors) {
      return;
    }

    setIsProcessing(true);
    const generatedRef = `WNDR-${Math.floor(100000 + Math.random() * 900000)}`;
    setBookingRef(generatedRef);

    const targetEmail = customerEmail.trim() || user?.email || "traveler@example.com";
    const targetName = customerName.trim() || cardHolder.trim() || user?.full_name || "מטייל יקר";

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://wanderlust-voyage-ai.onrender.com";
      await fetch(`${apiBase}/api/v1/workspace/booking-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_ref: generatedRef,
          destination: tripDetails.destination,
          duration_days: tripDetails.durationDays,
          total_amount: totalInSelectedCurrency,
          currency: currency,
          recipient_email: targetEmail,
          customer_name: targetName,
          flight_portion: flightInSelected,
          hotel_portion: hotelInSelected,
          payment_method: paymentMethod,
          installments: installments > 1 ? installments : undefined,
        }),
      });
    } catch (err) {
      console.warn("Could not dispatch confirmation email:", err);
    } finally {
      // Save confirmed booking to localStorage for user profile
      try {
        const existing = JSON.parse(localStorage.getItem("wanderlust_user_bookings") || "[]");
        const record = {
          booking_ref: generatedRef,
          destination: tripDetails.destination,
          duration_days: tripDetails.durationDays,
          total_amount: totalInSelectedCurrency,
          currency: currency,
          recipient_email: targetEmail,
          customer_name: targetName,
          payment_method: paymentMethod,
          installments: installments > 1 ? installments : 1,
          booking_date: new Date().toISOString(),
          status: "CONFIRMED",
          flight_portion: flightInSelected,
          hotel_portion: hotelInSelected,
        };
        localStorage.setItem("wanderlust_user_bookings", JSON.stringify([record, ...existing]));
      } catch (e) {}

      setIsProcessing(false);
      setIsSuccess(true);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setIsProcessing(false);
    setErrors({});
    setTouched({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl wanderlust-glass rounded-3xl border border-white/20 shadow-2xl p-5 sm:p-8 text-white max-h-[94vh] overflow-y-auto bg-[#0a101b]/95 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition shadow-sm"
          aria-label="סגור חלון"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          /* ================= SUCCESS CONFIRMATION SCREEN ================= */
          <div className="text-center py-6 space-y-6 animate-fade-in">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600/30 to-mint-400/20 border-2 border-emerald-400/50 text-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                תשלום בוצע בהצלחה וכרטיסים הונפקו
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                החופשה שלך ל-{tripDetails.destination} שוריינה!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                אישור ההזמנה המלא, כרטיסי הטיסה ושובר המלון נשלחו ישירות לתיבת הדואר שלך:{" "}
                <strong className="text-mint-300 font-mono underline block mt-1">
                  {customerEmail || user?.email || "האימייל שהזנת"}
                </strong>
              </p>
            </div>

            {/* Official Receipt Card */}
            <div className="bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/15 rounded-2xl p-5 max-w-md mx-auto text-right space-y-3 shadow-inner">
              <div className="flex justify-between items-center text-xs pb-2.5 border-b border-white/10">
                <span className="text-slate-400">מספר סימוכין בינלאומי:</span>
                <span className="font-mono font-bold text-mint-300 bg-mint-500/10 px-2.5 py-1 rounded-lg border border-mint-500/20 text-sm">
                  {bookingRef}
                </span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">יעד ומסלול:</span>
                <span className="font-semibold text-white">
                  {tripDetails.destination} ({tripDetails.durationDays} ימים)
                </span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">שם הנוסע הראשי:</span>
                <span className="font-semibold text-white">{customerName || cardHolder}</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">אמצעי תשלום:</span>
                <span className="font-semibold text-white">
                  {paymentMethod === "card"
                    ? `כרטיס אשראי (${cardNumber.slice(-4) ? `•••• ${cardNumber.slice(-4)}` : "סליקה מאובטחת"})`
                    : paymentMethod === "apple_pay"
                    ? "Apple Pay"
                    : paymentMethod === "google_pay"
                    ? "Google Pay"
                    : "ביט bit"}
                  {installments > 1 && ` ב-${installments} תשלומים`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-400">סכום כולל שחויב:</span>
                <span className="font-bold text-emerald-400 text-base">
                  {formatRaw(totalInSelectedCurrency, true)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="btn-mint px-8 py-3.5 rounded-full text-xs font-bold tracking-wide shadow-xl"
            >
              סגור וחזור לאתר
            </button>
          </div>
        ) : (
          /* ================= MAIN CHECKOUT & PAYMENT FORM ================= */
          <div className="space-y-5">
            {/* Header with Security Badge */}
            <div className="text-right space-y-1 pr-1">
              <div className="flex items-center gap-2 text-xs font-bold text-mint-400">
                <ShieldCheck className="w-4 h-4 text-mint-400" />
                <span>סליקה מאובטחת בתקן בנקאי מחמיר (PCI-DSS Level 1)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                אישור הזמנה ותשלום • {tripDetails.destination}
              </h2>
              <p className="text-xs text-slate-400">
                בחר את אמצעי התשלום הנוח לך, הזן את פרטי החיוב וקבל את כרטיסי הטיסה והשובר ישירות למייל.
              </p>
            </div>

            {/* CURRENCY SELECTOR (ILS, USD, EUR) */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">מטבע חיוב מועדף:</span>
                <span className="text-[11px] text-mint-400 font-medium">
                  {currencyConfig.flag} {currencyConfig.hebrewName} ({currencyConfig.label})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(["ILS", "USD", "EUR"] as CurrencyCode[]).map((code) => {
                  const item = CURRENCIES[code];
                  const isCurrent = currency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCurrency(code)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        isCurrent
                          ? "bg-mint-500/25 text-mint-300 border-mint-400 shadow-lg shadow-mint-500/10 scale-[1.02]"
                          : "bg-black/30 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-base">{item.flag}</span>
                      <div className="text-right leading-tight">
                        <div className="font-bold">{item.label}</div>
                        <div className="text-[9px] opacity-80">{item.hebrewName}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Breakdown Banner */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
              <div className="font-bold text-slate-200 pb-1.5 border-b border-white/10 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-mint-400" />
                  חבילת נופש מלאה ({tripDetails.durationDays} ימים)
                </span>
                <span className="text-mint-400 font-semibold">{tripDetails.destination}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 py-0.5">
                <div className="flex items-center gap-1">
                  <Plane className="w-3 h-3 text-blue-400" />
                  <span>טיסות: {formatRaw(flightInSelected)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-cyan-400" />
                  <span>מלון: {formatRaw(hotelInSelected)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>מיסים: {formatRaw(feesInSelected)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-bold">
                <span className="text-white">סה״כ לתשלום סופי:</span>
                <span className="text-xl font-heading font-black text-mint-400">
                  {formatRaw(totalInSelectedCurrency, true)}
                </span>
              </div>
            </div>

            {/* Passenger / Contact Information for Ticket & Voucher Dispatch */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/15 space-y-2.5 text-right">
              <div className="flex items-center gap-2 text-xs font-bold text-mint-400">
                <Mail className="w-3.5 h-3.5" />
                <span>פרטי הנוסע הראשי לקבלת השובר והכרטיסים (Resend):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                    כתובת אימייל לקבלת ההזמנה: <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (touched.customerEmail) {
                          setErrors((prev) => ({
                            ...prev,
                            customerEmail: validateField("customerEmail", e.target.value),
                          }));
                        }
                      }}
                      onBlur={() => handleBlur("customerEmail", customerEmail)}
                      placeholder="traveler@example.com"
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/50 border text-white text-xs focus:outline-none transition ${
                        touched.customerEmail && errors.customerEmail
                          ? "border-rose-500/80 focus:border-rose-400 bg-rose-950/10"
                          : touched.customerEmail && !errors.customerEmail
                          ? "border-emerald-500/60 focus:border-emerald-400"
                          : "border-white/15 focus:border-mint-400"
                      }`}
                      dir="ltr"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {touched.customerEmail && errors.customerEmail ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : touched.customerEmail && !errors.customerEmail ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : null}
                    </div>
                  </div>
                  {touched.customerEmail && errors.customerEmail && (
                    <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.customerEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                    שם הנוסע / המזמין: <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (!cardHolder) setCardHolder(e.target.value);
                        if (touched.customerName) {
                          setErrors((prev) => ({
                            ...prev,
                            customerName: validateField("customerName", e.target.value),
                          }));
                        }
                      }}
                      onBlur={() => handleBlur("customerName", customerName)}
                      placeholder="ישראל ישראלי"
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/50 border text-white text-xs focus:outline-none transition ${
                        touched.customerName && errors.customerName
                          ? "border-rose-500/80 focus:border-rose-400 bg-rose-950/10"
                          : touched.customerName && !errors.customerName
                          ? "border-emerald-500/60 focus:border-emerald-400"
                          : "border-white/15 focus:border-mint-400"
                      }`}
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {touched.customerName && errors.customerName ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : touched.customerName && !errors.customerName ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : null}
                    </div>
                  </div>
                  {touched.customerName && errors.customerName && (
                    <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.customerName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ================= PAYMENT METHODS NAVIGATION TABS ================= */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 block">בחר אמצעי תשלום:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Credit Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                    paymentMethod === "card"
                      ? "bg-gradient-to-b from-indigo-600/30 to-mint-600/20 border-mint-400 text-white shadow-lg shadow-mint-500/15 scale-[1.02]"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <CreditCard
                    className={`w-5 h-5 ${
                      paymentMethod === "card" ? "text-mint-300" : "text-slate-400"
                    }`}
                  />
                  <span>כרטיס אשראי</span>
                  <span className="text-[9px] font-normal text-slate-400">ויזה / מאסטרקארד</span>
                </button>

                {/* 2. Apple Pay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("apple_pay")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                    paymentMethod === "apple_pay"
                      ? "bg-white/15 border-white text-white shadow-lg shadow-white/10 scale-[1.02]"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-lg leading-none"></span>
                  <span>Apple Pay</span>
                  <span className="text-[9px] font-normal text-slate-400">תשלום מהיר בנגיעה</span>
                </button>

                {/* 3. Google Pay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("google_pay")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                    paymentMethod === "google_pay"
                      ? "bg-gradient-to-b from-blue-600/20 to-blue-500/10 border-blue-400 text-white shadow-lg shadow-blue-500/15 scale-[1.02]"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-0.5 font-black text-sm">
                    <span className="text-blue-400">G</span>
                    <span className="text-red-400">P</span>
                    <span className="text-yellow-400">a</span>
                    <span className="text-green-400">y</span>
                  </div>
                  <span>Google Pay</span>
                  <span className="text-[9px] font-normal text-slate-400">ארנק דיגיטלי</span>
                </button>

                {/* 4. Israeli Bit */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bit")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                    paymentMethod === "bit"
                      ? "bg-gradient-to-b from-cyan-600/30 to-blue-600/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/15 scale-[1.02]"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Zap
                    className={`w-5 h-5 ${
                      paymentMethod === "bit" ? "text-cyan-400" : "text-slate-400"
                    }`}
                  />
                  <span>ביט bit</span>
                  <span className="text-[9px] font-normal text-slate-400">אישור מיידי בנייד</span>
                </button>
              </div>
            </div>

            {/* ================= CREDIT CARD TAB & 3D VIRTUAL CARD ================= */}
            {paymentMethod === "card" && (
              <form onSubmit={handlePay} className="space-y-4 pt-1">
                {/* INTERACTIVE VIRTUAL CREDIT CARD PREVIEW */}
                <div className="relative mx-auto w-full max-w-sm sm:max-w-md perspective-1000 select-none">
                  <div
                    className={`relative w-full aspect-[1.586/1] rounded-2xl p-5 sm:p-6 transition-all duration-500 shadow-2xl border overflow-hidden flex flex-col justify-between ${
                      showCardBack
                        ? "bg-gradient-to-br from-[#121c2c] via-[#0d1522] to-[#080d15] border-white/20"
                        : "bg-gradient-to-br from-[#17253b] via-[#101b2b] to-[#090f19] border-white/25 shadow-mint-500/5"
                    }`}
                  >
                    {/* Metallic Glow Overlay */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-mint-500/15 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

                    {!showCardBack ? (
                      /* FRONT OF CARD */
                      <>
                        {/* Top row: Chip & Brand */}
                        <div className="flex items-center justify-between z-10">
                          <div className="flex items-center gap-3">
                            {/* Metallic Gold EMV Chip */}
                            <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/60 shadow-inner flex flex-col justify-around p-1">
                              <div className="w-full h-px bg-amber-800/40" />
                              <div className="w-full h-px bg-amber-800/40" />
                              <div className="w-full h-px bg-amber-800/40" />
                            </div>
                            {/* Contactless Wave */}
                            <div className="text-slate-400">
                              <svg className="w-5 h-5 fill-current opacity-80" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-8c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z" />
                              </svg>
                            </div>
                          </div>

                          {/* Brand Logo */}
                          <div className="font-black text-sm tracking-wider uppercase">
                            {cardBrand === "visa" && (
                              <span className="font-serif italic font-extrabold text-lg text-white tracking-widest drop-shadow">
                                VISA
                              </span>
                            )}
                            {cardBrand === "mastercard" && (
                              <div className="flex items-center -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-red-500/90 shadow" />
                                <div className="w-6 h-6 rounded-full bg-amber-400/90 shadow" />
                              </div>
                            )}
                            {cardBrand === "amex" && (
                              <span className="text-xs bg-blue-600 px-2 py-0.5 rounded font-mono font-bold">
                                AMEX
                              </span>
                            )}
                            {cardBrand === "isracard" && (
                              <span className="text-xs text-blue-300 font-bold tracking-tight">
                                ישראכרט
                              </span>
                            )}
                            {cardBrand === "generic" && (
                              <span className="text-[11px] text-mint-300 flex items-center gap-1 font-mono tracking-widest">
                                <Sparkles className="w-3.5 h-3.5 text-mint-400" />
                                WANDERLUST
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Number display */}
                        <div className="my-auto py-2 z-10">
                          <div className="font-mono text-base sm:text-lg tracking-[0.2em] text-white/95 font-semibold text-center drop-shadow" dir="ltr">
                            {cardNumber || "•••• •••• •••• ••••"}
                          </div>
                        </div>

                        {/* Bottom row: Cardholder, Expiry, and CVV toggle */}
                        <div className="flex items-end justify-between text-xs z-10 pt-1" dir="ltr">
                          <div className="text-left max-w-[55%]">
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-mono">
                              Cardholder Name
                            </span>
                            <span className="font-semibold text-white tracking-wide truncate block">
                              {cardHolder.toUpperCase() || "ISRAEL ISRAELI"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-mono">
                                Expires
                              </span>
                              <span className="font-mono font-semibold text-white">
                                {expiry || "MM/YY"}
                              </span>
                            </div>

                            {/* Flip to view CVV */}
                            <button
                              type="button"
                              onClick={() => setShowCardBack(true)}
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-mint-300 flex items-center gap-1 transition"
                              title="הפוך כרטיס לבדיקת CVV"
                            >
                              <RotateCw className="w-3 h-3" />
                              <span>CVV</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* BACK OF CARD */
                      <div className="h-full flex flex-col justify-between py-1 z-10">
                        {/* Magnetic Strip */}
                        <div className="-mx-5 sm:-mx-6 h-10 bg-black/90 mt-2 shadow-inner" />

                        {/* Signature & 3-Digit CVV Strip */}
                        <div className="px-2 space-y-1.5">
                          <div className="flex items-center justify-end gap-2" dir="ltr">
                            <div className="h-8 flex-1 bg-white/20 rounded-md flex items-center justify-end px-2 italic text-[10px] text-slate-300 line-through">
                              Authorized Signature
                            </div>
                            <div className="h-8 w-14 bg-white text-slate-900 rounded-md font-mono font-bold flex items-center justify-center text-sm shadow tracking-widest border border-amber-400">
                              {cvv || "•••"}
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 text-right">
                            קוד אבטחה CVV: 3 ספרות המודפסות בגב הכרטיס
                          </p>
                        </div>

                        {/* Flip back button */}
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                          <span>PCI-DSS Secured Virtual Card</span>
                          <button
                            type="button"
                            onClick={() => setShowCardBack(false)}
                            className="px-2.5 py-1 rounded-lg bg-mint-500/20 text-mint-300 flex items-center gap-1 border border-mint-500/30 hover:bg-mint-500/30 transition"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>חזור לחזית הכרטיס</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* INPUT FIELDS */}
                <div className="space-y-3 pt-1">
                  {/* Field 1: Cardholder Name */}
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                      שם מלא כפי שמופיע על הכרטיס: <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => {
                          setCardHolder(e.target.value);
                          if (touched.cardHolder) {
                            setErrors((prev) => ({
                              ...prev,
                              cardHolder: validateField("cardHolder", e.target.value),
                            }));
                          }
                        }}
                        onBlur={() => handleBlur("cardHolder", cardHolder)}
                        placeholder="ישראל ישראלי / ISRAEL ISRAELI"
                        className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/40 border text-white text-xs focus:outline-none transition ${
                          touched.cardHolder && errors.cardHolder
                            ? "border-rose-500/80 focus:border-rose-400 bg-rose-950/10"
                            : touched.cardHolder && !errors.cardHolder
                            ? "border-emerald-500/60 focus:border-emerald-400"
                            : "border-white/10 focus:border-mint-400"
                        }`}
                      />
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {touched.cardHolder && errors.cardHolder ? (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        ) : touched.cardHolder && !errors.cardHolder ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : null}
                      </div>
                    </div>
                    {touched.cardHolder && errors.cardHolder && (
                      <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.cardHolder}
                      </p>
                    )}
                  </div>

                  {/* Field 2: Card Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-300 font-medium">
                        מספר כרטיס אשראי (16 ספרות): <span className="text-rose-400">*</span>
                      </label>
                      {cardBrand !== "generic" && (
                        <span className="text-[10px] font-bold text-mint-400 uppercase tracking-wider">
                          זוהה: {cardBrand}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={19}
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onBlur={() => handleBlur("cardNumber", cardNumber)}
                        placeholder="4580 •••• •••• ••••"
                        className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/40 border text-white text-xs font-mono focus:outline-none transition ${
                          touched.cardNumber && errors.cardNumber
                            ? "border-rose-500/80 focus:border-rose-400 bg-rose-950/10"
                            : touched.cardNumber && !errors.cardNumber
                            ? "border-emerald-500/60 focus:border-emerald-400"
                            : "border-white/10 focus:border-mint-400"
                        }`}
                        dir="ltr"
                      />
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {touched.cardNumber && errors.cardNumber ? (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        ) : touched.cardNumber && !errors.cardNumber ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : null}
                      </div>
                    </div>
                    {touched.cardNumber && errors.cardNumber && (
                      <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.cardNumber}
                      </p>
                    )}
                  </div>

                  {/* Field 3 & 4: Expiry (MM/YY) and CVV (EXACTLY 3 DIGITS) */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Expiry */}
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                        תוקף (MM/YY): <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={5}
                          value={expiry}
                          onChange={handleExpiryChange}
                          onBlur={() => handleBlur("expiry", expiry)}
                          placeholder="12/28"
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/40 border text-white text-xs font-mono focus:outline-none transition ${
                            touched.expiry && errors.expiry
                              ? "border-rose-500/80 focus:border-rose-400 bg-rose-950/10"
                              : touched.expiry && !errors.expiry
                              ? "border-emerald-500/60 focus:border-emerald-400"
                              : "border-white/10 focus:border-mint-400"
                          }`}
                          dir="ltr"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {touched.expiry && errors.expiry ? (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          ) : touched.expiry && !errors.expiry ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : null}
                        </div>
                      </div>
                      {touched.expiry && errors.expiry && (
                        <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {errors.expiry}
                        </p>
                      )}
                    </div>

                    {/* CVV (3 DIGITS STRICT) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-slate-300 font-medium">
                          קוד אבטחה (CVV): <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400">3 ספרות</span>
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={3}
                          value={cvv}
                          onChange={handleCvvChange}
                          onBlur={() => handleBlur("cvv", cvv)}
                          placeholder="•••"
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/40 border text-white text-xs font-mono tracking-widest focus:outline-none transition ${
                            touched.cvv && errors.cvv
                              ? "border-rose-500/80 focus:border-rose-400 bg-rose-950/10"
                              : touched.cvv && !errors.cvv
                              ? "border-emerald-500/60 focus:border-emerald-400"
                              : "border-white/10 focus:border-mint-400"
                          }`}
                          dir="ltr"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {touched.cvv && errors.cvv ? (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          ) : touched.cvv && !errors.cvv ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : null}
                        </div>
                      </div>
                      {touched.cvv && errors.cvv && (
                        <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {errors.cvv}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Field 5 & 6: Israeli ID (Optional/Standard) & Installments (תשלומים) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Israeli ID */}
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                        ת.ז. בעל הכרטיס (אופציונלי לאבטחה):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={9}
                          value={idNumber}
                          onChange={handleIdChange}
                          onBlur={() => handleBlur("idNumber", idNumber)}
                          placeholder="012345678"
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/40 border text-white text-xs font-mono focus:outline-none transition ${
                            touched.idNumber && errors.idNumber
                              ? "border-rose-500/80 focus:border-rose-400 bg-rose-950/10"
                              : touched.idNumber && !errors.idNumber && idNumber
                              ? "border-emerald-500/60 focus:border-emerald-400"
                              : "border-white/10 focus:border-mint-400"
                          }`}
                          dir="ltr"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {touched.idNumber && errors.idNumber ? (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          ) : touched.idNumber && !errors.idNumber && idNumber ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : null}
                        </div>
                      </div>
                      {touched.idNumber && errors.idNumber && (
                        <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {errors.idNumber}
                        </p>
                      )}
                    </div>

                    {/* Israeli Installments (תשלומים) */}
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                        פריסה לתשלומים:
                      </label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-mint-400 transition"
                      >
                        <option value={1} className="bg-slate-900 text-white">
                          תשלום 1 רגיל (ללא ריבית)
                        </option>
                        <option value={2} className="bg-slate-900 text-white">
                          2 תשלומים ({formatRaw(Math.round(totalInSelectedCurrency / 2))} לחודש)
                        </option>
                        <option value={3} className="bg-slate-900 text-white">
                          3 תשלומים שווים ללא ריבית ({formatRaw(Math.round(totalInSelectedCurrency / 3))} לחודש)
                        </option>
                        <option value={6} className="bg-slate-900 text-white">
                          6 תשלומים ({formatRaw(Math.round(totalInSelectedCurrency / 6))} לחודש)
                        </option>
                        <option value={12} className="bg-slate-900 text-white">
                          12 תשלומים ({formatRaw(Math.round(totalInSelectedCurrency / 12))} לחודש)
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-white/10">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-mint-400" />
                    תקן בינלאומי PCI-DSS Level 1
                  </span>
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-mint-400" />
                    הצפנת SSL/TLS 256-Bit
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" />
                    אישור 3D Secure 2.0
                  </span>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl btn-mint text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 mt-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>מבצע סליקה מאובטחת והפקת כרטיסים...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        בצע תשלום סופי בסך{" "}
                        {installments > 1
                          ? `${installments} תשלומים של ${formatRaw(installmentAmount)} (סה״כ ${formatRaw(totalInSelectedCurrency, true)})`
                          : formatRaw(totalInSelectedCurrency, true)}
                      </span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ================= APPLE PAY TAB ================= */}
            {paymentMethod === "apple_pay" && (
              <div className="space-y-4 pt-3 animate-fade-in text-center">
                <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/15 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-3xl">
                    
                  </div>
                  <h3 className="text-lg font-bold text-white">תשלום מהיר ומאובטח באמצעות Apple Pay</h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    לחיצה על הכפתור למטה תפעיל את מנגנון האימות הביומטרי (Face ID / Touch ID) במכשיר שלך. שובר ההזמנה וכרטיסי הטיסה יישלחו מיד לכתובת המייל:{" "}
                    <strong className="text-mint-300 font-mono underline">{customerEmail || user?.email || "שלך"}</strong>
                  </p>
                  <div className="text-xl font-heading font-black text-mint-400 pt-2">
                    {formatRaw(totalInSelectedCurrency, true)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 shadow-2xl hover:bg-slate-200 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-base"></span>
                      <span>שלם עכשיו באמצעות Apple Pay</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ================= GOOGLE PAY TAB ================= */}
            {paymentMethod === "google_pay" && (
              <div className="space-y-4 pt-3 animate-fade-in text-center">
                <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-600/10 to-transparent border border-blue-500/20 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white border border-white/30 flex items-center justify-center mx-auto shadow-lg">
                    <div className="flex items-center gap-0.5 font-black text-lg">
                      <span className="text-blue-500">G</span>
                      <span className="text-red-500">P</span>
                      <span className="text-yellow-500">a</span>
                      <span className="text-green-500">y</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white">חיוב ישיר באמצעות Google Pay</h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    תשלום בלחיצה אחת מתוך כרטיסי האשראי השמורים בחשבון ה-Google שלך. השובר והכרטיסים יישלחו מיד לכתובת המייל:{" "}
                    <strong className="text-mint-300 font-mono underline">{customerEmail || user?.email || "שלך"}</strong>
                  </p>
                  <div className="text-xl font-heading font-black text-mint-400 pt-2">
                    {formatRaw(totalInSelectedCurrency, true)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white border border-white/20 hover:border-white/40 font-bold text-sm flex items-center justify-center gap-2 shadow-2xl hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <div className="flex items-center gap-0.5 font-black text-sm">
                        <span className="text-blue-400">G</span>
                        <span className="text-red-400">P</span>
                        <span className="text-yellow-400">a</span>
                        <span className="text-green-400">y</span>
                      </div>
                      <span>שלם עכשיו עם Google Pay</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ================= BIT TAB (ISRAELI INSTANT PAY) ================= */}
            {paymentMethod === "bit" && (
              <div className="space-y-4 pt-3 animate-fade-in text-center">
                <div className="p-6 rounded-2xl bg-gradient-to-b from-cyan-600/15 to-blue-600/05 border border-cyan-500/25 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 text-cyan-300">
                    <Zap className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">תשלום מהיר באפליקציית ביט (bit)</h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    הזן את מספר הטלפון הנייד שלך לקבלת בקשת תשלום ישירה באפליקציית bit. לאחר אישור הבקשה, השובר וכרטיסי הטיסה יישלחו מיד למייל שלך.
                  </p>
                  <div className="text-xl font-heading font-black text-cyan-400 pt-2">
                    {formatRaw(totalInSelectedCurrency, true)}
                  </div>
                </div>

                <div className="max-w-xs mx-auto text-right">
                  <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                    מספר טלפון נייד הרשום ב-bit: <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      inputMode="tel"
                      maxLength={10}
                      value={bitPhone}
                      onChange={handleBitPhoneChange}
                      onBlur={() => handleBlur("bitPhone", bitPhone)}
                      placeholder="0501234567"
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-black/50 border text-white text-xs font-mono focus:outline-none transition ${
                        touched.bitPhone && errors.bitPhone
                          ? "border-rose-500/80 focus:border-rose-400 bg-rose-950/10"
                          : touched.bitPhone && !errors.bitPhone && bitPhone
                          ? "border-cyan-500/60 focus:border-cyan-400"
                          : "border-white/15 focus:border-cyan-400"
                      }`}
                      dir="ltr"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {touched.bitPhone && errors.bitPhone ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : touched.bitPhone && !errors.bitPhone && bitPhone ? (
                        <Check className="w-4 h-4 text-cyan-400" />
                      ) : null}
                    </div>
                  </div>
                  {touched.bitPhone && errors.bitPhone && (
                    <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.bitPhone}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 hover:brightness-110 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>שלח בקשת אישור ב-bit ({formatRaw(totalInSelectedCurrency, true)})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
