export interface Hotspot {
  id: string;
  label_he: string;
  category: string;
  sku_code: string;
  scaled_price_ils: number;
  confidence: number;
  box: { x: number; y: number; w: number; h: number };
}

export interface VisionLookbookData {
  scene_type: string;
  is_dynamic_detection?: boolean;
  detection_source?: string;
  needs_visual_hint?: boolean;
  detection_warning_he?: string | null;
  landmark_detected_he?: string | null;
  fit_accuracy_pct?: number;
  title_he: string;
  destination: string;
  destination_label_he?: string;
  image_url: string;
  hotspots: Hotspot[];
  bundle_total_ils: number;
  summary_he: string;
}

export const SCENES = [
  { id: "SANTORINI_CLIFFSIDE", label: "סנטוריני אויה" },
  { id: "TOKYO_NEON_FOOD", label: "טוקיו ניאון" },
  { id: "SWISS_ALPINE_CHALET", label: "שוויץ צרמט" },
  { id: "AMALFI_COAST_LUXURY", label: "אמלפי ורומא" },
  { id: "BALI_JUNGLE_VILLA", label: "באלי אובוד" },
] as const;

export function playSpatialPing() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {}
}

export function readAndCompressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onload = () => {
      const rawUrl = typeof reader.result === "string" ? reader.result : "";
      if (!rawUrl) return reject(new Error("Empty image data"));
      // Keep files <= 900KB untouched so JPEG EXIF GPS headers remain intact
      if (file.size <= 900 * 1024 || typeof document === "undefined") {
        return resolve(rawUrl);
      }
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1024;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(rawUrl);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.84));
        } catch {
          resolve(rawUrl);
        }
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function extractClipboardImageUrl(dataTransfer: DataTransfer | null | undefined): string | null {
  if (!dataTransfer) return null;
  const html = dataTransfer.getData("text/html") || "";
  const imgMatch = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (imgMatch?.[1]) return imgMatch[1];
  const txt = (dataTransfer.getData("text/plain") || "").trim();
  if (/^https?:\/\/\S+$/i.test(txt)) return txt;
  return null;
}

interface DynamicFallbackInput {
  image_source_url?: string;
  image_url?: string;
  image_base64?: string;
  file_name?: string;
  custom_hint?: string;
}

