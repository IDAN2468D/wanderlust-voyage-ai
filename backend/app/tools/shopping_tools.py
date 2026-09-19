import json
import logging
from typing import Dict, Any

logger = logging.getLogger("shopping_tools")

TAX_FREE_DATABASE: Dict[str, Dict[str, Any]] = {
    "איטליה": {
        "vat_standard_rate": 22.0,
        "min_spend_eur": 70.0,  # Italy lowered threshold in 2024 to 70 EUR!
        "typical_refund_percentage": 12.5,
        "kiosk_system": "Otello 2.0 (אישור דיגיטלי בשדה התעופה)",
        "refund_operators": ["Global Blue", "Planet Tax Free"],
        "shopping_districts": [
            "רומא: Via del Corso (רשתות מובילות), Via Condotti (מותגי יוקרה)",
            "מילאנו: Galleria Vittorio Emanuele II, Quadrilatero della Moda",
            "פירנצה: שוק העור San Lorenzo, Via de' Tornabuoni",
        ],
        "outlets": [
            "Castel Romano Designer Outlet (ליד רומא - שאטל מטרמיני)",
            "Serravalle Designer Outlet (ליד מילאנו)",
            "The Mall Luxury Outlets (טוסקנה - גוצ'י, פראדה במחירי מפעל)",
        ],
        "customs_instructions": "בקשו טופס Tax-Free במעמד הקנייה בחנות עם הצגת דרכון. בשדה התעופה סרקו את הברקוד בעמדות Otello לפני מסירת המזוודות.",
    },
    "צרפת": {
        "vat_standard_rate": 20.0,
        "min_spend_eur": 100.0,
        "typical_refund_percentage": 12.0,
        "kiosk_system": "PABLO (עמדות סריקה אלקטרוניות עצמאיות)",
        "refund_operators": ["Global Blue", "Planet Payment"],
        "shopping_districts": [
            "פריז: שדרות השאנז אליזה (Champs-Élysées)",
            "מרכז הקניות היוקרתי Galeries Lafayette ו-Printemps (בולוואר הוסמן)",
            "רובע המארה (Le Marais) - בוטיקים עצמאיים ומעצבים מקומיים",
        ],
        "outlets": [
            "La Vallée Village (35 דקות מפריז ליד דיסנילנד - 120 מותגי יוקרה בהנחות עד 60%)",
            "One Nation Paris Outlet",
        ],
        "customs_instructions": "בקשו טופס עם ברקוד PABLO. בשדה התעופה (CDG או אורלי), גשו למכונות PABLO וסרקו את הברקוד לקבלת חיווי ירוק מידי.",
    },
    "ספרד": {
        "vat_standard_rate": 21.0,
        "min_spend_eur": 0.0,  # Spain has NO minimum spend threshold!
        "typical_refund_percentage": 13.0,
        "kiosk_system": "DIVA (מערכת סריקה דיגיטלית ארצית)",
        "refund_operators": ["Global Blue", "Planet", "Innova Tax Free"],
        "shopping_districts": [
            "ברצלונה: Passeig de Gràcia (מותגי על ואופנה), Portal de l'Àngel",
            "מדריד: Gran Vía, Calle de Serrano (רובע סלמנקה היוקרתי)",
            "רשת בתי הכלבו El Corte Inglés",
        ],
        "outlets": [
            "La Roca Village (40 דקות מברצלונה - שאטל Shopping Express)",
            "Las Rozas Village (ליד מדריד)",
        ],
        "customs_instructions": "בספרד אין סכום מינימום! כל קנייה זכאית לטופס DIVA. סרקו את הטפסים בעמדות DIVA בשדה לפני הבידוק הביטחוני.",
    },
    "אנגליה": {
        "vat_standard_rate": 20.0,
        "min_spend_eur": 0.0,
        "typical_refund_percentage": 0.0,
        "kiosk_system": "שימו לב: בריטניה ביטלה את החזרי המע\"מ לתיירים (Tax-Free) בעקבות הברקזיט.",
        "refund_operators": [],
        "shopping_districts": [
            "Oxford Street & Regent Street (קניות מיינסטרים מובילות)",
            "בית הכלבו המלכותי Harrods ו-Selfridges",
            "Covent Garden (בוטיקים וקוסמטיקה)",
        ],
        "outlets": ["Bicester Village (שעה נסיעה מלונדון ברכבת מרילבון)"],
        "customs_instructions": "בבריטניה לא ניתן לקבל החזר מע\"מ מסורתי בשדה, אך מחירי האאוטלט ב-Bicester Village עדיין משתלמים במיוחד.",
    },
}


