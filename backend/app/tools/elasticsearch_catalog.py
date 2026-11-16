"""
Elasticsearch 8.15 Hybrid Index Mapping (`wanderlust_vacations_v1`),
768-dimensional Bilingual Semantic Embedder (`gemini-embedding-001` + offline projection),
and Curated Geo-Indexed Vacation Catalog.
"""
import hashlib
import math
import os
import re
from typing import Any, Dict, List, Tuple

from app.core.config import settings

EMBEDDING_DIMS = 768

VACATION_INDEX_MAPPING: Dict[str, Any] = {
    "settings": {
        "analysis": {
            "filter": {
                "edge_ngram_filter": {
                    "type": "edge_ngram",
                    "min_gram": 2,
                    "max_gram": 16,
                }
            },
            "analyzer": {
                "bilingual_autocomplete": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "edge_ngram_filter"],
                },
                "bilingual_search": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase"],
                },
            },
        }
    },
    "mappings": {
        "properties": {
            "package_id": {"type": "keyword"},
            "iata_code": {"type": "keyword"},
            "destination_he": {
                "type": "text",
                "analyzer": "bilingual_autocomplete",
                "search_analyzer": "bilingual_search",
                "fields": {"keyword": {"type": "keyword"}, "suggest": {"type": "completion"}},
            },
            "destination_en": {
                "type": "text",
                "analyzer": "bilingual_autocomplete",
                "search_analyzer": "bilingual_search",
                "fields": {"keyword": {"type": "keyword"}, "suggest": {"type": "completion"}},
            },
            "country_he": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
            "country_en": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
            "title_he": {"type": "search_as_you_type"},
            "title_en": {"type": "search_as_you_type"},
            "description_he": {"type": "text", "analyzer": "bilingual_search"},
            "hotel_name": {"type": "text", "analyzer": "bilingual_search"},
            "vibe_tags": {"type": "keyword"},
            "weather_badge": {"type": "keyword"},
            "star_rating": {"type": "integer"},
            "shabbat_friendly": {"type": "boolean"},
            "duration_nights": {"type": "integer"},
            "flight_hours_from_tlv": {"type": "float"},
            "price_ils": {"type": "scaled_float", "scaling_factor": 100},
            "coordinates": {"type": "geo_point"},
            "embedding": {
                "type": "dense_vector",
                "dims": EMBEDDING_DIMS,
                "index": True,
                "similarity": "cosine",
            },
        }
    },
}

GEO_LANDMARK_ANCHORS: Dict[str, Dict[str, Any]] = {
    "paris_eiffel": {"label_he": "מגדל אייפל, פריז", "lat": 48.8584, "lon": 2.2945},
    "rome_colosseum": {"label_he": "הקולוסיאום, רומא", "lat": 41.8902, "lon": 12.4922},
    "santorini_oia": {"label_he": "מצוקי אויה, סנטוריני", "lat": 36.4618, "lon": 25.3753},
    "zermatt_matterhorn": {"label_he": "המטרהורן, צרמט", "lat": 46.0207, "lon": 7.7491},
    "tokyo_shibuya": {"label_he": "שיבויה, טוקיו", "lat": 35.6595, "lon": 139.7004},
    "london_bigben": {"label_he": "ביג בן, לונדון", "lat": 51.5007, "lon": -0.1246},
    "budapest_parliament": {"label_he": "הפרלמנט והדנובה, בודפשט", "lat": 47.5071, "lon": 19.0457},
    "jerusalem_kotel": {"label_he": "הכותל והעיר העתיקה, ירושלים", "lat": 31.7767, "lon": 35.2345},
    "eilat_reef": {"label_he": "שונית האלמוגים, אילת", "lat": 29.5015, "lon": 34.9182},
}