const CITY_FALLBACKS: Array<{
  keys: string[];
  destination: string;
  labelHe: string;
  titleHe: string;
  hotelHe: string;
  hotelSku: string;
  flightHe: string;
  flightSku: string;
  expHe: string;
  expSku: string;
  prices: [number, number, number];
}> = [
  { keys: ["paris", "eiffel", "seine", "cdg", "france", "פריז", "אייפל"], destination: "Paris", labelHe: "פריז — מגדל אייפל ונהר הסיין", titleHe: "פריחת אביב מול מגדל אייפל — חופשת בוטיק בפריז", hotelHe: "סוויטת בוטיק עם מרפסת למגדל אייפל", hotelSku: "HTL-PAR-EIFFEL", flightHe: 'טיסה ישירה נתב"ג → פריז CDG (4:35 ש\')', flightSku: "FLT-TLV-CDG", expHe: "שייט שקיעה על הסיין + דילוג על התור לאייפל", expSku: "EXP-PAR-SEINE", prices: [3190, 1680, 590] },
  { keys: ["london", "bigben", "thames", "lhr", "לונדון"], destination: "London", labelHe: "לונדון — ווסטמינסטר והווסט אנד", titleHe: "לונדון הקלאסית — ביג בן, סוהו ותאטרון", hotelHe: "מלון בוטיק בקובנט גארדן / מייפייר", hotelSku: "HTL-LON-COVENT", flightHe: 'טיסה ישירה נתב"ג → לונדון הית\'רו (5:05 ש\')', flightSku: "FLT-TLV-LHR", expHe: "מחזמר בווסט אנד + שייט על התמזה", expSku: "EXP-LON-WESTEND", prices: [2950, 1820, 640] },
  { keys: ["dubai", "burj", "marina", "dxb", "דובאי"], destination: "Dubai", labelHe: "דובאי — בורג' חליפה והמרינה", titleHe: "קו הרקיע של דובאי — יוקרה וחוויות מדבר", hotelHe: "מלון יוקרה במרינה / דאון טאון (אופציה כשרה)", hotelSku: "HTL-DXB-MARINA", flightHe: 'טיסה ישירה נתב"ג → דובאי (3:15 ש\')', flightSku: "FLT-TLV-DXB", expHe: "תצפית בורג' חליפה VIP + ספארי דיונות שקיעה", expSku: "EXP-DXB-SAFARI", prices: [2490, 1350, 520] },
  { keys: ["rome", "colosseum", "italy", "amalfi", "רומא", "איטליה"], destination: "Rome", labelHe: "רומא — הקולוסיאום ופיאצה נבונה", titleHe: "רומא הקלאסית — דולצ'ה ויטה וקולינריה", hotelHe: "מלון בוטיק במרכז ההיסטורי ליד פיאצה נבונה", hotelSku: "HTL-ROM-CEN", flightHe: 'טיסה ישירה נתב"ג → רומא FCO (3:30 ש\')', flightSku: "FLT-TLV-FCO", expHe: "דילוג על התור לקולוסיאום + סיור אוכל בטרסטוורה", expSku: "EXP-ROM-COLOSSEUM", prices: [2350, 1420, 480] },
  { keys: ["amsterdam", "canal", "netherlands", "ams", "אמסטרדם"], destination: "Amsterdam", labelHe: "אמסטרדם — התעלות ורובע יורדאן", titleHe: "אמסטרדם — שייט תעלות, אמנות ואופניים", hotelHe: "מלון בוטיק על תעלת הקייזרסחראכט", hotelSku: "HTL-AMS-CANAL", flightHe: 'טיסה ישירה נתב"ג → אמסטרדם AMS', flightSku: "FLT-TLV-AMS", expHe: "שייט תעלות VIP + כניסה לרייקסמוזיאום", expSku: "EXP-AMS-CRUISE", prices: [2790, 1640, 470] },
  { keys: ["barcelona", "gaudi", "sagrada", "bcn", "ברצלונה"], destination: "Barcelona", labelHe: "ברצלונה — אישמפלה, גאודי והחוף", titleHe: "ברצלונה של גאודי — רמבלאס והים התיכון", hotelHe: "מלון גג מעוצב באישמפלה", hotelSku: "HTL-BCN-EIX", flightHe: 'טיסה ישירה נתב"ג → ברצלונה (4:25 ש\')', flightSku: "FLT-TLV-BCN", expHe: "סגרדה פמיליה + סיור טאפאס ברובע הגותי", expSku: "EXP-BCN-GAUDI", prices: [2290, 1490, 460] },
  { keys: ["new york", "new-york", "nyc", "manhattan", "jfk", "ניו יורק"], destination: "New York", labelHe: "ניו יורק — מנהטן וסנטרל פארק", titleHe: "ניו יורק — מנהטן, ברודוויי וסוהו", hotelHe: "מלון בוטיק במידטאון מנהטן", hotelSku: "HTL-NYC-MIDTOWN", flightHe: 'טיסה ישירה נתב"ג → ניו יורק JFK', flightSku: "FLT-TLV-JFK", expHe: "הצגת ברודוויי + תצפית Summit One", expSku: "EXP-NYC-BROADWAY", prices: [3590, 3490, 780] },
  { keys: ["jerusalem", "kotel", "ירושלים", "הכותל"], destination: "Jerusalem", labelHe: "ירושלים — העיר העתיקה וממילא", titleHe: "ירושלים — מורשת, ממילא ושוק מחנה יהודה", hotelHe: "מלון יוקרה בממילא", hotelSku: "HTL-JRS-MAMILLA", flightHe: "הסעה פרטית / רכבת מהירה מתל אביב", flightSku: "TRF-TLV-JRS", expHe: "מנהרות הכותל + טעימות שוק מחנה יהודה", expSku: "EXP-JRS-SHUK", prices: [2490, 220, 340] },
];

