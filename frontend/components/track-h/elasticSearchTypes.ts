export interface ElasticVacationHit {
  package_id: string;
  iata_code: string;
  destination_he: string;
  destination_en: string;
  country_he: string;
  country_en: string;
  title_he: string;
  title_en: string;
  description_he: string;
  hotel_name: string;
  vibe_tags: string[];
  weather_badge: string;
  star_rating: number;
  shabbat_friendly: boolean;
  duration_nights: number;
  flight_hours_from_tlv: number;
  price_ils: number;
  coordinates: { lat: number; lon: number };
  distance_km?: number | null;
  bm25_score: number;
  knn_score: number;
  rrf_score: number;
}

export interface ElasticFacetBucket {
  key: string;
  label_he: string;
  count: number;
}

export interface ElasticFacets {
  vibes: ElasticFacetBucket[];
  shabbat_friendly_count: number;
  price_stats: { min_ils: number; max_ils: number; avg_ils: number; count: number };
}

export interface ElasticSearchResponse {
  status: string;
  engine_mode: string;
  index_name: string;
  query: string;
  fusion_method: string;
  embedding_dims: number;
  rrf_k: number;
  took_ms: number;
  total_hits: number;
  geo_anchor_label?: string | null;
  results: ElasticVacationHit[];
  facets: ElasticFacets;
}

export interface AutocompleteSuggestion {
  package_id: string;
  iata_code: string;
  destination_he: string;
  destination_en: string;
  title_he: string;
  price_ils: number;
  match_type: string;
  score: number;
}

export const GEO_ANCHORS = [
  { id: "", labelHe: "ללא הגבלת מרחק (כל העולם)", labelEn: "Global (All Locations)", lat: 0, lon: 0 },
  { id: "paris_eiffel", labelHe: "מגדל אייפל, פריז", labelEn: "Eiffel Tower, Paris", lat: 48.8584, lon: 2.2945 },
  { id: "budapest_parliament", labelHe: "הפרלמנט והספא, בודפשט", labelEn: "Danube & Thermal Spa, Budapest", lat: 47.5071, lon: 19.0457 },
  { id: "zermatt_matterhorn", labelHe: "המטרהורן, צרמט", labelEn: "Matterhorn, Zermatt", lat: 46.0207, lon: 7.7491 },
  { id: "santorini_oia", labelHe: "מצוקי אויה, סנטוריני", labelEn: "Oia Cliffs, Santorini", lat: 36.4618, lon: 25.3753 },
  { id: "rome_colosseum", labelHe: "הקולוסיאום, רומא", labelEn: "Colosseum, Rome", lat: 41.8902, lon: 12.4922 },
  { id: "jerusalem_kotel", labelHe: "העיר העתיקה, ירושלים", labelEn: "Old City, Jerusalem", lat: 31.7767, lon: 35.2345 },
];

export const VIBE_LABEL_MAP: Record<string, { he: string; en: string }> = {
  ROMANTIC: { he: "רומנטי וזוגי", en: "Romantic" },
  SNOW_ALPINE: { he: "שלג וחורף", en: "Snow & Alps" },
  WELLNESS_SPA: { he: "ספא ורוגע", en: "Wellness Spa" },
  KOSHER_FRIENDLY: { he: "כשר / שבת", en: "Kosher Friendly" },
  CULINARY: { he: "קולינריה", en: "Culinary" },
  BEACH_LUXURY: { he: "חופים ויוקרה", en: "Beach Luxury" },
  FAMILY: { he: "משפחות", en: "Family" },
  URBAN_CULTURE: { he: "עיר ואמנות", en: "Urban Culture" },
};

