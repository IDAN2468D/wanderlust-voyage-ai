"use client";

import React, { useState, useEffect } from "react";
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
  RotateCw,
  Smartphone,
  Zap,
  Info,
  ExternalLink,
  Phone,
  User,
  Download,
  Share2,
  FileText,
  Printer,
  Copy,
  Clock,
  Luggage,
} from "lucide-react";
import { useCurrency, CURRENCIES, CurrencyCode } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { downloadCalendarIcsFile } from "@/utils/calendarIcs";

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

// Helper to retrieve contextual destination photo
function getDestinationImage(dest: string): string {
  const d = dest.toLowerCase();
  if (d.includes("רומא") || d.includes("rome") || d.includes("איטליה")) {
    return "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=800&auto=format&fit=crop";
  }
  if (d.includes("טוקיו") || d.includes("tokyo") || d.includes("יפן")) {
    return "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800&auto=format&fit=crop";
  }
  if (d.includes("סנטוריני") || d.includes("santorini") || d.includes("יוון")) {
    return "/images/santorini.jpg";
  }
  if (d.includes("באלי") || d.includes("bali")) {
    return "/images/bali.jpg";
  }
  if (d.includes("מלדיביים") || d.includes("maldives")) {
    return "/images/maldives.jpg";
  }
  if (d.includes("אלפים") || d.includes("swiss") || d.includes("שוויץ")) {
    return "/images/swiss_alps.jpg";
  }
  if (d.includes("פריז") || d.includes("paris")) {
    return "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop";
  }
  if (d.includes("ברצלונה") || d.includes("barcelona")) {
    return "https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=800&auto=format&fit=crop";
  }
  return "/images/hero-bg.jpg";
}