def get_shopping_and_tax_free(destination: str, estimated_shopping_budget_usd: float = 300.0) -> str:
    """
    Computes shopping districts, VAT refund eligibility, threshold calculations, and airport customs guidelines.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()
    budget = max(50.0, estimated_shopping_budget_usd)

    matched_country = None
    if any(city in dest_clean for city in ["רומא", "מילאנו", "פירנצה", "ונציה", "איטליה", "rome", "milan", "florence", "italy"]):
        matched_country = "איטליה"
    elif any(city in dest_clean for city in ["פריז", "ניס", "צרפת", "ליון", "paris", "nice", "france"]):
        matched_country = "צרפת"
    elif any(city in dest_clean for city in ["ברצלונה", "מדריד", "ולנסיה", "ספרד", "barcelona", "madrid", "spain"]):
        matched_country = "ספרד"
    elif any(city in dest_clean for city in ["לונדון", "אנגליה", "בריטניה", "london", "uk", "england"]):
        matched_country = "אנגליה"

    if matched_country:
        country_info = TAX_FREE_DATABASE[matched_country]
        refund_pct = country_info["typical_refund_percentage"]
        est_refund_usd = round(budget * (refund_pct / 100.0), 2)
        est_refund_ils = round(est_refund_usd * 3.65, 0)

        result = {
            "destination": dest_clean,
            "country": matched_country,
            "vat_rate": f"{country_info['vat_standard_rate']}%",
            "min_spend_per_receipt": f"€{country_info['min_spend_eur']:.2f}",
            "refund_rate_effective": f"{refund_pct}%",
            "projected_shopping_budget_usd": budget,
            "projected_vat_refund_usd": est_refund_usd,
            "projected_vat_refund_ils": est_refund_ils,
            "kiosk_system": country_info["kiosk_system"],
            "refund_operators": country_info["refund_operators"],
            "shopping_districts": country_info["shopping_districts"],
            "outlets": country_info["outlets"],
            "customs_instructions": country_info["customs_instructions"],
            "key_rules": [
                "הצטיידו תמיד בדרכון פיזי (או צילום איכותי) בעת ביצוע הרכישה בחנות.",
                "אל תפתחו את אריזות הפריטים ואל תתלשו טיקטים עד לאחר אימות המכס בשדה התעופה.",
                "הגיעו לשדה התעופה 45 דקות מוקדם יותר במידה ויש לכם מספר טפסי החזר להחתמה.",
            ],
            "is_curated": True,
        }
    else:
        # Standard generic European/Global model
        vat_pct = 19.0
        refund_pct = 11.0
        est_refund_usd = round(budget * (refund_pct / 100.0), 2)
        est_refund_ils = round(est_refund_usd * 3.65, 0)

        result = {
            "destination": dest_clean,
            "country": dest_clean,
            "vat_rate": f"{vat_pct}%",
            "min_spend_per_receipt": "בדיקה לפי מדינת היעד (לרוב בין €50 ל-€120 לחשבונית)",
            "refund_rate_effective": f"{refund_pct}%",
            "projected_shopping_budget_usd": budget,
            "projected_vat_refund_usd": est_refund_usd,
            "projected_vat_refund_ils": est_refund_ils,
            "kiosk_system": f"דלפקי המכס הבינלאומי בשדה התעופה של {dest_clean}",
            "refund_operators": ["Global Blue", "Planet"],
            "shopping_districts": [
                f"שדרת הקניות המרכזית במרכז {dest_clean}",
                f"קניון מרכזי ומרכזי אופנה מקומיים ב{dest_clean}",
                "שווקי וינטג' ושווקי רחוב בסופי שבוע",
            ],
            "outlets": [f"מתחם אאוטלט מחוץ ל{dest_clean} (בדיקת שאטלים מהמרכז)"],
            "customs_instructions": f"בקשו טופס Tax-Free בכל קנייה גדולה מעל סף המינימום, והחתימו את הקבלות בעמדות המכס של שדה התעופה ב{dest_clean}.",
            "key_rules": [
                "הצגת דרכון בחנות היא תנאי להפקת טופס פטור ממס.",
                "שמרו את הקבלות המקוריות בצמוד לטפסים בתוך מעטפה ייעודית.",
                "ניתן לקבל את ההחזר במזומן (בניכוי עמלה קטנה) או ישירות לכרטיס האשראי תוך 5 ימי עסקים.",
            ],
            "is_curated": False,
        }

    return json.dumps(result, ensure_ascii=False)
