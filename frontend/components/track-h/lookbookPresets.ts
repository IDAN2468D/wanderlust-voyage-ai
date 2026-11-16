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
  {
    keys: ["paris", "eiffel", "seine", "cdg", "france", "פריז"],
    destination: "Paris",
    labelHe: "פריז — מגדל אייפל ונהר הסיין",
    titleHe: "פריחת אביב מול מגדל אייפל — חופשת בוטיק בפריז",
    hotelHe: "סוויטת בוטיק עם מרפסת למגדל אייפל (Shangri-La / Pullman Paris)",
    hotelSku: "HTL-PAR-EIFFEL",
    flightHe: 'טיסה ישירה נתב"ג → פריז שארל דה גול (4:35 ש\')',
    flightSku: "FLT-TLV-CDG",
    expHe: "שייט שקיעה קולינרי על נהר הסיין + דילוג על התור לאייפל",
    expSku: "EXP-PAR-SEINE",
    prices: [3190, 1680, 590],
  },
  {
    keys: ["london", "bigben", "thames", "lhr", "לונדון"],
    destination: "London",
    labelHe: "לונדון — ווסטמינסטר והווסט אנד",
    titleHe: "לונדון הקלאסית — ביג בן, סוהו ותאטרון",
    hotelHe: "מלון בוטיק בקובנט גארדן / מייפייר",
    hotelSku: "HTL-LON-COVENT",
    flightHe: 'טיסה ישירה נתב"ג → לונדון הית\'רו (5:05 ש\')',
    flightSku: "FLT-TLV-LHR",
    expHe: "מחזמר בווסט אנד + שייט על התמזה",
    expSku: "EXP-LON-WESTEND",
    prices: [2950, 1820, 640],
  },
  {
    keys: ["dubai", "burj", "marina", "dxb", "דובאי"],
    destination: "Dubai",
    labelHe: "דובאי — בורג' חליפה והמרינה",
    titleHe: "קו הרקיע של דובאי — יוקרה וחוויות מדבר",
    hotelHe: "מלון יוקרה במרינה / דאון טאון (אופציה כשרה)",
    hotelSku: "HTL-DXB-MARINA",
    flightHe: 'טיסה ישירה נתב"ג → דובאי (3:15 ש\')',
    flightSku: "FLT-TLV-DXB",
    expHe: "תצפית בורג' חליפה VIP + ספארי דיונות שקיעה",
    expSku: "EXP-DXB-SAFARI",
    prices: [2490, 1350, 520],
  },
];

export function buildDynamicVisionFallback(input: DynamicFallbackInput): VisionLookbookData | null {
  const rawText = [input.image_source_url, input.image_url, input.file_name, input.custom_hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!rawText && !input.image_base64) return null;

  const matched = CITY_FALLBACKS.find((c) => c.keys.some((k) => rawText.includes(k))) || CITY_FALLBACKS[0];
  const subtotal = matched.prices[0] + matched.prices[1] + matched.prices[2];
  const bundleTotal = Math.round(subtotal * 0.9);
  const displayUrl = input.image_base64 || input.image_source_url || input.image_url || "";

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