_CONCEPT_EXPANSIONS: Dict[str, List[str]] = {
    "שלג": ["snow", "snow_alpine", "winter", "alps", "ski", "zermatt", "chalet", "חורף"],
    "חורף": ["winter", "snow", "snow_alpine", "spa", "wellness_spa", "prague", "zermatt", "vienna", "budapest"],
    "snow": ["snow_alpine", "winter", "alps", "zermatt", "שלג"],
    "winter": ["snow_alpine", "שלג", "wellness_spa", "budapest", "prague", "zermatt"],
    "ספא": ["spa", "wellness_spa", "thermal", "bath", "relax", "budapest", "bali", "zermatt", "רוגע"],
    "רוגע": ["wellness_spa", "spa", "relax", "bali", "santorini", "ספא"],
    "spa": ["wellness_spa", "thermal", "ספא", "budapest", "bali"],
    "רומנט": ["romantic", "honeymoon", "couple", "sunset", "paris", "santorini", "amalfi", "budapest", "זוגי"],
    "זוג": ["romantic", "couple", "paris", "santorini", "רומנטי"],
    "romantic": ["romantic", "paris", "santorini", "amalfi", "רומנטי"],
    "ירח דבש": ["romantic", "honeymoon", "santorini", "bali", "beach_luxury"],
    "כשר": ["kosher", "kosher_friendly", "shabbat", "chabad", "שבת", "rome", "budapest", "jerusalem", "london"],
    "שבת": ["kosher_friendly", "shabbat", "kosher", "chabad", "jerusalem", "eilat", "rome"],
    "kosher": ["kosher_friendly", "shabbat", "כשר"],
    "חוף": ["beach", "beach_luxury", "sea", "island", "ים", "santorini", "eilat", "dubai", "barcelona", "bali"],
    "ים": ["beach_luxury", "beach", "sea", "חוף", "santorini", "eilat", "tel aviv", "barcelona"],
    "בטן": ["beach_luxury", "resort", "pool", "all_inclusive", "eilat", "dubai", "bali", "santorini"],
    "קולינר": ["culinary", "food", "chef", "tapas", "gourmet", "rome", "tokyo", "paris", "barcelona"],
    "אוכל": ["culinary", "food", "restaurant", "rome", "tokyo", "barcelona", "קולינריה"],
    "משפח": ["family", "kids", "theme", "resort", "eilat", "dubai", "london", "new york", "barcelona"],
    "יוקרה": ["luxury", "5star", "vip", "beach_luxury", "dubai", "paris", "santorini", "zermatt"],
    "עיר": ["urban_culture", "museums", "shopping", "london", "new york", "paris", "tokyo", "amsterdam"],
    "פריז": ["paris", "france", "eiffel", "cdg", "romantic", "culinary"],
    "סנטוריני": ["santorini", "greece", "oia", "jtr", "romantic", "beach_luxury"],
    "שוויץ": ["swiss", "alps", "zermatt", "zrh", "snow_alpine", "winter", "spa"],
    "בודפשט": ["budapest", "hungary", "bud", "spa", "wellness_spa", "kosher_friendly", "romantic"],
    "רומא": ["rome", "italy", "fco", "culinary", "kosher_friendly", "romantic"],
    "טוקיו": ["tokyo", "japan", "hnd", "culinary", "urban_culture"],
    "לונדון": ["london", "uk", "lhr", "urban_culture", "family", "kosher_friendly"],
    "דובאי": ["dubai", "uae", "dxb", "beach_luxury", "family", "kosher_friendly"],
    "אילת": ["eilat", "israel", "etm", "beach_luxury", "family", "kosher_friendly"],
    "ירושלים": ["jerusalem", "israel", "tlv", "kosher_friendly", "urban_culture"],
    "ברצלונה": ["barcelona", "spain", "bcn", "culinary", "beach_luxury", "urban_culture"],
    "פראג": ["prague", "czech", "prg", "winter", "romantic", "kosher_friendly"],
    "וינה": ["vienna", "austria", "vie", "winter", "urban_culture", "kosher_friendly"],
    "אמסטרדם": ["amsterdam", "netherlands", "ams", "urban_culture", "romantic"],
    "באלי": ["bali", "indonesia", "dps", "wellness_spa", "romantic", "beach_luxury"],
    "ניו יורק": ["new york", "nyc", "jfk", "urban_culture", "family", "kosher_friendly"],
}

