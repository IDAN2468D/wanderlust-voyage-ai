"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Calendar,
  DollarSign,
  ArrowLeft,
  Sparkles,
  Plane,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { BookingPaymentModal } from "@/components/BookingPaymentModal";

interface SampleTrip {
  id: string;
  title: string;
  destination: string;
  country: string;
  days: number;
  totalBudget: number;
  image: string;
  flightEst: number;
  hotelEst: number;
  style: string;
  itineraryDays: { day: number; title: string; desc: string }[];
}

const TRIPS_DATA: SampleTrip[] = [
  {
    id: "bali-10-days",
    title: "באלי הקסומה: ג'ונגלים, מקדשים ווילות מבודדות",
    destination: "באלי",
    country: "אינדונזיה",
    days: 10,
    totalBudget: 1450,
    image: "/images/bali.jpg",
    flightEst: 620,
    hotelEst: 510,
    style: "יוקרה קלה / טבע",
    itineraryDays: [
      { day: 1, title: "נחיתה בדנפסאר והעברה לאובוד", desc: "התמקמות בריזורט בוטיק בין טרסות האורז וטיפול ספא מסורתי." },
      { day: 2, title: "יער הקופים ושוק האמנים באובוד", desc: "סיור בוקר בשוק המקומי, ביקור ביער הקופים הקדוש וארוחת שף מקומית." },
      { day: 3, title: "מפלי טיבומנה ומקדש טירתה אמפול", desc: "טבילה במעיינות המרפא הקדושים ורחצה במפלים נסתרים בג'ונגל." },
      { day: 4, title: "טרק זריחה להר הגעש באטור", desc: "עלייה מודרכת לקראת הזריחה עם ארוחת בוקר חמה על הפסגה." },
      { day: 5, title: "מעבר לחופי צ'אנגו וסמיניאק", desc: "סדנת גלישת גלים ראשונה ושקיעה מול מועדוני החוף המפורסמים." },
      { day: 6, title: "שייט לאי נוסה פנידה", desc: "תצפית על מפרץ קלינגקינג (צוק הדינוזאור) ושנורקלינג בלגונת קריסטל." },
      { day: 7, title: "מקדש אולוואטו ומופע קצ'אק", desc: "מקדש עתיק על שפת צוק דרמטי מעל האוקיינוס ומופע אש מסורתי בשקיעה." },
      { day: 8, title: "יום פינוק וספא בוילה פרטית", desc: "עיסוי באלינזי בארבע ידיים, אמבט פרחים מרגיע וזמן חופשי לבריכה." },
      { day: 9, title: "קניות בוטיק וסדנת בישול מקומית", desc: "רכישת עבודות עץ ובדים אינדונזיים וסדנת הכנת נסי גורנג אותנטי." },
      { day: 10, title: "קפה אחרון מול האוקיינוס וטיסה חזרה", desc: "צ'ק אאוט נינוח, העברה לשדה התעופה וטיסה הביתה." },
    ],
  },
  {
    id: "swiss-7-days",
    title: "האלפים השוויצריים: פסגות, קרחונים ורכבות נוף",
    destination: "האלפים השוויצריים",
    country: "שוויץ",
    days: 7,
    totalBudget: 2400,
    image: "/images/swiss_alps.jpg",
    flightEst: 430,
    hotelEst: 1180,
    style: "נופים פנורמיים / טבע",
    itineraryDays: [
      { day: 1, title: "נחיתה בציריך ונסיעה ללוצרן", desc: "שייט באגם לוצרן, גשר הקאפלה ההיסטורי ולינה במלון המשקיף למים." },
      { day: 2, title: "הר פילאטוס ברכבת השיניים התלולה בעולם", desc: "עלייה פנורמית לפסגה, תצפית אלפינית וירידה ברכבל כבלים." },
      { day: 3, title: "אינטרלאקן ועמק לאוטרברונן", desc: "עמק 72 המפלים שהיווה השראה לשר הטבעות, רכבל למירן." },
      { day: 4, title: "יונגפראויוך - 'גג אירופה'", desc: "תחנת הרכבת הגבוהה ביותר באירופה, ארמון קרח ותצפית קרחון אלטש." },
      { day: 5, title: "נסיעה ברכבת המפורסמת לצרמט", desc: "עיירה ציורית ללא מכוניות מנוע למרגלות פסגת המטרהורן האגדית." },
      { day: 6, title: "תצפית גורנרגראט וספא אלפיני", desc: "רכבת הרים לגורנרגראט מול 29 פסגות בנות 4,000 מטר ורגיעה בסאונה." },
      { day: 7, title: "טעימות שוקולד וגבינות בדרך לשדה התעופה", desc: "חזרה ברכבת נוחה לנמל התעופה בציריך וטיסה חזרה." },
    ],
  },
  {
    id: "santorini-5-days",
    title: "סנטוריני: שקיעות בלתי נשכחות ונופי קלדרה",
    destination: "סנטוריני",
    country: "יוון",
    days: 5,
    totalBudget: 1850,
    image: "/images/santorini.jpg",
    flightEst: 390,
    hotelEst: 850,
    style: "רומנטיקה ובוטיק",
    itineraryDays: [
      { day: 1, title: "נחיתה והגעה לוילה באויה (Oia)", desc: "קבלת פנים עם יין מקומי, צפייה בשקיעה המפורסמת ממרפסת פרטית." },
      { day: 2, title: "שביל ההליכה בין פירה לאויה", desc: "מסלול הליכה פנורמי מרהיב לאורך שפת הקלדרה של הר הגעש." },
      { day: 3, title: "שייט קטמרן פרטי סביב הר הגעש", desc: "טבילה במעיינות חמים גופרתיים, ארוחת ברביקיו יוונית על הסיפון." },
      { day: 4, title: "הכפר פירגוס וטעימות יקבים מקומיים", desc: "סיור בכפר עתיק שקט, טעימת יינות אסירטיקו בליווי גבינות מקומיות." },
      { day: 5, title: "חוף החול האדום וטיסה חזרה", desc: "שחייה אחרונה במי הטורקיז, ארוחת צהריים בטברנה מקומית והמראה." },
    ],
  },
  {
    id: "maldives-6-days",
    title: "האיים המלדיביים: וילת מים פרטית ושלווה אבסולוטית",
    destination: "האיים המלדיביים",
    country: "האוקיינוס ההודי",
    days: 6,
    totalBudget: 3200,
    image: "/images/maldives.jpg",
    flightEst: 850,
    hotelEst: 1650,
    style: "יוקרה עילאית",
    itineraryDays: [
      { day: 1, title: "נחיתה במאלה וטיסה במטוס ימי לריזורט", desc: "נוף עוצר נשימה של האטולים מהאוויר וצ'ק-אין בוילה מעל המים." },
      { day: 2, title: "שנורקלינג ישירות ממרפסת הוילה", desc: "מפגש עם צבי ים ושוניות אלמוגים צבעוניות ממש מתחת לחדר." },
      { day: 3, title: "שייט שקיעה וצפייה בלהקות דולפינים", desc: "שמפניה על הסיפון בעוד עשרות דולפינים מקפצים לצד החרטום." },
      { day: 4, title: "ארוחת ערב פרטית תחת הכוכבים על החוף", desc: "שולחן אינטימי בחול הלבן עם שף פרטי ופירות ים טריים." },
      { day: 5, title: "טיפול ספא זוגי בחדר עם רצפת זכוכית שקופה", desc: "רגיעה מוחלטת תוך כדי צפייה בדגים השוחים מתחת למיטת הטיפולים." },
      { day: 6, title: "ארוחת בוקר צפה בבריכה וטיסה חזרה", desc: "ארוחת בוקר מוגשת במגש צף בבריכת הוילה, פרידה מהאי והמראה." },
    ],
  },
];

