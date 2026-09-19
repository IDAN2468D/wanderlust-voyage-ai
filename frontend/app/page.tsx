"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Play,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Star,
  ShieldCheck,
  Headphones,
  CalendarCheck,
  Lock,
  Plane,
  Sparkles,
  MapPin,
  Compass,
  Clock,
  Check,
  Users,
  Layers,
  Activity,
  ArrowUpRight,
  Cpu,
  Luggage,
  Umbrella,
  Calendar,
  Heart,
  TrendingUp,
  CheckCircle2,
  Zap,
  Navigation,
  Utensils,
  ShoppingBag,
  Radio,
  MessageSquare,
  Car,
  Ship,
  ArrowLeftRight,
  Hotel,
  Globe,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VideoModal } from "@/components/VideoModal";
import { TripForm, TripFormData } from "@/components/TripForm";
import { AgentStreamLogs, StreamLogItem } from "@/components/AgentStreamLogs";
import { TripResultView } from "@/components/TripResultView";

// Curated destinations with rich metadata, category tags and moments
interface DestinationItem {
  id: string;
  name: string;
  location: string;
  country: string;
  rating: number;
  reviewsCount: number;
  image: string;
  category: "all" | "islands" | "culture" | "nature" | "culinary";
  moments: number;
  durationDays: number;
  estCostUsd: number;
  tagline: string;
  flightHoursFromTlv: string;
}

interface CuratedPlaceItem {
  id: string;
  name: string;
  hebrewName: string;
  location: string;
  country: string;
  rating: number;
  reviewsCount: number;
  image: string;
  category: "all" | "nature" | "culture" | "recreation" | "culinary";
  categoryLabel: string;
  description: string;
  durationDays: number;
}

// 6 Curated Places from Bali reference (CariBali style)
const BALI_CURATED_PLACES: CuratedPlaceItem[] = [
  {
    id: "uluwatu",
    name: "Uluwatu Temple",
    hebrewName: "מקדש אולואווטו",
    location: "דרום באלי, אינדונזיה",
    country: "אינדונזיה",
    rating: 4.6,
    reviewsCount: 840,
    image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=1200&auto=format&fit=crop",
    category: "culture",
    categoryLabel: "תרבות ומקדשים",
    description: "Perched on a dramatic cliff-top overlooking the Indian Ocean, Uluwatu Temple is one of Bali's most iconic landmarks.",
    durationDays: 8,
  },
  {
    id: "tegalalang",
    name: "Tegalalang Rice Terrace",
    hebrewName: "טרסות האורז טגלאלנג",
    location: "אובוד, באלי",
    country: "אינדונזיה",
    rating: 4.3,
    reviewsCount: 650,
    image: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=1200&auto=format&fit=crop",
    category: "nature",
    categoryLabel: "תיירות טבע",
    description: "Located in the heart of Ubud, Tegalalang offers stunning green rice terraces arranged in a traditional Subak system.",
    durationDays: 8,
  },
  {
    id: "batur",
    name: "Mount Batur",
    hebrewName: "הר באטור",
    location: "קינטמני, באלי",
    country: "אינדונזיה",
    rating: 4.6,
    reviewsCount: 520,
    image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=1200&auto=format&fit=crop",
    category: "nature",
    categoryLabel: "תיירות טבע",
    description: "An active volcano and one of Bali's most popular trekking spots, Mount Batur offers an unforgettable sunrise over cloud valleys.",
    durationDays: 8,
  },
  {
    id: "tirta_empul",
    name: "Tirta Empul Temple",
    hebrewName: "מקדש טירטה אמפול",
    location: "טמפקסירינג, באלי",
    country: "אינדונזיה",
    rating: 4.6,
    reviewsCount: 710,
    image: "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?q=80&w=1200&auto=format&fit=crop",
    category: "culture",
    categoryLabel: "תרבות ומקדשים",
    description: "This sacred water temple in Tampaksiring is famous for holy spring water, where visitors experience spiritual purification.",
    durationDays: 8,
  },
  {
    id: "monkey_forest",
    name: "Sacred Monkey Forest Sanctuary",
    hebrewName: "יער הקופים הקדוש",
    location: "מרכז אובוד, באלי",
    country: "אינדונזיה",
    rating: 4.5,
    reviewsCount: 920,
    image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=1200&auto=format&fit=crop",
    category: "nature",
    categoryLabel: "תיירות טבע",
    description: "Nestled in central Ubud, this lush forest sanctuary is home to over 1,000 long-tailed macaques and moss-draped ancient shrines.",
    durationDays: 8,
  },
  {
    id: "kelingking",
    name: "Nusa Penida (Kelingking Beach)",
    hebrewName: "נוסה פנידה (צוק קלינגקינג)",
    location: "נוסה פנידה, באלי",
    country: "אינדונזיה",
    rating: 4.7,
    reviewsCount: 1150,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
    category: "recreation",
    categoryLabel: "נופש וחופים",
    description: "Famous for its cliff that resembles a T-Rex overlooking an untouched white-sand cove and hypnotic turquoise waters.",
    durationDays: 8,
  },
];

const FEATURED_DESTINATIONS: DestinationItem[] = [
  {
    id: "santorini",
    name: "סנטוריני",
    location: "האיים הקיקלאדיים",
    country: "יוון",
    rating: 4.9,
    reviewsCount: 428,
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop",
    category: "islands",
    moments: 24,
    durationDays: 5,
    estCostUsd: 1350,
    tagline: "שקיעות מרהיבות באויה, וילות לבנות ובריכות אינסוף מול הלוע הגעשי",
    flightHoursFromTlv: "2 שעות ו-15 דק'",
  },
  {
    id: "tokyo",
    name: "טוקיו",
    location: "קנטו",
    country: "יפן",
    rating: 4.95,
    reviewsCount: 680,
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
    category: "culture",
    moments: 42,
    durationDays: 10,
    estCostUsd: 2850,
    tagline: "שילוב חד-פעמי בין עתידנות, מקדשים עתיקים, אופנת רחוב ומטבח מישלן",
    flightHoursFromTlv: "11 שעות ו-20 דק'",
  },
  {
    id: "maldives",
    name: "האיים המלדיביים",
    location: "האוקיינוס ההודי",
    country: "המלדיביים",
    rating: 4.92,
    reviewsCount: 310,
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1200&auto=format&fit=crop",
    category: "islands",
    moments: 19,
    durationDays: 7,
    estCostUsd: 3400,
    tagline: "בקתות עץ יוקרתיות על המים, שוניות אלמוגים פראיות ושלווה מוחלטת",
    flightHoursFromTlv: "7 שעות ו-40 דק'",
  },
  {
    id: "swiss_alps",
    name: "האלפים השוויצריים",
    location: "צנטרלשוויץ",
    country: "שוויץ",
    rating: 4.88,
    reviewsCount: 295,
    image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop",
    category: "nature",
    moments: 31,
    durationDays: 6,
    estCostUsd: 2200,
    tagline: "פסגות מושלגות, אגמים צלולים, רכבות פנורמיות ומלונות ספא יוקרתיים",
    flightHoursFromTlv: "4 שעות ו-10 דק'",
  },
  {
    id: "bali",
    name: "באלי",
    location: "אינדונזיה",
    country: "אינדונזיה",
    rating: 4.85,
    reviewsCount: 540,
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
    category: "nature",
    moments: 36,
    durationDays: 8,
    estCostUsd: 1750,
    tagline: "טרסות אורז באובוד, מקדשים מרחפים על המים וחופים טרופיים קסומים",
    flightHoursFromTlv: "13 שעות ו-30 דק'",
  },
  {
    id: "rome",
    name: "רומא",
    location: "לאציו",
    country: "איטליה",
    rating: 4.87,
    reviewsCount: 620,
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
    category: "culinary",
    moments: 28,
    durationDays: 5,
    estCostUsd: 1420,
    tagline: "פסטה טרייה בסמטאות טרסטוורה, קולוסיאום מואר והיסטוריה חיה בכל צעד",
    flightHoursFromTlv: "3 שעות ו-45 דק'",
  },
];

