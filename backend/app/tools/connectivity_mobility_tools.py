"""
Connectivity (eSIM vs Israeli Roaming) & Road-Trip Mobility Specialist (`connectivity_mobility_agent`).
"""
import json
from typing import Any, Dict, List


_DRIVING_RULES: Dict[str, Dict[str, Any]] = {
    "italy": {
        "idp_required": True,
        "ztl_lez_warning": "אזורי ZTL במרכז רומא, פירנצה ומילאנו — מצלמות קנס אוטומטיות (€80-€330 לדו\"ח). יש לחנות מחוץ לקו הירוק/אדום.",
        "vignette_tolls": "תשלום בכבישי אגרה (Autostrade) בנתיבי Telepass/כרטיס אשראי.",
    },
    "france": {
        "idp_required": True,
        "ztl_lez_warning": "מדבקת Crit'Air חובה בפריז, ליון וניס באזורי ZFE — יש לוודא מול חברת ההשכרה שהמדבקה מודבקת על השמשה.",
        "vignette_tolls": "כבישי אגרה (Péage) צרפתיים — הצטיידו בכרטיס אשראי פיזי ללא קוד בעייתי.",
    },
    "switzerland": {
        "idp_required": True,
        "ztl_lez_warning": "מרכזי הערים צפופים; מומלץ להחנות בחניוני Park+Ride ולהיכנס ברכבת.",
        "vignette_tolls": "מדבקת אוטוסטרדה שנתית (Vignette CHF 40) חובה בכניסה לשווייץ (ברכב המושכר בשווייץ לרוב כלולה).",
    },
    "uk": {
        "idp_required": False,
        "ztl_lez_warning": "אגרת גודש (Congestion Charge £15) ואזור ULEZ בלונדון + נהיגה בצד שמאל!",
        "vignette_tolls": "ללא מדבקה ארצית; תשלום מקוון במעבר Dartford Crossing.",
    },
    "japan": {
        "idp_required": True,
        "ztl_lez_warning": "חובה להנפיק רישיון נהיגה בינלאומי (IDP לפי אמנת 1949) בארץ טרם הטיסה — רישיון ישראלי רגיל לא תקף!",
        "vignette_tolls": "שכרו כרטיס ETC אוטומטי לרכב לכבישי האגרה המהירים.",
    },
}


def get_connectivity_and_mobility_guide(
    destination: str,
    duration_days: int = 7,
    travelers: int = 2,
    travel_style: str = "balanced",
) -> str:
    """Compute eSIM vs Israeli roaming recommendation and car-rental/driving compliance."""
    recommended_gb = max(5, duration_days * (2 if travel_style == "luxury" else 1) + 3)
    esim_cost_usd = round(min(38.0, 6.5 + (recommended_gb * 1.15)), 2)
    israeli_roaming_est_usd = round(max(45.0, duration_days * 8.5), 2)
    savings_usd = round(max(0.0, israeli_roaming_est_usd - esim_cost_usd), 2)

    dest_lower = destination.lower()
    driving = None
    for key, rules in _DRIVING_RULES.items():
        if key in dest_lower or (key == "italy" and "rome" in dest_lower) or (key == "france" and "paris" in dest_lower) or (key == "uk" and "london" in dest_lower) or (key == "japan" and "tokyo" in dest_lower) or (key == "switzerland" and "zurich" in dest_lower):
            driving = rules
            break
    if not driving:
        driving = {
            "idp_required": True,
            "ztl_lez_warning": "בדקו הגבלות כניסה למרכזי ערים עתיקות ומצלמות חניה.",
            "vignette_tolls": "בררו על כבישי אגרה מקומיים והגבלת קילומטראז' בחוזה ההשכרה.",
        }

    return json.dumps({
        "destination": destination,
        "esim_recommendation": {
            "recommended_data_gb": recommended_gb,
            "provider_options": ["Airalo", "Holafly Unlimited", "eSIM.sm"],
            "estimated_esim_usd": esim_cost_usd,
            "estimated_il_roaming_usd": israeli_roaming_est_usd,
            "estimated_savings_usd": savings_usd,
            "setup_checklist": [
                "התקינו את ה-eSIM יום לפני ההמראה על גבי Wi-Fi (הפעילו Data Roaming על קו ה-eSIM בלבד בנחיתה).",
                "השאירו את הסים הישראלי פעיל לקבלת SMS אימות מהבנק/כרטיס אשראי (ללא גלישה).",
            ],
        },
        "car_rental_compliance": {
            "idp_required": driving["idp_required"],
            "idp_note": "מומלץ להנפיק רישיון בינלאומי בממס\"י / אופטיקה מורשית בישראל (כ-₪20) לפני הטיסה." if driving["idp_required"] else "רישיון ישראלי פלסטיק בתוקף מספיק, אך מומלץ לגבות ב-IDP.",
            "ztl_lez_warning": driving["ztl_lez_warning"],
            "vignette_tolls": driving["vignette_tolls"],
            "rental_traps_guard": [
                "ודאו מדיניות דלק Full-to-Full וצלמו וידאו היקפי של הרכב בקבלה.",
                "בדקו ביטול השתתפות עצמית (Super CDW / ביטוח חיצוני) וכרטיס אשראי בינלאומי על שם הנהג הראשי לפיקדון.",
            ],
        },
    }, ensure_ascii=False)