export function buildDynamicVisionFallback(input: DynamicFallbackInput): VisionLookbookData | null {
  const rawText = [input.image_source_url, input.image_url, input.file_name, input.custom_hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!rawText && !input.image_base64) return null;

  const displayUrl = input.image_base64 || input.image_source_url || input.image_url || "";
  const matched = CITY_FALLBACKS.find((c) => c.keys.some((k) => rawText.includes(k)));
  if (!matched) {
    const hint = (input.custom_hint || "").trim();
    if (hint) {
      return {
        scene_type: "CUSTOM_VISION_UPLOAD",
        is_dynamic_detection: true,
        detection_source: "custom_hint",
        title_he: `חבילת Vision מותאמת אישית — ${hint}`,
        destination: hint,
        destination_label_he: `${hint} — ניתוח מותאם אישית`,
        image_url: displayUrl,
        hotspots: [
          { id: "hs_1", label_he: `מלון בוטיק מומלץ ב${hint}`, category: "HOTEL", sku_code: "HTL-VIS-CUSTOM", scaled_price_ils: 2590, confidence: 0.9, box: { x: 0.16, y: 0.34, w: 0.34, h: 0.3 } },
          { id: "hs_2", label_he: `טיסת הלוך-חזור מנתב"ג → ${hint}`, category: "FLIGHT", sku_code: "FLT-TLV-CUSTOM", scaled_price_ils: 1590, confidence: 0.9, box: { x: 0.56, y: 0.12, w: 0.28, h: 0.2 } },
          { id: "hs_3", label_he: `סיור מודרך וחווית דגל ב${hint}`, category: "EXPERIENCE", sku_code: "EXP-VIS-BUNDLE", scaled_price_ils: 490, confidence: 0.88, box: { x: 0.42, y: 0.62, w: 0.38, h: 0.24 } },
        ],
        bundle_total_ils: 4203,
        summary_he: `זוהו 3 רכיבי טיול ב${hint} עם הנחת באנדל 10% (סה"כ ₪4,203).`,
      };
    }
    return {
      scene_type: "UNIDENTIFIED_VISION_UPLOAD",
      is_dynamic_detection: true,
      needs_visual_hint: true,
      detection_source: "offline_fallback",
      detection_warning_he: "השרת לא זמין כרגע לזיהוי התמונה — הקלד שם עיר או אתר בשדה הרמז למטה לבנייה מיידית.",
      title_he: "נדרש רמז קצר להשלמת זיהוי התמונה",
      destination: "יעד לא מזוהה",
      destination_label_he: "התמונה נקלטה — הזן עיר/אתר לאישור",
      image_url: displayUrl,
      hotspots: [],
      bundle_total_ils: 0,
      summary_he: "ממתין לשם יעד או חיבור ל-Vision AI כדי לבנות חבילה.",
    };
  }

  const subtotal = matched.prices[0] + matched.prices[1] + matched.prices[2];
  const bundleTotal = Math.round(subtotal * 0.9);
  return {
    scene_type: `DYNAMIC_${matched.destination.toUpperCase()}`,
    is_dynamic_detection: true,
    detection_source: "fallback_keyword",
    title_he: matched.titleHe,
    destination: matched.destination,
    destination_label_he: matched.labelHe,
    image_url: displayUrl,
    hotspots: [
      { id: "hs_1", label_he: matched.hotelHe, category: "HOTEL", sku_code: matched.hotelSku, scaled_price_ils: matched.prices[0], confidence: 0.97, box: { x: 0.16, y: 0.34, w: 0.34, h: 0.3 } },
      { id: "hs_2", label_he: matched.flightHe, category: "FLIGHT", sku_code: matched.flightSku, scaled_price_ils: matched.prices[1], confidence: 0.95, box: { x: 0.56, y: 0.12, w: 0.28, h: 0.2 } },
      { id: "hs_3", label_he: matched.expHe, category: "EXPERIENCE", sku_code: matched.expSku, scaled_price_ils: matched.prices[2], confidence: 0.94, box: { x: 0.42, y: 0.62, w: 0.38, h: 0.24 } },
    ],
    bundle_total_ils: bundleTotal,
    summary_he: `זוהו 3 רכיבי טיול ב${matched.labelHe} עם הנחת באנדל 10% (סה"כ ₪${bundleTotal.toLocaleString()}).`,
  };
}
