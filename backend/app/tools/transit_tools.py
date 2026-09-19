import json
import logging
from typing import Dict, Any

logger = logging.getLogger("transit_tools")

CITY_TRANSIT_DATABASE: Dict[str, Dict[str, Any]] = {
    "רומא": {
        "pass_name": "Roma 72H Pass / כרטיס יומי ATAC",
        "pass_cost_eur": 18.0,
        "pass_cost_usd": 19.5,
        "airport_transfer": "רכבת לאונרדו אקספרס (Leonardo Express) משדה פיומיצ'ינו לתחנת טרמיני - 32 דקות (14€)",
        "main_lines": ["מטרו קו A (כתום - ותיקן/ספרדיים)", "מטרו קו B (כחול - קולוסיאום)", "טראם קו 8"],
        "walking_score": 9,
        "transit_apps": ["Citymapper", "Google Maps", "Moovit"],
        "tips": "כרטיסי המטרו תקפים ל-100 דקות מראש וכוללים מעברים. רומא מדהימה להליכה רגלית בסמטאות המרכז.",
    },
    "פריז": {
        "pass_name": "Navigo Easy / Navigo Découverte",
        "pass_cost_eur": 30.0,
        "pass_cost_usd": 32.5,
        "airport_transfer": "רכבת RER B מ-CDG למרכז פריז (35 דקות, 11.80€) או RoissyBus לאופרה",
        "main_lines": ["מטרו קו 1 (אוטומטי - הלובר, שאנז אליזה)", "מטרו קו 4", "RER C (לאייפל ולוורסאי)"],
        "walking_score": 9,
        "transit_apps": ["Île-de-France Mobilités", "Citymapper", "Google Maps"],
        "tips": "מערכת המטרו בפריז מכסה כל פינה ברדיוס 300 מטר. שימו לב לכיוון הרציף הסופי (Terminus).",
    },
    "לונדון": {
        "pass_name": "Oyster Card / Contactless Pay-as-you-go",
        "pass_cost_eur": 35.0,
        "pass_cost_usd": 40.0,
        "airport_transfer": "Elizabeth Line או Heathrow Express מנמל התעופה הית'רו ל-Paddington",
        "main_lines": ["Piccadilly Line (הית'רו למרכז)", "Central Line", "Jubilee Line", "Elizabeth Line המהיר"],
        "walking_score": 8,
        "transit_apps": ["TfL Go", "Citymapper", "Google Maps"],
        "tips": "אין צורך לקנות כרטיסים פיזיים – פשוט סרקו כרטיס אשראי contactless או Apple/Google Pay בעלייה ובירידה.",
    },
    "ברצלונה": {
        "pass_name": "Hola Barcelona Travel Card / T-Casual Card",
        "pass_cost_eur": 24.0,
        "pass_cost_usd": 26.0,
        "airport_transfer": "Aerobús משדה אל פראט לפלאזה קטלוניה (35 דקות, 6.75€) או מטרו L9 Sud",
        "main_lines": ["L3 (ירוק - פלאזה קטלוניה וראמבלס)", "L4 (צהוב - החופים ובארסלוscenario)", "L5 (כחול - סגרדה פמיליה)"],
        "walking_score": 9,
        "transit_apps": ["TMB App", "Citymapper", "Google Maps"],
        "tips": "ברצלונה מרושתת בשבילי אופניים ובשדרות הליכה נוחות. הליכה בין רובע הגותי לאישאמפלה מהנה וקלה.",
    },
    "טוקיו": {
        "pass_name": "Welcome Suica / Pasmo Passport / Tokyo Subway 72-hr Ticket",
        "pass_cost_eur": 18.0,
        "pass_cost_usd": 20.0,
        "airport_transfer": "Narita Express (N'EX) או Skyliner מנריטה; מונו-רייל מהנדה",
        "main_lines": ["JR Yamanote Line (קו מעגלי המקשר את כל רובעי העיר)", "Tokyo Metro Ginza Line", "Marunouchi Line"],
        "walking_score": 9,
        "transit_apps": ["Japan Travel by NAVITIME", "Google Maps"],
        "tips": "הוסיפו כרטיס Suica דיגיטלי ל-Apple Wallet / Google Wallet. הרכבות מדייקות על השנייה, הימנעו משיחות טלפון בקרונות.",
    },
    "ניו יורק": {
        "pass_name": "OMNY Contactless Fare Cap (12 נסיעות ומעלה חינם בשבוע)",
        "pass_cost_eur": 34.0,
        "pass_cost_usd": 34.0,
        "airport_transfer": "JFK AirTrain + Subway קו E או LIRR למנהטן (35-50 דקות)",
        "main_lines": ["קווי 1, 2, 3 (הצד המערבי)", "קווי 4, 5, 6 (הצד המזרחי)", "קווים N, Q, R, W (ברודוויי)"],
        "walking_score": 9,
        "transit_apps": ["MTA OMNY", "Citymapper", "Google Maps"],
        "tips": "מערכת ה-OMNY מאפשרת להצמיד ישירות טלפון או כרטיס אשראי. המטרו פועל 24 שעות ביממה.",
    },
}


def get_transit_guide(destination: str, duration_days: int = 7) -> str:
    """
    Computes public transit recommendations, airport connection, daily pass, and navigation advice.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()
    days = max(1, duration_days)

    matched_key = None
    for key in CITY_TRANSIT_DATABASE:
        if key in dest_clean or dest_lower in key.lower():
            matched_key = key
            break

    if matched_key:
        city_info = CITY_TRANSIT_DATABASE[matched_key]
        daily_cost = city_info["pass_cost_usd"] / 3.0
        total_transit_cost = round(daily_cost * days, 2)

        result = {
            "destination": dest_clean,
            "pass_name": city_info["pass_name"],
            "estimated_daily_cost_usd": round(daily_cost, 2),
            "total_transit_cost_usd": total_transit_cost,
            "airport_transfer": city_info["airport_transfer"],
            "main_transit_lines": city_info["main_lines"],
            "walking_score": city_info["walking_score"],
            "recommended_apps": city_info["transit_apps"],
            "local_transit_tip": city_info["tips"],
            "is_curated": True,
        }
    else:
        # Dynamic generic model
        daily_cost = 8.5
        total_transit_cost = round(daily_cost * days, 2)
        result = {
            "destination": dest_clean,
            "pass_name": f"כרטיס נסיעות יומי / שבועי מקומי ({dest_clean} City Transit Card)",
            "estimated_daily_cost_usd": daily_cost,
            "total_transit_cost_usd": total_transit_cost,
            "airport_transfer": f"רכבת אקספרס או שאטל מרכזי מנמל התעופה למרכז {dest_clean} (משך משוער: 30-45 דקות)",
            "main_transit_lines": [
                f"רשת המטרו/רכבת קלה של {dest_clean}",
                "קווי אוטובוס תיירותיים ומרכזיים",
                "שבילי הליכה נגישים במרכז ההיסטורי",
            ],
            "walking_score": 8,
            "recommended_apps": ["Google Maps", "Moovit", "Citymapper"],
            "local_transit_tip": f"במרכז {dest_clean} מרבית האטרקציות נגישות ברגל או בנסיעת מטרו קצרה. מומלץ להצטייד באפליקציית ניווט עם מפות Offline.",
            "is_curated": False,
        }

    return json.dumps(result, ensure_ascii=False)