// Quick Hero Inspiration Chips
const QUICK_INSPIRATIONS = [
  { label: "🌸 טוקיו ביפן", destination: "טוקיו, יפן", duration: 10 },
  { label: "🏖️ חופשת באלי", destination: "באלי, אינדונזיה", duration: 8 },
  { label: "🏛️ רומא וטוסקנה", destination: "רומא, איטליה", duration: 5 },
  { label: "🎿 האלפים השוויצריים", destination: "האלפים השוויצריים, שוויץ", duration: 6 },
  { label: "🏝️ וילה במלדיביים", destination: "האיים המלדיביים", duration: 7 },
  { label: "🇬🇷 סנטוריני הרומנטית", destination: "סנטוריני, יוון", duration: 5 },
];

// Autonomous Multi-Agent Team Specs
const AGENTS_TEAM = [
  {
    id: "orchestrator",
    name: "Travel Orchestrator",
    role: "סוכן מתאם ראשי",
    desc: "מנתח את העדפות המטייל, מסנכרן את כל 6 הסוכנים האחרים ומחבר ל-Google Workspace.",
    icon: Compass,
    color: "from-amber-400 to-amber-600",
    badgeColor: "bg-amber-400/10 text-amber-300 border-amber-400/20",
    metrics: "סנכרון תוכנית-על",
  },
  {
    id: "flights",
    name: "Flight Search Engine",
    role: "סוכן טיסות ונתב\"ג",
    desc: "סורק לוחות טיסות מנתב\"ג, בודק מועדי כניסת חג ושבת ומחשב כבודה מלאה ללא הפתעות.",
    icon: Plane,
    color: "from-blue-400 to-cyan-500",
    badgeColor: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
    metrics: "השוואה ישירה וקונקשנים",
  },
  {
    id: "hotels",
    name: "Places & Hotel Curator",
    role: "סוכן לינה וקולינריה",
    desc: "מאתר מלונות בוטיק וריזורטים עם דירוג 8.8+, לצד מסעדות שף וחוויות קולינריה אותנטיות.",
    icon: MapPin,
    color: "from-emerald-400 to-teal-500",
    badgeColor: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    metrics: "אימות מיקומים וקרבה",
  },
  {
    id: "budget",
    name: "Budget & Currency Optimizer",
    role: "סוכן תקציב ופיננסים",
    desc: "מחשב שערי המרה רציפים (₪/$/€), מקצה 10% בלת\"ם אוטומטי ומונע חריגות תקציב.",
    icon: TrendingUp,
    color: "from-purple-400 to-pink-500",
    badgeColor: "bg-purple-400/10 text-purple-300 border-purple-400/20",
    metrics: "ניהול רב-מטבעי מדויק",
  },
  {
    id: "weather",
    name: "Weather & Packing Optimizer",
    role: "סוכן אקלים ומזוודה",
    desc: "בודק טמפרטורות יום/לילה, עומסי חום או גשם ומפיק צ'ק ליסט מותאם למזוודה.",
    icon: Umbrella,
    color: "from-sky-400 to-blue-600",
    badgeColor: "bg-sky-400/10 text-sky-300 border-sky-400/20",
    metrics: "חיזוי עונתי מותאם",
  },
  {
    id: "culture",
    name: "Culture & Events Specialist",
    role: "סוכן תרבות ואירועים",
    desc: "מוצא פסטיבלים עונתיים, נקודות תצפית לשקיעה ואוצרות תרבות הרחק ממלכודות התיירים.",
    icon: Sparkles,
    color: "from-orange-400 to-amber-500",
    badgeColor: "bg-orange-400/10 text-orange-300 border-orange-400/20",
    metrics: "חוויות מקומיות נסתרות",
  },
  {
    id: "safety",
    name: "Safety & Health Advisor",
    role: "סוכן בטיחות ורפואה",
    desc: "מוודא דרישות אשרת כניסה (ויזה), תוקף דרכון, אזהרות מסע עדכניות ומספרי חירום מקומיים.",
    icon: ShieldCheck,
    color: "from-mint-400 to-emerald-600",
    badgeColor: "bg-mint-400/10 text-mint-300 border-mint-400/20",
    metrics: "הגנה ובדיקת דרישות",
  },
  {
    id: "transit",
    name: "Transit & Navigation Specialist",
    role: "סוכן ניווט ותחבורה",
    desc: "מתכנן חיבורי שדות תעופה, קווי מטרו, כרטיסי עיר יומיים (Pass) וציון נגישות רגלית.",
    icon: Navigation,
    color: "from-sky-400 to-blue-500",
    badgeColor: "bg-sky-400/10 text-sky-300 border-sky-400/20",
    metrics: "מטרו והתניידות אופטימלית",
  },
  {
    id: "culinary",
    name: "Gourmet & Kosher Concierge",
    role: "סוכן קולינריה וכשרות",
    desc: "ממפה מנות דגל, מסעדות שף, מוקדי כשרות וחב\"ד, וספיק-איזי מחתרתיים לשעות הלילה.",
    icon: Utensils,
    color: "from-amber-400 to-yellow-500",
    badgeColor: "bg-amber-400/10 text-amber-300 border-amber-400/20",
    metrics: "כשרות וחוויות שף",
  },
  {
    id: "shopping",
    name: "Smart Shopper & Tax-Free Auditor",
    role: "סוכן שופינג ו-Tax-Free",
    desc: "מחשב פטור ממע\"מ (VAT Refund), ספי מינימום לחשבונית, אאוטלטים ושדרות יוקרה.",
    icon: ShoppingBag,
    color: "from-pink-400 to-rose-500",
    badgeColor: "bg-pink-400/10 text-pink-300 border-pink-400/20",
    metrics: "חיסכון של 10-15% במע\"מ",
  },
  {
    id: "calendar",
    name: "Calendar & iCal Sync Specialist",
    role: "סוכן סנכרון יומנים",
    desc: "מייצר קובץ iCal (.ics) תקני וסנכרון בלחיצה ל-Google Calendar עם התראות שעה לפני.",
    icon: CalendarCheck,
    color: "from-indigo-400 to-cyan-500",
    badgeColor: "bg-indigo-400/10 text-indigo-300 border-indigo-400/20",
    metrics: "סנכרון ישיר לטלפון",
  },
  {
    id: "sentinel",
    name: "Live Ground Sentinel",
    role: "סוכן מודיעין שטח והתרעות",
    desc: "מנטר שביתות תעופה, תקלות תחבורה, אזהרות כייסים והונאות שכיחות ומוקדי חירום.",
    icon: Radio,
    color: "from-red-400 to-orange-500",
    badgeColor: "bg-red-400/10 text-red-300 border-red-400/20",
    metrics: "הגנת שטח רציפה",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Daily Trip Butler",
    role: "סוכן קונסיירז' לוואטסאפ",
    desc: "מפיק תדריכים יומיים מלוטשים בבוקר, צהריים וערב עם כפתור שיתוף מיידי לוואטסאפ.",
    icon: MessageSquare,
    color: "from-emerald-400 to-teal-500",
    badgeColor: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    metrics: "שיתוף יומי בלחיצה",
  },
];

