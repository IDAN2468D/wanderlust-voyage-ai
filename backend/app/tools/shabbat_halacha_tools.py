"""
Shabbat, Kosher Logistics & Halacha Specialist (`shabbat_halacha_agent`).
Computes destination candle-lighting/Havdalah windows, Friday 14:00 cutoff,
and Shabbat-compliant lodging & Chabad walking radius.
"""
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List


_CITY_SHABBAT_DATA: Dict[str, Dict[str, Any]] = {
    "rome": {
        "candle_lighting": "17:45",
        "havdalah": "18:48",
        "eruv_status": "אין עירוב עירוני מלא — אין לטלטל בשבת",
        "chabad_area": "הגטו היהודי (Portico d'Ottavia)",
        "walk_minutes_from_center": 14,
        "shabbat_hotel_tips": "בקשו מפתח מכני בקבלה מראש (במלונות הבוטיק בגטו מכירים היטב).",
    },
    "paris": {
        "candle_lighting": "18:10",
        "havdalah": "19:15",
        "eruv_status": "אין עירוב חיצוני בפריז — יש להיערך ללא טלטול",
        "chabad_area": "רובע המארה (Le Marais, Rue des Rosiers)",
        "walk_minutes_from_center": 12,
        "shabbat_hotel_tips": "מלונות באזור Le Marais / רובע 9 מציעים מפתחות מכניים ומדרגות נוחות.",
    },
    "london": {
        "candle_lighting": "17:55",
        "havdalah": "19:02",
        "eruv_status": "קיים עירוב בצפון-מערב לונדון (Golders Green / Hendon) — לא במרכז West End",
        "chabad_area": "Bloomsbury / Golders Green",
        "walk_minutes_from_center": 18,
        "shabbat_hotel_tips": "ב-Golders Green פועלים מלונות שומרי שבת עם שעוני שבת ומעלית שבת.",
    },
    "athens": {
        "candle_lighting": "18:20",
        "havdalah": "19:20",
        "eruv_status": "אין עירוב עירוני באתונה",
        "chabad_area": "בית חב\"ד אתונה (רחוב איסופו 10, פסירי)",
        "walk_minutes_from_center": 9,
        "shabbat_hotel_tips": "מלונות בפלאקה/מונסטיראקי נמצאים 6-10 דקות הליכה מבית חב\"ד.",
    },
    "new york": {
        "candle_lighting": "17:35",
        "havdalah": "18:36",
        "eruv_status": "קיים עירוב במנהטן (יש לוודא בדיקה שבועית באתר Manhattan Eruv)",
        "chabad_area": "Upper West Side / Midtown / Crown Heights",
        "walk_minutes_from_center": 10,
        "shabbat_hotel_tips": "רוב המלונות הגדולים במנהטן מאפשרים מפתח מכני או ליווי שומר לפתיחת דלת.",
    },
}


def get_shabbat_halacha_schedule(
    destination: str,
    start_date: str,
    duration_days: int = 7,
    shabbat_safe_mode: bool = False,
) -> str:
    """Build Shabbat candle-lighting schedule, Friday 14:00 cutoff, and lodging halacha checklist."""
    dest_lower = destination.lower()
    city_info = None
    for key, val in _CITY_SHABBAT_DATA.items():
        if key in dest_lower:
            city_info = val
            break
    if not city_info:
        city_info = {
            "candle_lighting": "18:05",
            "havdalah": "19:08",
            "eruv_status": "מומלץ לברר מקומית מול בית חב\"ד ביעד לגבי עירוב.",
            "chabad_area": f"מרכז בית חב\"ד {destination}",
            "walk_minutes_from_center": 15,
            "shabbat_hotel_tips": "בקשו קומה נמוכה (1-2) ומפתח מכני רגיל בעת הצ'ק-אין.",
        }

    shabbat_days: List[Dict[str, Any]] = []
    try:
        dt_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        for offset in range(duration_days):
            cur = dt_start + timedelta(days=offset)
            if cur.weekday() == 4:  # Friday
                shabbat_days.append({
                    "day_number": offset + 1,
                    "date_formatted": cur.strftime("%d/%m/%Y"),
                    "day_name": "ערב שבת (יום שישי)",
                    "cutoff_time": "14:00",
                    "candle_lighting": city_info["candle_lighting"],
                    "note": "סיום נסיעות וקניות עד 14:00 והתארגנות לשבת.",
                })
            elif cur.weekday() == 5:  # Saturday
                shabbat_days.append({
                    "day_number": offset + 1,
                    "date_formatted": cur.strftime("%d/%m/%Y"),
                    "day_name": "שבת קודש",
                    "havdalah": city_info["havdalah"],
                    "note": "פעילות הליכה רגלית ללא תשלום / כרטיסי כניסה; יציאה ברגל לבית חב\"ד.",
                })
    except Exception:
        pass

    return json.dumps({
        "destination": destination,
        "shabbat_safe_mode": shabbat_safe_mode,
        "candle_lighting_estimate": city_info["candle_lighting"],
        "havdalah_estimate": city_info["havdalah"],
        "friday_cutoff": "14:00",
        "eruv_status": city_info["eruv_status"],
        "chabad_hub": city_info["chabad_area"],
        "walk_minutes_to_chabad": city_info["walk_minutes_from_center"],
        "hotel_halacha_checklist": [
            city_info["shabbat_hotel_tips"],
            "וידוא קומה 1–2 (או מעלית שבת) והימנעות מחיישני תאורה אוטומטיים במסדרון.",
            "הזמנת ארוחות שבת מראש באתר בית חב\"ד המקומי.",
        ],
        "affected_shabbat_days": shabbat_days,
    }, ensure_ascii=False)