export default function TripsPage() {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [expandedTripId, setExpandedTripId] = useState<string | null>("bali-10-days");
  const [bookingTrip, setBookingTrip] = useState<SampleTrip | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTripId((prev) => (prev === id ? null : id));
  };

  const handleCustomizeTrip = (trip: SampleTrip) => {
    const query = new URLSearchParams({
      destination: `${trip.destination}, ${trip.country}`,
      duration: trip.days.toString(),
      budget: trip.totalBudget.toString(),
    }).toString();

    router.push(`/?${query}#planner-form`);
  };

  return (
    <div className="min-h-screen bg-[#070c12] text-white selection:bg-mint-400 selection:text-slate-950 font-sans" dir="rtl">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative py-20 px-6 sm:px-12 lg:px-16 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0 opacity-20">
          <Image
            src="/images/santorini.jpg"
            alt="Trips Background"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070c12]/85 via-[#070c12] to-[#070c12]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-mint-400 text-xs font-bold uppercase tracking-[0.2em] bg-mint-500/10 px-4 py-1.5 rounded-full border border-mint-500/20">
            <Sparkles className="w-4 h-4" />
            <span>תוכניות מסע בדוקות</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            מסלולי דוגמה שהורכבו ע&quot;י AI
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            קבל השראה מתוכניות חופשה מושלמות שנבנו, תומחרו ואומתו בזמן אמת על ידי ארבעת סוכני ה-AI שלנו. בלחיצה אחת תוכל להתאים כל מסלול בדיוק לצרכיך.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-14 space-y-10">
        <div className="space-y-8">
          {TRIPS_DATA.map((trip) => {
            const isExpanded = expandedTripId === trip.id;

            return (
              <div
                key={trip.id}
                className="wanderlust-glass-card rounded-3xl border border-white/15 overflow-hidden transition-all"
              >
                {/* Trip Header Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
                  {/* Thumbnail Image */}
                  <div className="lg:col-span-4 relative h-56 rounded-2xl overflow-hidden border border-white/10">
                    <Image
                      src={trip.image}
                      alt={trip.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs font-semibold text-white bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md">
                      <MapPin className="w-3.5 h-3.5 text-mint-400" />
                      <span>{trip.destination}, {trip.country}</span>
                    </div>
                  </div>

                  {/* Trip Summary Details */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-mint-500/20 text-mint-300 border border-mint-500/30 text-[11px] font-bold">
                        {trip.style}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {trip.days} ימים מלאים
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl font-bold text-white">
                      {trip.title}
                    </h3>

                    {/* Financial Estimations Strip */}
                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-400 block">תקציב כולל</span>
                        <span className="font-bold text-mint-400 text-sm">{formatPrice(trip.totalBudget)}</span>
                      </div>
                      <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                          <Plane className="w-3 h-3 text-slate-400" /> טיסות
                        </span>
                        <span className="font-semibold text-white text-xs">{formatPrice(trip.flightEst)}</span>
                      </div>
                      <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" /> מלונות
                        </span>
                        <span className="font-semibold text-white text-xs">{formatPrice(trip.hotelEst)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="lg:col-span-3 flex flex-col gap-2.5 justify-center">
                    <button
                      type="button"
                      onClick={() => setBookingTrip(trip)}
                      className="btn-mint w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg group"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>הזמן עכשיו ({formatPrice(trip.totalBudget)})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCustomizeTrip(trip)}
                      className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 transition"
                    >
                      <span>התאם מסלול זה עבורי</span>
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(trip.id)}
                      className="w-full py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition"
                    >
                      <span>{isExpanded ? "הסתר פירוט יומי" : "צפה בתוכנית יום-אחר-יום"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Day by Day Accordion / Itinerary expansion */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/30 p-6 sm:p-8 animate-fade-in space-y-4">
                    <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-mint-400" />
                      <span>תוכנית יומית מפורטת</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {trip.itineraryDays.map((item) => (
                        <div
                          key={item.day}
                          className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex items-start gap-3"
                        >
                          <div className="w-7 h-7 rounded-xl bg-mint-500/20 border border-mint-500/30 text-mint-300 flex items-center justify-center text-xs font-bold shrink-0">
                            {item.day}
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-bold text-xs text-white">{item.title}</h5>
                            <p className="text-[11px] text-slate-300 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Booking and Secure Payment Modal */}
      <BookingPaymentModal
        isOpen={!!bookingTrip}
        onClose={() => setBookingTrip(null)}
        tripDetails={
          bookingTrip
            ? {
                destination: `${bookingTrip.destination}, ${bookingTrip.country}`,
                durationDays: bookingTrip.days,
                totalUsd: bookingTrip.totalBudget,
                flightCostUsd: bookingTrip.flightEst,
                hotelCostUsd: bookingTrip.hotelEst,
                title: bookingTrip.title,
              }
            : null
        }
      />

      <Footer />
    </div>
  );
}