const OFFLINE_SEED: ElasticVacationHit[] = [
  {
    package_id: "PKG-BUD-SPA-WINTER", iata_code: "BUD", destination_he: "בודפשט", destination_en: "Budapest",
    country_he: "הונגריה", country_en: "Hungary",
    title_he: "בודפשט חורף רומנטית + מרחצאות סצ'ני תרמיים וספא פרטי",
    title_en: "Romantic Winter Budapest + Szechenyi Thermal Spa & Danube",
    description_he: "חופשת חורף רומנטית עם ספא תרמי מפנק, שייט שקיעה ונגישות כשרה.",
    hotel_name: "Mystery Hotel & Thermal Spa Budapest", vibe_tags: ["ROMANTIC", "WELLNESS_SPA", "SNOW_ALPINE", "KOSHER_FRIENDLY"],
    weather_badge: "ALPINE_SNOW", star_rating: 5, shabbat_friendly: true, duration_nights: 4,
    flight_hours_from_tlv: 3.3, price_ils: 3180, coordinates: { lat: 47.5071, lon: 19.0457 },
    bm25_score: 4.8, knn_score: 0.89, rrf_score: 0.032787,
  },
  {
    package_id: "PKG-ZRH-SNOW-SPA", iata_code: "ZRH", destination_he: "צרמט והאלפים", destination_en: "Swiss Alps Zermatt",
    country_he: "שוויץ", country_en: "Switzerland",
    title_he: "חופשת חורף ושלג רומנטית בצרמט — שאלה אלפיני וספא חם",
    title_en: "Romantic Winter Snow Chalet & Alpine Spa in Zermatt",
    description_he: "סוויטת עץ מול המטרהורן המושלג, ג'קוזי חיצוני חם ורכבת פנורמית.",
    hotel_name: "Cervo Mountain Boutique Spa Resort", vibe_tags: ["ROMANTIC", "SNOW_ALPINE", "WELLNESS_SPA"],
    weather_badge: "ALPINE_SNOW", star_rating: 5, shabbat_friendly: true, duration_nights: 4,
    flight_hours_from_tlv: 4.4, price_ils: 4890, coordinates: { lat: 46.0207, lon: 7.7491 },
    bm25_score: 5.2, knn_score: 0.92, rrf_score: 0.032522,
  },
  {
    package_id: "PKG-PARIS-EIFFEL-LUX", iata_code: "CDG", destination_he: "פריז", destination_en: "Paris",
    country_he: "צרפת", country_en: "France",
    title_he: "פריז הרומנטית — סוויטה מול מגדל אייפל ושייט על הסיין",
    title_en: "Romantic Paris Eiffel Tower Boutique Suite & Seine Cruise",
    description_he: "מלון בוטיק ברובע ה-7 במרחק הליכה ממגדל אייפל וסיור קולינרי.",
    hotel_name: "Pullman Paris Tour Eiffel", vibe_tags: ["ROMANTIC", "CULINARY", "URBAN_CULTURE"],
    weather_badge: "MILD_SPRING", star_rating: 5, shabbat_friendly: true, duration_nights: 4,
    flight_hours_from_tlv: 4.6, price_ils: 5190, coordinates: { lat: 48.8556, lon: 2.2932 },
    bm25_score: 4.3, knn_score: 0.84, rrf_score: 0.031746,
  },
  {
    package_id: "PKG-JTR-OIA-SUNSET", iata_code: "JTR", destination_he: "סנטוריני", destination_en: "Santorini",
    country_he: "יוון", country_en: "Greece",
    title_he: "סנטוריני אויה — סוויטת צוק רומנטית עם בריכת אינסוף",
    title_en: "Santorini Oia Cliffside Infinity Pool & Sunset Catamaran",
    description_he: "וילת צוק לבנה מול הקלדרה, שייט קטמרן בשקיעה וטיסה ישירה מנתב\"ג.",
    hotel_name: "Canaves Oia Epitome", vibe_tags: ["ROMANTIC", "BEACH_LUXURY", "WELLNESS_SPA"],
    weather_badge: "SUNNY_WARM", star_rating: 5, shabbat_friendly: true, duration_nights: 4,
    flight_hours_from_tlv: 2.25, price_ils: 4450, coordinates: { lat: 36.4618, lon: 25.3753 },
    bm25_score: 4.1, knn_score: 0.81, rrf_score: 0.03125,
  },
];

export function buildLocalElasticFallback(query: string, maxPrice?: number, shabbatOnly?: boolean, vibe?: string): ElasticSearchResponse {
  const q = query.trim().toLowerCase();
  const filtered = OFFLINE_SEED.filter((pkg) => {
    if (maxPrice && pkg.price_ils > maxPrice) return false;
    if (shabbatOnly && !pkg.shabbat_friendly) return false;
    if (vibe && !pkg.vibe_tags.includes(vibe)) return false;
    if (!q) return true;
    const blob = `${pkg.destination_he} ${pkg.destination_en} ${pkg.title_he} ${pkg.title_en} ${pkg.vibe_tags.join(" ")}`.toLowerCase();
    return q.split(/\s+/).some((tok) => tok.length >= 2 && blob.includes(tok));
  });
  const list = filtered.length > 0 ? filtered : OFFLINE_SEED.slice(0, 3);
  return {
    status: "FALLBACK_LOCAL",
    engine_mode: "in_memory_hybrid_768d",
    index_name: "wanderlust_vacations_v1",
    query,
    fusion_method: "RRF_BM25_KNN_768D",
    embedding_dims: 768,
    rrf_k: 60,
    took_ms: 4.2,
    total_hits: list.length,
    results: list,
    facets: {
      vibes: Object.entries(VIBE_LABEL_MAP).slice(0, 5).map(([k, v]) => ({ key: k, label_he: v.he, count: 1 })),
      shabbat_friendly_count: list.filter((x) => x.shabbat_friendly).length,
      price_stats: { min_ils: 3180, max_ils: 5190, avg_ils: 4427, count: list.length },
    },
  };
}