// Verified Traveler Testimonials
const TESTIMONIALS = [
  {
    name: "רוני ואלון שפירא",
    from: "תל אביב",
    dest: "טוקיו וקיוטו • 12 ימים",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    quote: "סוכני ה-AI הרכיבו לנו טיול מושלם ליפן ב-40 שניות! המלונות היו בדיוק דקה מתחנות השינקנסן, המסלול הסתנכרן לנו אוטומטית ל-Google Calendar, וחסכנו כמעט ₪3,000 בהשוואת הטיסות.",
    stars: 5,
  },
  {
    name: "מיכל דוידוביץ'",
    from: "הרצליה",
    dest: "האלפים השוויצריים • 6 ימים",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
    quote: "הפיצ'ר של בדיקת מזג האוויר והמזוודה היה גאוני. ידענו בדיוק מה לארוז, קיבלנו שובר הזמנה מעוצב ישר למייל דרך Resend והשירות היה ללא דופי.",
    stars: 5,
  },
  {
    name: "דניאל גרינברג",
    from: "ירושלים",
    dest: "סנטוריני וכרתים • 7 ימים",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    quote: "השילוב של פריסה לתשלומים ללא ריבית והעובדה שכל הטיסות מנתב\"ג נבדקו כולל כבודה אמיתית נתן לנו שקט נפשי מלא. מומלץ בחום לכל מי שמתכנן חופשה!",
    stars: 5,
  },
];

