import json
import random
from typing import Dict, Any, List, Optional
from datetime import datetime


def get_destination_weather(
    destination: str,
    start_date: str,
    duration_days: int = 7,
) -> str:
    """
    Retrieves weather forecast, climate metrics, and plug type data for a destination.

    Args:
        destination (str): Target destination city/region (e.g., 'באלי', 'Bali', 'Santorini').
        start_date (str): Trip start date (YYYY-MM-DD).
        duration_days (int): Length of the trip.

    Returns:
        str: JSON formatted string containing climate metrics, temperatures, rain probability,
             and electrical plug information.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()

    # Determine travel month
    month = 7
    try:
        dt = datetime.strptime(start_date, "%Y-%m-%d")
        month = dt.month
    except Exception:
        pass

    # Destination climate database
    climate_profiles: Dict[str, Dict[str, Any]] = {
        "bali": {
            "temp_high": 31,
            "temp_low": 24,
            "condition": "טרופי נעים עם שמש חמימה",
            "rain_chance": 25 if month in [11, 12, 1, 2, 3] else 10,
            "humidity": "75%",
            "uv_index": 10,
            "plug_type": "Type C / F (230V, 50Hz - מתאים לתקע ישראלי דו-פיני)",
            "clothing_tip": "בגדי קיץ קלים מכותנה/פשתן, בגד ים, שכבה קלה לערב בג'ונגלים באובוד וקרם הגנה חזק.",
        },
        "santorini": {
            "temp_high": 29 if month in [6, 7, 8, 9] else 20,
            "temp_low": 21 if month in [6, 7, 8, 9] else 14,
            "condition": "שמשי ים-תיכוני עם בריזה מהים האגאי",
            "rain_chance": 5,
            "humidity": "55%",
            "uv_index": 8,
            "plug_type": "Type C / F (230V - מתאים לתקע ישראלי דו-פיני)",
            "clothing_tip": "בגדים קלילים, כובע רחב שוליים, משקפי שמש, ונעלי הליכה נוחות למדרגות האבן באויה ובפירה.",
        },
        "maldives": {
            "temp_high": 31,
            "temp_low": 26,
            "condition": "שמש טרופית ומים צלולים",
            "rain_chance": 20,
            "humidity": "78%",
            "uv_index": 11,
            "plug_type": "Type G (בריטי 3 פינים, מומלץ מתאם אוניברסלי)",
            "clothing_tip": "בגדי ים, ביגוד חוף קל, חולצת לייקרה להגנה בשנורקלינג וכפכפי מים.",
        },
        "swiss_alps": {
            "temp_high": 22 if month in [6, 7, 8] else (2 if month in [12, 1, 2] else 12),
            "temp_low": 11 if month in [6, 7, 8] else (-6 if month in [12, 1, 2] else 3),
            "condition": "אוויר הרים צלול וקריר",
            "rain_chance": 30,
            "humidity": "60%",
            "uv_index": 6,
            "plug_type": "Type J (שוויצרי 3 פינים - נדרש מתאם)",
            "clothing_tip": "שיטת השכבות (בצל): מעיל עמיד לרוח ומים, פליז חם, נעלי הליכה הרריות ומשקפי שמש.",
        },
        "paris": {
            "temp_high": 25 if month in [6, 7, 8] else 13,
            "temp_low": 16 if month in [6, 7, 8] else 6,
            "condition": "אביבי מעונן חלקית עם שמש נעימה",
            "rain_chance": 20,
            "humidity": "65%",
            "uv_index": 5,
            "plug_type": "Type E / C (230V - מתאים לתקע ישראלי דו-פיני)",
            "clothing_tip": "אלגנט-קז'ואל, ז'קט נוח לערב, מטרייה קומפקטית ונעליים מעולות להליכה בעיר.",
        },
        "rome": {
            "temp_high": 28 if month in [6, 7, 8, 9] else 16,
            "temp_low": 18 if month in [6, 7, 8, 9] else 8,
            "condition": "שמש איטלקית בהירה וחמימה",
            "rain_chance": 12,
            "humidity": "58%",
            "uv_index": 7,
            "plug_type": "Type L / C (230V - מתאים לתקע ישראלי דו-פיני)",
            "clothing_tip": "בגדים קלילים ונושמים, צעיף או שאל לכיסוי כתפיים בכנסיות ובמקדש הפנתיאון, ונעלי הליכה.",
        },
        "tokyo": {
            "temp_high": 27 if month in [6, 7, 8, 9] else 15,
            "temp_low": 19 if month in [6, 7, 8, 9] else 7,
            "condition": "מזג אוויר נוח עם לחות מתונה",
            "rain_chance": 25,
            "humidity": "68%",
            "uv_index": 6,
            "plug_type": "Type A / B (100V אמריקאי שטוח - חובה מתאם)",
            "clothing_tip": "נעליים שנוח לחלוץ במהירות בכניסה למקדשים ומסעדות מסורתיות, שכבות נוחות ומטען נייד.",
        },
    }

    # Match or generate fallback
    profile = None
    for key, data in climate_profiles.items():
        if key in dest_lower or (key == "swiss_alps" and ("אלפים" in dest_clean or "שוויץ" in dest_clean or "swiss" in dest_lower)):
            profile = data
            break

    if not profile:
        # Fallback profile based on destination name hash
        seed = sum(ord(c) for c in dest_clean)
        rng = random.Random(seed)
        t_high = rng.randint(22, 30)
        profile = {
            "temp_high": t_high,
            "temp_low": t_high - rng.randint(6, 10),
            "condition": "נעים ומזמין לטיולים וסיורים",
            "rain_chance": rng.randint(10, 25),
            "humidity": f"{rng.randint(50, 70)}%",
            "uv_index": rng.randint(5, 8),
            "plug_type": "Type C / Europlug (230V - מומלץ מתאם בינלאומי ליתר ביטחון)",
            "clothing_tip": "ביגוד קל ונוח בשכבות, נעלי הליכה איכותיות, משקפי שמש ועליונית קלה לשעות הערב.",
        }

    return json.dumps({
        "destination": dest_clean,
        "start_date": start_date,
        "duration_days": duration_days,
        "metrics": profile,
    }, ensure_ascii=False, indent=2)


def generate_packing_checklist(
    destination: str,
    travel_style: str = "balanced",
    interests: Optional[List[str]] = None,
    weather_data: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generates a personalized, interactive packing checklist divided into categories.

    Returns:
        str: JSON formatted string containing categorized packing items with checklist items.
    """
    interests_str = " ".join(interests or []).lower()
    is_beach = "חוף" in interests_str or "ים" in interests_str or "רוגע" in interests_str or "beach" in interests_str
    is_nature = "טבע" in interests_str or "נוף" in interests_str or "הר" in interests_str or "nature" in interests_str

    categories = [
        {
            "category": "📄 מסמכים וכרטיסים חיוניים",
            "items": [
                {"id": "doc_1", "name": "דרכון בתוקף (לפחות 6 חודשים קדימה)", "checked": True, "critical": True},
                {"id": "doc_2", "name": "כרטיסי טיסה ושובר מלון מודפסים/בנייד", "checked": True, "critical": True},
                {"id": "doc_3", "name": "ביטוח נסיעות לחו\"ל כולל כיסוי ספורט אתגרי ורפואי", "checked": True, "critical": True},
                {"id": "doc_4", "name": "כרטיס אשראי בינלאומי ומעט מזומן מקומי ראשוני", "checked": False, "critical": False},
                {"id": "doc_5", "name": "רישיון נהיגה בינלאומי (אם מתכננים השכרת רכב)", "checked": False, "critical": False},
            ],
        },
        {
            "category": "👕 ביגוד והנעלה מותאמים",
            "items": [
                {"id": "cloth_1", "name": "חולצות קלות מנדפות זיעה ובדי כותנה נוחים", "checked": False, "critical": False},
                {"id": "cloth_2", "name": "מכנסיים קלים / שמלות / ברמודות לטיולים ביום", "checked": False, "critical": False},
                {"id": "cloth_3", "name": "נעלי הליכה נוחות שנבדקו מראש (לא חדשות מהקופסה)", "checked": False, "critical": True},
                {"id": "cloth_4", "name": "עליונית קלה / סוודר דק לשעות הערב או מזגנים", "checked": False, "critical": False},
                {"id": "cloth_5", "name": "ביגוד ערב אלגנטי למסעדות שף וברים", "checked": False, "critical": False},
            ],
        },
        {
            "category": "🔌 טכנולוגיה וגאדג'טים",
            "items": [
                {"id": "tech_1", "name": "מתאם חשמל בינלאומי אוניברסלי", "checked": False, "critical": True},
                {"id": "tech_2", "name": "סוללת גיבוי ניידת (Power Bank) חזקה", "checked": False, "critical": True},
                {"id": "tech_3", "name": "חבילת eSIM דיגיטלית או סים מקומי פעיל", "checked": False, "critical": True},
                {"id": "tech_4", "name": "כבל טעינה ארוך ואוזניות עם סינון רעשים לטיסה", "checked": False, "critical": False},
            ],
        },
        {
            "category": "💊 בריאות, טיפוח ועזרה ראשונה",
            "items": [
                {"id": "health_1", "name": "קרם הגנה מהשמש (SPF 50) ושפתון לחות", "checked": False, "critical": True},
                {"id": "health_2", "name": "תכשיר דוחה יתושים וחרקים טרופי", "checked": False, "critical": True},
                {"id": "health_3", "name": "ערכת עזרה ראשונה אישית: משככי כאבים, כדורי בחילה ופלסטרים", "checked": False, "critical": False},
                {"id": "health_4", "name": "תרופות קבועות במרשם בתיק העלייה למטוס", "checked": False, "critical": True},
            ],
        },
    ]

    # Dynamic activity extras
    if is_beach:
        categories.append({
            "category": "🏖️ ציוד חוף ורוגע מיוחד",
            "items": [
                {"id": "beach_1", "name": "2 בגדי ים לפחות ומגבת מיקרופייבר מהירת ייבוש", "checked": False, "critical": False},
                {"id": "beach_2", "name": "שקית אטומה למים לטלפון הנייד (Waterproof Pouch)", "checked": False, "critical": False},
                {"id": "beach_3", "name": "משקפת שנורקלינג וכובע שמש רחב", "checked": False, "critical": False},
            ],
        })

    if is_nature:
        categories.append({
            "category": "🌲 ציוד טיולים ושטח",
            "items": [
                {"id": "nature_1", "name": "תרמיל יום קל ונוח (20-25 ליטר)", "checked": False, "critical": False},
                {"id": "nature_2", "name": "בקבוק מים רב-פעמי מבודד לשמירה על קור", "checked": False, "critical": False},
                {"id": "nature_3", "name": "גרבי טיולים מנדפות למניעת שפשופים", "checked": False, "critical": False},
            ],
        })

    return json.dumps({
        "destination": destination,
        "categories": categories,
    }, ensure_ascii=False, indent=2)