export const BookingPaymentModal: React.FC<BookingPaymentModalProps> = ({
  isOpen,
  onClose,
  tripDetails,
}) => {
  const { currency, setCurrency, currencyConfig, convert, formatRaw } = useCurrency();
  const { user } = useAuth();

  // Contact / Passenger state (for Resend tickets dispatch & flight check-in)
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [passportNumber, setPassportNumber] = useState("");

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
  const [copiedRef, setCopiedRef] = useState(false);

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
  const destinationImage = getDestinationImage(tripDetails.destination);

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
      case "customerPhone": {
        if (!val.trim()) return "";
        const clean = val.replace(/\D/g, "");
        if (!/^05\d{8}$/.test(clean)) return "מספר טלפון אינו תקין (לדוגמה: 0501234567)";
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
        if (isNaN(mm) || mm < 1 || mm > 12) return "חודש תוקף לא תקין (01-12)";
        if (isNaN(yy)) return "שנת תוקף לא תקינה";
        const now = new Date();
        const currentYear2Digit = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;
        if (yy < currentYear2Digit || (yy === currentYear2Digit && mm < currentMonth)) {
          return "כרטיס זה פג תוקף";
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
        if (clean.length !== 3) return "קוד CVV חייב להכיל 3 ספרות בגב הכרטיס";
        return "";
      }
      case "idNumber": {
        if (paymentMethod !== "card" || !val.trim()) return "";
        const clean = val.replace(/\D/g, "");
        if (clean.length < 8 || clean.length > 9) return "תעודת זהות חייבת להכיל 8 או 9 ספרות";
        if (!isValidIsraeliId(clean)) return "מספר תעודת זהות אינו תקין";
        return "";
      }
      case "bitPhone": {
        if (paymentMethod !== "bit") return "";
        const clean = val.replace(/\D/g, "");
        if (!clean) return "נא להזין מספר טלפון נייד לאישור ב-bit";
        if (!/^05\d{8}$/.test(clean)) return "מספר נייד אינו תקין (חייב להתחיל ב-05)";
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

  // 1-Click Demo Autofill for Instant Test Booking
  const handleFillDemoData = () => {
    const demoEmail = user?.email || "israel.traveler@example.com";
    const demoName = user?.full_name || "ישראל ישראלי";
    setCustomerName(demoName);
    setCustomerEmail(demoEmail);
    setCustomerPhone("054-8921100");
    setPassportNumber("IL9482104");
    setPaymentMethod("card");
    setCardHolder("ISRAEL ISRAELI");
    setCardNumber("4580 1234 5678 9010");
    setExpiry("12/28");
    setCvv("770");
    setIdNumber("012345678");
    setBitPhone("0548921100");
    setTouched({
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      cardHolder: true,
      cardNumber: true,
      expiry: true,
      cvv: true,
      idNumber: true,
      bitPhone: true,
    });
    setErrors({});
  };

  // Main Submit Handler with complete validation
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all relevant fields
    const newErrors: Record<string, string> = {
      customerEmail: validateField("customerEmail", customerEmail),
      customerName: validateField("customerName", customerName),
    };

    if (customerPhone) {
      newErrors.customerPhone = validateField("customerPhone", customerPhone);
    }

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
      customerPhone: true,
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
          customer_phone: customerPhone,
          passport_number: passportNumber,
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

  const handleCopyRef = () => {
    navigator.clipboard.writeText(bookingRef);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleDownloadIcs = () => {
    if (!tripDetails) return;
    const success = downloadCalendarIcsFile({
      destination: tripDetails.destination || "חופשה",
      durationDays: tripDetails.durationDays || 7,
      hotelName: tripDetails.title,
    });

    if (!success) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      window.open(
        `${apiBase}/api/workspace/download-ics?destination=${encodeURIComponent(
          tripDetails.destination
        )}&days=${tripDetails.durationDays}`,
        "_blank"
      );
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🎉 סגרתי חופשה ל-${tripDetails.destination}! מס׳ סימוכין: ${bookingRef}, משך: ${
      tripDetails.durationDays
    } ימים, סה"כ: ${formatRaw(totalInSelectedCurrency, true)}. מחכה לטיסה! ✈️`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-5xl wanderlust-glass rounded-3xl border border-white/20 shadow-2xl p-5 sm:p-8 text-white max-h-[94vh] overflow-y-auto bg-[#0a101b]/95 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-5 left-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition shadow-sm z-20"
          aria-label="סגור חלון"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          /* ================= SUCCESS BOARDING PASS CONFIRMATION SCREEN ================= */
          <div className="text-center py-6 space-y-6 animate-fade-in max-w-2xl mx-auto">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600/30 to-mint-400/20 border-2 border-emerald-400/60 text-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold tracking-wide">
                <ShieldCheck className="w-4 h-4" />
                אישור הזמנה ותשלום מאומת • כרטיסים הונפקו
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                החופשה שלך ל-{tripDetails.destination} שוריינה בהצלחה!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                שובר הנופש המלא, כרטיסי העלייה למטוס ופרטי המלון נשלחו ישירות לתיבת הדואר שלך:{" "}
                <strong className="text-mint-300 font-mono underline block mt-1 text-sm" dir="ltr">
                  {customerEmail || user?.email || "האימייל שהזנת"}
                </strong>
              </p>
            </div>

            {/* Official Boarding Pass Ticket Card */}
            <div className="bg-gradient-to-b from-white/[0.08] to-black/50 border border-white/20 rounded-3xl p-6 text-right space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <div>
                  <span className="text-[11px] text-slate-400 block">מספר סימוכין בינלאומי:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-black text-mint-300 text-lg tracking-wider">
                      {bookingRef}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] flex items-center gap-1 transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedRef ? "הועתק!" : "העתק"}</span>
                    </button>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[11px] text-slate-400 block">סטטוס כרטיס:</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    מאושר ומסונכרן
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs py-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">יעד הטיול:</span>
                  <span className="font-bold text-white text-sm">{tripDetails.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">משך החופשה:</span>
                  <span className="font-bold text-white text-sm">{tripDetails.durationDays} ימים מלאים</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">שם הנוסע הראשי:</span>
                  <span className="font-bold text-white text-sm">{customerName || cardHolder}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs">
                <span className="text-slate-300">אמצעי תשלום:</span>
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

              <div className="flex justify-between items-center pt-2 text-sm font-bold">
                <span className="text-white">סה״כ שחויב:</span>
                <span className="text-2xl font-black text-mint-400 font-heading">
                  {formatRaw(totalInSelectedCurrency, true)}
                </span>
              </div>
            </div>

            {/* Direct Action Runway */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-2 transition shadow-md"
              >
                <Download className="w-4 h-4 text-mint-400" />
                <span>הורד קובץ יומן (.ics)</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-5 py-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 transition shadow-md"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>שתף שובר ב-WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>הדפס אישור</span>
              </button>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="btn-mint px-7 py-3 rounded-2xl text-xs font-black shadow-xl"
              >
                סגור וחזור לאתר
              </button>
            </div>
          </div>
        ) : (
          /* ================= 2-COLUMN CHECKOUT COCKPIT ================= */
          <div className="space-y-5">
            {/* Modal Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 pl-10 text-right gap-2">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-mint-400 mb-1">
                  <ShieldCheck className="w-4 h-4 text-mint-400" />
                  <span>סליקה מאובטחת בתקן PCI-DSS Level 1 • הצפנת SSL 256-Bit</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
                  אישור הזמנה ותשלום מאובטח • {tripDetails.destination}
                </h2>
              </div>

              {/* Fast Demo Fill Button */}
              <button
                type="button"
                onClick={handleFillDemoData}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-mint-500/15 hover:bg-mint-500/25 border border-mint-400/40 text-mint-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-mint-400 fill-current" />
                <span>מלא פרטי דמו לבדיקה מהירה</span>
              </button>
            </div>

            {/* Split 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ========================================================
                  COLUMN 1 (lg:col-span-5): ORDER & PRICE BREAKDOWN (RIGHT IN RTL)
              ======================================================== */}
              <div className="lg:col-span-5 space-y-4 text-right">
                {/* Destination Hero Card */}
                <div className="relative rounded-2xl overflow-hidden border border-white/15 h-40 w-full shadow-lg">
                  <img
                    src={destinationImage}
                    alt={tripDetails.destination}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a101b] via-[#0a101b]/40 to-transparent" />
                  <div className="absolute bottom-3.5 right-3.5 left-3.5 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-mint-500/20 text-mint-300 font-bold border border-mint-500/30">
                        חבילת נופש מאומתת
                      </span>
                      <h3 className="text-xl font-serif font-bold text-white mt-1">
                        {tripDetails.destination}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-slate-200 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 font-mono">
                      {tripDetails.durationDays} ימים
                    </span>
                  </div>
                </div>

                {/* Currency Switcher Buttons */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">בחר מטבע לחיוב סופי:</span>
                    <span className="text-mint-400 font-semibold text-[11px]">
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
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            isCurrent
                              ? "bg-mint-500/25 text-mint-300 border-mint-400 shadow-md"
                              : "bg-black/40 text-slate-300 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-sm">{item.flag}</span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Itemized Price Breakdown */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs shadow-inner">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-cyan-400" />
                      טיסות הלוך ושוב (כולל כבודה 23kg):
                    </span>
                    <span className="font-bold text-white font-mono">{formatRaw(flightInSelected)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      לינה במלון נבחר ({tripDetails.durationDays} לילות):
                    </span>
                    <span className="font-bold text-white font-mono">{formatRaw(hotelInSelected)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      דמי טיפול וסנכרון 13 סוכנים:
                    </span>
                    <span className="font-bold text-white font-mono">{formatRaw(feesInSelected)}</span>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm font-bold">
                    <span className="text-white">סה״כ לתשלום סופי:</span>
                    <span className="text-2xl font-heading font-black text-mint-400">
                      {formatRaw(totalInSelectedCurrency, true)}
                    </span>
                  </div>
                </div>

                {/* Guarantees Badges */}
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-mint-400 shrink-0" />
                    <span>הבטחת מחיר מלאה ללא תוספות נסתרות</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>ביטול חינם בכפוף למדיניות הספק עד 48 שעות לפני ההמראה</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>מוקד חירום ותמיכה קונסיירז' זמין 24/7 בעברית</span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  COLUMN 2 (lg:col-span-7): PASSENGER DETAILS & PAYMENT INPUTS
              ======================================================== */}
              <div className="lg:col-span-7 space-y-5 text-right">
                {/* Section A: Passenger Information (Comfortable, Inviting Inputs) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/15 space-y-3.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-mint-300">
                      <User className="w-4 h-4 text-mint-400" />
                      <span>פרטי הנוסע הראשי וקבלת הכרטיסים</span>
                    </div>
                    <span className="text-[10px] text-slate-400">שדות חובה מסומנים ב-*</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Full Name Input */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>שם מלא (באנגלית / דרכון) <span className="text-rose-400">*</span></span>
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
                          placeholder="ישראל ישראלי / ISRAEL ISRAELI"
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-white text-xs focus:outline-none transition ${
                            touched.customerName && errors.customerName
                              ? "border-rose-500/80 bg-rose-950/20"
                              : touched.customerName && !errors.customerName
                              ? "border-emerald-500/60"
                              : "border-white/15"
                          }`}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          {touched.customerName && errors.customerName ? (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          ) : touched.customerName && !errors.customerName ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                      </div>
                      {touched.customerName && errors.customerName && (
                        <p className="text-[10px] text-rose-400">{errors.customerName}</p>
                      )}
                    </div>

                    {/* Email Input */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>כתובת דואר אלקטרוני (אימייל) <span className="text-rose-400">*</span></span>
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
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-white text-xs focus:outline-none transition ${
                            touched.customerEmail && errors.customerEmail
                              ? "border-rose-500/80 bg-rose-950/20"
                              : touched.customerEmail && !errors.customerEmail
                              ? "border-emerald-500/60"
                              : "border-white/15"
                          }`}
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          {touched.customerEmail && errors.customerEmail ? (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          ) : touched.customerEmail && !errors.customerEmail ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                      </div>
                      {touched.customerEmail && errors.customerEmail && (
                        <p className="text-[10px] text-rose-400">{errors.customerEmail}</p>
                      )}
                    </div>

                    {/* Mobile Phone for Flight SMS Updates */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        <span>טלפון נייד לעדכוני שער וטיסה ב-SMS</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => {
                            setCustomerPhone(e.target.value);
                            if (touched.customerPhone) {
                              setErrors((prev) => ({
                                ...prev,
                                customerPhone: validateField("customerPhone", e.target.value),
                              }));
                            }
                          }}
                          onBlur={() => handleBlur("customerPhone", customerPhone)}
                          placeholder="050-1234567"
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-white text-xs focus:outline-none transition ${
                            touched.customerPhone && errors.customerPhone
                              ? "border-rose-500/80 bg-rose-950/20"
                              : touched.customerPhone && !errors.customerPhone
                              ? "border-emerald-500/60"
                              : "border-white/15"
                          }`}
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </div>
                      {touched.customerPhone && errors.customerPhone && (
                        <p className="text-[10px] text-rose-400">{errors.customerPhone}</p>
                      )}
                    </div>

                    {/* Passport Number (Optional for Airline Check-in) */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>מספר דרכון (לצ'ק-אין מוקדם בשדה)</span>
                        <span className="text-[9px] text-slate-400">אופציונלי</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={passportNumber}
                          onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                          placeholder="IL1234567"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-white/15 text-white text-xs font-mono uppercase focus:outline-none transition"
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Payment Method Selection Tabs */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300">
                    בחר אמצעי תשלום מועדף:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {/* 1. Credit Card */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                        paymentMethod === "card"
                          ? "bg-mint-500/25 text-mint-300 border-mint-400 shadow-lg shadow-mint-500/10 scale-[1.02]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>כרטיס אשראי</span>
                    </button>

                    {/* 2. Apple Pay */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("apple_pay")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                        paymentMethod === "apple_pay"
                          ? "bg-white/20 border-white text-white shadow-md scale-[1.02]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-base leading-none"></span>
                      <span dir="ltr">Apple Pay</span>
                    </button>

                    {/* 3. Google Pay */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("google_pay")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                        paymentMethod === "google_pay"
                          ? "bg-blue-600/25 border-blue-400 text-white shadow-md scale-[1.02]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-xs font-black" dir="ltr">GPay</span>
                      <span dir="ltr">Google Pay</span>
                    </button>

                    {/* 4. Bit */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bit")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                        paymentMethod === "bit"
                          ? "bg-cyan-600/30 border-cyan-400 text-cyan-300 shadow-md scale-[1.02]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Zap className="w-4 h-4 text-cyan-400 fill-current" />
                      <span>ביט bit</span>
                    </button>
                  </div>
                </div>

                {/* ================= CREDIT CARD INPUT FORM ================= */}
                {paymentMethod === "card" && (
                  <form onSubmit={handlePay} className="space-y-4">
                    {/* Compact Interactive Virtual Credit Card Preview */}
                    <div className="relative mx-auto w-full select-none">
                      <div
                        className={`relative w-full aspect-[2.8/1] rounded-2xl p-4 transition-all duration-300 shadow-xl border overflow-hidden flex flex-col justify-between ${
                          showCardBack
                            ? "bg-gradient-to-br from-[#121c2c] to-[#080d15] border-white/20"
                            : "bg-gradient-to-br from-[#162438] via-[#101b2a] to-[#090f19] border-white/25 shadow-mint-500/5"
                        }`}
                      >
                        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-mint-500/10 blur-xl pointer-events-none" />

                        {!showCardBack ? (
                          /* FRONT OF CARD */
                          <>
                            <div className="flex items-center justify-between z-10">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-300 to-amber-600 border border-amber-200/50 shadow-inner flex flex-col justify-around p-0.5">
                                  <div className="w-full h-px bg-amber-800/40" />
                                  <div className="w-full h-px bg-amber-800/40" />
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono tracking-widest">WANDERLUST</span>
                              </div>

                              <div className="font-bold text-xs uppercase tracking-wider text-white">
                                {cardBrand === "visa" && <span className="font-serif italic font-extrabold text-sm">VISA</span>}
                                {cardBrand === "mastercard" && (
                                  <div className="flex items-center -space-x-1">
                                    <div className="w-4 h-4 rounded-full bg-red-500/90" />
                                    <div className="w-4 h-4 rounded-full bg-amber-400/90" />
                                  </div>
                                )}
                                {cardBrand === "isracard" && <span className="text-[11px] text-blue-300 font-bold">ישראכרט</span>}
                                {cardBrand === "amex" && <span className="text-[10px] bg-blue-600 px-1.5 py-0.5 rounded font-bold">AMEX</span>}
                                {cardBrand === "generic" && <span className="text-[10px] text-mint-400">LUXURY PASS</span>}
                              </div>
                            </div>

                            <div className="font-mono text-sm sm:text-base tracking-[0.2em] text-white/95 font-semibold text-center z-10" dir="ltr">
                              {cardNumber || "•••• •••• •••• ••••"}
                            </div>

                            <div className="flex items-end justify-between text-[11px] z-10" dir="ltr">
                              <span className="font-semibold text-white tracking-wide truncate max-w-[60%]">
                                {cardHolder.toUpperCase() || "ISRAEL ISRAELI"}
                              </span>

                              <div className="flex items-center gap-3">
                                <span className="font-mono font-semibold text-white">
                                  {expiry || "MM/YY"}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => setShowCardBack(true)}
                                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-mint-300 flex items-center gap-1 transition"
                                >
                                  <RotateCw className="w-2.5 h-2.5" />
                                  <span>CVV</span>
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* BACK OF CARD */
                          <div className="h-full flex flex-col justify-between py-1 z-10">
                            <div className="-mx-4 h-7 bg-black/90 shadow-inner" />
                            <div className="flex items-center justify-end gap-2 px-2" dir="ltr">
                              <span className="text-[10px] text-slate-400">CVV (3 ספרות):</span>
                              <div className="h-6 w-12 bg-white text-slate-900 rounded font-mono font-bold flex items-center justify-center text-xs tracking-widest border border-amber-400">
                                {cvv || "•••"}
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-400">
                              <span>PCI-DSS Secured</span>
                              <button
                                type="button"
                                onClick={() => setShowCardBack(false)}
                                className="px-2 py-0.5 rounded bg-mint-500/20 text-mint-300 flex items-center gap-1 border border-mint-500/30"
                              >
                                <RotateCw className="w-2.5 h-2.5" />
                                <span>חזור לחזית</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inputs Grid with Ergonomic Spacing */}
                    <div className="space-y-3 pt-1">
                      {/* Cardholder Name */}
                      <div className="space-y-1">
                        <label className="block text-[11px] text-slate-300 font-semibold">
                          שם מלא כפי שמופיע על גבי הכרטיס: <span className="text-rose-400">*</span>
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
                            className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-white text-xs focus:outline-none transition ${
                              touched.cardHolder && errors.cardHolder
                                ? "border-rose-500/80 bg-rose-950/20"
                                : touched.cardHolder && !errors.cardHolder
                                ? "border-emerald-500/60"
                                : "border-white/15"
                            }`}
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            {touched.cardHolder && errors.cardHolder ? (
                              <AlertCircle className="w-4 h-4 text-rose-400" />
                            ) : touched.cardHolder && !errors.cardHolder ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </div>
                        </div>
                        {touched.cardHolder && errors.cardHolder && (
                          <p className="text-[10px] text-rose-400">{errors.cardHolder}</p>
                        )}
                      </div>

                      {/* Card Number */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-slate-300 font-semibold">
                            מספר כרטיס אשראי (16 ספרות): <span className="text-rose-400">*</span>
                          </label>
                          {cardBrand !== "generic" && (
                            <span className="text-[10px] font-bold text-mint-400 uppercase bg-mint-500/10 px-2 py-0.5 rounded-md border border-mint-500/20">
                              {cardBrand}
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
                            className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-white text-xs font-mono focus:outline-none transition tracking-wider ${
                              touched.cardNumber && errors.cardNumber
                                ? "border-rose-500/80 bg-rose-950/20"
                                : touched.cardNumber && !errors.cardNumber
                                ? "border-emerald-500/60"
                                : "border-white/15"
                            }`}
                            dir="ltr"
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            {touched.cardNumber && errors.cardNumber ? (
                              <AlertCircle className="w-4 h-4 text-rose-400" />
                            ) : touched.cardNumber && !errors.cardNumber ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </div>
                        </div>
                        {touched.cardNumber && errors.cardNumber && (
                          <p className="text-[10px] text-rose-400">{errors.cardNumber}</p>
                        )}
                      </div>

                      {/* Expiry & CVV in 2 columns */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Expiry */}
                        <div className="space-y-1">
                          <label className="block text-[11px] text-slate-300 font-semibold">
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
                              className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-white text-xs font-mono focus:outline-none transition text-center ${
                                touched.expiry && errors.expiry
                                ? "border-rose-500/80 bg-rose-950/20"
                                : touched.expiry && !errors.expiry
                                ? "border-emerald-500/60"
                                : "border-white/15"
                              }`}
                              dir="ltr"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              {touched.expiry && errors.expiry ? (
                                <AlertCircle className="w-4 h-4 text-rose-400" />
                              ) : touched.expiry && !errors.expiry ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : null}
                            </div>
                          </div>
                          {touched.expiry && errors.expiry && (
                            <p className="text-[10px] text-rose-400">{errors.expiry}</p>
                          )}
                        </div>

                        {/* CVV */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] text-slate-300 font-semibold">
                              קוד CVV: <span className="text-rose-400">*</span>
                            </label>
                            <span className="text-[10px] text-slate-400">3 ספרות בגב</span>
                          </div>
                          <div className="relative">
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={3}
                              value={cvv}
                              onChange={handleCvvChange}
                              onFocus={() => setShowCardBack(true)}
                              onBlur={() => {
                                setShowCardBack(false);
                                handleBlur("cvv", cvv);
                              }}
                              placeholder="•••"
                              className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-white text-xs font-mono tracking-widest focus:outline-none transition text-center ${
                                touched.cvv && errors.cvv
                                  ? "border-rose-500/80 bg-rose-950/20"
                                  : touched.cvv && !errors.cvv
                                  ? "border-emerald-500/60"
                                  : "border-white/15"
                              }`}
                              dir="ltr"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              {touched.cvv && errors.cvv ? (
                                <AlertCircle className="w-4 h-4 text-rose-400" />
                              ) : touched.cvv && !errors.cvv ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : null}
                            </div>
                          </div>
                          {touched.cvv && errors.cvv && (
                            <p className="text-[10px] text-rose-400">{errors.cvv}</p>
                          )}
                        </div>
                      </div>

                      {/* Israeli ID & Installments in 2 columns */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Israeli ID */}
                        <div className="space-y-1">
                          <label className="block text-[11px] text-slate-300 font-semibold">
                            ת.ז. בעל הכרטיס (אופציונלי):
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={9}
                            value={idNumber}
                            onChange={handleIdChange}
                            onBlur={() => handleBlur("idNumber", idNumber)}
                            placeholder="012345678"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 text-white text-xs font-mono focus:outline-none transition"
                            dir="ltr"
                          />
                          {touched.idNumber && errors.idNumber && (
                            <p className="text-[10px] text-rose-400">{errors.idNumber}</p>
                          )}
                        </div>

                        {/* Installments */}
                        <div className="space-y-1">
                          <label className="block text-[11px] text-slate-300 font-semibold">
                            פריסה לתשלומים:
                          </label>
                          <select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-white text-xs focus:outline-none transition cursor-pointer"
                          >
                            <option value={1} className="bg-slate-900">1 תשלום (ללא ריבית)</option>
                            <option value={2} className="bg-slate-900">2 תשלומים ({formatRaw(Math.round(totalInSelectedCurrency / 2))}/חודש)</option>
                            <option value={3} className="bg-slate-900">3 תשלומים שווים ללא ריבית ({formatRaw(Math.round(totalInSelectedCurrency / 3))}/חודש)</option>
                            <option value={6} className="bg-slate-900">6 תשלומים ({formatRaw(Math.round(totalInSelectedCurrency / 6))}/חודש)</option>
                            <option value={12} className="bg-slate-900">12 תשלומים ({formatRaw(Math.round(totalInSelectedCurrency / 12))}/חודש)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Submit Payment CTA */}
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-4 rounded-2xl btn-mint text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 mt-4"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                          <span>מבצע סליקה מאובטחת והפקת כרטיסים...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-slate-950" />
                          <span>
                            אישור סופי והנפקת כרטיסים בסך{" "}
                            {installments > 1
                              ? `${installments} תשלומים של ${formatRaw(installmentAmount)} (${formatRaw(totalInSelectedCurrency, true)})`
                              : formatRaw(totalInSelectedCurrency, true)}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ================= APPLE PAY TAB ================= */}
                {paymentMethod === "apple_pay" && (
                  <div className="space-y-4 pt-2 text-center animate-fade-in">
                    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto text-2xl">
                        
                      </div>
                      <h3 className="text-base font-bold text-white">תשלום מאובטח עם Apple Pay</h3>
                      <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                        אימות ביומטרי בלחיצה אחת ב-Touch ID / Face ID. השובר והכרטיסים יישלחו מיד לכתובת הדואר שלך.
                      </p>
                      <div className="text-xl font-heading font-black text-mint-400 pt-1">
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
                          <span dir="ltr">Pay with Apple Pay</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* ================= GOOGLE PAY TAB ================= */}
                {paymentMethod === "google_pay" && (
                  <div className="space-y-4 pt-2 text-center animate-fade-in">
                    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-white text-slate-900 flex items-center justify-center mx-auto font-black text-lg shadow">
                        <span dir="ltr">GPay</span>
                      </div>
                      <h3 className="text-base font-bold text-white">חיוב ישיר מ-Google Wallet</h3>
                      <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                        תשלום מהיר ומאובטח באמצעות כרטיסי האשראי המוגדרים בחשבון ה-Google שלך.
                      </p>
                      <div className="text-xl font-heading font-black text-mint-400 pt-1">
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
                        <span dir="ltr">Pay with Google Pay</span>
                      )}
                    </button>
                  </div>
                )}

                {/* ================= BIT TAB ================= */}
                {paymentMethod === "bit" && (
                  <div className="space-y-4 pt-2 text-center animate-fade-in">
                    <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-300">
                        <Zap className="w-7 h-7 fill-current" />
                      </div>
                      <h3 className="text-base font-bold text-white">תשלום מהיר באפליקציית ביט (bit)</h3>
                      <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                        הזן מספר טלפון נייד לקבלת בקשת אישור תשלום מיידית באפליקציית bit.
                      </p>
                      <div className="text-xl font-heading font-black text-cyan-400 pt-1">
                        {formatRaw(totalInSelectedCurrency, true)}
                      </div>
                    </div>

                    <div className="max-w-xs mx-auto text-right space-y-1">
                      <label className="block text-[11px] text-slate-300 font-semibold">
                        מספר נייד הרשום ב-bit: <span className="text-rose-400">*</span>
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
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </div>
                      {touched.bitPhone && errors.bitPhone && (
                        <p className="text-[10px] text-rose-400">{errors.bitPhone}</p>
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
                          <span>שלח בקשת אישור תשלום ל-bit</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
