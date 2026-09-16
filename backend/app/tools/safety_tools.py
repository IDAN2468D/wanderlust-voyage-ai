import json
from typing import Dict, Any


def get_safety_and_visa_info(
    destination: str,
    nationality: str = "IL",
) -> str:
    """
    Provides comprehensive safety guidelines, visa policies, emergency numbers,
    and cultural etiquette advice for a destination.

    Args:
        destination (str): City or country name.
        nationality (str): Traveler country code (default 'IL' for Israel).

    Returns:
        str: JSON formatted string containing visa requirements, emergency contacts,
             health recommendations, and safety tips.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()

    # Database of destination safety and travel advisory information
    advisories: Dict[str, Dict[str, Any]] = {
        "bali": {
            "country_name": "אינדונזיה (באלי)",
            "visa_requirement": "ויזה אלקטרונית בעת ההגעה (e-VOA) או הזמנה מראש באינטרנט (כ-$35 לחודש). חובה תוקף דרכון של 6 חודשים וכרטיס יציאה.",
            "safety_level": "בטוח ומסביר פנים לתיירים. שיעור פשיעה אלים אפסי.",
            "emergency_numbers": {
                "police": "110",
                "ambulance": "118 / 112",
                "tourist_police": "+62 361 224111",
                "embassy_contact": "שגרירות ישראל בסינגפור/בנגקוק (סיוע אזורי): +65 6834 9200",
            },
            "health_advice": "שתיית מים מינרליים מבקבוקים סגורים בלבד (להימנע ממי ברז). להשתמש בתכשיר נגד יתושים וקרם הגנה.",
            "scam_alerts": [
                "להחליף כסף אך ורק בצ'יינג'ים מורשים (Authorized Money Changer עם שלט ירוק) ולא בסמטאות.",
                "בנסיעות מוניות, להשתמש אך ורק באפליקציות Grab או Gojek, או מוניות Bluebird רשמיות.",
            ],
            "cultural_etiquette": [
                "בביקור במקדשים (כמו אולוואטו או טירתה אמפול) חובה לחגור סארונג (כיסוי רגליים מסורתי הניתן במקום).",
                "לא לדרוך על מנחות הפרחים הקטנות (Canang Sari) הפזורות על המדרכות.",
            ],
        },
        "santorini": {
            "country_name": "יוון (סנטוריני)",
            "visa_requirement": "פטור מלא מוויזה לאזרחים ישראלים לתיירות של עד 90 יום (חלק מאמנת שנגן). חובה תוקף דרכון של 3 חודשים לפחות ממועד העזיבה.",
            "safety_level": "בטוח ביותר. אחד האיים השלווים והבטוחים באירופה.",
            "emergency_numbers": {
                "police": "100 / 112",
                "ambulance": "166 / 112",
                "tourist_police": "+30 22860 22649",
                "embassy_contact": "שגרירות ישראל באתונה: +30 210 670 5155",
            },
            "health_advice": "מי הברז בסנטוריני אינם מתאימים לשתייה עקב התפלה מקומית — מומלץ לשתות מים מינרליים מבקבוקים.",
            "scam_alerts": [
                "יש לוודא מחירים בתפריט במסעדות על שפת הצוק (Caldera) לפני ההזמנה.",
                "היזהרו מרכיבה על חמורים במדרגות פירה — מומלץ להשתמש ברכבל המודרני (Cable Car).",
            ],
            "cultural_etiquette": [
                "אין לטפס על כיפות הכנסיות הכחולות או גגות פרטיים לצורך צילום סלפי — זהו חילול מקום קדוש.",
                "נהוג להשאיר טיפ של 5%-10% במסעדות לשירות מוצלח.",
            ],
        },
        "maldives": {
            "country_name": "האיים המלדיביים",
            "visa_requirement": "אשרת כניסה (Visa on Arrival) חינמית ל-30 יום ניתנת לכל התיירים בשדה התעופה במאלה עם הצגת הזמנת מלון.",
            "safety_level": "בטוח לחלוטין. הריזורטים מבודדים ומאובטחים 24/7.",
            "emergency_numbers": {
                "police": "119",
                "ambulance": "102",
                "tourist_police": "+960 332 2111",
                "embassy_contact": "שגרירות ישראל בניו דלהי (סיוע אזורי): +91 11 3041 4500",
            },
            "health_advice": "קרם הגנה בעל מקדם SPF גבוה חיוני עקב הקרבה לקו המשווה. המים בריזורטים מותפלים ומסוננים ברמה גבוהה.",
            "scam_alerts": [
                "הזמנת סירות מהירות (Speedboat transfers) ישירות דרך המלון כדי למנוע הפקעת מחירים ברציף.",
            ],
            "cultural_etiquette": [
                "באיים המקומיים (מחוץ לריזורטים הפרטיים) יש להתלבש בצניעות בציבור ולא ללכת בבגדי ים ברחובות.",
            ],
        },
        "swiss_alps": {
            "country_name": "שוויץ (האלפים השוויצריים)",
            "visa_requirement": "פטור מלא מוויזה לאזרחים ישראלים עד 90 יום (שנגן). תוקף דרכון של 3 חודשים ממועד היציאה.",
            "safety_level": "מדד הבטיחות הגבוה בעולם. רמת פשיעה אפסית.",
            "emergency_numbers": {
                "police": "117 / 112",
                "ambulance": "144",
                "mountain_rescue": "1414 (REGA חילוץ הררי)",
                "embassy_contact": "שגרירות ישראל בברן: +41 31 356 3500",
            },
            "health_advice": "מי הברז והמזרקות הציבוריות בשוויץ הם מהנקיים והאיכותיים בעולם ומתאימים לשתייה ישירה.",
            "scam_alerts": [
                "הקפידו לרכוש כרטיס רכבת תקף (Swiss Travel Pass) — הקנסות על נסיעה ללא כרטיס מתוקף גבוהים מאוד.",
            ],
            "cultural_etiquette": [
                "דייקנות היא ערך עליון. רכבות ואוטובוסים יוצאים בדיוק בדקה הנקובה.",
                "שמירה על שקט במקומות ציבוריים וברכבות (במיוחד בקרונות השקטים 'Quiet Zone').",
            ],
        },
        "paris": {
            "country_name": "צרפת (פריז)",
            "visa_requirement": "פטור מוויזה לתיירות עד 90 יום. תוקף דרכון 3 חודשים ממועד החזרה.",
            "safety_level": "בטוח עם עירנות נדרשת לכייסים באזורי תיירות ובמטרו.",
            "emergency_numbers": {
                "police": "17 / 112",
                "ambulance": "15 / 112",
                "tourist_police": "+33 1 53 71 53 71",
                "embassy_contact": "שגרירות ישראל בפריז: +33 1 40 76 55 00",
            },
            "health_advice": "מי הברז בפריז בטוחים לחלוטין לשתייה (כולל מזרקות וולאס ההיסטוריות בעיר).",
            "scam_alerts": [
                "עצומות מזויפות (Sign the petition): התרחקו מאנשים המבקשים חתימה ליד מגדל אייפל והלובר — זו הסחת דעת לכייסים.",
                "הונאת חוט הידידות (Bracelet scam) במדרגות הסקרה-קר — פשוט המשיכו ללכת בנימוס ואל תושיטו יד.",
            ],
            "cultural_etiquette": [
                "אמירת 'Bonjour' (שלום) בעת כניסה לכל חנות או מסעדה היא כלל נימוס בסיסי ביותר.",
            ],
        },
        "rome": {
            "country_name": "איטליה (רומא)",
            "visa_requirement": "פטור מוויזה לתיירות עד 90 יום. תוקף דרכון 3 חודשים ממועד החזרה.",
            "safety_level": "בטוח מאוד עם ערנות לכייסים באוטובוסים צפופים (קו 64) ותחנת טרמיני.",
            "emergency_numbers": {
                "police": "112 / 113",
                "ambulance": "118",
                "tourist_police": "+39 06 67691",
                "embassy_contact": "שגרירות ישראל ברומא: +39 06 3619 8500",
            },
            "health_advice": "מי הברז והברזיות הציבוריות ('Nasoni') המפוזרות בכל רומא הם מים מינרליים קרים ואיכותיים ביותר.",
            "scam_alerts": [
                "גלדיאטורים בתחפושת ליד הקולוסיאום המציעים תמונה משותפת ידרשו תשלום גבוה — סרבו בנימוס אם אינכם מעוניינים לשלם.",
            ],
            "cultural_etiquette": [
                "קפוצ'ינו שותים בבוקר בלבד — הזמנת קפוצ'ינו אחרי 11:00 בבוקר או אחרי פסטה נחשבת למוזרה באיטליה.",
                "לבוש צנוע (כתפיים וברכיים מכוסות) חובה בכניסה לוותיקן, בזיליקת פטרוס הקדוש וכל כנסייה.",
            ],
        },
        "tokyo": {
            "country_name": "יפן (טוקיו)",
            "visa_requirement": "פטור מלא מוויזה לאזרחים ישראלים עד 90 יום. מומלץ למלא מראש טופס Visit Japan Web לכניסה מהירה.",
            "safety_level": "המדינה הבטוחה ביותר בעולם. ניתן להסתובב בבטחה מלאה בכל שעה של היום והלילה.",
            "emergency_numbers": {
                "police": "110",
                "ambulance": "119",
                "tourist_police": "+81 3 3501 0110",
                "embassy_contact": "שגרירות ישראל בטוקיו: +81 3 3264 0911",
            },
            "health_advice": "מי הברז בטוחים לחלוטין. מומלץ להצטייד במזומן (ין יפני) לחנויות ומסעדות קטנות.",
            "scam_alerts": [
                "היזהרו ממקדמי מועדונים (Touts) ברחובות שינג'וקו (קבוקיצ'ו) ורופונגי המזמינים ל'ברים זולים'.",
            ],
            "cultural_etiquette": [
                "אין משאירים טיפ ביפן כלל — מתן טיפ עשוי להיתפס כעלבון.",
                "לא מקובל לאכול או לשתות תוך כדי הליכה ברחוב.",
                "הקפידו על שקט מוחלט ברכבות התחתיות.",
            ],
        },
    }

    # Match destination or generic fallback
    info = None
    for key, data in advisories.items():
        if key in dest_lower or (key == "swiss_alps" and ("אלפים" in dest_clean or "שוויץ" in dest_clean)):
            info = data
            break

    if not info:
        info = {
            "country_name": dest_clean,
            "visa_requirement": f"פטור מוויזה לתיירות עד 90 יום לרוב המדינות, או אשרה בעת ההגעה. חובה תוקף דרכון של לפחות 6 חודשים קדימה.",
            "safety_level": "בטוח לתיירים תוך שמירה על עירנות שגרתית במקומות הומי אדם.",
            "emergency_numbers": {
                "police": "112 / 911",
                "ambulance": "112",
                "tourist_police": "מוקד חירום בינלאומי: 112",
                "embassy_contact": "מוקד משרד החוץ בירושלים למקרי חירום: +972 2 530 3155",
            },
            "health_advice": "מומלץ להצטייד בביטוח נסיעות מקיף ולשתות מים מינרליים מבוקבקים באזורים שאינם מוכרים.",
            "scam_alerts": [
                "להשתמש בתחבורה ציבורית מוסדרת או מוניות עם מונה פעיל בלבד.",
                "לשמור על חפצים יקרי ערך וארנקים בכיסים פנימיים באזורי שווקים צפופים.",
            ],
            "cultural_etiquette": [
                "לכבד את מנהגי המקום, לשמור על שקט במקומות תפילה ואתרים היסטוריים.",
                "לברר מראש האם נהוג להשאיר תשר (טיפ) במסעדות.",
            ],
        }

    return json.dumps({
        "destination": dest_clean,
        "advisory": info,
    }, ensure_ascii=False, indent=2)