_TOKEN_RE = re.compile(r"[a-z0-9\u0590-\u05ff_]+")


def _l2_normalize(vec: List[float]) -> List[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0.0:
        return vec
    return [round(v / norm, 6) for v in vec]


def embed_768d(text: str) -> List[float]:
    """
    Generate a 768-dimensional L2-normalized semantic vector for hybrid Elasticsearch kNN.
    Uses Gemini embeddings when ENABLE_RAG_LIVE_EMBEDDINGS=true outside pytest runs;
    otherwise projects bilingual tokens, concepts, and 3-grams into 768 dims.
    """
    if (
        settings.ENABLE_RAG_LIVE_EMBEDDINGS
        and not os.getenv("PYTEST_CURRENT_TEST")
        and (settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY"))
    ):
        try:
            from google import genai
            from google.genai import types

            key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
            client = genai.Client(api_key=key)
            resp = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMS),
            )
            if resp and getattr(resp, "embeddings", None):
                vals = list(resp.embeddings[0].values)[:EMBEDDING_DIMS]
                if len(vals) == EMBEDDING_DIMS:
                    return _l2_normalize(vals)
        except Exception:
            pass

    vec = [0.0] * EMBEDDING_DIMS
    norm_txt = (text or "").lower().strip()
    if not norm_txt:
        return vec

    tokens = _TOKEN_RE.findall(norm_txt)
    weighted_terms: List[Tuple[str, float]] = []
    for tok in tokens:
        weighted_terms.append((tok, 2.4))
        for stem_key, exps in _CONCEPT_EXPANSIONS.items():
            if stem_key in tok or tok in stem_key:
                for exp in exps:
                    weighted_terms.append((exp.lower(), 1.85))
    for key, exps in _CONCEPT_EXPANSIONS.items():
        if key in norm_txt:
            for exp in exps:
                weighted_terms.append((exp.lower(), 1.6))

    for tok in tokens:
        if len(tok) >= 3:
            for i in range(len(tok) - 2):
                weighted_terms.append((f"3g:{tok[i:i+3]}", 0.85))

    for term, w in weighted_terms:
        digest = hashlib.blake2b(term.encode("utf-8"), digest_size=8).digest()
        idx = int.from_bytes(digest[:4], "little") % EMBEDDING_DIMS
        sign = 1.0 if (digest[4] % 2 == 0) else -1.0
        vec[idx] += sign * w

    return _l2_normalize(vec)


