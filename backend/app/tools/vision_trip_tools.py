"""
Screenshot-to-Trip & Virtual Fit Assessment (`vision_lookbook_agent`).
Inspired by Daydream AI Screenshot-to-Shop & Google Shopping Vision Match:
decomposes travel inspiration screenshots (URL, preset, or uploaded base64) into
normalized bounding-box hotspots (x, y, w, h) mapped to bookable travel components
with a -10% Complete-the-Trip bundle discount.
"""
import hashlib
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.tools.vision_image_utils import (
    clean_upload_filename_hint,
    decode_base64_image,
    fetch_image_from_url,
    match_nearest_city_from_gps,
)

logger = logging.getLogger("vision_trip_tools")
_VISION_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_VISION_CACHE_TTL_SEC = 300.0

LOOKBOOK_PRESETS: Dict[str, Dict[str, Any]] = {
    "SANTORINI_CLIFFSIDE": {
        "scene_type": "SANTORINI_CLIFFSIDE",
        "title_he": "שקיעה בקלדרה של אויה — חופשת בוטיק זוגית",
        "destination": "Santorini",
        "destination_label_he": "סנטוריני — מצוקי אויה והים האגאי",
        "country": "יוון",
        "iata_code": "JTR",
        "flight_hours_from_tlv": 2.25,
        "shabbat_friendly_score": 92,
        "image_url": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["santorini", "oia", "cyclades", "סנטוריני"],
        "hotspots": [
            {
                "id": "hs_oia_villa",
                "label_he": "סוויטת צוק עם בריכת אינסוף (Oia)",
                "category": "HOTEL",
                "sku_code": "HTL-OIA-CLIFF",
                "price_ils": 2890.0,
                "confidence": 0.96,
                "box": {"x": 0.14, "y": 0.28, "w": 0.34, "h": 0.32},
            },
            {
                "id": "hs_tlv_jtr",
                "label_he": "טיסה ישירה נתב\"ג → סנטוריני (2:15 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-JTR",
                "price_ils": 1590.0,
                "confidence": 0.94,
                "box": {"x": 0.56, "y": 0.12, "w": 0.26, "h": 0.20},
            },
            {
                "id": "hs_catamaran",
                "label_he": "שייט קטמרן שקיעה + טברנה יוונית",
                "category": "EXPERIENCE",
                "sku_code": "EXP-CATAMARAN",
                "price_ils": 680.0,
                "confidence": 0.91,
                "box": {"x": 0.44, "y": 0.62, "w": 0.34, "h": 0.24},
            },
        ],
    },
    "TOKYO_NEON_FOOD": {
        "scene_type": "TOKYO_NEON_FOOD",
        "title_he": "טוקיו ניאון וקולינריית שף — שיבויה ושינג'וקו",
        "destination": "Tokyo",
        "destination_label_he": "טוקיו — שיבויה, שינג'וקו וקולינריית שף",
        "country": "יפן",
        "iata_code": "HND",
        "flight_hours_from_tlv": 11.3,
        "shabbat_friendly_score": 85,
        "image_url": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["tokyo", "shibuya", "shinjuku", "japan", "טוקיו", "יפן"],
        "hotspots": [
            {
                "id": "hs_tyo_hotel",
                "label_he": "מלון מעצבים בשינג'וקו (קרוב לחב\"ד)",
                "category": "HOTEL",
                "sku_code": "HTL-TYO-SHJ",
                "price_ils": 3100.0,
                "confidence": 0.95,
                "box": {"x": 0.18, "y": 0.22, "w": 0.32, "h": 0.38},
            },
            {
                "id": "hs_tlv_hnd",
                "label_he": "טיסה נתב\"ג → טוקיו האנדה (כבודה מלאה)",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-HND",
                "price_ils": 3690.0,
                "confidence": 0.93,
                "box": {"x": 0.58, "y": 0.14, "w": 0.28, "h": 0.22},
            },
            {
                "id": "hs_tyo_pass",
                "label_he": "סיור ראמן לילי + JR Pass & eSIM 20GB",
                "category": "EXPERIENCE",
                "sku_code": "TRF-ESIM-VIP",
                "price_ils": 540.0,
                "confidence": 0.90,
                "box": {"x": 0.46, "y": 0.58, "w": 0.35, "h": 0.25},
            },
        ],
    },
    "SWISS_ALPINE_CHALET": {
        "scene_type": "SWISS_ALPINE_CHALET",
        "title_he": "בקתת עץ אלפינית ורכבת פנורמית — צרמט, שוויץ",
        "destination": "Swiss Alps",
        "destination_label_he": "האלפים השווייצריים — צרמט ומטרהורן",
        "country": "שוויץ",
        "iata_code": "ZRH",
        "flight_hours_from_tlv": 4.4,
        "shabbat_friendly_score": 88,
        "image_url": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["swiss", "zermatt", "zurich", "alps", "matterhorn", "שוויץ", "צרמט"],
        "hotspots": [
            {
                "id": "hs_zrh_chalet",
                "label_he": "שאלה אלפיני מול המטרהורן",
                "category": "HOTEL",
                "sku_code": "HTL-ZRH-CHALET",
                "price_ils": 3450.0,
                "confidence": 0.95,
                "box": {"x": 0.22, "y": 0.36, "w": 0.34, "h": 0.30},
            },
            {
                "id": "hs_tlv_zrh",
                "label_he": "טיסה ישירה נתב\"ג → ציריך (4:25 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-ZRH",
                "price_ils": 1750.0,
                "confidence": 0.92,
                "box": {"x": 0.54, "y": 0.15, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_swiss_rail",
                "label_he": "כרטיס רכבות נוף Glacier Express",
                "category": "EXPERIENCE",
                "sku_code": "EXP-GLACIER",
                "price_ils": 820.0,
                "confidence": 0.91,
                "box": {"x": 0.42, "y": 0.66, "w": 0.36, "h": 0.22},
            },
        ],
    },
    "AMALFI_COAST_LUXURY": {
        "scene_type": "AMALFI_COAST_LUXURY",
        "title_he": "חוף אמלפי ורומא — טרסות לימונים ויאכטה פרטית",
        "destination": "Rome",
        "destination_label_he": "רומא וחוף אמלפי — דולצ'ה ויטה איטלקי",
        "country": "איטליה",
        "iata_code": "FCO",
        "flight_hours_from_tlv": 3.5,
        "shabbat_friendly_score": 94,
        "image_url": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["amalfi", "rome", "italy", "positano", "colosseum", "capri", "רומא", "אמלפי", "איטליה"],
        "hotspots": [
            {
                "id": "hs_amalfi_hotel",
                "label_he": "מלון טרסה היסטורי מול הים",
                "category": "HOTEL",
                "sku_code": "HTL-ROM-CEN",
                "price_ils": 2350.0,
                "confidence": 0.94,
                "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32},
            },
            {
                "id": "hs_tlv_fco",
                "label_he": "טיסה ישירה נתב\"ג → רומא (3:30 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-FCO",
                "price_ils": 1420.0,
                "confidence": 0.95,
                "box": {"x": 0.56, "y": 0.14, "w": 0.26, "h": 0.20},
            },
            {
                "id": "hs_amalfi_boat",
                "label_he": "יום יאכטה לקפרי + טעימות גורמה",
                "category": "EXPERIENCE",
                "sku_code": "EXP-CAPRI-BOAT",
                "price_ils": 740.0,
                "confidence": 0.89,
                "box": {"x": 0.45, "y": 0.62, "w": 0.34, "h": 0.24},
            },
        ],
    },
    "BALI_JUNGLE_VILLA": {
        "scene_type": "BALI_JUNGLE_VILLA",
        "title_he": "וילת ג'ונגל וטרסות אורז — אובוד, באלי",
        "destination": "Bali",
        "destination_label_he": "באלי — וילות אובוד וטרסות האורז",
        "country": "אינדונזיה",
        "iata_code": "DPS",
        "flight_hours_from_tlv": 13.5,
        "shabbat_friendly_score": 68,
        "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["bali", "ubud", "indonesia", "seminyak", "באלי"],
        "hotspots": [
            {
                "id": "hs_bali_villa",
                "label_he": "וילת ג'ונגל פרטית באובוד",
                "category": "HOTEL",
                "sku_code": "HTL-DPS-UBUD",
                "price_ils": 2150.0,
                "confidence": 0.95,
                "box": {"x": 0.18, "y": 0.26, "w": 0.35, "h": 0.34},
            },
            {
                "id": "hs_bali_flt",
                "label_he": "טיסת קונקשן פרימיום לבאלי",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-DPS",
                "price_ils": 2980.0,
                "confidence": 0.91,
                "box": {"x": 0.58, "y": 0.16, "w": 0.26, "h": 0.20},
            },
            {
                "id": "hs_bali_spa",
                "label_he": "ספא באלינזי זוגי + נהג פרטי",
                "category": "EXPERIENCE",
                "sku_code": "EXP-BALI-SPA",
                "price_ils": 490.0,
                "confidence": 0.92,
                "box": {"x": 0.46, "y": 0.64, "w": 0.32, "h": 0.22},
            },
        ],
    },
}

# Dynamic catalog for custom URLs / uploaded screenshots matched by keyword or AI vision
DYNAMIC_DESTINATION_SCENES: List[Dict[str, Any]] = [
    {
        "scene_type": "PARIS_EIFFEL_SEINE",
        "title_he": "פריחת אביב מול מגדל אייפל — חופשת בוטיק בפריז",
        "destination": "Paris",
        "destination_label_he": "פריז — מגדל אייפל ונהר הסיין",
        "country": "צרפת",
        "iata_code": "CDG",
        "flight_hours_from_tlv": 4.6,
        "shabbat_friendly_score": 91,
        "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["paris", "eiffel", "seine", "louvre", "champs", "montmartre", "cdg", "france", "פריז", "אייפל", "צרפת"],
        "hotspots": [
            {
                "id": "hs_par_hotel",
                "label_he": "סוויטת בוטיק עם מרפסת למגדל אייפל (Shangri-La / Pullman Paris)",
                "category": "HOTEL",
                "sku_code": "HTL-PAR-EIFFEL",
                "price_ils": 3190.0,
                "confidence": 0.97,
                "box": {"x": 0.16, "y": 0.34, "w": 0.34, "h": 0.30},
            },
            {
                "id": "hs_tlv_cdg",
                "label_he": "טיסה ישירה נתב\"ג → פריז שארל דה גול (4:35 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-CDG",
                "price_ils": 1680.0,
                "confidence": 0.95,
                "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_par_seine",
                "label_he": "שייט שקיעה קולינרי על נהר הסיין + דילוג על התור לאייפל",
                "category": "EXPERIENCE",
                "sku_code": "EXP-PAR-SEINE",
                "price_ils": 590.0,
                "confidence": 0.94,
                "box": {"x": 0.42, "y": 0.62, "w": 0.38, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "LONDON_WEST_END",
        "title_he": "לונדון הקלאסית — ביג בן, סוהו והווסט אנד",
        "destination": "London",
        "destination_label_he": "לונדון — ווסטמינסטר, סוהו ותמזה",
        "country": "בריטניה",
        "iata_code": "LHR",
        "flight_hours_from_tlv": 5.1,
        "shabbat_friendly_score": 93,
        "image_url": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["london", "bigben", "thames", "soho", "lhr", "england", "לונדון"],
        "hotspots": [
            {
                "id": "hs_lon_hotel",
                "label_he": "מלון בוטיק בקובנט גארדן / מייפייר",
                "category": "HOTEL",
                "sku_code": "HTL-LON-COVENT",
                "price_ils": 2950.0,
                "confidence": 0.96,
                "box": {"x": 0.15, "y": 0.30, "w": 0.33, "h": 0.32},
            },
            {
                "id": "hs_tlv_lhr",
                "label_he": "טיסה ישירה נתב\"ג → לונדון הית'רו (5:05 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-LHR",
                "price_ils": 1820.0,
                "confidence": 0.95,
                "box": {"x": 0.56, "y": 0.14, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_lon_musical",
                "label_he": "מחזמר פרימיום בווסט אנד + שייט על התמזה",
                "category": "EXPERIENCE",
                "sku_code": "EXP-LON-WESTEND",
                "price_ils": 640.0,
                "confidence": 0.92,
                "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "DUBAI_MARINA_SKYLINE",
        "title_he": "קו הרקיע של דובאי — בורג' חליפה והמרינה",
        "destination": "Dubai",
        "destination_label_he": "דובאי — דאון טאון והמרינה",
        "country": "איחוד האמירויות",
        "iata_code": "DXB",
        "flight_hours_from_tlv": 3.2,
        "shabbat_friendly_score": 90,
        "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["dubai", "burj", "marina", "uae", "dxb", "דובאי"],
        "hotspots": [
            {
                "id": "hs_dxb_hotel",
                "label_he": "מלון יוקרה בדובאי מרינה / דאון טאון (אופציה כשרה)",
                "category": "HOTEL",
                "sku_code": "HTL-DXB-MARINA",
                "price_ils": 2490.0,
                "confidence": 0.96,
                "box": {"x": 0.16, "y": 0.28, "w": 0.34, "h": 0.34},
            },
            {
                "id": "hs_tlv_dxb",
                "label_he": "טיסה ישירה נתב\"ג → דובאי (3:15 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-DXB",
                "price_ils": 1350.0,
                "confidence": 0.95,
                "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_dxb_desert",
                "label_he": "תצפית בורג' חליפה VIP + ספארי דיונות שקיעה",
                "category": "EXPERIENCE",
                "sku_code": "EXP-DXB-SAFARI",
                "price_ils": 520.0,
                "confidence": 0.93,
                "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "BARCELONA_GAUDI_COAST",
        "title_he": "ברצלונה של גאודי — שדרות רמבלאס והים התיכון",
        "destination": "Barcelona",
        "destination_label_he": "ברצלונה — אישמפלה, גאודי והחוף",
        "country": "ספרד",
        "iata_code": "BCN",
        "flight_hours_from_tlv": 4.4,
        "shabbat_friendly_score": 89,
        "image_url": "https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["barcelona", "gaudi", "sagrada", "bcn", "spain", "ברצלונה"],
        "hotspots": [
            {
                "id": "hs_bcn_hotel",
                "label_he": "מלון גג מעוצב באישמפלה ליד פאסאו דה גרסיה",
                "category": "HOTEL",
                "sku_code": "HTL-BCN-EIX",
                "price_ils": 2290.0,
                "confidence": 0.95,
                "box": {"x": 0.18, "y": 0.30, "w": 0.32, "h": 0.32},
            },
            {
                "id": "hs_tlv_bcn",
                "label_he": "טיסה ישירה נתב\"ג → ברצלונה (4:25 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-BCN",
                "price_ils": 1490.0,
                "confidence": 0.94,
                "box": {"x": 0.56, "y": 0.14, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_bcn_tour",
                "label_he": "כניסה מהירה לסגרדה פמיליה + סיור טאפאס ברובע הגותי",
                "category": "EXPERIENCE",
                "sku_code": "EXP-BCN-GAUDI",
                "price_ils": 460.0,
                "confidence": 0.92,
                "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "NEW_YORK_MANHATTAN",
        "title_he": "ניו יורק — קו הרקיע של מנהטן, סנטרל פארק וסוהו",
        "destination": "New York",
        "destination_label_he": "ניו יורק — מנהטן, סנטרל פארק וברודוויי",
        "country": "ארה\"ב",
        "iata_code": "JFK",
        "flight_hours_from_tlv": 11.5,
        "shabbat_friendly_score": 96,
        "image_url": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["new-york", "new_york", "newyork", "nyc", "manhattan", "brooklyn", "jfk", "ניו יורק", "מנהטן"],
        "hotspots": [
            {
                "id": "hs_nyc_hotel",
                "label_he": "מלון בוטיק במידטאון / אפר ווסט סייד",
                "category": "HOTEL",
                "sku_code": "HTL-NYC-MIDTOWN",
                "price_ils": 3590.0,
                "confidence": 0.96,
                "box": {"x": 0.16, "y": 0.28, "w": 0.34, "h": 0.34},
            },
            {
                "id": "hs_tlv_jfk",
                "label_he": "טיסה ישירה נתב\"ג → ניו יורק JFK",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-JFK",
                "price_ils": 3490.0,
                "confidence": 0.95,
                "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_nyc_exp",
                "label_he": "הצגת ברודוויי + תצפית Summit One Vanderbilt",
                "category": "EXPERIENCE",
                "sku_code": "EXP-NYC-BROADWAY",
                "price_ils": 780.0,
                "confidence": 0.93,
                "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "BANGKOK_THAILAND_RIVER",
        "title_he": "תאילנד הטרופית — מקדשי בנגקוק ושווקי הנהר",
        "destination": "Bangkok",
        "destination_label_he": "בנגקוק ותאילנד — נהר הצ'או פראיה והשווקים",
        "country": "תאילנד",
        "iata_code": "BKK",
        "flight_hours_from_tlv": 10.8,
        "shabbat_friendly_score": 86,
        "image_url": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["bangkok", "thailand", "phuket", "samui", "bkk", "בנגקוק", "תאילנד"],
        "hotspots": [
            {
                "id": "hs_bkk_hotel",
                "label_he": "ריזורט נהר 5★ בבנגקוק (קרוב לבית חב\"ד)",
                "category": "HOTEL",
                "sku_code": "HTL-BKK-RIVER",
                "price_ils": 1890.0,
                "confidence": 0.95,
                "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32},
            },
            {
                "id": "hs_tlv_bkk",
                "label_he": "טיסה ישירה נתב\"ג → בנגקוק BKK",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-BKK",
                "price_ils": 2890.0,
                "confidence": 0.94,
                "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_bkk_exp",
                "label_he": "שייט שוק צף פרטי + ערב גג וטוק-טוק קולינרי",
                "category": "EXPERIENCE",
                "sku_code": "EXP-BKK-FLOATING",
                "price_ils": 410.0,
                "confidence": 0.91,
                "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "ATHENS_ACROPOLIS",
        "title_he": "אתונה הקלאסית — האקרופוליס, פלאקה וטברנות",
        "destination": "Athens",
        "destination_label_he": "אתונה — האקרופוליס ורובע פלאקה",
        "country": "יוון",
        "iata_code": "ATH",
        "flight_hours_from_tlv": 2.0,
        "shabbat_friendly_score": 91,
        "image_url": "https://images.unsplash.com/photo-1555993539-1732b0258235?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["athens", "acropolis", "plaka", "ath", "אתונה"],
        "hotspots": [
            {
                "id": "hs_ath_hotel",
                "label_he": "מלון בוטיק עם גג תצפית לאקרופוליס (פלאקה)",
                "category": "HOTEL",
                "sku_code": "HTL-ATH-PLAKA",
                "price_ils": 1790.0,
                "confidence": 0.95,
                "box": {"x": 0.18, "y": 0.30, "w": 0.32, "h": 0.32},
            },
            {
                "id": "hs_tlv_ath",
                "label_he": "טיסה ישירה נתב\"ג → אתונה (2:00 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-ATH",
                "price_ils": 980.0,
                "confidence": 0.96,
                "box": {"x": 0.56, "y": 0.14, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_ath_exp",
                "label_he": "סיור טברנות בפסירי + כרטיס לאקרופוליס",
                "category": "EXPERIENCE",
                "sku_code": "EXP-ATH-TAVERNA",
                "price_ils": 390.0,
                "confidence": 0.92,
                "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "PRAGUE_OLD_TOWN",
        "title_he": "פראג הרומנטית — גשר קארל והעיר העתיקה",
        "destination": "Prague",
        "destination_label_he": "פראג — גשר קארל והרובע היהודי",
        "country": "צ'כיה",
        "iata_code": "PRG",
        "flight_hours_from_tlv": 4.0,
        "shabbat_friendly_score": 92,
        "image_url": "https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["prague", "praha", "prg", "bohemia", "פראג"],
        "hotspots": [
            {
                "id": "hs_prg_hotel",
                "label_he": "מלון היסטורי ברובע יוזפוב / העיר העתיקה",
                "category": "HOTEL",
                "sku_code": "HTL-PRG-OLD",
                "price_ils": 1850.0,
                "confidence": 0.95,
                "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32},
            },
            {
                "id": "hs_tlv_prg",
                "label_he": "טיסה ישירה נתב\"ג → פראג (4:00 ש')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-PRG",
                "price_ils": 1290.0,
                "confidence": 0.94,
                "box": {"x": 0.56, "y": 0.14, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_prg_exp",
                "label_he": "שייט על נהר הוולטאבה + סיור הרובע היהודי",
                "category": "EXPERIENCE",
                "sku_code": "EXP-PRG-VLTAVA",
                "price_ils": 380.0,
                "confidence": 0.92,
                "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "EILAT_RED_SEA",
        "title_he": "אילת והים האדום — שונית האלמוגים ונופש שמש",
        "destination": "Eilat",
        "destination_label_he": "אילת — טיילת הים האדום ושונית האלמוגים",
        "country": "ישראל",
        "iata_code": "ETM",
        "flight_hours_from_tlv": 1.0,
        "shabbat_friendly_score": 98,
        "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["eilat", "redsea", "red-sea", "etm", "timna", "אילת"],
        "hotspots": [
            {
                "id": "hs_etm_hotel",
                "label_he": "ריזורט על קו המים בטיילת הצפונית (אילת)",
                "category": "HOTEL",
                "sku_code": "HTL-ETM-RESORT",
                "price_ils": 2190.0,
                "confidence": 0.96,
                "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32},
            },
            {
                "id": "hs_tlv_etm",
                "label_he": "טיסה ישירה נתב\"ג → רמון אילת (55 דק')",
                "category": "FLIGHT",
                "sku_code": "FLT-TLV-ETM",
                "price_ils": 580.0,
                "confidence": 0.95,
                "box": {"x": 0.56, "y": 0.14, "w": 0.28, "h": 0.20},
            },
            {
                "id": "hs_etm_exp",
                "label_he": "הפלגה בשונית האלמוגים + פארק תמנע בשקיעה",
                "category": "EXPERIENCE",
                "sku_code": "EXP-ETM-REEF",
                "price_ils": 360.0,
                "confidence": 0.93,
                "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
            },
        ],
    },
    {
        "scene_type": "AMSTERDAM_CANALS",
        "title_he": "אמסטרדם — תעלות יורדאן, מוזיאונים ואופניים",
        "destination": "Amsterdam",
        "destination_label_he": "אמסטרדם — תעלות המרכז ורובע יורדאן",
        "country": "הולנד",
        "iata_code": "AMS",
        "flight_hours_from_tlv": 4.9,
        "shabbat_friendly_score": 91,
        "image_url": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["amsterdam", "canal", "jordaan", "netherlands", "holland", "ams", "אמסטרדם", "הולנד"],
        "hotspots": [
            {"id": "hs_ams_hotel", "label_he": "מלון בוטיק על תעלת הקייזרסחראכט", "category": "HOTEL", "sku_code": "HTL-AMS-CANAL", "price_ils": 2790.0, "confidence": 0.95, "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32}},
            {"id": "hs_tlv_ams", "label_he": "טיסה ישירה נתב\"ג → אמסטרדם סכיפהול", "category": "FLIGHT", "sku_code": "FLT-TLV-AMS", "price_ils": 1640.0, "confidence": 0.95, "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20}},
            {"id": "hs_ams_exp", "label_he": "שייט תעלות VIP + כרטיסים לרייקסמוזיאום", "category": "EXPERIENCE", "sku_code": "EXP-AMS-CRUISE", "price_ils": 470.0, "confidence": 0.93, "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24}},
        ],
    },
    {
        "scene_type": "BUDAPEST_DANUBE",
        "title_he": "בודפשט — בניין הפרלמנט, מרחצאות סצ'ני והדנובה",
        "destination": "Budapest",
        "destination_label_he": "בודפשט — נהר הדנובה והרובע היהודי",
        "country": "הונגריה",
        "iata_code": "BUD",
        "flight_hours_from_tlv": 3.3,
        "shabbat_friendly_score": 95,
        "image_url": "https://images.unsplash.com/photo-1551867633-194f125bddfa?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["budapest", "danube", "szechenyi", "hungary", "bud", "בודפשט", "הונגריה"],
        "hotspots": [
            {"id": "hs_bud_hotel", "label_he": "מלון בוטיק במרכז הרובע היהודי / הדנובה", "category": "HOTEL", "sku_code": "HTL-BUD-PEST", "price_ils": 1690.0, "confidence": 0.95, "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32}},
            {"id": "hs_tlv_bud", "label_he": "טיסה ישירה נתב\"ג → בודפשט (3:20 ש')", "category": "FLIGHT", "sku_code": "FLT-TLV-BUD", "price_ils": 1120.0, "confidence": 0.95, "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20}},
            {"id": "hs_bud_exp", "label_he": "שייט ערב על הדנובה + כניסה למרחצאות סצ'ני", "category": "EXPERIENCE", "sku_code": "EXP-BUD-SPA", "price_ils": 350.0, "confidence": 0.93, "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24}},
        ],
    },
    {
        "scene_type": "VIENNA_IMPERIAL",
        "title_he": "וינה הקיסרית — ארמון שנברון ובתי הקפה",
        "destination": "Vienna",
        "destination_label_he": "וינה — מרכז העיר וארמון שנברון",
        "country": "אוסטריה",
        "iata_code": "VIE",
        "flight_hours_from_tlv": 3.7,
        "shabbat_friendly_score": 93,
        "image_url": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["vienna", "wien", "austria", "schonbrunn", "vie", "וינה", "אוסטריה"],
        "hotspots": [
            {"id": "hs_vie_hotel", "label_he": "מלון קלאסי במרכז רובע 1 (קרוב לבית הכנסת)", "category": "HOTEL", "sku_code": "HTL-VIE-RING", "price_ils": 2250.0, "confidence": 0.95, "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32}},
            {"id": "hs_tlv_vie", "label_he": "טיסה ישירה נתב\"ג → וינה (3:40 ש')", "category": "FLIGHT", "sku_code": "FLT-TLV-VIE", "price_ils": 1340.0, "confidence": 0.95, "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20}},
            {"id": "hs_vie_exp", "label_he": "סיור ארמון שנברון + קונצרט מוצרט", "category": "EXPERIENCE", "sku_code": "EXP-VIE-PALACE", "price_ils": 430.0, "confidence": 0.92, "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24}},
        ],
    },
    {
        "scene_type": "LISBON_TRAM",
        "title_he": "ליסבון — חשמלית 28, אלפמה ושקיעה בבלם",
        "destination": "Lisbon",
        "destination_label_he": "ליסבון — אלפמה, בלם וחופי קשקאיש",
        "country": "פורטוגל",
        "iata_code": "LIS",
        "flight_hours_from_tlv": 5.7,
        "shabbat_friendly_score": 87,
        "image_url": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["lisbon", "lisboa", "portugal", "alfama", "belem", "lis", "ליסבון", "פורטוגל"],
        "hotspots": [
            {"id": "hs_lis_hotel", "label_he": "מלון בוטיק בכיכר רוסיו / שיאדו", "category": "HOTEL", "sku_code": "HTL-LIS-CHIADO", "price_ils": 2190.0, "confidence": 0.95, "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32}},
            {"id": "hs_tlv_lis", "label_he": "טיסה ישירה נתב\"ג → ליסבון", "category": "FLIGHT", "sku_code": "FLT-TLV-LIS", "price_ils": 1790.0, "confidence": 0.94, "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20}},
            {"id": "hs_lis_exp", "label_he": "יום טירות סינטרה + טעימות פסטל דה נטה", "category": "EXPERIENCE", "sku_code": "EXP-LIS-SINTRA", "price_ils": 460.0, "confidence": 0.92, "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24}},
        ],
    },
    {
        "scene_type": "JERUSALEM_OLD_CITY",
        "title_he": "ירושלים — העיר העתיקה, הכותל וממילא",
        "destination": "Jerusalem",
        "destination_label_he": "ירושלים — העיר העתיקה, מגדל דוד וממילא",
        "country": "ישראל",
        "iata_code": "TLV",
        "flight_hours_from_tlv": 0.8,
        "shabbat_friendly_score": 99,
        "image_url": "https://images.unsplash.com/photo-1552423314-cf29ab68ad73?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["jerusalem", "kotel", "western wall", "mamilla", "ירושלים", "הכותל"],
        "hotspots": [
            {"id": "hs_jrs_hotel", "label_he": "מלון יוקרה בממילא / משכנות שאננים", "category": "HOTEL", "sku_code": "HTL-JRS-MAMILLA", "price_ils": 2490.0, "confidence": 0.97, "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32}},
            {"id": "hs_jrs_trf", "label_he": "רכבת מהירה / הסעה פרטית תל אביב → ירושלים", "category": "FLIGHT", "sku_code": "TRF-TLV-JRS", "price_ils": 220.0, "confidence": 0.95, "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20}},
            {"id": "hs_jrs_exp", "label_he": "סיור מנהרות הכותל + טעימות שוק מחנה יהודה", "category": "EXPERIENCE", "sku_code": "EXP-JRS-SHUK", "price_ils": 340.0, "confidence": 0.94, "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24}},
        ],
    },
    {
        "scene_type": "TEL_AVIV_BEACH",
        "title_he": "תל אביב-יפו — טיילת הים, נווה צדק ושרונה",
        "destination": "Tel Aviv",
        "destination_label_he": "תל אביב-יפו — חופי הטיילת ונווה צדק",
        "country": "ישראל",
        "iata_code": "TLV",
        "flight_hours_from_tlv": 0.2,
        "shabbat_friendly_score": 96,
        "image_url": "https://images.unsplash.com/photo-1544971587-b842c27f8e14?q=80&w=1200&auto=format&fit=crop",
        "keywords": ["tel aviv", "tel-aviv", "telaviv", "jaffa", "tlv", "תל אביב", "יפו"],
        "hotspots": [
            {"id": "hs_tlv_hotel", "label_he": "מלון בוטיק על חוף תל אביב / שדרות רוטשילד", "category": "HOTEL", "sku_code": "HTL-TLV-BEACH", "price_ils": 2290.0, "confidence": 0.96, "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32}},
            {"id": "hs_tlv_mob", "label_he": "חבילת חניה VIP והתניידות במרכז", "category": "FLIGHT", "sku_code": "TRF-TLV-CITY", "price_ils": 180.0, "confidence": 0.94, "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20}},
            {"id": "hs_tlv_exp", "label_he": "סיור קולינרי בכרמל ולוינסקי + שקיעה ביפו העתיקה", "category": "EXPERIENCE", "sku_code": "EXP-TLV-JAFFA", "price_ils": 320.0, "confidence": 0.93, "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24}},
        ],
    },
]

ALL_SCENES: List[Dict[str, Any]] = list(LOOKBOOK_PRESETS.values()) + DYNAMIC_DESTINATION_SCENES


def _get_gemini_api_key() -> str:
    return (
        settings.GEMINI_API_KEY
        or os.getenv("GEMINI_API_KEY", "")
        or os.getenv("GOOGLE_API_KEY", "")
    ).strip()


def _normalize_parsed_json(raw_text: str) -> Optional[Dict[str, Any]]:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", (raw_text or "").strip(), flags=re.IGNORECASE | re.DOTALL).strip()
    if not cleaned:
        return None
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not m:
            return None
        data = json.loads(m.group(0))
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return data[0]
    return data if isinstance(data, dict) else None


def _try_gemini_vision_extract(
    *,
    image_source_url: Optional[str],
    image_bytes: Optional[bytes],
    image_mime_type: Optional[str],
    page_hint: Optional[str],
    custom_hint: Optional[str],
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Attempt multimodal destination extraction with Gemini Vision when GEMINI_API_KEY
    is active (skipped in automated pytest runs unless mocked).
    Returns (scene_dict, failure_reason_code).
    """
    if os.getenv("PYTEST_CURRENT_TEST") and not os.getenv("ALLOW_PYTEST_GEMINI_VISION"):
        return None, "pytest_skipped"

    gemini_key = _get_gemini_api_key()
    if not gemini_key:
        return None, "missing_api_key"

    if not image_bytes and not custom_hint and not page_hint:
        return None, "no_visual_payload"

    digest = hashlib.sha256(image_bytes).hexdigest()[:20] if image_bytes else ""
    cache_key = f"{digest}|{(image_source_url or '')[:120]}|{(custom_hint or '')[:60]}"
    cached = _VISION_CACHE.get(cache_key)
    if cached and (time.time() - cached[0]) < _VISION_CACHE_TTL_SEC:
        return dict(cached[1]), None

    try:
        from google import genai
        from google.genai import types

        parts: List[Any] = []
        if image_bytes:
            parts.append(types.Part.from_bytes(data=image_bytes, mime_type=image_mime_type or "image/jpeg"))

        prompt = (
            "You are an expert travel vision & landmark geolocation AI. "
            "Inspect the actual image pixels carefully: landmarks, skyline, architecture, coastal geography, "
            "terrain, street/shop signs, language/alphabet, or screenshot text (Google Maps, Instagram, Airbnb, Booking). "
            "Identify the real city/travel destination shown. Return strictly valid JSON (no markdown) with keys: "
            "recognized (boolean, false ONLY if impossible to infer any place), "
            "confidence (number 0..1), "
            "destination (standard English city name, e.g. 'Paris', 'Rome', 'Jerusalem', 'London', 'Amsterdam'), "
            "destination_label_he (Hebrew city + detected landmark, e.g. 'פריז — מגדל אייפל ונהר הסיין'), "
            "landmark_detected_he (short Hebrew description of what you visually see in the image), "
            "country (Hebrew country name), iata_code (3-letter nearest airport code), "
            "vibe_title (Hebrew catchy trip title), flight_hours_from_tlv (number), shabbat_friendly_score (50-98 int), "
            "hotel_label_he, hotel_price_ils (number), flight_label_he (Hebrew TLV -> destination), "
            "flight_price_ils (number), experience_label_he, experience_price_ils (number). "
        )
        if image_source_url and not image_source_url.startswith("data:"):
            prompt += f"Image URL context: {image_source_url}. "
        if page_hint:
            prompt += f"Page/image metadata: {page_hint}. "
        if custom_hint:
            prompt += f"User hint: {custom_hint}. "
        parts.append(prompt)

        client = genai.Client(api_key=gemini_key)
        candidate_models = list(
            dict.fromkeys([
                settings.GEMINI_REASONING_MODEL,
                settings.GEMINI_MODEL,
                "gemini-2.5-flash",
                "gemini-2.0-flash",
            ])
        )

        parsed: Optional[Dict[str, Any]] = None
        last_err: Optional[Exception] = None
        for model_name in candidate_models:
            try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=parts,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2,
                        ),
                    )
                except Exception:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=parts,
                    )
                parsed = _normalize_parsed_json(getattr(response, "text", "") or "")
                if parsed:
                    break
            except Exception as exc:
                last_err = exc
                logger.warning("Gemini vision attempt with model %s failed: %s", model_name, exc)

        if not parsed:
            return None, f"gemini_error:{type(last_err).__name__ if last_err else 'empty'}"

        if parsed.get("recognized") is False:
            return None, "gemini_unrecognized"

        dest_en = str(parsed.get("destination") or "").strip()
        if not dest_en or dest_en.lower() in ("unknown", "unidentified", "none", "n/a"):
            return None, "gemini_unrecognized"

        dest_code = re.sub(r"[^A-Z]", "", dest_en.upper())[:3] or "DST"
        iata = re.sub(r"[^A-Z]", "", str(parsed.get("iata_code") or "TLV").upper())[:3] or "CDG"
        landmark_he = str(parsed.get("landmark_detected_he") or "").strip() or None
        dest_label_he = str(parsed.get("destination_label_he") or dest_en).strip()

        curated = _match_scene_from_text(dest_en)
        if curated and curated["destination"].lower() == dest_en.lower():
            enriched = dict(curated)
            enriched["detection_source"] = "gemini_vision"
            if landmark_he:
                enriched["landmark_detected_he"] = landmark_he
            if dest_label_he:
                enriched["destination_label_he"] = dest_label_he
            if parsed.get("vibe_title"):
                enriched["title_he"] = str(parsed["vibe_title"])
            _VISION_CACHE[cache_key] = (time.time(), enriched)
            return enriched, None

        scene_result: Dict[str, Any] = {
            "scene_type": f"VISION_{dest_code}",
            "title_he": str(parsed.get("vibe_title") or f"חופשת השראה ב{dest_label_he}"),
            "destination": dest_en,
            "destination_label_he": dest_label_he,
            "landmark_detected_he": landmark_he,
            "country": str(parsed.get("country") or "בינלאומי"),
            "iata_code": iata,
            "flight_hours_from_tlv": float(parsed.get("flight_hours_from_tlv") or 4.5),
            "shabbat_friendly_score": int(parsed.get("shabbat_friendly_score") or 85),
            "detection_source": "gemini_vision",
            "hotspots": [
                {
                    "id": f"hs_{dest_code.lower()}_hotel",
                    "label_he": str(parsed.get("hotel_label_he") or f"מלון בוטיק מרכזי ב{dest_en}"),
                    "category": "HOTEL",
                    "sku_code": f"HTL-{dest_code}-LUX",
                    "price_ils": float(parsed.get("hotel_price_ils") or 2650.0),
                    "confidence": float(parsed.get("confidence") or 0.95),
                    "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32},
                },
                {
                    "id": f"hs_tlv_{iata.lower()}",
                    "label_he": str(parsed.get("flight_label_he") or f"טיסה מנתב\"ג → {dest_en} ({iata})"),
                    "category": "FLIGHT",
                    "sku_code": f"FLT-TLV-{iata}",
                    "price_ils": float(parsed.get("flight_price_ils") or 1690.0),
                    "confidence": 0.94,
                    "box": {"x": 0.56, "y": 0.12, "w": 0.28, "h": 0.20},
                },
                {
                    "id": f"hs_{dest_code.lower()}_exp",
                    "label_he": str(parsed.get("experience_label_he") or f"סיור וחוויית דגל ב{dest_en}"),
                    "category": "EXPERIENCE",
                    "sku_code": f"EXP-{dest_code}-VIP",
                    "price_ils": float(parsed.get("experience_price_ils") or 540.0),
                    "confidence": 0.92,
                    "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24},
                },
            ],
        }
        if len(_VISION_CACHE) >= 128:
            _VISION_CACHE.clear()
        _VISION_CACHE[cache_key] = (time.time(), scene_result)
        return scene_result, None
    except Exception as exc:
        logger.warning("Gemini vision extraction error: %s", exc)
        return None, f"gemini_exception:{type(exc).__name__}"


def _match_scene_from_text(*candidates: Optional[str]) -> Optional[Dict[str, Any]]:
    combined = " ".join(c for c in candidates if c).lower()
    if not combined.strip():
        return None
    for scene in ALL_SCENES:
        for kw in scene.get("keywords", []):
            if kw in combined:
                return scene
    return None


def _build_hint_or_unidentified_scene(
    *,
    file_name: Optional[str] = None,
    custom_hint: Optional[str] = None,
    gemini_reason: Optional[str] = None,
) -> Tuple[Dict[str, Any], bool, Optional[str]]:
    explicit_hint = (custom_hint or "").strip()
    clean_file_hint = clean_upload_filename_hint(file_name)
    label = explicit_hint or clean_file_hint

    if label:
        scene = {
            "scene_type": "CUSTOM_VISION_UPLOAD",
            "title_he": f"חבילת Vision מותאמת אישית — {label}",
            "destination": label,
            "destination_label_he": f"{label} — ניתוח תמונה ורמז מותאם",
            "country": "יעד מותאם",
            "iata_code": "TLV",
            "flight_hours_from_tlv": 4.2,
            "shabbat_friendly_score": 88,
            "detection_source": "custom_hint",
            "hotspots": [
                {"id": "hs_custom_hotel", "label_he": f"מלון בוטיק מומלץ באזור {label}", "category": "HOTEL", "sku_code": "HTL-VIS-CUSTOM", "price_ils": 2590.0, "confidence": 0.94, "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32}},
                {"id": "hs_custom_flight", "label_he": f"טיסת הלוך-חזור מנתב\"ג TLV → {label}", "category": "FLIGHT", "sku_code": "FLT-TLV-CUSTOM", "price_ils": 1590.0, "confidence": 0.93, "box": {"x": 0.56, "y": 0.14, "w": 0.28, "h": 0.20}},
                {"id": "hs_custom_exp", "label_he": f"חוויית סיור VIP והעברות ב{label}", "category": "EXPERIENCE", "sku_code": "EXP-VIS-BUNDLE", "price_ils": 490.0, "confidence": 0.91, "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24}},
            ],
        }
        return scene, False, None

    if gemini_reason == "missing_api_key":
        warning_he = (
            "זיהוי אוטומטי מתמונה דורש הגדרת GEMINI_API_KEY בשרת. "
            "הקלד שם עיר או אתר בשדה הרמז למטה (למשל: רומא, פריז, מגדל אייפל) כדי לפרק את החבילה מיידית."
        )
    else:
        warning_he = (
            "לא הצלחנו לזהות בוודאות את המקום מתוך התמונה בלבד. "
            "הקלד שם עיר או אתר בשדה הרמז למטה ונבנה לך מסלול מותאם מיידית."
        )

    unidentified = {
        "scene_type": "UNIDENTIFIED_VISION_UPLOAD",
        "title_he": "נדרש רמז קצר להשלמת זיהוי התמונה",
        "destination": "יעד לא מזוהה",
        "destination_label_he": "התמונה נקלטה — הזן שם עיר/אתר לאישור היעד",
        "country": "ממתין לזיהוי",
        "iata_code": "TLV",
        "flight_hours_from_tlv": 4.0,
        "shabbat_friendly_score": 88,
        "detection_source": "unidentified_upload",
        "hotspots": [
            {"id": "hs_unid_hotel", "label_he": "מלון בוטיק מותאם ליעד שתבחר", "category": "HOTEL", "sku_code": "HTL-VIS-PENDING", "price_ils": 2490.0, "confidence": 0.65, "box": {"x": 0.16, "y": 0.30, "w": 0.34, "h": 0.32}},
            {"id": "hs_unid_flight", "label_he": "טיסת הלוך-חזור מנתב\"ג TLV", "category": "FLIGHT", "sku_code": "FLT-TLV-PENDING", "price_ils": 1490.0, "confidence": 0.65, "box": {"x": 0.56, "y": 0.14, "w": 0.28, "h": 0.20}},
            {"id": "hs_unid_exp", "label_he": "סיור מקומי והעברות + eSIM", "category": "EXPERIENCE", "sku_code": "EXP-VIS-PENDING", "price_ils": 420.0, "confidence": 0.65, "box": {"x": 0.44, "y": 0.62, "w": 0.36, "h": 0.24}},
        ],
    }
    return unidentified, True, warning_he


def _resolve_scene(
    *,
    scene_type: Optional[str] = "SANTORINI_CLIFFSIDE",
    scene_key: Optional[str] = None,
    image_source_url: Optional[str] = None,
    image_url: Optional[str] = None,
    image_base64: Optional[str] = None,
    file_name: Optional[str] = None,
    custom_hint: Optional[str] = None,
) -> Tuple[Dict[str, Any], Optional[str], bool, str, bool, Optional[str]]:
    effective_url = (image_source_url or image_url or "").strip() or None
    effective_b64 = (image_base64 or "").strip() or None
    if effective_url and effective_url.startswith("data:image/"):
        effective_b64 = effective_b64 or effective_url

    preset_stock_match: Optional[Dict[str, Any]] = None
    if effective_url and not effective_url.startswith("data:"):
        for preset in LOOKBOOK_PRESETS.values():
            if preset["image_url"] == effective_url:
                preset_stock_match = preset
                break

    has_custom_media = bool(
        (effective_url and preset_stock_match is None)
        or effective_b64
        or (file_name and file_name.strip())
        or (custom_hint and custom_hint.strip())
    )

    if has_custom_media:
        raw_bytes: Optional[bytes] = None
        raw_mime: Optional[str] = None
        url_meta_hint: Optional[str] = None

        if effective_b64:
            try:
                raw_bytes, raw_mime = decode_base64_image(effective_b64)
            except Exception:
                raw_bytes = None
        elif effective_url and not effective_url.startswith("data:"):
            raw_bytes, raw_mime, url_meta_hint = fetch_image_from_url(effective_url)

        gemini_scene, gemini_reason = _try_gemini_vision_extract(
            image_source_url=effective_url,
            image_bytes=raw_bytes,
            image_mime_type=raw_mime,
            page_hint=url_meta_hint,
            custom_hint=custom_hint or clean_upload_filename_hint(file_name),
        )
        if gemini_scene:
            display_img = effective_b64 or effective_url or gemini_scene.get("image_url") or LOOKBOOK_PRESETS["SANTORINI_CLIFFSIDE"]["image_url"]
            return gemini_scene, display_img, True, "gemini_vision", False, None

        clean_fname = clean_upload_filename_hint(file_name)
        matched = _match_scene_from_text(effective_url, url_meta_hint, file_name, clean_fname, custom_hint)
        if matched:
            display_img = effective_b64 or effective_url or matched["image_url"]
            src = "hint_keyword" if custom_hint else "url_keyword"
            return matched, display_img, True, src, False, None

        if raw_bytes:
            gps_city = match_nearest_city_from_gps(raw_bytes)
            if gps_city:
                gps_scene = _match_scene_from_text(gps_city)
                if gps_scene:
                    display_img = effective_b64 or effective_url or gps_scene["image_url"]
                    return gps_scene, display_img, True, "exif_gps", False, None

        fallback_scene, needs_hint, warning_he = _build_hint_or_unidentified_scene(
            file_name=file_name,
            custom_hint=custom_hint,
            gemini_reason=gemini_reason,
        )
        display_img = effective_b64 or effective_url or LOOKBOOK_PRESETS["SANTORINI_CLIFFSIDE"]["image_url"]
        return fallback_scene, display_img, True, fallback_scene["detection_source"], needs_hint, warning_he

    if preset_stock_match is not None:
        return preset_stock_match, preset_stock_match["image_url"], False, "preset", False, None

    key = (scene_key or scene_type or "SANTORINI_CLIFFSIDE").strip().upper()
    preset = LOOKBOOK_PRESETS.get(key, LOOKBOOK_PRESETS["SANTORINI_CLIFFSIDE"])
    return preset, preset["image_url"], False, "preset", False, None


def get_vision_presets() -> List[Dict[str, Any]]:
    return [
        {
            "scene_type": v["scene_type"],
            "title_he": v["title_he"],
            "destination": v["destination"],
            "destination_label_he": v["destination_label_he"],
            "country": v["country"],
            "image_url": v["image_url"],
            "hotspots_count": len(v["hotspots"]),
        }
        for v in LOOKBOOK_PRESETS.values()
    ]


def _compute_fit_metrics(
    *,
    scene: Dict[str, Any],
    bundle_total_ils: float,
    within_budget: bool,
    budget_ceiling_ils: float,
    shabbat_observant: bool,
    max_flight_hours: float,
) -> Tuple[int, List[str]]:
    score = 94.0
    notes: List[str] = []
    if not within_budget:
        over_pct = min(25.0, ((bundle_total_ils - budget_ceiling_ils) / max(1.0, budget_ceiling_ils)) * 100.0)
        score -= over_pct
        notes.append(f"עלות הבאנדל (₪{bundle_total_ils:,.0f}) גבוהה מהתקרה ב-₪{bundle_total_ils - budget_ceiling_ils:,.0f}.")
    else:
        notes.append("החבילה עומדת במלואה בתקציב שהוגדר כולל הנחת ה-10%.")

    flight_hours = float(scene.get("flight_hours_from_tlv", 4.5))
    shabbat_score = int(scene.get("shabbat_friendly_score", 88))
    if flight_hours > float(max_flight_hours):
        score -= 14.0
        notes.append(f"זמן הטיסה מנתב\"ג ({flight_hours} ש') ארוך מהעדפת ה-{max_flight_hours} שעות.")
    else:
        notes.append(f"זמן טיסה נוח מנתב\"ג ({flight_hours} שעות).")

    if shabbat_observant and shabbat_score < 80:
        score -= 18.0
        notes.append("נדרשת התאמת כשרות ושבת מוגברת ביעד זה.")
    elif shabbat_observant:
        notes.append(f"התאמה גבוהה לשבת וכשרות ({shabbat_score}%).")

    return int(max(45, min(99, round(score)))), notes


def decompose_travel_screenshot(
    *,
    scene_type: Optional[str] = "SANTORINI_CLIFFSIDE",
    scene_key: Optional[str] = None,
    image_source_url: Optional[str] = None,
    image_url: Optional[str] = None,
    image_base64: Optional[str] = None,
    file_name: Optional[str] = None,
    custom_hint: Optional[str] = None,
    travelers: int = 2,
    budget_ceiling_ils: float = 8500.0,
) -> Dict[str, Any]:
    scene, resolved_image, is_dynamic, detection_source, needs_hint, warning_he = _resolve_scene(
        scene_type=scene_type,
        scene_key=scene_key,
        image_source_url=image_source_url,
        image_url=image_url,
        image_base64=image_base64,
        file_name=file_name,
        custom_hint=custom_hint,
    )

    scale = max(1.0, travelers / 2.0)
    hotspots: List[Dict[str, Any]] = []
    subtotal_ils = 0.0
    for hs in scene["hotspots"]:
        scaled_price = round(
            float(hs["price_ils"]) * (scale if hs["category"] == "FLIGHT" else (1.0 + 0.25 * max(0, travelers - 2))),
            2,
        )
        subtotal_ils += scaled_price
        hotspots.append({
            **hs,
            "scaled_price_ils": scaled_price,
        })

    bundle_discount_ils = round(subtotal_ils * 0.10, 2)
    bundle_total_ils = round(subtotal_ils - bundle_discount_ils, 2)
    within_budget = bundle_total_ils <= float(budget_ceiling_ils)
    dest_label_he = scene.get("destination_label_he") or scene["destination"]
    fit_pct, _ = _compute_fit_metrics(
        scene=scene,
        bundle_total_ils=bundle_total_ils,
        within_budget=within_budget,
        budget_ceiling_ils=float(budget_ceiling_ils),
        shabbat_observant=False,
        max_flight_hours=8.0,
    )

    summary_he = (
        warning_he
        if needs_hint and warning_he
        else (
            f"זוהו {len(hotspots)} רכיבי טיול ב{dest_label_he} עם הנחת באנדל 10% "
            f"(חיסכון של ₪{bundle_discount_ils:,.0f}, סה\"כ ₪{bundle_total_ils:,.0f})."
        )
    )

    return {
        "scene_type": scene["scene_type"],
        "is_dynamic_detection": is_dynamic,
        "detection_source": detection_source,
        "needs_visual_hint": needs_hint,
        "detection_warning_he": warning_he,
        "landmark_detected_he": scene.get("landmark_detected_he"),
        "title_he": scene["title_he"],
        "vibe_title": scene["title_he"],
        "destination": scene["destination"],
        "destination_label_he": dest_label_he,
        "country": scene["country"],
        "iata_code": scene.get("iata_code", "TLV"),
        "flight_hours_from_tlv": float(scene.get("flight_hours_from_tlv", 4.5)),
        "shabbat_friendly_score": int(scene.get("shabbat_friendly_score", 88)),
        "image_url": resolved_image or scene.get("image_url"),
        "travelers": travelers,
        "budget_ceiling_ils": float(budget_ceiling_ils),
        "hotspots": hotspots,
        "subtotal_ils": round(subtotal_ils, 2),
        "standalone_total_ils": round(subtotal_ils, 2),
        "bundle_discount_pct": 10,
        "bundle_discount_ils": bundle_discount_ils,
        "discount_amount_ils": bundle_discount_ils,
        "bundle_total_ils": bundle_total_ils,
        "within_budget": within_budget,
        "fit_accuracy_pct": fit_pct,
        "summary_he": summary_he,
    }


def assess_trip_vision_fit(
    *,
    scene_type: Optional[str] = "SANTORINI_CLIFFSIDE",
    scene_key: Optional[str] = None,
    image_source_url: Optional[str] = None,
    image_url: Optional[str] = None,
    image_base64: Optional[str] = None,
    file_name: Optional[str] = None,
    custom_hint: Optional[str] = None,
    travelers: int = 2,
    budget_ceiling_ils: float = 8500.0,
    shabbat_observant: bool = False,
    max_flight_hours: float = 8.0,
) -> Dict[str, Any]:
    decomposed = decompose_travel_screenshot(
        scene_type=scene_type,
        scene_key=scene_key,
        image_source_url=image_source_url,
        image_url=image_url,
        image_base64=image_base64,
        file_name=file_name,
        custom_hint=custom_hint,
        travelers=travelers,
        budget_ceiling_ils=budget_ceiling_ils,
    )
    fit_pct, notes = _compute_fit_metrics(
        scene=decomposed,
        bundle_total_ils=decomposed["bundle_total_ils"],
        within_budget=decomposed["within_budget"],
        budget_ceiling_ils=float(budget_ceiling_ils),
        shabbat_observant=shabbat_observant,
        max_flight_hours=max_flight_hours,
    )
    return {
        "scene_type": decomposed["scene_type"],
        "destination": decomposed["destination"],
        "destination_label_he": decomposed.get("destination_label_he") or decomposed["destination"],
        "fit_accuracy_pct": fit_pct,
        "cancellation_risk_reduction_pct": round(min(42.0, fit_pct * 0.41), 1),
        "bundle_total_ils": decomposed["bundle_total_ils"],
        "notes_he": notes,
    }
