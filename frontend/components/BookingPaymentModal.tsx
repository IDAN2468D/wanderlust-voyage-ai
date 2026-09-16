"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useCurrency, CURRENCIES, CurrencyCode } from "@/context/CurrencyContext";

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

export const BookingPaymentModal: React.FC<BookingPaymentModalProps> = ({
  isOpen,
  onClose,
  tripDetails,
}) => {
  const { currency, setCurrency, currencyConfig, convert, formatPrice, formatRaw } = useCurrency();

  const [paymentMethod, setPaymentMethod] = useState<"card" | "apple_pay" | "google_pay" | "bank">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  if (!isOpen || !tripDetails) return null;

  const totalUsd = tripDetails.totalUsd || 1500;
  // Flights and hotel portions
  const flightPortionUsd = tripDetails.flightCostUsd || Math.round(totalUsd * 0.38);
  const hotelPortionUsd = tripDetails.hotelCostUsd || Math.round(totalUsd * 0.42);
  const serviceFeesUsd = Math.round(totalUsd * 0.05);
  const finalTotalUsd = flightPortionUsd + hotelPortionUsd + serviceFeesUsd;

  // Convert to selected currency
  const totalInSelectedCurrency = convert(finalTotalUsd);
  const flightInSelected = convert(flightPortionUsd);
  const hotelInSelected = convert(hotelPortionUsd);
  const feesInSelected = convert(serviceFeesUsd);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setBookingRef(`WNDR-${Math.floor(100000 + Math.random() * 900000)}`);
    }, 1800);
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl wanderlust-glass rounded-3xl border border-white/20 shadow-2xl p-6 sm:p-8 text-white max-h-[92vh] overflow-y-auto bg-[#0a101b]/95 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          aria-label="סגור חלון"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          /* Success Screen */
          <div className="text-center py-8 space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                תשלום בוצע בהצלחה!
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                החופשה שלך ל-{tripDetails.destination} שוריינה
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                מסמכי ההזמנה, כרטיסי הטיסה והאישור המלא נשלחו לכתובת המייל שלך.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-md mx-auto text-right space-y-3">
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">מספר אסמכתא:</span>
                <span className="font-mono font-bold text-mint-300">{bookingRef}</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">יעד ומסלול:</span>
                <span className="font-semibold text-white">{tripDetails.destination} ({tripDetails.durationDays} ימים)</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                <span className="text-slate-400">סכום שחויב:</span>
                <span className="font-bold text-emerald-400 text-sm">{formatRaw(totalInSelectedCurrency, true)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">מטבע החיוב:</span>
                <span className="font-semibold text-white">{currencyConfig.hebrewName} ({currencyConfig.label})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="btn-mint px-8 py-3.5 rounded-full text-xs font-bold tracking-wide shadow-xl"
            >
              סגור וחזור לתכנון
            </button>
          </div>
        ) : (
          /* Payment Form Screen */
          <div className="space-y-6">
            {/* Modal Header */}
            <div className="text-right space-y-1 pr-1">
              <div className="flex items-center gap-2 text-xs font-bold text-mint-400">
                <Lock className="w-3.5 h-3.5" />
                <span>הזמנה ותשלום מאובטח</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">
                אישור הזמנת החופשה ל-{tripDetails.destination}
              </h2>
              <p className="text-xs text-slate-400">
                בחר את מטבע התשלום המועדף עליך, סקור את פרטי העסקה והשלם את ההזמנה.
              </p>
            </div>

            {/* CURRENCY SELECTOR STRIP (EURO, DOLLAR, SHEKEL) */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  בחר מטבע לחיוב ולתשלום:
                </span>
                <span className="text-[11px] text-mint-400 font-medium">
                  {currencyConfig.flag} {currencyConfig.hebrewName}
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
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
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

              {/* Live exchange rate notification */}
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                <span>שער המרה מבוסס על שער רציף</span>
                <span className="font-mono text-slate-300">
                  1 USD = {CURRENCIES.ILS.rateAgainstUSD} ₪ | 1 USD = {CURRENCIES.EUR.rateAgainstUSD} €
                </span>
              </div>
            </div>

            {/* Order Price Breakdown */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs">
              <div className="font-bold text-slate-200 pb-1.5 border-b border-white/10 flex items-center justify-between">
                <span>פירוט חבילת הנופש ({tripDetails.durationDays} ימים)</span>
                <span className="text-mint-400 font-semibold">{tripDetails.destination}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-blue-400" />
                  טיסות הלוך ושוב (כולל כבודה)
                </span>
                <span className="font-semibold text-white">{formatRaw(flightInSelected)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  לינה במלון נבחר
                </span>
                <span className="font-semibold text-white">{formatRaw(hotelInSelected)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  דמי טיפול וסנכרון סוכני AI
                </span>
                <span className="font-semibold text-white">{formatRaw(feesInSelected)}</span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-bold">
                <span className="text-white">סה״כ לתשלום סופי:</span>
                <div className="text-left">
                  <span className="text-xl font-heading font-black text-mint-400">
                    {formatRaw(totalInSelectedCurrency, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Methods Selection */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 block">בחר אמצעי תשלום:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    paymentMethod === "card"
                      ? "bg-indigo-600/30 text-white border-indigo-500/80 shadow-md"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>כרטיס אשראי</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("apple_pay")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    paymentMethod === "apple_pay"
                      ? "bg-indigo-600/30 text-white border-indigo-500/80 shadow-md"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span> Apple Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("google_pay")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    paymentMethod === "google_pay"
                      ? "bg-indigo-600/30 text-white border-indigo-500/80 shadow-md"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>G Pay</span>
                </button>
              </div>
            </div>

            {/* Card Form */}
            {paymentMethod === "card" && (
              <form onSubmit={handlePay} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">שם מלא על הכרטיס</label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-mint-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">מספר כרטיס אשראי</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                      const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
                      setCardNumber(formatted);
                    }}
                    placeholder="4580 •••• •••• ••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-mint-400 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">תוקף (MM/YY)</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="12/28"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-mint-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">קוד אבטחה (CVV)</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="•••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-mint-400 transition"
                    />
                  </div>
                </div>

                {/* Trust and Guarantee badges */}
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-white/10">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-mint-400" />
                    תקן אבטחה מחמיר PCI-DSS
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-mint-400" />
                    הצפנת SSL 256-bit
                  </span>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl btn-mint text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>מעבד תשלום מאובטח...</span>
                    </>
                  ) : (
                    <>
                      <span>בצע תשלום סופי בסך {formatRaw(totalInSelectedCurrency, true)}</span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Apple Pay / Google Pay Direct Submit */}
            {(paymentMethod === "apple_pay" || paymentMethod === "google_pay") && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-slate-300">
                  חיוב מהיר באמצעות ארנק דיגיטלי מאובטח בסך{" "}
                  <strong className="text-mint-400 text-sm font-bold">
                    {formatRaw(totalInSelectedCurrency, true)}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-slate-200 transition"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : paymentMethod === "apple_pay" ? (
                    <span>שלם באמצעות  Apple Pay ({formatRaw(totalInSelectedCurrency, true)})</span>
                  ) : (
                    <span>שלם באמצעות G Pay ({formatRaw(totalInSelectedCurrency, true)})</span>
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