_RAW_PACKAGES: List[Dict[str, Any]] = [
    {
        "package_id": "PKG-BUD-SPA-WINTER",
        "iata_code": "BUD",
        "destination_he": "בודפשט",
        "destination_en": "Budapest",
        "country_he": "הונגריה",
        "country_en": "Hungary",
        "title_he": "בודפשט חורף רומנטית + מרחצאות סצ'ני תרמיים וספא פרטי",
        "title_en": "Romantic Winter Budapest + Szechenyi Thermal Spa & Danube",
        "description_he": "חופשת חורף רומנטית בבודפשט עם שווקי חורף, ספא תרמי מפנק, שייט שקיעה על הדנובה ונגישות כשרה מלאה.",
        "hotel_name": "Mystery Hotel & Thermal Spa Budapest",
        "vibe_tags": ["ROMANTIC", "WELLNESS_SPA", "SNOW_ALPINE", "KOSHER_FRIENDLY"],
        "weather_badge": "ALPINE_SNOW",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 3.3,
        "price_ils": 3180.0,
        "coordinates": {"lat": 47.5071, "lon": 19.0457},
    },
    {
        "package_id": "PKG-ZRH-SNOW-SPA",
        "iata_code": "ZRH",
        "destination_he": "צרמט והאלפים השוויצריים",
        "destination_en": "Swiss Alps Zermatt",
        "country_he": "שוויץ",
        "country_en": "Switzerland",
        "title_he": "חופשת חורף ושלג רומנטית בצרמט — שאלה אלפיני וספא חם",
        "title_en": "Romantic Winter Snow Chalet & Alpine Spa in Zermatt",
        "description_he": "סוויטת עץ מול המטרהורן המושלג, ג'קוזי חיצוני חם תחת כיפת השמיים ורכבת פנורמית.",
        "hotel_name": "Cervo Mountain Boutique Spa Resort",
        "vibe_tags": ["ROMANTIC", "SNOW_ALPINE", "WELLNESS_SPA"],
        "weather_badge": "ALPINE_SNOW",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 4.4,
        "price_ils": 4890.0,
        "coordinates": {"lat": 46.0207, "lon": 7.7491},
    },
    {
        "package_id": "PKG-PRG-WINTER-ROM",
        "iata_code": "PRG",
        "destination_he": "פראג",
        "destination_en": "Prague",
        "country_he": "צ'כיה",
        "country_en": "Czech Republic",
        "title_he": "פראג המושלגת — סופ\"ש חורף רומנטי + ביר ספא והרובע היהודי",
        "title_en": "Snowy Prague Romantic Winter Escape + Beer Spa & Old Town",
        "description_he": "גשר קארל, ספא חורפי מפנק בלב העיר העתיקה, מלונות כשרים ליד אלטנוישול וארוחות גורמה.",
        "hotel_name": "Augustine Luxury Collection Prague",
        "vibe_tags": ["ROMANTIC", "SNOW_ALPINE", "WELLNESS_SPA", "KOSHER_FRIENDLY"],
        "weather_badge": "ALPINE_SNOW",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 4.0,
        "price_ils": 3490.0,
        "coordinates": {"lat": 50.0875, "lon": 14.4214},
    },
    {
        "package_id": "PKG-PARIS-EIFFEL-LUX",
        "iata_code": "CDG",
        "destination_he": "פריז",
        "destination_en": "Paris",
        "country_he": "צרפת",
        "country_en": "France",
        "title_he": "פריז הרומנטית — סוויטה מול מגדל אייפל ושייט על הסיין",
        "title_en": "Romantic Paris Eiffel Tower Boutique Suite & Seine Cruise",
        "description_he": "מלון בוטיק ברובע ה-7 במרחק הליכה ממגדל אייפל, סיור קולינרי בלה מארה ודילוג על התור ללובר.",
        "hotel_name": "Pullman Paris Tour Eiffel",
        "vibe_tags": ["ROMANTIC", "CULINARY", "URBAN_CULTURE"],
        "weather_badge": "MILD_SPRING",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 4.6,
        "price_ils": 5190.0,
        "coordinates": {"lat": 48.8556, "lon": 2.2932},
    },
    {
        "package_id": "PKG-JTR-OIA-SUNSET",
        "iata_code": "JTR",
        "destination_he": "סנטוריני",
        "destination_en": "Santorini",
        "country_he": "יוון",
        "country_en": "Greece",
        "title_he": "סנטוריני אויה — סוויטת צוק רומנטית עם בריכת אינסוף",
        "title_en": "Santorini Oia Cliffside Infinity Pool & Sunset Catamaran",
        "description_he": "וילת צוק לבנה מול הקלדרה, שייט קטמרן פרטי בשקיעה, טברנות יווניות וטיסה ישירה מנתב\"ג.",
        "hotel_name": "Canaves Oia Epitome",
        "vibe_tags": ["ROMANTIC", "BEACH_LUXURY", "WELLNESS_SPA"],
        "weather_badge": "SUNNY_WARM",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 2.25,
        "price_ils": 4450.0,
        "coordinates": {"lat": 36.4618, "lon": 25.3753},
    },
    {
        "package_id": "PKG-ROM-DOLCE-KOSHER",
        "iata_code": "FCO",
        "destination_he": "רומא",
        "destination_en": "Rome",
        "country_he": "איטליה",
        "country_en": "Italy",
        "title_he": "רומא הקלאסית — קולינריה איטלקית, קולוסיאום ושבת כשרה",
        "title_en": "Classic Rome Culinary & Kosher Friendly Boutique Stay",
        "description_he": "מלון במרכז ההיסטורי ליד פיאצה נבונה והגטו היהודי, סיור שווקים בטרסטוורה וכרטיסי VIP לקולוסיאום.",
        "hotel_name": "Hotel Chapter Roma",
        "vibe_tags": ["CULINARY", "ROMANTIC", "KOSHER_FRIENDLY", "URBAN_CULTURE"],
        "weather_badge": "MILD_SPRING",
        "star_rating": 4,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 3.5,
        "price_ils": 3690.0,
        "coordinates": {"lat": 41.8943, "lon": 12.4768},
    },
    {
        "package_id": "PKG-TYO-NEON-CHEF",
        "iata_code": "HND",
        "destination_he": "טוקיו",
        "destination_en": "Tokyo",
        "country_he": "יפן",
        "country_en": "Japan",
        "title_he": "טוקיו קולינריה וניאון — שינג'וקו, שיבויה ו-JR Pass",
        "title_en": "Tokyo Neon Culinary Discovery + Shinjuku Design Hotel",
        "description_he": "חוויה קולינרית עילית בשיבויה, מלון מעצבים בקרבת בית חב\"ד, סיורי אוכל רחוב ורכבות מהירות.",
        "hotel_name": "Bellustar Tokyo Pan Pacific",
        "vibe_tags": ["CULINARY", "URBAN_CULTURE", "FAMILY"],
        "weather_badge": "MILD_SPRING",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 7,
        "flight_hours_from_tlv": 11.3,
        "price_ils": 6890.0,
        "coordinates": {"lat": 35.6938, "lon": 139.7006},
    },
    {
        "package_id": "PKG-DXB-MARINA-VIP",
        "iata_code": "DXB",
        "destination_he": "דובאי",
        "destination_en": "Dubai",
        "country_he": "איחוד האמירויות",
        "country_en": "UAE",
        "title_he": "דובאי משפחות ויוקרה — חוף פרטי, בורג' חליפה ואוכל כשר",
        "title_en": "Dubai Luxury Beach Resort, Burj Khalifa VIP & Kosher Dining",
        "description_he": "ריזורט 5 כוכבים במרינה, כניסה מהירה לבורג' חליפה, ספארי דיונות שקיעה ומסעדות כשרות למהדרין.",
        "hotel_name": "Address Beach Resort Dubai",
        "vibe_tags": ["BEACH_LUXURY", "FAMILY", "KOSHER_FRIENDLY", "WELLNESS_SPA"],
        "weather_badge": "SUNNY_WARM",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 3.2,
        "price_ils": 3850.0,
        "coordinates": {"lat": 25.0772, "lon": 55.1332},
    },
    {
        "package_id": "PKG-LON-WESTEND-LUX",
        "iata_code": "LHR",
        "destination_he": "לונדון",
        "destination_en": "London",
        "country_he": "בריטניה",
        "country_en": "United Kingdom",
        "title_he": "לונדון — ווסט אנד, מחזות זמר, שופינג ומסורת כשרה",
        "title_en": "London Covent Garden, West End Musicals & Soho Dining",
        "description_he": "מלון בוטיק במרחק צעדים מכיכר לסטר והביג בן, כרטיסים למחזמר פרימיום ומסלול משפחתי בלונדון.",
        "hotel_name": "NoMad London Covent Garden",
        "vibe_tags": ["URBAN_CULTURE", "FAMILY", "KOSHER_FRIENDLY", "CULINARY"],
        "weather_badge": "MILD_SPRING",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 5.1,
        "price_ils": 4790.0,
        "coordinates": {"lat": 51.5133, "lon": -0.1225},
    },
    {
        "package_id": "PKG-BCN-GAUDI-BEACH",
        "iata_code": "BCN",
        "destination_he": "ברצלונה",
        "destination_en": "Barcelona",
        "country_he": "ספרד",
        "country_en": "Spain",
        "title_he": "ברצלונה — גאודי, שוק לה בוקריה וחופי הים התיכון",
        "title_en": "Barcelona Gaudi Architecture, Tapas & Mediterranean Coast",
        "description_he": "מלון גג מעוצב באישמפלה, סיור טאפאס, כניסה מהירה לסגרדה פמיליה וחוף ברצלונטה.",
        "hotel_name": "H10 Casa Mimosa Barcelona",
        "vibe_tags": ["CULINARY", "BEACH_LUXURY", "URBAN_CULTURE", "FAMILY"],
        "weather_badge": "SUNNY_WARM",
        "star_rating": 4,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 4.4,
        "price_ils": 3790.0,
        "coordinates": {"lat": 41.3959, "lon": 2.1620},
    },
    {
        "package_id": "PKG-DPS-UBUD-RETREAT",
        "iata_code": "DPS",
        "destination_he": "באלי",
        "destination_en": "Bali",
        "country_he": "אינדונזיה",
        "country_en": "Indonesia",
        "title_he": "באלי אובוד — וילת ג'ונגל פרטית, ריטריט יוגה וספא",
        "title_en": "Bali Ubud Private Jungle Pool Villa & Wellness Spa Retreat",
        "description_he": "וילה מבודדת בין טרסות האורז, טיפולי ספא באלינזיים יומיים, חופים טרופיים ורומנטיקה של ירח דבש.",
        "hotel_name": "Four Seasons Resort Bali at Sayan",
        "vibe_tags": ["WELLNESS_SPA", "ROMANTIC", "BEACH_LUXURY"],
        "weather_badge": "TROPICAL",
        "star_rating": 5,
        "shabbat_friendly": False,
        "duration_nights": 7,
        "flight_hours_from_tlv": 13.5,
        "price_ils": 5120.0,
        "coordinates": {"lat": -8.5069, "lon": 115.2435},
    },
    {
        "package_id": "PKG-ETM-CORAL-FAMILY",
        "iata_code": "ETM",
        "destination_he": "אילת",
        "destination_en": "Eilat",
        "country_he": "ישראל",
        "country_en": "Israel",
        "title_he": "אילת הים האדום — ריזורט חוף כשר למהדרין למשפחות וזוגות",
        "title_en": "Eilat Red Sea Beachfront Kosher Resort & Coral Reef",
        "description_he": "מלון יוקרה ישיר על חוף אלמוג עם ספא מפנק, צלילת שנורקל בשונית, כשרות מלאה ומועדון ילדים.",
        "hotel_name": "Herods Vitalis Spa Hotel Eilat",
        "vibe_tags": ["BEACH_LUXURY", "FAMILY", "KOSHER_FRIENDLY", "WELLNESS_SPA"],
        "weather_badge": "SUNNY_WARM",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 3,
        "flight_hours_from_tlv": 0.9,
        "price_ils": 2790.0,
        "coordinates": {"lat": 29.5528, "lon": 34.9628},
    },
    {
        "package_id": "PKG-JRS-OLD-CITY-VIP",
        "iata_code": "TLV",
        "destination_he": "ירושלים",
        "destination_en": "Jerusalem",
        "country_he": "ישראל",
        "country_en": "Israel",
        "title_he": "ירושלים של זהב — ממילא, העיר העתיקה ושוק מחנה יהודה",
        "title_en": "Jerusalem Mamilla Heritage Luxury & Culinary Shuk Tour",
        "description_he": "סוף שבוע יוקרתי מול חומות העיר העתיקה, הליכה של 5 דקות לכותל, סיור שוק וטיפולי ספא.",
        "hotel_name": "Waldorf Astoria Jerusalem",
        "vibe_tags": ["KOSHER_FRIENDLY", "CULINARY", "ROMANTIC", "URBAN_CULTURE"],
        "weather_badge": "MILD_SPRING",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 2,
        "flight_hours_from_tlv": 0.8,
        "price_ils": 2650.0,
        "coordinates": {"lat": 31.7774, "lon": 35.2225},
    },
    {
        "package_id": "PKG-AMS-CANAL-ART",
        "iata_code": "AMS",
        "destination_he": "אמסטרדם",
        "destination_en": "Amsterdam",
        "country_he": "הולנד",
        "country_en": "Netherlands",
        "title_he": "אמסטרדם — תעלות יורדאן, מוזיאון ואן גוך ושייט פרטי",
        "title_en": "Amsterdam Jordaan Canals Boutique & Van Gogh VIP",
        "description_he": "מלון היסטורי על שפת התעלה, שייט גבינות ויין בשקיעה, רכיבת אופניים בפארקים ושופינג.",
        "hotel_name": "Pulitzer Amsterdam",
        "vibe_tags": ["URBAN_CULTURE", "ROMANTIC", "FAMILY"],
        "weather_badge": "MILD_SPRING",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 4.9,
        "price_ils": 4420.0,
        "coordinates": {"lat": 52.3731, "lon": 4.8833},
    },
    {
        "package_id": "PKG-ATH-RIVIERA-ESCAPE",
        "iata_code": "ATH",
        "destination_he": "אתונה",
        "destination_en": "Athens",
        "country_he": "יוון",
        "country_en": "Greece",
        "title_he": "אתונה והריביירה היוונית — אקרופוליס, פלאקה וטברנות",
        "title_en": "Athens Acropolis Plaka Boutique & Riviera Sunset",
        "description_he": "טיסה של שעתיים מתל אביב, גג תצפית לאקרופוליס, סיור טברנות קולינרי והפלגה קצרה לאיים.",
        "hotel_name": "Electra Metropolis Athens",
        "vibe_tags": ["CULINARY", "URBAN_CULTURE", "ROMANTIC"],
        "weather_badge": "SUNNY_WARM",
        "star_rating": 4,
        "shabbat_friendly": True,
        "duration_nights": 3,
        "flight_hours_from_tlv": 2.0,
        "price_ils": 2490.0,
        "coordinates": {"lat": 37.9746, "lon": 23.7327},
    },
    {
        "package_id": "PKG-VIE-IMPERIAL-WINTER",
        "iata_code": "VIE",
        "destination_he": "וינה",
        "destination_en": "Vienna",
        "country_he": "אוסטריה",
        "country_en": "Austria",
        "title_he": "וינה החורפית — קונצרטים, בתי קפה קיסריים וספא מלון",
        "title_en": "Imperial Winter Vienna Concerts, Coffee Houses & Spa",
        "description_he": "חופשה אירופאית קלאסית ברובע ה-1, קרובה לקהילה היהודית, מרחצאות חמים ושווקי חורף קסומים.",
        "hotel_name": "Hotel Sacher Wien",
        "vibe_tags": ["WINTER", "SNOW_ALPINE", "WELLNESS_SPA", "KOSHER_FRIENDLY", "URBAN_CULTURE"],
        "weather_badge": "ALPINE_SNOW",
        "star_rating": 5,
        "shabbat_friendly": True,
        "duration_nights": 4,
        "flight_hours_from_tlv": 3.7,
        "price_ils": 4120.0,
        "coordinates": {"lat": 48.2038, "lon": 16.3694},
    },
]

# Pre-compute 768-dim vectors once at module load for sub-5ms in-memory fallback & bulk ES indexing
VACATION_SEED_PACKAGES: List[Dict[str, Any]] = []
for _pkg in _RAW_PACKAGES:
    _corpus = " ".join([
        _pkg["destination_he"],
        _pkg["destination_en"],
        _pkg["country_he"],
        _pkg["country_en"],
        _pkg["iata_code"],
        _pkg["title_he"],
        _pkg["title_en"],
        _pkg["description_he"],
        _pkg["hotel_name"],
        " ".join(_pkg["vibe_tags"]),
        _pkg["weather_badge"],
    ])
    VACATION_SEED_PACKAGES.append({**_pkg, "embedding": embed_768d(_corpus)})
