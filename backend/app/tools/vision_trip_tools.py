"""
Screenshot-to-Trip & Virtual Fit Assessment (`vision_lookbook_agent`).
Inspired by Daydream AI Screenshot-to-Shop & Google Shopping Vision Match:
decomposes travel inspiration screenshots into normalized bounding-box hotspots (x, y, w, h)
mapped to bookable travel components with a -10% Complete-the-Trip bundle discount.
"""
from typing import Any, Dict, List, Optional

LOOKBOOK_PRESETS: Dict[str, Dict[str, Any]] = {
    "SANTORINI_CLIFFSIDE": {
        "scene_type": "SANTORINI_CLIFFSIDE",
        "title_he": "שקיעה בקלדרה של אויה — חופשת בוטיק זוגית",
        "destination": "Santorini",
        "country": "יוון",
        "flight_hours_from_tlv": 2.25,
        "shabbat_friendly_score": 92,
        "image_url": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop",
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
        "country": "יפן",
        "flight_hours_from_tlv": 11.3,
        "shabbat_friendly_score": 85,
        "image_url": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
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
        "country": "שוויץ",
        "flight_hours_from_tlv": 4.4,
        "shabbat_friendly_score": 88,
        "image_url": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=1200&auto=format&fit=crop",
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
        "country": "איטליה",
        "flight_hours_from_tlv": 3.5,
        "shabbat_friendly_score": 94,
        "image_url": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1200&auto=format&fit=crop",
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
        "country": "אינדונזיה",
        "flight_hours_from_tlv": 13.5,
        "shabbat_friendly_score": 68,
        "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
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


def get_vision_presets() -> List[Dict[str, Any]]:
    return [
        {
            "scene_type": v["scene_type"],
            "title_he": v["title_he"],
            "destination": v["destination"],
            "country": v["country"],
            "image_url": v["image_url"],
            "hotspots_count": len(v["hotspots"]),
        }
        for v in LOOKBOOK_PRESETS.values()
    ]


def decompose_travel_screenshot(
    *,
    scene_type: str = "SANTORINI_CLIFFSIDE",
    image_source_url: Optional[str] = None,
    travelers: int = 2,
    budget_ceiling_ils: float = 8500.0,
) -> Dict[str, Any]:
    key = (scene_type or "SANTORINI_CLIFFSIDE").strip().upper()
    preset = LOOKBOOK_PRESETS.get(key, LOOKBOOK_PRESETS["SANTORINI_CLIFFSIDE"])

    scale = max(1.0, travelers / 2.0)
    hotspots: List[Dict[str, Any]] = []
    subtotal_ils = 0.0
    for hs in preset["hotspots"]:
        scaled_price = round(float(hs["price_ils"]) * (scale if hs["category"] == "FLIGHT" else (1.0 + 0.25 * max(0, travelers - 2))), 2)
        subtotal_ils += scaled_price
        hotspots.append({
            **hs,
            "scaled_price_ils": scaled_price,
        })

    bundle_discount_ils = round(subtotal_ils * 0.10, 2)
    bundle_total_ils = round(subtotal_ils - bundle_discount_ils, 2)
    within_budget = bundle_total_ils <= float(budget_ceiling_ils)

    return {
        "scene_type": preset["scene_type"],
        "title_he": preset["title_he"],
        "destination": preset["destination"],
        "country": preset["country"],
        "image_url": image_source_url or preset["image_url"],
        "travelers": travelers,
        "budget_ceiling_ils": float(budget_ceiling_ils),
        "hotspots": hotspots,
        "subtotal_ils": round(subtotal_ils, 2),
        "bundle_discount_pct": 10,
        "bundle_discount_ils": bundle_discount_ils,
        "bundle_total_ils": bundle_total_ils,
        "within_budget": within_budget,
        "summary_he": (
            f"זוהו {len(hotspots)} רכיבי טיול ב{preset['destination']} עם הנחת באנדל 10% "
            f"(חיסכון של ₪{bundle_discount_ils:,.0f}, סה\"כ ₪{bundle_total_ils:,.0f})."
        ),
    }


def assess_trip_vision_fit(
    *,
    scene_type: str = "SANTORINI_CLIFFSIDE",
    travelers: int = 2,
    budget_ceiling_ils: float = 8500.0,
    shabbat_observant: bool = False,
    max_flight_hours: float = 8.0,
) -> Dict[str, Any]:
    decomposed = decompose_travel_screenshot(
        scene_type=scene_type,
        travelers=travelers,
        budget_ceiling_ils=budget_ceiling_ils,
    )
    preset = LOOKBOOK_PRESETS.get((scene_type or "").upper(), LOOKBOOK_PRESETS["SANTORINI_CLIFFSIDE"])

    score = 94.0
    notes: List[str] = []
    if not decomposed["within_budget"]:
        over_pct = min(25.0, ((decomposed["bundle_total_ils"] - budget_ceiling_ils) / max(1.0, budget_ceiling_ils)) * 100.0)
        score -= over_pct
        notes.append(f"עלות הבאנדל (₪{decomposed['bundle_total_ils']:,.0f}) גבוהה מהתקרה ב-₪{decomposed['bundle_total_ils'] - budget_ceiling_ils:,.0f}.")
    else:
        notes.append("החבילה עומדת במלואה בתקציב שהוגדר כולל הנחת ה-10%.")

    if float(preset["flight_hours_from_tlv"]) > float(max_flight_hours):
        score -= 14.0
        notes.append(f"זמן הטיסה מנתב\"ג ({preset['flight_hours_from_tlv']} ש') ארוך מהעדפת ה-{max_flight_hours} שעות.")
    else:
        notes.append(f"זמן טיסה נוח מנתב\"ג ({preset['flight_hours_from_tlv']} שעות).")

    if shabbat_observant and preset["shabbat_friendly_score"] < 80:
        score -= 18.0
        notes.append("נדרשת התאמת כשרות ושבת מוגברת ביעד זה.")
    elif shabbat_observant:
        notes.append(f"התאמה גבוהה לשבת וכשרות ({preset['shabbat_friendly_score']}%).")

    fit_pct = int(max(45, min(99, round(score))))
    return {
        "scene_type": preset["scene_type"],
        "destination": preset["destination"],
        "fit_accuracy_pct": fit_pct,
        "cancellation_risk_reduction_pct": round(min(42.0, fit_pct * 0.41), 1),
        "bundle_total_ils": decomposed["bundle_total_ils"],
        "notes_he": notes,
    }