export default function Home() {
  const router = useRouter();
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [logs, setLogs] = useState<StreamLogItem[]>([]);
  const [markdownPlan, setMarkdownPlan] = useState<string>("");
  const [budgetStatus, setBudgetStatus] = useState<string | null>(null);
  const [totalEstimated, setTotalEstimated] = useState<number | null>(null);
  const [remainingBalance, setRemainingBalance] = useState<number | null>(null);
  const [flightCost, setFlightCost] = useState<number | null>(null);
  const [hotelCost, setHotelCost] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, { amount_usd: number; percentage: number }> | null>(null);
  const [currentDestination, setCurrentDestination] = useState<string>("באלי, אינדונזיה");
  const [currentDuration, setCurrentDuration] = useState<number>(7);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCuratedCategory, setSelectedCuratedCategory] = useState<string>("all");
  const [curatedPage, setCuratedPage] = useState<number>(1);
  const [searchLocation, setSearchLocation] = useState<string>("באלי, אינדונזיה");
  const [searchVibe, setSearchVibe] = useState<string>("טבע ונופים");
  const [activeAgentCard, setActiveAgentCard] = useState<number>(0);

  // GlobalVista Liquid Glass Booking Console States
  const [activeBookingTab, setActiveBookingTab] = useState<"flights" | "hotels" | "cars" | "cruises">("flights");
  const [searchOrigin, setSearchOrigin] = useState<string>("תל אביב (TLV), ישראל");
  const [searchDestination, setSearchDestination] = useState<string>("לכל יעד בעולם (Anywhere)");
  const [departDate, setDepartDate] = useState<string>("2025-05-24");
  const [returnDate, setReturnDate] = useState<string>("2025-05-31");
  const [travelersCount, setTravelersCount] = useState<string>("2 מבוגרים, ילד 1");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    bali: false,
    santorini: true,
    dubai: false,
    maldives: false,
  });

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSwapOriginDestination = () => {
    const prevOrigin = searchOrigin;
    const prevDest = searchDestination;
    setSearchOrigin(prevDest === "לכל יעד בעולם (Anywhere)" ? "באלי, אינדונזיה" : prevDest);
    setSearchDestination(prevOrigin);
  };

  // Specialist Agents Extra Data
  const [weatherMetrics, setWeatherMetrics] = useState<any>(null);
  const [packingChecklist, setPackingChecklist] = useState<any[]>([]);
  const [safetyInfo, setSafetyInfo] = useState<any>(null);
  const [seasonalEvents, setSeasonalEvents] = useState<any>(null);
  const [structuredDays, setStructuredDays] = useState<any[]>([]);
  const [recommendedFlight, setRecommendedFlight] = useState<any>(null);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [startDateFormatted, setStartDateFormatted] = useState<string>("");
  const [transitGuide, setTransitGuide] = useState<any>(null);
  const [culinaryGuide, setCulinaryGuide] = useState<any>(null);
  const [shoppingTaxfree, setShoppingTaxfree] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<any>(null);
  const [groundAlerts, setGroundAlerts] = useState<any>(null);
  const [whatsappBriefings, setWhatsappBriefings] = useState<any>(null);

  const agentSectionRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Check URL search parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const destParam = params.get("destination");
      const durationParam = params.get("duration");

      if (destParam) {
        setCurrentDestination(destParam);
      }
      if (durationParam) {
        const d = parseInt(durationParam, 10);
        if (!isNaN(d) && d > 0) setCurrentDuration(d);
      }

      if (window.location.hash === "#planner-form") {
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, []);

  const handleSelectQuickInspiration = (dest: string, duration: number) => {
    setCurrentDestination(dest);
    setCurrentDuration(duration);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredDestinations =
    selectedCategory === "all"
      ? FEATURED_DESTINATIONS
      : FEATURED_DESTINATIONS.filter((d) => d.category === selectedCategory);

  // Combined and paginated places (6 per page like CariBali)
  const allCuratedPlaces: CuratedPlaceItem[] = [
    ...BALI_CURATED_PLACES,
    ...FEATURED_DESTINATIONS.map((d) => ({
      id: d.id,
      name: d.name,
      hebrewName: d.name,
      location: `${d.location}, ${d.country}`,
      country: d.country,
      rating: d.rating,
      reviewsCount: d.reviewsCount,
      image: d.image,
      category: (d.category === "islands" ? "recreation" : d.category) as any,
      categoryLabel:
        d.category === "islands"
          ? "נופש וחופים"
          : d.category === "nature"
          ? "תיירות טבע"
          : d.category === "culture"
          ? "תרבות ומקדשים"
          : "קולינריה",
      description: d.tagline,
      durationDays: d.durationDays,
    })),
  ];

  const filteredCuratedPlaces =
    selectedCuratedCategory === "all"
      ? allCuratedPlaces
      : allCuratedPlaces.filter((p) => p.category === selectedCuratedCategory);

  const PAGE_SIZE = 6;
  const totalCuratedPages = Math.max(1, Math.ceil(filteredCuratedPlaces.length / PAGE_SIZE));
  const displayCuratedPlaces = filteredCuratedPlaces.slice(
    (curatedPage - 1) * PAGE_SIZE,
    curatedPage * PAGE_SIZE
  );

  const handleTripSubmit = async (formData: TripFormData) => {
    setIsStreaming(true);
    setActiveAgent("travel_orchestrator");
    setLogs([]);
    setMarkdownPlan("");
    setBudgetStatus(null);
    setTotalEstimated(null);
    setRemainingBalance(null);
    setFlightCost(null);
    setHotelCost(null);
    setBreakdown(null);
    setWeatherMetrics(null);
    setPackingChecklist([]);
    setSafetyInfo(null);
    setSeasonalEvents(null);
    setStructuredDays([]);
    setRecommendedFlight(null);
    setSelectedHotel(null);
    setStartDateFormatted("");
    setTransitGuide(null);
    setCulinaryGuide(null);
    setShoppingTaxfree(null);
    setCalendarEvents(null);
    setGroundAlerts(null);
    setWhatsappBriefings(null);
    setCurrentDestination(formData.destination);
    setCurrentDuration(formData.durationDays);

    // Scroll to agent telemetry section
    setTimeout(() => {
      agentSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://wanderlust-voyage-ai.onrender.com";
    const streamUrl = `${apiBase}/api/v1/trips/plan/stream`;

    const requestPayload = {
      origin: formData.origin,
      destination: formData.destination,
      start_date: formData.startDate,
      duration_days: formData.durationDays,
      total_budget: formData.totalBudget,
      interests: formData.interests,
      travel_style: formData.travelStyle,
    };

    try {
      let response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(requestPayload),
      });

      // Fallback
      if (!response.ok && response.status === 404) {
        response = await fetch(`${apiBase}/api/v1/plan-trip/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(requestPayload),
        });
      }

      if (!response.ok || !response.body) {
        throw new Error(`שרת ה-API החזיר שגיאה: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = "message";
          let eventDataRaw = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              eventType = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              eventDataRaw = line.replace("data:", "").trim();
            }
          }

          if (!eventDataRaw) continue;

          try {
            const data = JSON.parse(eventDataRaw);
            const nowTime = new Date().toLocaleTimeString("he-IL");

            if (eventType === "step") {
              setActiveAgent(data.agent || null);
              setLogs((prev) => [
                ...prev,
                {
                  id: Math.random().toString(),
                  type: "step",
                  agent: data.agent,
                  stage: data.stage,
                  title: data.title,
                  message: data.message,
                  timestamp: nowTime,
                },
              ]);
            } else if (eventType === "tool_call") {
              setLogs((prev) => [
                ...prev,
                {
                  id: Math.random().toString(),
                  type: "tool_call",
                  agent: data.agent,
                  tool: data.tool,
                  summary: data.summary,
                  timestamp: nowTime,
                },
              ]);
            } else if (eventType === "chunk") {
              setMarkdownPlan((prev) => prev + (data.text || ""));
            } else if (eventType === "done") {
              setBudgetStatus(data.budget_status);
              setTotalEstimated(data.total_estimated);
              setRemainingBalance(data.remaining_balance);
              setFlightCost(data.flight_cost);
              setHotelCost(data.hotel_cost);
              setBreakdown(data.breakdown);
              setWeatherMetrics(data.weather_metrics || null);
              setPackingChecklist(data.packing_checklist || []);
              setSafetyInfo(data.safety_info || null);
              setSeasonalEvents(data.seasonal_events || null);
              setStructuredDays(data.structured_days || []);
              setRecommendedFlight(data.recommended_flight || null);
              setSelectedHotel(data.selected_hotel || null);
              setStartDateFormatted(data.start_date_formatted || "");
              setTransitGuide(data.transit_guide || null);
              setCulinaryGuide(data.culinary_guide || null);
              setShoppingTaxfree(data.shopping_taxfree || null);
              setCalendarEvents(data.calendar_events || null);
              setGroundAlerts(data.ground_alerts || null);
              setWhatsappBriefings(data.whatsapp_briefings || null);
              setActiveAgent(null);
              setLogs((prev) => [
                ...prev,
                {
                  id: Math.random().toString(),
                  type: "done",
                  agent: "travel_orchestrator",
                  stage: "COMPLETE",
                  title: "התוכנית הושלמה בהצלחה ע\"י 13 סוכני ה-AI האוטונומיים",
                  message: `כל משימות 13 הסוכנים סוכמו במלואן. סטטוס תקציב: ${
                    data.budget_status === "APPROVED" ? "מאושר (כולל 10% בלת\"ם)" : "חריגה"
                  }`,
                  timestamp: nowTime,
                },
              ]);

              // Store last planned trip for post-registration email auto-dispatch
              try {
                localStorage.setItem(
                  "wanderlust_last_planned_trip",
                  JSON.stringify({
                    destination: formData.destination,
                    duration_days: formData.durationDays,
                    total_estimated_usd: data.total_estimated || 2400,
                    markdown_plan: data.markdown_plan || "",
                  })
                );
              } catch (e) {}
            }
          } catch (err) {
            console.error("שגיאה בפענוח בלוק SSE:", err);
          }
        }
      }
    } catch (error) {
      console.warn("שגיאה בהזרמת SSE, מנסה מסלול ישיר:", error);
      try {
        const syncUrl = `${apiBase}/api/v1/trips/plan`;
        let res = await fetch(syncUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });
        if (!res.ok && res.status === 404) {
          res = await fetch(`${apiBase}/api/v1/plan-trip`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload),
          });
        }
        if (res.ok) {
          const syncData = await res.json();
          setMarkdownPlan(syncData.markdown_plan);
          setBudgetStatus(syncData.budget_status);
          setTotalEstimated(syncData.total_estimated);
          setRemainingBalance(syncData.remaining_balance);
          setFlightCost(syncData.flight_cost);
          setHotelCost(syncData.hotel_cost);
          setBreakdown(syncData.itemized_breakdown);
          setWeatherMetrics(syncData.weather_metrics || null);
          setPackingChecklist(syncData.packing_checklist || []);
          setSafetyInfo(syncData.safety_info || null);
          setSeasonalEvents(syncData.seasonal_events || null);
          setStructuredDays(syncData.structured_days || []);
          setRecommendedFlight(syncData.recommended_flight || null);
          setSelectedHotel(syncData.selected_hotel || null);
          setStartDateFormatted(syncData.start_date_formatted || "");
          setTransitGuide(syncData.transit_guide || null);
          setCulinaryGuide(syncData.culinary_guide || null);
          setShoppingTaxfree(syncData.shopping_taxfree || null);
          setCalendarEvents(syncData.calendar_events || null);
          setGroundAlerts(syncData.ground_alerts || null);
          setWhatsappBriefings(syncData.whatsapp_briefings || null);

          try {
            localStorage.setItem(
              "wanderlust_last_planned_trip",
              JSON.stringify({
                destination: formData.destination,
                duration_days: formData.durationDays,
                total_estimated_usd: syncData.total_estimated || 2400,
                markdown_plan: syncData.markdown_plan || "",
              })
            );
          } catch (e) {}
        }
      } catch (fallbackErr) {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            type: "error",
            title: "שגיאת תקשורת",
            message: `לא ניתן להתחבר לשרת בכתובת ${apiBase}. ודא ששרת ה-Backend פעיל.`,
            timestamp: new Date().toLocaleTimeString("he-IL"),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setActiveAgent(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#050811] text-white selection:bg-mint-400 selection:text-slate-950 font-sans relative overflow-x-hidden" dir="rtl">
      {/* Background Liquid Glass Ambient Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 -right-40 w-[550px] h-[550px] rounded-full bg-cyan-600/10 blur-[130px] animate-flow-1" />
        <div className="absolute top-2/3 -left-40 w-[600px] h-[600px] rounded-full bg-mint-500/10 blur-[140px] animate-flow-2" />
        <div className="absolute bottom-10 right-1/3 w-[450px] h-[450px] rounded-full bg-amber-500/08 blur-[120px] animate-flow-3" />
      </div>

      {/* Global Shared Header Navbar */}
      <Navbar />

      {/* ========================================================
          LIVE AIRPORT & TELEMETRY TICKER BAR (Liquid Glass 4.0 Pro)
      ======================================================== */}
      <div className="relative z-20 border-b border-white/[0.08] bg-[#070b13]/90 backdrop-blur-2xl py-2.5 px-4 sm:px-8 text-[11px] select-none overflow-hidden" dir="rtl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Live Station Badge */}
          <div className="flex items-center gap-2 font-bold shrink-0 bg-mint-500/10 border border-mint-400/25 px-3 py-1 rounded-full text-mint-300 shadow-[0_0_12px_rgba(45,212,191,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-mint-400" />
            </span>
            <span className="text-xs">טלמטריה חיה נתב"ג (TLV Hub)</span>
          </div>

          {/* Telemetry Data Ribbon without ugly scrollbars */}
          <div className="flex items-center gap-3 sm:gap-5 text-slate-300 font-mono overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap text-xs">
            <span className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              <Plane className="w-3.5 h-3.5 text-cyan-400" />
              <span>TLV ⇄ HND: <strong className="text-white font-sans">11h 20m</strong> • טיסות פתוחות</span>
            </span>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              <span>🏛️ FCO רומא: <strong className="text-white font-sans">21°C</strong> • עומס נמוך</span>
            </span>
            <span className="text-white/20 hidden md:inline">|</span>
            <span className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              <span>🏝️ JTR סנטוריני: <strong className="text-white font-sans">23°C</strong> • שקיעה ב-19:42</span>
            </span>
            <span className="text-white/20 hidden lg:inline">|</span>
            <span className="flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-emerald-300">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>1 USD = ₪3.72 • 1 EUR = ₪4.02</span>
            </span>
            <span className="text-white/20 hidden xl:inline">|</span>
            <span className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-amber-300 font-sans font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>13 סוכני AI פעילים במקביל</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          HERO WRAPPER WITH WORLD LANDMARKS & GLOBE HORIZON (GlobalVista Theme)
      ======================================================== */}
      <div className="relative min-h-[960px] lg:min-h-[1080px] w-full overflow-hidden flex flex-col justify-between">
        {/* Background Image: High-res World Landmarks & Planet Earth Horizon */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/world_landmarks_globe.jpg"
            alt="GlobalVista - Explore the World With Confidence"
            fill
            priority
            unoptimized
            className="object-cover object-center scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Multi-layer Cinematic Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-[#050811]/30 to-blue-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/45 via-transparent to-blue-950/45" />
        </div>

        {/* HERO MAIN CONTENT - Full Width Panoramic Architecture */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-8 pb-10 w-full">
          {/* Top Hero Section: Headline, Live Badges & CTAs */}
          <div className="max-w-4xl mx-auto text-center space-y-4 mb-4">
            {/* Top Luxury Eyebrow */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold tracking-wide shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
              <span>AI-POWERED TRAVEL PLANNER • 13 סוכנים אוטונומיים</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-ping" />
            </div>

            {/* Massive Headline matching GlobalVista reference */}
            <h1 className="font-heading font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-[1.1] drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              Explore the World <br />
              <span className="bg-gradient-to-r from-white via-sky-100 to-blue-200 bg-clip-text text-transparent">
                With Confidence
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] font-medium">
              Seamless global travel planning, personalized experiences, and trusted booking — all in one place.
            </p>

            {/* Two Action Buttons: Start Your Journey & View Destinations */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  formRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black shadow-[0_0_25px_rgba(37,99,235,0.5)] hover:shadow-[0_0_35px_rgba(37,99,235,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
              >
                <span>Start Your Journey</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <a
                href="#discover-places"
                className="px-6 py-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-sky-300" />
                <span>View Destinations</span>
                <ArrowLeft className="w-4 h-4 text-white/70" />
              </a>
            </div>
          </div>

          {/* ========================================================
              FLOATING LIQUID GLASS BOOKING CONSOLE (GlobalVista Style)
          ======================================================== */}
          <div className="w-full max-w-5xl mx-auto mt-6 mb-4 relative z-20">
            <div className="relative group">
              {/* Ambient specular bloom glow */}
              <div className="absolute -inset-1.5 rounded-[36px] bg-gradient-to-r from-blue-500/25 via-cyan-500/20 to-indigo-500/25 blur-2xl opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />

              {/* The Big Glass Card */}
              <div className="relative rounded-[32px] bg-white/[0.14] backdrop-blur-2xl border border-white/30 p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] space-y-4 sm:space-y-5">
                
                {/* Tab Bar: Flights, Hotels, Cars, Cruises */}
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 text-xs sm:text-sm select-none">
                  <button
                    type="button"
                    onClick={() => setActiveBookingTab("flights")}
                    className={`px-4 sm:px-5 py-2 rounded-xl sm:rounded-2xl font-bold flex items-center gap-2 transition-all ${
                      activeBookingTab === "flights"
                        ? "bg-white text-blue-600 shadow-md shadow-black/10 scale-[1.02]"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Plane className="w-4 h-4 text-blue-600" />
                    <span>Flights (טיסות)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveBookingTab("hotels")}
                    className={`px-4 sm:px-5 py-2 rounded-xl sm:rounded-2xl font-bold flex items-center gap-2 transition-all ${
                      activeBookingTab === "hotels"
                        ? "bg-white text-blue-600 shadow-md shadow-black/10 scale-[1.02]"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Hotel className="w-4 h-4" />
                    <span>Hotels (מלונות)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveBookingTab("cars")}
                    className={`px-4 sm:px-5 py-2 rounded-xl sm:rounded-2xl font-bold flex items-center gap-2 transition-all ${
                      activeBookingTab === "cars"
                        ? "bg-white text-blue-600 shadow-md shadow-black/10 scale-[1.02]"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Car className="w-4 h-4" />
                    <span>Cars (רכבים)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveBookingTab("cruises")}
                    className={`px-4 sm:px-5 py-2 rounded-xl sm:rounded-2xl font-bold flex items-center gap-2 transition-all ${
                      activeBookingTab === "cruises"
                        ? "bg-white text-blue-600 shadow-md shadow-black/10 scale-[1.02]"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Ship className="w-4 h-4" />
                    <span>Cruises (קרוזים)</span>
                  </button>
                </div>

                {/* Segmented Search Container */}
                <div className="rounded-2xl sm:rounded-3xl bg-white text-slate-900 shadow-xl border border-white p-2.5 sm:p-3 flex flex-col lg:flex-row items-stretch lg:items-center gap-2 sm:gap-3">
                  
                  {/* From Field */}
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-1">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="flex-1 text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">From</span>
                      <input
                        type="text"
                        value={searchOrigin}
                        onChange={(e) => setSearchOrigin(e.target.value)}
                        className="w-full bg-transparent border-0 p-0 text-xs sm:text-sm font-bold text-slate-900 focus:ring-0"
                        placeholder="מוצא טיסה"
                      />
                    </div>
                    {/* Swap Button */}
                    <button
                      type="button"
                      onClick={handleSwapOriginDestination}
                      title="החלף כיוון"
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors shrink-0"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden lg:block" />

                  {/* To Field */}
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-1">
                    <div className="flex-1 text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">To</span>
                      <select
                        value={searchDestination}
                        onChange={(e) => setSearchDestination(e.target.value)}
                        className="w-full bg-transparent border-0 p-0 text-xs sm:text-sm font-bold text-slate-900 focus:ring-0 cursor-pointer"
                      >
                        <option value="לכל יעד בעולם (Anywhere)">Anywhere (לכל יעד בעולם)</option>
                        <option value="באלי, אינדונזיה">Bali, Indonesia (באלי)</option>
                        <option value="סנטוריני, יוון">Santorini, Greece (סנטוריני)</option>
                        <option value="דובאי, איחוד האמירויות">Dubai, UAE (דובאי)</option>
                        <option value="האיים המלדיביים">Maldives (המלדיביים)</option>
                        <option value="טוקיו, יפן">Tokyo, Japan (טוקיו)</option>
                        <option value="רומא, איטליה">Rome, Italy (רומא)</option>
                        <option value="האלפים השוויצריים, שוויץ">Swiss Alps (שוויץ)</option>
                      </select>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden lg:block" />

                  {/* Depart Date Field */}
                  <div className="flex-1 flex items-center gap-2 px-3 py-1">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="flex-1 text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Depart</span>
                      <input
                        type="date"
                        value={departDate}
                        onChange={(e) => setDepartDate(e.target.value)}
                        className="w-full bg-transparent border-0 p-0 text-xs sm:text-sm font-bold text-slate-900 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden lg:block" />

                  {/* Return Date Field */}
                  <div className="flex-1 flex items-center gap-2 px-3 py-1">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="flex-1 text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Return</span>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full bg-transparent border-0 p-0 text-xs sm:text-sm font-bold text-slate-900 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden lg:block" />

                  {/* Travelers Count Field */}
                  <div className="flex-1 flex items-center gap-2 px-3 py-1">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="flex-1 text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Travelers</span>
                      <select
                        value={travelersCount}
                        onChange={(e) => setTravelersCount(e.target.value)}
                        className="w-full bg-transparent border-0 p-0 text-xs sm:text-sm font-bold text-slate-900 focus:ring-0 cursor-pointer"
                      >
                        <option value="1 מבוגר">1 Adult</option>
                        <option value="2 מבוגרים">2 Adults</option>
                        <option value="2 מבוגרים, ילד 1">2 Adults, 1 Child</option>
                        <option value="2 מבוגרים, 2 ילדים">2 Adults, 2 Children</option>
                        <option value="קבוצה (4+)">Group (4+ Travelers)</option>
                      </select>
                    </div>
                  </div>

                  {/* Search Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const targetDest = searchDestination === "לכל יעד בעולם (Anywhere)" ? "באלי, אינדונזיה" : searchDestination;
                      handleSelectQuickInspiration(targetDest, 8);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-md shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shrink-0"
                  >
                    <span>Search</span>
                    <Search className="w-4 h-4" />
                  </button>

                </div>

                {/* Lower Row: AI Suggestions for You */}
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Sparkles className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
                      <span className="tracking-wider uppercase">AI Suggestions For You</span>
                    </div>

                    <a
                      href="#discover-places"
                      className="text-xs text-sky-200 hover:text-white hover:underline flex items-center gap-1 transition-colors"
                    >
                      <span>See more ideas</span>
                      <ArrowLeft className="w-3 h-3" />
                    </a>
                  </div>

                  {/* 4 Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        id: "bali",
                        title: "Bali, Indonesia",
                        hebrewTitle: "באלי, אינדונזיה",
                        price: "$899",
                        image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=400&auto=format&fit=crop",
                        duration: 8,
                      },
                      {
                        id: "santorini",
                        title: "Santorini, Greece",
                        hebrewTitle: "סנטוריני, יוון",
                        price: "$1,299",
                        image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=400&auto=format&fit=crop",
                        duration: 5,
                      },
                      {
                        id: "dubai",
                        title: "Dubai, UAE",
                        hebrewTitle: "דובאי, איחוד האמירויות",
                        price: "$1,099",
                        image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=400&auto=format&fit=crop",
                        duration: 6,
                      },
                      {
                        id: "maldives",
                        title: "Maldives",
                        hebrewTitle: "האיים המלדיביים",
                        price: "$1,499",
                        image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=400&auto=format&fit=crop",
                        duration: 7,
                      },
                    ].map((card) => {
                      const isFav = favorites[card.id] || false;
                      return (
                        <div
                          key={card.id}
                          onClick={() => handleSelectQuickInspiration(card.hebrewTitle, card.duration)}
                          className="group/card rounded-2xl bg-white/90 hover:bg-white text-slate-900 p-2 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer flex items-center gap-2.5 border border-white hover:scale-[1.02]"
                        >
                          {/* Thumbnail */}
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0">
                            <Image
                              src={card.image}
                              alt={card.title}
                              fill
                              unoptimized
                              className="object-cover group-hover/card:scale-110 transition-transform duration-500"
                            />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 text-right">
                            <h4 className="text-xs sm:text-sm font-bold truncate text-slate-900">
                              {card.title}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              from <strong className="text-blue-600 font-bold">{card.price}</strong>
                            </span>
                          </div>

                          {/* Heart Icon */}
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(card.id, e)}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                            title="שמור למועדפים"
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                isFav ? "fill-rose-500 text-rose-500" : ""
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Full Width Trip Planning Glass Console (Spanning the entire width of the site) */}
          <div className="w-full max-w-7xl mx-auto mt-6" id="planner-form" ref={formRef}>
            <div className="relative">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500/25 via-cyan-500/20 to-purple-500/25 rounded-[32px] blur-2xl opacity-75 pointer-events-none" />
              <div className="relative">
                <TripForm
                  onSubmit={handleTripSubmit}
                  isLoading={isStreaming}
                  selectedDestination={currentDestination}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            TRUST & GUARANTEES BAR (GlobalVista 4 Columns)
        ======================================================== */}
        <div className="relative z-20 w-full bg-[#070c17]/95 backdrop-blur-xl border-t border-white/10 py-5 px-4 sm:px-8 text-white">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-right">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Best Price Guarantee</h4>
                <p className="text-[11px] text-slate-400">We match the best prices</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center text-sky-400 shrink-0 shadow-sm">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">24/7 Travel Support</h4>
                <p className="text-[11px] text-slate-400">Always here when you need us</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Secure Booking</h4>
                <p className="text-[11px] text-slate-400">Your data is 100% protected</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Trusted by Millions</h4>
                <p className="text-[11px] text-slate-400">10M+ happy travelers worldwide</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================================
          MULTI-AGENT EXECUTION & TELEMETRY STREAM SECTION (If Active)
      ======================================================== */}
      {(isStreaming || logs.length > 0 || markdownPlan) && (
        <section ref={agentSectionRef} className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-14 space-y-10 relative z-20">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs px-3 py-1 rounded-full bg-mint-500/15 text-mint-300 border border-mint-500/30 font-bold uppercase tracking-wider">
              חדר המבצעים האוטונומי
            </span>
            <h2 className="text-3xl font-serif font-bold text-white">
              תהליך התכנון והסינתזה של 13 סוכני ה-AI האוטונומיים
            </h2>
            <p className="text-xs text-slate-400">
              מעקב חי אחר קריאות לכלים, בירור לוחות זמנים מנתב״ג, תחבורה, קולינריה, שופינג, אזהרות שטח וסנכרון יומנים.
            </p>
          </div>

          <AgentStreamLogs logs={logs} activeAgent={activeAgent} isStreaming={isStreaming} />

          {markdownPlan && (
            <TripResultView
              markdownPlan={markdownPlan}
              budgetStatus={budgetStatus}
              totalEstimated={totalEstimated}
              remainingBalance={remainingBalance}
              flightCost={flightCost}
              hotelCost={hotelCost}
              breakdown={breakdown}
              destination={currentDestination}
              durationDays={currentDuration}
              weatherMetrics={weatherMetrics}
              packingChecklist={packingChecklist}
              safetyInfo={safetyInfo}
              seasonalEvents={seasonalEvents}
              structuredDays={structuredDays}
              recommendedFlight={recommendedFlight}
              selectedHotel={selectedHotel}
              startDateFormatted={startDateFormatted}
              transitGuide={transitGuide}
              culinaryGuide={culinaryGuide}
              shoppingTaxfree={shoppingTaxfree}
              calendarEvents={calendarEvents}
              groundAlerts={groundAlerts}
              whatsappBriefings={whatsappBriefings}
            />
          )}
        </section>
      )}

      {/* ========================================================
          DISCOVER PLACES SECTION (CariBali & MotionSites Style)
      ======================================================== */}
      <section id="discover-places" className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-16 space-y-10 relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-400 text-xs font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>גילוי יעדים ואוצרות טבע</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            Discover places you're going to love
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            מפלאי תרבות עתיקים ועד בריחה לטבע פראי, תן להעדפות שלך להוביל אותך לחוויות המרגשות ביותר בעולם.
          </p>

          {/* Filter Pills (All, Nature, Cultural, Recreational, General) */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
            {[
              { id: "all", label: "הכל (All)" },
              { id: "nature", label: "תיירות טבע (Nature)" },
              { id: "culture", label: "תרבות ומקדשים (Cultural)" },
              { id: "recreation", label: "נופש וחופים (Recreational)" },
              { id: "culinary", label: "קולינריה וכללי (General)" },
            ].map((tab) => {
              const isSelected = selectedCuratedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedCuratedCategory(tab.id);
                    setCuratedPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 scale-105 border border-amber-400/40"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10 hover:border-white/20"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Columns Grid of Destination / Attraction Cards (CariBali Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {displayCuratedPlaces.map((place) => (
            <div
              key={place.id}
              onClick={() => handleSelectQuickInspiration(`${place.name}, ${place.country}`, place.durationDays)}
              className="group bg-[#0d1424]/85 hover:bg-[#121c32]/95 border border-white/10 hover:border-amber-400/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
            >
              {/* Rounded Image Container */}
              <div className="relative h-56 w-full overflow-hidden p-3 pb-0">
                <div className="relative h-full w-full rounded-2xl overflow-hidden">
                  <Image
                    src={place.image}
                    alt={place.name}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  
                  {/* Top Badge: Category */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/15 shadow-sm">
                      {place.categoryLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 space-y-3 text-right flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white font-serif group-hover:text-amber-300 transition-colors">
                      {place.name}
                    </h3>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{place.rating}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({place.reviewsCount})</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mt-2 line-clamp-2">
                    {place.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{place.location}</span>
                  </span>

                  <span className="text-amber-400 font-bold hover:underline flex items-center gap-1 text-[11px]">
                    <span>קרא עוד ותכנן</span>
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Bar (Matching CariBali Layout) */}
        <div className="flex items-center justify-center gap-2 pt-4 select-none">
          <button
            type="button"
            onClick={() => setCuratedPage((p) => Math.max(1, p - 1))}
            disabled={curatedPage === 1}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-40 disabled:hover:bg-white/[0.05] text-xs font-semibold text-slate-300 border border-white/10 transition-colors"
          >
            עמוד קודם (Back Page)
          </button>

          <div className="flex items-center gap-1.5 mx-2">
            {[1, 2, 3, 4, 5].slice(0, Math.max(3, totalCuratedPages)).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCuratedPage(pageNum)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                  curatedPage === pageNum
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 scale-105"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10"
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCuratedPage((p) => Math.min(totalCuratedPages, p + 1))}
            disabled={curatedPage === totalCuratedPages}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-40 disabled:hover:bg-white/[0.05] text-xs font-semibold text-slate-300 border border-white/10 transition-colors"
          >
            עמוד הבא (Next Page)
          </button>
        </div>
      </section>

      {/* ========================================================
          TRAVEL SMARTER VALUE PROPOSITIONS (CariBali Style)
      ======================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-14 space-y-8 relative z-10 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            Travel Smarter with AgentTravelPlanner
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            תן להעדפות שלך ולסוכני הבינה המלאכותית להוביל אותך למקומות שמתאימים בדיוק לוייב שלך.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-amber-400/40 transition-all duration-300 text-right space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-serif">Personalized Picks</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              המלצות מותאמות אישית שנבנות על פי סגנון הטיול, תחומי העניין והתקציב שלך, ללא מלכודות תיירים.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 transition-all duration-300 text-right space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-serif">Smart and Simple</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              במקום עשרות שעות מול עשרות טאבים, 13 סוכני ה-AI שלנו מתאמים טיסות, מלונות ומסלולים בלחיצת כפתור אחת.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 hover:border-mint-400/40 transition-all duration-300 text-right space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-mint-500/15 border border-mint-500/30 flex items-center justify-center text-mint-400">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-serif">All in One Place</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              לוחות טיסות מנתב״ג, מלונות מובילים, תוכנית יומית וסנכרון מלא ישירות ל-Google Calendar ולמייל.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          MULTI-AGENT ORCHESTRATION COCKPIT (How the 7 AI Agents Work)
      ======================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-16 space-y-10 relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>הארכיטקטורה הרב-סוכנית</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            צוות של 7 סוכני בינה מלאכותית אוטונומיים
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            במקום מודל גנרי בודד, Wanderlust מפעילה 7 סוכנים מומחים הפועלים בסינרגיה מתמדת ומונעים טעויות בתכנון, בטיסות ובתקציב.
          </p>
        </div>

        {/* 7 Agents Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENTS_TEAM.map((agent, idx) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.id}
                onMouseEnter={() => setActiveAgentCard(idx)}
                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between text-right space-y-3 ${
                  activeAgentCard === idx
                    ? "wanderlust-glass border-mint-400/60 shadow-xl shadow-mint-500/10 scale-[1.02]"
                    : "bg-white/[0.03] border-white/10 hover:border-white/20"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${agent.color} text-slate-950 font-bold shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${agent.badgeColor}`}>
                      {agent.metrics}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm font-serif">{agent.name}</h4>
                    <span className="text-[11px] text-mint-400 font-semibold">{agent.role}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{agent.desc}</p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    מופעל אוטונומית
                  </span>
                  <span className="font-mono text-slate-400">SSE Live Telemetry</span>
                </div>
              </div>
            );
          })}

          {/* 8th Card: Google Workspace Integration Hub */}
          <div className="p-5 rounded-2xl border border-dashed border-mint-400/40 bg-gradient-to-br from-mint-500/10 to-transparent flex flex-col justify-between text-right space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-mint-400 text-slate-950 font-bold shadow-md">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-mint-400/30 bg-mint-400/15 text-mint-300 font-bold">
                  Google Workspace
                </span>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm font-serif">סנכרון מלא לפלטפורמה שלך</h4>
                <span className="text-[11px] text-mint-400 font-semibold">Calendar • Docs • Resend</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                קבל את כל לוחות הזמנים ישירות ליומן Google שלך, מסמך תכנון משותף ושובר כרטיסים רשמי במייל.
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-mint-300 font-bold">
              <span>סנכרון בלחיצת כפתור</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          TLV HOLIDAY FLIGHT BOARD SPOTLIGHT BANNER
      ======================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-8 relative z-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-[#0a121e]/80 to-teal-950/40 border border-cyan-500/30 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>בלעדי: סוכן טיסות חגים מנתב"ג</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              מתכננים חופשה בפסח, שבועות, קיץ או סוכות?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              סוכן נתב"ג החכם משווה את כל הטיסות מכל חברות התעופה הישראליות והזרות, בודק מועדי כניסת שבת וחג שבהם אל על וישראייר אינן טסות, מנרמל את עלויות הכבודה המלאות ובונה לוח המראות חי.
            </p>
          </div>

          <a
            href="/flights"
            className="shrink-0 px-7 py-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-sm tracking-wide shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-3 cursor-pointer"
          >
            <Plane className="w-4 h-4" />
            <span>פתח את לוח המראות החגים ✈️</span>
          </a>
        </div>
      </section>

      {/* ========================================================
          TRAVELER REVIEWS & SOCIAL PROOF
      ======================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-16 space-y-10 relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint-500/10 border border-mint-400/20 text-mint-300 text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>חוויות מטיילים</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            מה אומרים המטיילים שלנו?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            מעל 12,000 מסלולים שנבנו ע״י סוכני ה-AI ועזרו למטיילים ישראלים לחסוך זמן וכסף.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="wanderlust-glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4 text-right shadow-xl hover:border-white/20 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-mint-400 bg-mint-500/10 px-2 py-0.5 rounded-full border border-mint-500/20">
                    מטייל מאומת
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20">
                  <Image src={t.avatar} alt={t.name} fill className="object-cover" />
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-xs text-white">{t.name}</div>
                  <div className="text-[10px] text-slate-400">{t.from} • {t.dest}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Video Demonstration Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onStartPlanning={() => {
          formRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* Global Shared Footer */}
      <Footer />
    </main>
  );
}
