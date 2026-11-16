import asyncio
import concurrent.futures
import json
import logging
import random
import urllib.parse
from typing import Optional, List, Dict, Any

import httpx

logger = logging.getLogger("places_tools")

NOMINATIM_HEADERS = {
    "User-Agent": "WanderlustVoyageAI/1.0 (https://github.com/IDAN2468D/wanderlust-voyage-ai)"
}


def _run_async(coro):
    """Execute an async coroutine safely from synchronous tool code."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result(timeout=6.0)


async def _enrich_places_with_nominatim(
    items: List[Dict[str, Any]],
    destination: str,
) -> List[Dict[str, Any]]:
    """
    Query OpenStreetMap Nominatim API via httpx.AsyncClient (5s timeout) to enrich places
    with real coordinates and map links, falling back cleanly on error or timeout.
    """
    enriched = [dict(item) for item in items]
    if not enriched:
        return enriched

    try:
        async with httpx.AsyncClient(timeout=5.0, headers=NOMINATIM_HEADERS) as client:
            for item in enriched:
                query = f"{item['name']}, {destination}"
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": query, "format": "json", "limit": 1},
                )
                resp.raise_for_status()
                results = resp.json()
                if isinstance(results, list) and results:
                    lat = round(float(results[0]["lat"]), 6)
                    lng = round(float(results[0]["lon"]), 6)
                    item["lat"] = lat
                    item["lng"] = lng
                    item["osm_url"] = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=16/{lat}/{lng}"
                    item["google_maps_url"] = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
                    item["geo_source"] = "nominatim"
                else:
                    item.setdefault("geo_source", "deterministic_fallback")
    except (httpx.TimeoutException, httpx.HTTPError, Exception) as exc:
        logger.warning(f"Nominatim enrichment failed for '{destination}', using deterministic fallback: {exc}")
        for item in enriched:
            item.setdefault("geo_source", "deterministic_fallback")

    return enriched


def search_attractions(
    destination: str,
    interests: Optional[List[str]] = None,
    max_results: int = 6,
) -> str:
    """
    Search for top tourist attractions, museums, landmarks, and cultural spots in a city.

    Args:
        destination (str): Destination city name (e.g., 'Bali', 'Santorini', 'Rome', 'Tokyo', 'Paris').
        interests (Optional[List[str]]): List of user interest categories.
        max_results (int): Maximum number of recommendations to return (default 6).

    Returns:
        str: JSON formatted string containing attraction details with Google Maps deep links,
             geo coordinates, ratings (>=4.3), time slots, and ticket costs.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()
    interests_clean = [i.strip().lower() for i in (interests or ["history", "culture", "sightseeing"])]

    def make_maps_url(name: str, location: str) -> str:
        query = f"{name}, {location}"
        return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(query)}"

    # Core high-fidelity attraction catalogs
    city_catalogs: Dict[str, List[Dict[str, Any]]] = {
        "bali": [
            {
                "name": "מקדש אולוואטו וצוק השקיעה (Uluwatu Temple)",
                "category": "תרבות והיסטוריה",
                "description": "אחד מששת המקדשים הקדושים והחשובים ביותר בבאלי, הניצב על שפת צוק אבן גיר דרמטי בגובה 70 מטרים מעל האוקיינוס ההודי. האתר מציע שילוב נדיר של אדריכלות הינדית מהמאה ה-11, שבילי הליכה פתוחים לאורך קו הצוק וגלי ענק המתנפצים מתחת.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 3.5,
                "best_time": "אחר הצהריים לקראת שקיעה (16:30–19:00)",
                "highlight": "תצפית שקיעה פנורמית מעל האוקיינוס ומופע הריקוד הבאלינזי המסורתי Kecak מול הים",
                "what_to_see": ["שער האבן המקושט המוביל לקצה הצוק", "נקודת התצפית הצפונית לשעת השקיעה", "אמפיתיאטרון מופע האש והקולות Kecak"],
                "visitor_tips": "הגיעו ב-16:30 כדי לתפוס מקומות טובים לאמפיתיאטרון מופע ה-Kecak (מתחיל ב-18:00). בכניסה תקבלו סארונג מסורתי ללא עלות; שמרו על משקפיים וכובעים הרחק מקופי המקאק באזור.",
                "rating": 4.8,
                "lat": -8.8291,
                "lng": 115.0849,
            },
            {
                "name": "שמורת יער הקופים המקודש באובוד (Ubud Monkey Forest)",
                "category": "טבע וחיות בר",
                "description": "שמורת ג'ונגל קסומה בלב אובוד המשתרעת על כ-12.5 דונם של עצי בניאן ענקיים, ערוצי נחל מוצלים ושלושה מקדשים עתיקים מהמאה ה-14 המכוסים טחב ירוק. מעל 1,000 קופי מקאק ארוכי-זנב חיים כאן בסביבתם הטבעית.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 5.5,
                "best_time": "שעות הבוקר (08:30–11:00) כשהיער קריר",
                "highlight": "שדרת שורשי עץ הבניאן הענק והגשר העתיק מעל קניון הנחל הטרופי",
                "what_to_see": ["מקדש פורה דאלם אגונג (Pura Dalem Agung)", "גשר הדרקון העתיק מעל ערוץ הנחל", "יער עצי הפיקוס והשרכים הטרופיים"],
                "visitor_tips": "אחסנו תכשיטים, בקבוקי מים גלויים ושקיות בתוך התיק הסגור ואל תסתכלו ישירות בעיני הקופים. שבילי האבן מוצלים ונעימים גם בימים חמים.",
                "rating": 4.7,
                "lat": -8.5194,
                "lng": 115.2631,
            },
            {
                "name": "טרסות האורז של טגלאלנג (Tegallalang Rice Terraces)",
                "category": "נופים וטבע",
                "description": "עמק מרהיב של מדרגות אורז ירוקות החצובות במדרונות התלולים מצפון לאובוד, הפועלות כבר למעלה מאלף שנה בשיטת השקיה קהילתית מסורתית (Subak) שהוכרה כאתר מורשת עולמית של אונסק\"ו.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 2.0,
                "best_time": "בוקר מוקדם (07:30–09:30) באור הרך",
                "highlight": "אור השמש החודר דרך עצי הקוקוס מעל הטרסות ונדנדות העמק הגבוהות",
                "what_to_see": ["הליכה רגלית בשבילים הפנימיים בין תעלות המים", "בתי הקפה הצופים לעמק בצלע המערבית", "מטעי התבלינים וקפה הלואק הסמוכים"],
                "visitor_tips": "שלבו נעלי הליכה קלות שלא אכפת שיתלכלכו במעט בוץ והביאו מזומן קטן לתרומות המסורתיות במעברי החקלאים הפרטיים.",
                "rating": 4.6,
                "lat": -8.4343,
                "lng": 115.2796,
            },
            {
                "name": "מקדש המעיין הקדוש טירתה אמפול (Tirta Empul)",
                "category": "תרבות ורוחניות",
                "description": "מתחם מקדשים היסטורי שנבנה בשנת 962 סביב מעיינות מים תרמיים הנובעים מהאדמה. זהו המקום שבו המקומיים מבצעים את טקס ה-Melukat — טבילה רוחנית ב-13 זרבוביות אבן מגולפות לטיהור והתחדשות.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 3.5,
                "best_time": "שעות הבוקר או הצהריים המוקדמות",
                "highlight": "צפייה במים הצלולים הנובעים מקרקעית בריכת המקור ובטקס הטיהור המסורתי",
                "what_to_see": ["בריכת המעיין הטבעי עם קרקעית החול המבעבעת", "שורת זרבוביות הטיהור העתיקות", "חצר המקדש הפנימית ובריכת דגי הקוי"],
                "visitor_tips": "אם תרצו לטבול במים בעצמכם, הביאו בגד ים ומגבת והחליפו לתאי ההלבשה במקום עם סארונג המיועד למים (להשכרה בכניסה).",
                "rating": 4.7,
                "lat": -8.4150,
                "lng": 115.3150,
            },
            {
                "name": "מקדש טאנה לוט על הים (Tanah Lot Temple)",
                "category": "אתר מורשת ונוף",
                "description": "מקדש הים המצולם ביותר בבאלי, השוכן על סלע בזלת מבודד עשרות מטרים מקו החוף המערבי. בגאות המקדש מוקף מים לחלוטין, ובשפל ניתן לחצות אליו רגלית לקבלת ברכת המים הקדושים.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 4.0,
                "best_time": "שעת השקיעה (17:00–18:30)",
                "highlight": "צללית גג הפגודות הכהות של המקדש מול שמי הארגמן והגלים הלבנים",
                "what_to_see": ["תצפית הצוק הדרומית ליד גלי הים", "מערת הנחשים המקודשת בבסיס הסלע", "טיילת האומנים והדוכנים בדרך למתחם"],
                "visitor_tips": "בדקו מראש את שעות השפל כדי להספיק לגשת קרוב לסלע לפני השקיעה, ואז טפסו לצוק הדרומי לצילום המושלם.",
                "rating": 4.6,
                "lat": -8.6212,
                "lng": 115.0868,
            },
            {
                "name": "שייט וצלילה בחופי נוסה פנידה (Nusa Penida & Kelingking Beach)",
                "category": "הרפתקה ואטרקציות ימיות",
                "description": "יום טיול מלא לאי הדרמטי שמדרום-מזרח לבאלי, הידוע במצוקי גיר אנכיים הנופלים למים בצבע טורקיז בוהק, בלגונה החבויה של Angel's Billabong ובמפגש שנורקלינג בלתי נשכח עם חתולי-ים ענקיים (Manta Rays).",
                "recommended_hours": 6.5,
                "entry_fee_usd": 35.0,
                "best_time": "יציאה מוקדמת מנמל סאנור בסירת מנוע (07:30)",
                "highlight": "צוק T-Rex המפורסם ב-Kelingking Beach ושנורקלינג במפרץ Manta Bay",
                "what_to_see": ["תצפית Kelingking Cliff", "הקשת הטבעית ב-Broken Beach", "צלילת שנורקלינג במים הצלולים של Crystal Bay"],
                "visitor_tips": "הזמינו העברה מסודרת הכוללת סירה ורכב מקומי על האי כי הכבישים צרים. קחו כדורים נגד בחילות ים לשיט ונעליים סגורות לתצפית.",
                "rating": 4.9,
                "lat": -8.7497,
                "lng": 115.5434,
            },
        ],
        "santorini": [
            {
                "name": "טיילת הצוק והשקיעה של אויה (Oia Castle Viewpoint)",
                "category": "נוף וצילום",
                "description": "הסיור הקסום ביותר בסנטוריני — מבוך סמטאות שיש לבנות, בתי קפטנים מהמאה ה-19, גלריות בוטיק ומרפסות תלויות מעל הקלדרה הוולקנית, המגיעות לשיא בטירת אויה העתיקה הצופה לים האגאי.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 0.0,
                "best_time": "כשעה וחצי לפני השקיעה",
                "highlight": "השקיעה המפורסמת בים האגאי מעל הכיפות הכחולות וטחנות הרוח של אויה",
                "what_to_see": ["שלוש הכיפות הכחולות מסמטת Agios Nikolaos", "חנות הספרים הייחודית Atlantis Books", "שרידי המצודה הוונציאנית (Castle of Agios Nikolaos)"],
                "visitor_tips": "במקום להצטופף ממש בחומת המצודה ב-19:00, מצאו שולחן בקו המרפסות הסמוך או המשיכו 5 דקות צפונה לכיוון תחנות הרוח לתצפית שקטה יותר.",
                "rating": 4.9,
                "lat": 36.4618,
                "lng": 25.3753,
            },
            {
                "name": "העיר הפרהיסטורית אקרוטירי (Akrotiri Ruins)",
                "category": "היסטוריה וארכיאולוגיה",
                "description": "הצצה מרתקת לחברה מתקדמת בת 3,600 שנה שהוקפאה בזמן תחת שכבת אפר וולקני אדירה — 'פומפיי המינואית'. האתר מקורה וממוזג חלקית, ומאפשר הליכה מעל רחובות אבן ובתים בני שלוש קומות.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 12.0,
                "best_time": "שעות הבוקר (09:30–11:30)",
                "highlight": "בתים שמורים עם מדרגות אבן, מערכות ניקוז וחרסים מהתקופה המינואית",
                "what_to_see": ["מתחם Xeste 3 ובית הגברות", "מערכת השבילים המרחפים מעל החפירות", "מגדלור אקרוטירי במרחק 7 דקות נסיעה משם"],
                "visitor_tips": "כדאי לשכור מדריך קולי או סיור קצר בכניסה כדי להבין את הסיפור מאחורי פרסקאות הקיר המפורסמים (שחלקם מוצגים במוזיאון פירה).",
                "rating": 4.7,
                "lat": 36.3512,
                "lng": 25.4034,
            },
            {
                "name": "שייט קטמרן סביב הקלדרה והמעיינות החמים (Caldera Catamaran Cruise)",
                "category": "שייט ופנאי",
                "description": "חוויית שייט חצי-יום על קטמרן מרווח החוצה את לוע הר הגעש השקוע. השייט עובר לצד הצוקים הלבנים והאדומים, עוצר במעיינות גופרית תרמיים חמים, וכולל ארוחת צהריים/ערב יוונית טרייה על הסיפון.",
                "recommended_hours": 5.0,
                "entry_fee_usd": 95.0,
                "best_time": "שייט שקיעה (14:30 עד אחרי השקיעה)",
                "highlight": "טבילה במפרצי הטורקיז הוולקניים וצפייה בשקיעה מהמים מול הצוק של אויה",
                "what_to_see": ["שחייה מול החוף הלבן והאדום", "המעיינות החמים של Nea Kameni", "צוקי הקלדרה הנישאים לגובה 300 מטר מהמים"],
                "visitor_tips": "הביאו בגד ים כהה לשחייה במעיינות החמים (מי הגופרית עלולים להכתים בדים לבנים) וסוודר קל לרוח הים לאחר השקיעה.",
                "rating": 4.9,
                "lat": 36.4022,
                "lng": 25.4321,
            },
            {
                "name": "שביל ההליכה פירה–אימרוביגלי–אויה (Fira to Oia Cliff Trail)",
                "category": "טבע ונוף",
                "description": "אחד ממסלולי ההליכה היפים בים התיכון (כ-10 ק\"מ), הנמתח לאורך שפת הצוק הוולקני דרך הכפרים הציוריים פירוסטפני ואימרוביגלי ועד לאויה — עם נוף פנורמי אינסופי בכל צעד.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 0.0,
                "best_time": "בוקר מוקדם (07:30) לפני שעות השיא",
                "highlight": "תצפית אל סלע סקארוס וקפלת התכלת המבודדת על הקצה הצפוני",
                "what_to_see": ["סלע סקארוס (Skaros Rock) באימרוביגלי", "כנסיית תאונה קטנה על השביל", "נקודות התצפית השקטות בין אימרוביגלי לאויה"],
                "visitor_tips": "השביל כולל מדרגות ואבני בזלת ודורש נעלי ספורט נוחות, כובע ו-1.5 ליטר מים לאדם. אפשר גם לעשות רק את המקטע היפה ביותר מאימרוביגלי לאויה.",
                "rating": 4.8,
                "lat": 36.4320,
                "lng": 25.4280,
            },
            {
                "name": "החוף האדום המפורסם (Red Beach / Kokkini Paralia)",
                "category": "חופים וטבע",
                "description": "מפרץ טבעי דרמטי מוקף קירות לבה וסלעים בצבע אדום-חלודה עז הניגודים בחדות לכחול העמוק של הים האגאי, בסמוך לאתר העתיק אקרוטירי.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 0.0,
                "best_time": "שעות הבוקר או אחר הצהריים",
                "highlight": "צבעי הסלע האדום-ברזל והמים השקטים והצלולים של המפרץ",
                "what_to_see": ["שביל התצפית מעל המפרץ", "מערת החוף הקטנה בצד המזרחי", "סירות השייט המגיעות ממפרץ אקרוטירי"],
                "visitor_tips": "שימו לב לשילוט האזהרה על המדרון והעדיפו צפייה מהתצפית העליונה או הגעה דרך סירת המוניות הימית (Water Taxi) מאקרוטירי.",
                "rating": 4.5,
                "lat": 36.3486,
                "lng": 25.3948,
            },
        ],
        "paris": [
            {
                "name": "מוזיאון הלובר וגני טווילרי (Musée du Louvre)",
                "category": "אמנות ותרבות",
                "description": "ארמון המלכים הצרפתי שהפך למוזיאון המפורסם בתבל, עם מעל 35,000 יצירות מופת ממצרים העתיקה ועד הרנסנס — כולל המונה ליזה, ונוס ממילו, ניקה מסמותרקה וגלריית אפולון המוזהבת.",
                "recommended_hours": 3.5,
                "entry_fee_usd": 24.0,
                "best_time": "כניסת הבוקר הראשונה (09:00) או בערב ברביעי/שישי",
                "highlight": "המונה ליזה באגף Denon, הפירמידה השקופה והליכה רגועה בגני טווילרי בסיום",
                "what_to_see": ["המונה ליזה והחתונה בקנה (אגף Denon)", "דירות נפוליאון השלישי המפוארות (אגף Richelieu)", "שדרת הפסלים והמזרקה בגני טווילרי"],
                "visitor_tips": "חובה להזמין כרטיס מתוזמן באתר הרשמי שבועות מראש. הכניסה דרך פסאז' Carrousel du Louvre חוסכת כמעט תמיד את התור הארוך בחצר הפירמידה.",
                "rating": 4.8,
                "lat": 48.8606,
                "lng": 2.3376,
            },
            {
                "name": "מגדל אייפל ושדרות שאן דה מארס (Eiffel Tower)",
                "category": "אתר מורשת ונוף",
                "description": "סמלה האייקוני של פריז המתנשא לגובה 330 מטרים בלב פארק שאן דה מארס ומעל גדות נהר הסיין. העלייה במעלית לקומה השנייה ולפסגה פורשת מתחת לרגליים את השדרות הכוכביות והמונומנטים המרכזיים.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 32.0,
                "best_time": "שעת בין הערביים עד מופע הנצנוץ העגול בלילה",
                "highlight": "צפייה בעיר האורות נדלקת בשעת השקיעה ומופע הנצנוצים מדי שעה עגולה",
                "what_to_see": ["רצפת הזכוכית בקומה הראשונה", "המרפסת הפתוחה בקומה השנייה", "תצפית הפסגה (Summit) ורחבת טרוקדרו מעבר לנהר"],
                "visitor_tips": "גם אם לא עליתם לפסגה, רדו לרחבת Trocadéro או לרציף Debilly בשעה עגולה לאחר החשכה ל-5 דקות הנצנוץ המרהיבות.",
                "rating": 4.7,
                "lat": 48.8584,
                "lng": 2.2945,
            },
            {
                "name": "גבעת מונמארטר ובזיליקת סקרה-קר (Montmartre & Sacré-Cœur)",
                "category": "היסטוריה ואווירה",
                "description": "כפר אמנים ציורי ששימר סמטאות מרוצפות, כרם ענבים פעיל, מאפיות קטנות וכיכרות מוקפות אמני רחוב — כשבראשו בזיליקת הסקרה-קר הלבנה הצופה על פריז כולה.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 0.0,
                "best_time": "שעות אחר הצהריים (15:30–18:30)",
                "highlight": "סיור בסמטאות מדרגות מונמארטר, כיכר הציירים Place du Tertre והנוף ממדרגות הכנסייה",
                "what_to_see": ["בזיליקת סקרה-קר והנוף מהרחבה", "כיכר הציירים Place du Tertre", "הרחוב הציורי Rue de l'Abreuvoir ו-'La Maison Rose'"],
                "visitor_tips": "רדו מתחנת Abbesses ועלו ברגל דרך הרחובות הקטנים של צד הגבעה (או בפוניקולר עם כרטיס המטרו הרגיל) במקום מהרחוב המסחרי ההומה.",
                "rating": 4.7,
                "lat": 48.8867,
                "lng": 2.3431,
            },
            {
                "name": "שייט שקיעה על נהר הסיין ורובע המארה (Seine & Le Marais)",
                "category": "פנאי ושייט",
                "description": "שילוב פריזאי מושלם של שיטוט רגלי ברובע המארה האופנתי (ובתוכו הרחוב היהודי Rue des Rosiers) ולאחריו שייט מואר על נהר הסיין החולף על פני נוטרדאם, מוזיאון ד'אורסיי וגשר אלכסנדר השלישי.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 18.0,
                "best_time": "אחר הצהריים במארה ושייט בשעת השקיעה",
                "highlight": "כיכר פלאס דה ווז' ההיסטורית והפלגה מתחת לגשרי פריז המוזהבים בלילה",
                "what_to_see": ["כיכר Place des Vosges והארקדות", "סמטאות המארה ו-Rue des Rosiers", "שייט Bateaux Parisiens / Vedettes du Pont Neuf"],
                "visitor_tips": "במארה כמעט כל הבוטיקים והגלריות פתוחים גם ביום ראשון, מה שהופך אותו לאידאלי לסוף השבוע בפריז.",
                "rating": 4.8,
                "lat": 48.8590,
                "lng": 2.2930,
            },
        ],
        "rome": [
            {
                "name": "הקולוסיאום, הפורום הרומאי וגבעת הפלטין (Colosseum & Roman Forum)",
                "category": "היסטוריה וארכיאולוגיה",
                "description": "האמפיתיאטרון האדיר שנבנה בשנת 80 לספירה ואיכלס 50,000 צופים, לצד חורבות הפורום הרומאי — המרכז השלטוני, המסחרי והמשפטי של האימפריה הרומית שבו פסעו קיסרים, סנאטורים וגלדיאטורים.",
                "recommended_hours": 3.5,
                "entry_fee_usd": 22.0,
                "best_time": "כניסת הבוקר הראשונה (08:30–09:00)",
                "highlight": "דריכה על רצפת הזירה המשוחזרת ומראה מקדשי הפורום ושער טיטוס מתצפית הפלטין",
                "what_to_see": ["רצפת הזירה (Arena Floor) או המנהרות התת-קרקעיות", "שער טיטוס והוויה סאקרה בפורום הרומאי", "מרפסת התצפית של גבעת הפלטין (Terrazza Belvedere)"],
                "visitor_tips": "הזמינו כרטיס הכולל גישה ל-Arena Floor חודש מראש באתר הרשמי של הפארק הארכיאולוגי (Colosseo) — הכרטיס תקף גם לפורום ולגבעת הפלטין.",
                "rating": 4.8,
                "lat": 41.8902,
                "lng": 12.4922,
            },
            {
                "name": "מוזיאוני הוותיקן, הקפלה הסיסטינית ובזיליקת סן פייטרו (Vatican & Sistine Chapel)",
                "category": "אמנות ודת",
                "description": "מסע מרתק באחד מאוספי האמנות העשירים עלי אדמות — ממדרגות הספירלה וגלריית המפות העתיקות ועד חדרי רפאל ותקרת הקפלה הסיסטינית המופתית של מיכלאנג'לו, בליווי ביקור בבזיליקה הגדולה בעולם.",
                "recommended_hours": 3.5,
                "entry_fee_usd": 28.0,
                "best_time": "בוקר מוקדם (08:00) או צהריים עם כרטיס Skip-the-Line",
                "highlight": "פרסקו 'בריאת האדם' ו'יום הדין האחרון' בקפלה הסיסטינית וכיפת סן פייטרו",
                "what_to_see": ["גלריית המפות (Gallery of Maps) והשטיחים", "חדרי רפאל והקפלה הסיסטינית", "כיכר סן פייטרו ועמודי ברניני"],
                "visitor_tips": "חובה לבוש צנוע המכסה כתפיים וברכיים. כרטיס מתוזמן מראש מונע המתנה של שעתיים בחוץ; בימי רביעי בבוקר הכיכר עמוסה יותר.",
                "rating": 4.8,
                "lat": 41.9065,
                "lng": 12.4536,
            },
            {
                "name": "מזרקת טרווי והמדרגות הספרדיות (Trevi Fountain & Spanish Steps)",
                "category": "אדריכלות ותרבות",
                "description": "מסלול הליכה קלאסי בלב ההיסטורי של רומא בין חזית הארמון הפיסולית של מזרקת טרווי הבארוקית, חנויות היוקרה של Via Condotti, ועד המדרגות הספרדיות המדורגות לרגלי כנסיית טריניטה דיי מונטי.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 0.0,
                "best_time": "בוקר מוקדם מאוד (07:30) או בערב מואר (21:30)",
                "highlight": "שאון המים של מזרקה בגובה 26 מטר ותצפית מראש המדרגות אל סמטאות המרכז",
                "what_to_see": ["פסלי אוקיינוס והסוסים במזרקת טרווי", "גלידריות הבוטיק בסמטאות סביב המזרקה", "מזרקת הסירה של ברניני בתחתית המדרגות"],
                "visitor_tips": "אסור לשבת על המדרגות הספרדיות או על שפת המזרקה (אוכפים בקנסות). הטילו מטבע ביד ימין מעל כתף שמאל להבטחת השיבה לרומא.",
                "rating": 4.7,
                "lat": 41.9009,
                "lng": 12.4833,
            },
            {
                "name": "הפנתיאון, פיאצה נאבונה והגטו היהודי העתיק (Pantheon, Navona & Jewish Quarter)",
                "category": "היסטוריה וקולינריה",
                "description": "סיור בין הפלא האדריכלי השמור ביותר של רומא העתיקה (הפנתיאון בן כ-2,000 השנה עם כיפת הבטון חסרת התמיכה הגדולה בעולם), מופעי הרחוב של פיאצה נאבונה, ועד הגטו היהודי התוסס ומזרקת הצבים.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 5.5,
                "best_time": "אחר הצהריים ולקראת ערב",
                "highlight": "אלומת אור השמש החודרת דרך האוקולוס שבכיפת הפנתיאון ואווירת הקפה בארקדות נאבונה",
                "what_to_see": ["פתח האוקולוס בפנתיאון וקבר רפאל", "מזרקת ארבעת הנהרות של ברניני בנאבונה", "שוק Campo de' Fiori ומזרקת הצבים בגטו"],
                "visitor_tips": "רכשו כרטיס כניסה לפנתיאון מראש אונליין או במקום (קוד QR). במרחק 5 דקות משם נמצא קפה Sant'Eustachio המפורסם לאספרסו מושלם.",
                "rating": 4.8,
                "lat": 41.8986,
                "lng": 12.4769,
            },
        ],
        "london": [
            {
                "name": "מוזיאון הבריטי ובלומסברי (The British Museum)",
                "category": "היסטוריה ותרבות",
                "description": "אחד המוזיאונים החשובים בתבל עם אוסף חסר תקדים של היסטוריה אנושית — מאבן הרוזטה ומומיות מצרים העתיקה ועד פסלי הפרתנון של אתונה, שוכן תחת גג הזכוכית האייקוני של Great Court.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 0.0,
                "best_time": "פתיחת הבוקר (10:00) או שישי בערב",
                "highlight": "החצר המרכזית המרהיבה ואגפי מצרים, יוון ומסופוטמיה (הכניסה חופשית!)",
                "what_to_see": ["אבן הרוזטה (חדר 4)", "הפסלים והמומיות המצריות", "גלריית הפרתנון (חדר 18)"],
                "visitor_tips": "הכניסה למוזיאון בחינם אך מומלץ לשריין חלון זמן חינמי באתר מראש כדי להיכנס מיד בלי לחכות.",
                "rating": 4.8,
                "lat": 51.5194,
                "lng": -0.1270,
            },
            {
                "name": "ארמון בקינגהאם, טיילת הווסטמינסטר וביג בן (Westminster & Buckingham)",
                "category": "אדריכלות ומלכות",
                "description": "לב לונדון ההיסטורית: הליכה לאורך שדרת ה-Mall ופארק סנט ג'יימס הירוק מהארמון הרשמי של בית המלוכה ועד הפרלמנט, שעון הביג בן ומנזר ווסטמינסטר.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 0.0,
                "best_time": "בוקר (10:15 בימי חילופי המשמר)",
                "highlight": "טקס חילופי המשמר המלכותי והליכה על גשר ווסטמינסטר מול נהר התמזה",
                "what_to_see": ["רחבת ארמון בקינגהאם וחילופי המשמר", "כנסיית Westminster Abbey", "קו הרקיע של הביג בן וה-London Eye"],
                "visitor_tips": "בדקו מראש באתר המשמר המלכותי אילו ימים כוללים החלפת משמר מלאה והגיעו לפחות 35 דקות לפני 11:00.",
                "rating": 4.8,
                "lat": 51.5014,
                "lng": -0.1419,
            },
            {
                "name": "מצודת לונדון, גשר הטאוור ושוק בורו (Tower of London & Borough Market)",
                "category": "היסטוריה וקולינריה",
                "description": "מבצר ימי-הביניים על גדת התמזה המשכן את תכשיטי הכתר הבריטיים, במרחק הליכה על גשר הטאוור האייקוני משוק האוכל הוותיק והטעים ביותר בלונדון.",
                "recommended_hours": 3.5,
                "entry_fee_usd": 42.0,
                "best_time": "בוקר מוקדם למצודה והגעה לשוק ב-12:30",
                "highlight": "תכשיטי הכתר, סיורי שומרי ה-Beefeaters והריחות המשכרים של דוכני Borough Market",
                "what_to_see": ["אוסף תכשיטי הכתר במצודה", "מסלול ההליכה העליון עם רצפת הזכוכית ב-Tower Bridge", "דוכני הגבינות, השוקולד והמאפים ב-Borough Market"],
                "visitor_tips": "הצטרפו לסיור החינמי של ה-Yeoman Warders בתוך המצודה — מצחיק, חי ומרתק. לשוק כדאי להגיע בימי חול כדי לחמוק מהדוחק של שבת.",
                "rating": 4.8,
                "lat": 51.5081,
                "lng": -0.0759,
            },
            {
                "name": "קובנט גארדן, סוהו והווסט אנד (Covent Garden & West End)",
                "category": "קניות, אווירה ובילוי",
                "description": "רובע הבידור, התיאטראות, אמני הרחוב והבוטיקים של לונדון — שילוב של שוק היסטורי מקורה, חצרות סודיות צבעוניות (Neal's Yard) ואולמות מחזות זמר מהטובים בעולם.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 0.0,
                "best_time": "אחר הצהריים והערב",
                "highlight": "חצר Neal's Yard הצבעונית, אמני הרחוב בפיאצה ומופע ווסט אנד בערב",
                "what_to_see": ["השוק המקורה ב-Covent Garden", "סמטת Neal's Yard והחנויות הקטנות", "כיכר פיקדילי ורחוב Carnaby בסוהו"],
                "visitor_tips": "למחזות זמר מבוקשים ניתן לבדוק כרטיסי Same-Day מוזלים בקופת TKTS בכיכר לסטר או להזמין חודש מראש.",
                "rating": 4.7,
                "lat": 51.5117,
                "lng": -0.1232,
            },
        ],
        "barcelona": [
            {
                "name": "בזיליקת סגרדה פמיליה (Sagrada Família)",
                "category": "אדריכלות ומופת",
                "description": "יצירת החיים הבלתי-גמורה והעוצרת נשימה של האדריכל אנטוני גאודי. חלל הפנים מדמה יער ענק של עמודי אבן המתפצלים כצמרות עצים, עם ויטראז'ים צבעוניים השוטפים את הכנסייה באור קסום.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 29.0,
                "best_time": "בוקר מוקדם (09:30) או שעת השקיעה המוקדמת (16:30)",
                "highlight": "קרני השמש העוברות דרך הוויטראז'ים הכחולים והאדומים אל תוך יער העמודים",
                "what_to_see": ["חזית המולד העשירה בפרטים (Nativity Facade)", "אולם העמודים והתקרה הגבוהה", "מוזיאון גאודי התת-קרקעי"],
                "visitor_tips": "אי אפשר לקנות כרטיסים בקופה במקום — הזמינו באתר הרשמי בלבד כמה שבועות מראש כולל מדריך קולי בעברית/אנגלית באפליקציה.",
                "rating": 4.9,
                "lat": 41.4036,
                "lng": 2.1744,
            },
            {
                "name": "פארק גואל (Park Güell)",
                "category": "אמנות, טבע ונוף",
                "description": "פארק אגדות מרהיב על גבעת אל כרמל בעיצוב גאודי, המשלב ספסל פסיפס צבעוני מתפתל, עמודי אבן משופעים, ביתני ג'ינג'ר ותצפית פנורמית על ברצלונה עד קו הים.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 12.0,
                "best_time": "בוקר (09:00) או אחר הצהריים המאוחרים",
                "highlight": "מרפסת הפסיפס המפורסמת (Nature Square) ופסל הלטאה המרכזי El Drac",
                "what_to_see": ["גרם המדרגות ופסל הלטאה הצבעוני", "אולם מאה העמודים (Hypostyle Room)", "תצפית מרפסת הפסיפס אל הים"],
                "visitor_tips": "העלייה ברחוב תלולה, לכן קחו מונית או אוטובוס קו 24 ישירות לכניסה הצפונית ורדו ברגל בסיום הביקור.",
                "rating": 4.7,
                "lat": 41.4145,
                "lng": 2.1527,
            },
            {
                "name": "הרובע הגותי, שדרות לה רמבלה ושוק לה בוקריה (Barri Gòtic & La Boqueria)",
                "category": "היסטוריה וקולינריה",
                "description": "מבוך מרתק של סמטאות ימי-ביניים רומיות, כיכרות אינטימיות נסתרות וקתדרלת ברצלונה המרשימה — במרחק הליכה קצר מפיצוץ הצבעים והטעמים של שוק לה בוקריה.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 0.0,
                "best_time": "בוקר–צהריים (10:30–13:30)",
                "highlight": "גשר הבישוף (Pont del Bisbe), כיכר Plaça Reial ומיצי הפירות הטריים בשוק",
                "what_to_see": ["קתדרלת ברצלונה והחצר של 13 האווזים", "הרובע היהודי העתיק Call Jueu ובית הכנסת העתיק", "דוכני השוק ב-La Boqueria (עדיף הדוכנים הפנימיים)"],
                "visitor_tips": "שמרו על ערנות לתיקים וארנקים בשדרות לה רמבלה ובכניסה לשוק; לביקור רגוע בשוק הקדימו לפני 11:30.",
                "rating": 4.7,
                "lat": 41.3819,
                "lng": 2.1715,
            },
            {
                "name": "שדרת פסץ' דה גרסיה, קאסה בטליו ורובע אל בורן (Passeig de Gràcia & El Born)",
                "category": "אדריכלות, קניות ואווירה",
                "description": "שדרת היוקרה המודרניסטית עם חזית הדרקון והשלדים של קאסה בטליו וקאסה מילה, ומשם ירידה אל רובע אל בורן האופנתי והבוטיקים העצמאיים ליד פארק המצודה (Ciutadella).",
                "recommended_hours": 2.5,
                "entry_fee_usd": 31.0,
                "best_time": "אחר הצהריים (15:00–18:00)",
                "highlight": "גג הארובות של La Pedrera, חזית הקשקשים של Casa Batlló ומזרקת הפארק המוזהבת",
                "what_to_see": ["ביקור פנים או תצפית לילה ב-Casa Batlló", "כיכר Santa Maria del Mar באל בורן", "טיול רגלי במזרקת Cascada של פארק הסיודאדלה"],
                "visitor_tips": "אם תרצו לבחור כניסה פנימית אחת בין קאסה בטליו לקאסה מילה — קאסה בטליו מציעה חוויה אור-קולית סוחפת יותר והסבר קולי מצוין.",
                "rating": 4.8,
                "lat": 41.3917,
                "lng": 2.1649,
            },
        ],
    }

    # Match catalog key (supports both English and Hebrew names)
    alias_map = {
        "bali": ["bali", "באלי"],
        "santorini": ["santorini", "סנטוריני"],
        "paris": ["paris", "פריז"],
        "rome": ["rome", "רומא"],
        "london": ["london", "לונדון"],
        "barcelona": ["barcelona", "ברצלונה"],
    }
    catalog = None
    for key, patterns in alias_map.items():
        if any(p in dest_lower or p in dest_clean for p in patterns):
            catalog = city_catalogs.get(key)
            break

    if not catalog:
        # Generate rich dynamic catalog for any requested city
        seed = sum(ord(c) for c in dest_clean)
        rng = random.Random(seed)
        catalog = [
            {
                "name": f"העיר העתיקה והכיכר המרכזית של {dest_clean}",
                "category": "היסטוריה ואדריכלות",
                "description": f"לב ליבה ההיסטורי והאדריכלי של {dest_clean} — מבוך מטופח של סמטאות אבן, כיכרות רחבות, כנסיות ומבני שלטון היסטוריים שבהם פועם הרחוב המקומי לאורך מאות שנים.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 0.0,
                "best_time": "שעות הבוקר (09:30–12:00)",
                "highlight": f"סיור רגלי רגוע בין הכיכרות ההיסטוריות, בתי הקפה הוותיקים והמבנים המרכזיים של {dest_clean}",
                "what_to_see": [f"הכיכר המרכזית ובית העירייה ההיסטורי של {dest_clean}", "סמטאות המדרחוב העתיקות וחנויות הבוטיק", "תצפית מגדל הפעמון או המצודה הסמוכה"],
                "visitor_tips": "הקדימו לשעות הבוקר כדי לצלם את הכיכרות כשהן עוד שקטות ולשבת באחד מבתי הקפה המקומיים הסמוכים.",
                "rating": 4.7,
                "lat": 30.0 + rng.uniform(-10, 10),
                "lng": 35.0 + rng.uniform(-10, 10),
            },
            {
                "name": f"המוזיאון הלאומי לאמנות ומורשת של {dest_clean}",
                "category": "אמנות ותרבות",
                "description": f"מוסד הדגל התרבותי של {dest_clean}, המרכז תחת קורת גג אחת תערוכות אמנות מקומית ובינלאומית, מוצגים ארכיאולוגיים נדירים וסיפור התפתחות האזור מימי קדם ועד ימינו.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 16.0,
                "best_time": "שעות הצהריים (נוח לימי שמש חמים או גשם)",
                "highlight": "אולמות האוצרות המקומיים, הגלריה המרכזית וגינת הפסלים הפנימית",
                "what_to_see": [f"אגף ההיסטוריה המקומית של {dest_clean}", "גלריית האמנות הקלאסית והמודרנית", "חנות הספרים והעיצוב של המוזיאון"],
                "visitor_tips": "רכשו כרטיסים באתר המוזיאון ערב קודם ובקשו בכניסה מפת התמצאות או מדריך שמע של נקודות השיא ל-90 דקות.",
                "rating": 4.6,
                "lat": 30.0 + rng.uniform(-10, 10),
                "lng": 35.0 + rng.uniform(-10, 10),
            },
            {
                "name": f"תצפית הפנורמה והפארק העירוני של {dest_clean}",
                "category": "נוף וטבע",
                "description": f"הפארק המדורג ונקודת התצפית הגבוהה ביותר הצופה על קו הרקיע של {dest_clean}. מקום מושלם להפסקה ירוקה בין שדרות עצים, אגמים ושבילי הליכה המציעים מראה של 360 מעלות על העיר.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 8.0,
                "best_time": "שעות אחר הצהריים והזהב לפני השקיעה",
                "highlight": f"מבט פתוח על כל גגות {dest_clean} והאזור שמסביב בשעות הזהב שלפני השקיעה",
                "what_to_see": ["מרפסת התצפית המרכזית על העיר", "שדרות הפארק, המזרקות והגנים הבוטניים", "אזור בתי הקפה מול הנוף"],
                "visitor_tips": "הביאו נעליים נוחות, מצלמה טעונה ושתייה קלה; לקראת שקיעה הטמפרטורה מעט יורדת מומלץ לקחת שכבה עליונה דקה.",
                "rating": 4.8,
                "lat": 30.0 + rng.uniform(-10, 10),
                "lng": 35.0 + rng.uniform(-10, 10),
            },
            {
                "name": f"שוק האוכל המקורה ורובע האמנים של {dest_clean}",
                "category": "קולינריה וקניות",
                "description": f"מתחם תוסס וצבעוני שבו נפגשים חקלאים, אופים, שפים מקומיים ואמני מלאכת יד מ{dest_clean}. תוכלו לטעום גבינות, מאפים, שוקולדים ומנות רחוב טריות ולרכוש מזכרות אותנטיות.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 0.0,
                "best_time": "שעות הבוקר המאוחרות או הצהריים (11:00–15:00)",
                "highlight": "שילוב טעימות מהמטבח המקומי לצד סיור בגלריות האמנים שבסמטאות הסמוכות",
                "what_to_see": ["שדרת דוכני המאפים והמעדנים החמים", "פינת התבלינים, הקפה והשוקולד המקומי", "סמטאות הבוטיק והאמנות שמסביב לשוק"],
                "visitor_tips": "הגיעו רעבים עם מעט מזומן בכיס וקנו מנות קטנות לחלוקה ממספר דוכנים שונים במקום לעצור רק במקום אחד.",
                "rating": 4.6,
                "lat": 30.0 + rng.uniform(-10, 10),
                "lng": 35.0 + rng.uniform(-10, 10),
            },
        ]

    # Add Google Maps deep links to all items and enrich via OpenStreetMap Nominatim
    enriched_attractions = []
    for item in catalog[:max_results]:
        item_copy = dict(item)
        item_copy["google_maps_url"] = make_maps_url(item["name"], dest_clean)
        enriched_attractions.append(item_copy)

    enriched_attractions = _run_async(_enrich_places_with_nominatim(enriched_attractions, dest_clean))

    return json.dumps({
        "destination": dest_clean,
        "matched_interests": interests_clean,
        "total_attractions": len(enriched_attractions),
        "attractions": enriched_attractions,
    }, ensure_ascii=False, indent=2)


def search_accommodations(
    destination: str,
    checkin_date: str,
    checkout_date: str,
    guests: int = 2,
    budget_tier: str = "balanced",
) -> str:
    """
    Search for curated accommodations filtering by guest rating (>= 4.3/5.0).
    Includes nightly rate, amenities, Google Maps links, and booking deep links.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()

    def make_maps_url(hotel_name: str) -> str:
        query = f"{hotel_name}, {dest_clean}"
        return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(query)}"

    # Curated hotel recommendations by destination
    if "bali" in dest_lower or "באלי" in dest_clean:
        hotels = [
            {
                "name": "Maya Ubud Resort & Spa",
                "neighborhood": "עמק נהר פטנו, אובוד",
                "stars": 5,
                "rating": 4.8,
                "nightly_rate_usd": 220.0,
                "amenities": ["בריכת אינפיניטי בג'ונגל", "ספא יוקרתי על שפת הנהר", "שיעורי יוגה יומיים", "ארוחת בוקר בופה עשירה"],
                "description": "ריזורט יוקרתי ומבודד הטובל בירק טרופי עבות בלב עמק פטנו השליו.",
            },
            {
                "name": "Alila Villas Uluwatu",
                "neighborhood": "צוקי אולוואטו, חצי האי הדרומי",
                "stars": 5,
                "rating": 4.9,
                "nightly_rate_usd": 480.0,
                "amenities": ["וילות פרטיות עם בריכה", "ביתן שקיעה תלוי מעל הצוק", "באטלר אישי 24/7", "מסעדת שף"],
                "description": "אחת מווילות הנופש המרשימות בעולם התלויה על שפת צוק דרמטי מול האוקיינוס.",
            },
            {
                "name": "Theanna Eco Villa and Spa",
                "neighborhood": "צ'אנגו (Canggu)",
                "stars": 4,
                "rating": 4.6,
                "nightly_rate_usd": 140.0,
                "amenities": ["בריכה פרטית לכל וילה", "הסעות חינם לחוף אקו ביץ'", "ספא באלינזי מסורתי", "Wi-Fi מהיר"],
                "description": "וילות בוטיק אקולוגיות ומרגיעות במרחק דקות ממועדוני החוף והגלישה של צ'אנגו.",
            },
        ]
    elif "santorini" in dest_lower or "סנטוריני" in dest_clean:
        hotels = [
            {
                "name": "Canaves Oia Suites",
                "neighborhood": "אויה (Oia Caldera)",
                "stars": 5,
                "rating": 4.9,
                "nightly_rate_usd": 450.0,
                "amenities": ["בריכת שחייה חצובה בסלע הוולקני", "נוף פנורמי לקלדרה", "מרפסת שקיעה פרטית", "מסעדת גורמה"],
                "description": "סוויטות יוקרה עוצרות נשימה בסגנון קיקלדי קלאסי החצובות בצוק של אויה.",
            },
            {
                "name": "Astra Suites Imerovigli",
                "neighborhood": "אימרוביגלי (Imerovigli)",
                "stars": 5,
                "rating": 4.8,
                "nightly_rate_usd": 320.0,
                "amenities": ["ג'קוזי פרטי מול הים", "בריכת אינפיניטי מחוממת", "שירות קונסיירז' ברמה עולמית"],
                "description": "ממוקם על מרפסת סנטוריני הצופה היישר על סלע סקארוס המלכותי.",
            },
        ]
    else:
        seed = sum(ord(c) for c in dest_clean)
        rng = random.Random(seed)
        base_price = 120.0 if budget_tier == "budget" else (350.0 if budget_tier == "luxury" else 190.0)
        hotels = [
            {
                "name": f"Grand Boutique Hotel {dest_clean}",
                "neighborhood": "מרכז העיר ההיסטורי",
                "stars": 4,
                "rating": round(rng.uniform(4.5, 4.9), 1),
                "nightly_rate_usd": base_price,
                "amenities": ["ארוחת בוקר גורמה כלולה", "Wi-Fi מהיר בכל המתחם", "מרכז כושר וספא בוטיק", "מרפסת גג פנורמית"],
                "description": f"מלון בוטיק אלגנטי בדירוג אורחים מעולה במרחק הליכה מאתרי התיירות המובילים ב{dest_clean}.",
            },
            {
                "name": f"{dest_clean} Luxury Suites & Spa",
                "neighborhood": "רובע התרבות והעיצוב",
                "stars": 5,
                "rating": 4.9,
                "nightly_rate_usd": round(base_price * 1.5, 2),
                "amenities": ["סוויטות יוקרה מרווחות", "בריכת שחייה מחוממת", "לאונג' קוקטיילים עסקי", "שירות חדרים 24/7"],
                "description": "חוויית אירוח פרימיום עם שירות אישי מוקפד ונוף פנורמי.",
            },
        ]

    try:
        from datetime import datetime
        d1 = datetime.strptime(checkin_date, "%Y-%m-%d")
        d2 = datetime.strptime(checkout_date, "%Y-%m-%d")
        nights = max(1, (d2 - d1).days)
    except Exception:
        nights = 5

    # Enrich hotels with links and total stay calculation
    enriched_hotels = []
    for h in hotels:
        h_copy = dict(h)
        h_copy["nights"] = nights
        h_copy["total_estimated_usd"] = round(h_copy["nightly_rate_usd"] * nights, 2)
        h_copy["google_maps_url"] = make_maps_url(h["name"])
        booking_query = f"{h['name']} {dest_clean}"
        h_copy["booking_url"] = f"https://www.google.com/travel/hotels?q={urllib.parse.quote(booking_query)}"
        enriched_hotels.append(h_copy)

    return json.dumps({
        "destination": dest_clean,
        "checkin_date": checkin_date,
        "checkout_date": checkout_date,
        "total_nights": nights,
        "options": enriched_hotels,
    }, ensure_ascii=False, indent=2)


def search_restaurants(
    destination: str,
    cuisine_type: str = "local",
    price_range: str = "$$",
) -> str:
    """
    Search for high-rated culinary venues, authentic local dining, and chef bistros
    with detailed explanations, atmosphere notes, booking advice, and kosher notes.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()

    def make_maps_url(name: str) -> str:
        return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(name + ', ' + dest_clean)}"

    restaurant_catalogs: Dict[str, List[Dict[str, Any]]] = {
        "bali": [
            {
                "name": "Locavore NXT (אובוד)",
                "neighborhood": "אובוד",
                "cuisine_style": "פיין דיינינג באלינזי מודרני",
                "description": "מסעדת הדגל הקולינרית של אובוד, הפועלת בגישה מקיימת עם חוות גידול עצמאיות ומטבח פתוח. כל מנה מספרת סיפור על האי אינדונזי עם טכניקות התססה ובישול עכשוויות.",
                "signature_dish": "תפריט טעימות מקומי יצירתי מחומרי גלם טריים מחוות באלינזיות",
                "atmosphere": "אדריכלות ירוקה עטופה בג'ונגל, שקטה ומרשימה",
                "booking_tip": "חובה להזמין מקום 3–4 שבועות מראש באתר המסעדה ולציין העדפות תזונתיות.",
                "kosher_note": "אינה כשרה — ניתן לבקש מראש תפריט צמחוני/דגים מותאם.",
                "price_tier": "$$$",
                "avg_cost_person_usd": 65.0,
                "rating": 4.9,
            },
            {
                "name": "Bebek Bengil (Dirty Duck Diner)",
                "neighborhood": "מרכז אובוד מול טרסות אורז",
                "cuisine_style": "מסורתי באלינזי",
                "description": "מוסד ותיק ואהוב באובוד השוכן בלב גן טרופי פתוח של פביליונים מול שדות אורז ירוקים — המקום הקלאסי לטעום ברווז באלינזי מסורתי באווירה נינוחה.",
                "signature_dish": "ברווז פריך באלינזי מסורתי (Crispy Duck) עם אורז ותבליני סאמבאל",
                "atmosphere": "ביתני עץ פתוחים בין בריכות לוטוס ושדות אורז",
                "booking_tip": "בקשו שולחן בפביליון הגן האחורי מול שדות האורז לשעת שקיעה.",
                "kosher_note": "תפריט רגיל לא כשר; קיימות מנות צמחוניות ודגים פשוטים.",
                "price_tier": "$$",
                "avg_cost_person_usd": 22.0,
                "rating": 4.6,
            },
            {
                "name": "Mason Canggu",
                "neighborhood": "צ'אנגו (Canggu)",
                "cuisine_style": "גריל עצים ומטבח עכשווי",
                "description": "ביסטרו אורבני שיקי בלב צ'אנגו המתמחה בצלייה איטית על תנור עצים, ירקות מקומיים צלויים ולחמי מחמצת הנאפים במקום לצד תפריט קוקטיילים מוקפד.",
                "signature_dish": "בשרים ודגים טריים בצלייה על עץ, ירקות אורגניים וקוקטיילים",
                "atmosphere": "תאורה חמה, בר פתוח ואווירה קוסמופוליטית תוססת",
                "booking_tip": "הזמינו שולחן לערב מוקדם דרך אתר המסעדה, במיוחד בסופי שבוע.",
                "kosher_note": "ניתן לבחור דגי ים טריים ומנות ירק צלויות; ללא תעודת כשרות.",
                "price_tier": "$$",
                "avg_cost_person_usd": 38.0,
                "rating": 4.7,
            },
        ],
        "santorini": [
            {
                "name": "Metaxi Mas Tavern",
                "neighborhood": "אקסו גוניה (Exo Gonia)",
                "cuisine_style": "טברנה יוונית-קיקלדית אותנטית",
                "description": "נחשבת בעיני מקומיים ומטיילים לאחת הטברנות הטובות ביוון כולה. שוכנת בכפר שקט הרחק מהמוני התיירים עם מרפסת אבן צופה אל הכרמים והים.",
                "signature_dish": "טלה בתנור חרס, עגבניות שרי מיובשות ברוטב יין וגבינת פטה אפויה",
                "atmosphere": "מרפסת כפרית חמימה מול נוף פנורמי של מזרח האי",
                "booking_tip": "חובה לשריין מקום שבוע מראש בטלפון או דרך המלון (עמוסה מדי ערב).",
                "kosher_note": "תפריט יווני עשיר בדגים, גבינות צאן וסלטים; לא תחת השגחה.",
                "price_tier": "$$",
                "avg_cost_person_usd": 40.0,
                "rating": 4.9,
            },
            {
                "name": "Ammoudi Fish Tavern",
                "neighborhood": "מפרץ אמורדי (אויה)",
                "cuisine_style": "דגים טריים על קו המים",
                "description": "שולחנות עץ כחולים-לבנים ממש על המזח הזעיר של מפרץ אמונדי מתחת לצוקי אויה האדומים — מושלם לארוחת דגים שלל היום בשעת הזהב.",
                "signature_dish": "דגים טריים שלל היום על הגריל וקציצות עגבניות מסורתיות (Domatokeftedes)",
                "atmosphere": "על קו המים הצלול ממש מול סירות הדיג הקטנות",
                "booking_tip": "הזמינו שולחן בשורה הראשונה על המזח לשעה 18:00 (לפני השקיעה).",
                "kosher_note": "מגישה דגי ים שלמים צלויים בשמן זית וירקות; ללא תעודת כשרות.",
                "price_tier": "$$$",
                "avg_cost_person_usd": 55.0,
                "rating": 4.7,
            },
        ],
        "rome": [
            {
                "name": "Roscioli Salumeria con Cucina",
                "neighborhood": "Campo de' Fiori",
                "cuisine_style": "מטבח רומאי קלאסי ומעדניית יין",
                "description": "מוסד קולינרי היסטורי שצמח ממאפייה משפחתית למסעדת שף מבוקשת בתוך מעדניית גבינות ויינות. הפסטות מבושלות בעבודת יד מדויקת עם חומרי גלם מאזור לאציו.",
                "signature_dish": "פסטה טונארלי Cacio e Pepe, בוראטה עבודת יד עם עגבניות לחות",
                "atmosphere": "תוסס, מוקף מדפי יינות וגבינות איטלקיות נדירות",
                "booking_tip": "מומלץ להזמין מקום 3 שבועות מראש דרך האתר הרשמי (צהריים או ערב).",
                "kosher_note": "לא כשר; בקרבת מקום במרחק 5 דקות הליכה נמצא הרובע היהודי עם Ba'Ghetto.",
                "price_tier": "$$$",
                "avg_cost_person_usd": 48.0,
                "rating": 4.8,
            },
            {
                "name": "Trattoria Da Enzo al 29",
                "neighborhood": "טרסטוורה (Trastevere)",
                "cuisine_style": "טרטוריה רומאית משפחתית",
                "description": "טרטוריה זעירה וקסומה בסמטה שקטה של טרסטוורה עם מתכונים שעוברים מדור לדור — מפורסמת בזכות המרכיבים הטריים, השירות החם והקינוחים הביתיים.",
                "signature_dish": "ארטישוק מטוגן פריך, פסטה גריצ'ה קלאסית וטירמיסו בכוס",
                "atmosphere": "אינטימי, שולחנות עץ קטנים בחוץ בסמטה רומאית ציורית",
                "booking_tip": "לצהריים הגיעו ב-12:00 לפני פתיחת התור; לערב מומלץ להגיע ב-18:45.",
                "kosher_note": "אינה כשרה; ארטישוק מטוגן ומנות פסטה צמחוניות זמינות.",
                "price_tier": "$$",
                "avg_cost_person_usd": 32.0,
                "rating": 4.7,
            },
            {
                "name": "Ba'Ghetto (הגטו היהודי)",
                "neighborhood": "הרובע היהודי (Portico d'Ottavia)",
                "cuisine_style": "יהודי-רומאי ובשרי גלאט כשר",
                "description": "הלב הפועם של המטבח הכשר ברומא, הממוקמת במדרחוב העתיק של הגטו היהודי. משלבת מסורת רומאית בת אלפיים שנה עם גריל תוסס ומנות אהובות על ישראלים.",
                "signature_dish": "קרצ'ופי אלה ג'ודיאה (ארטישוק מטוגן פריך) ופסטה פוטנסקה / בשרים",
                "atmosphere": "חמה ומשפחתית על רחוב האבן ההיסטורי של הרובע היהודי",
                "booking_tip": "מומלץ להזמין מראש לערב ולמוצ\"ש; סגור בשבת.",
                "kosher_note": "כשר למהדרין בהשגחת הרבנות רומא (גלאט).",
                "price_tier": "$$",
                "avg_cost_person_usd": 36.0,
                "rating": 4.6,
            },
        ],
        "paris": [
            {
                "name": "Le Comptoir du Relais",
                "neighborhood": "סן ז'רמן דה פרה (Saint-Germain)",
                "cuisine_style": "ביסטרו צרפתי קלאסי",
                "description": "ביסטרו אייקוני בגדה השמאלית שהפך לסמל הביסטרונומיה הפריזאית. מציע מנות צרפתיות מנחמות המבושלות בקפידה לצד מרפסת עמוסה באווירה מקומית.",
                "signature_dish": "ביף בורגיניון בבישול ארוך, מרק בצל מוקרם וקרפ סוזט",
                "atmosphere": "ביסטרו פריזאי תוסס עם מרפסת רחוב קלאסית",
                "booking_tip": "בצהריים ישיבה על בסיס מקום פנוי (הגיעו סביב 12:00); בערב הזמינו מראש.",
                "kosher_note": "אינה כשרה; אופציות כשרות בשפע נמצאות ברובע המארה (Chez Marianne).",
                "price_tier": "$$$",
                "avg_cost_person_usd": 45.0,
                "rating": 4.6,
            },
            {
                "name": "Bouillon Pigalle / Bouillon Chartier",
                "neighborhood": "אופרה / פיגאל",
                "cuisine_style": "בראסרי פריזאי מסורתי במחיר נגיש",
                "description": "אולם ארט-נובו ענק מהמאה ה-19 המגיש מטבח צרפתי מסורתי מהיר, טרי ומשתלם במיוחד באווירה היסטורית חיה שאין שנייה לה בפריז.",
                "signature_dish": "מרק בצל פריזאי, דג ים בחמאת לימון ומוס שוקולד ביתי",
                "atmosphere": "אולם מראות ענק, מלצרים זריזים ואנרגיה פריזאית של פעם",
                "booking_tip": "אפשר להגיע ישירות בצהריים או להזמין ב-Bouillon Pigalle אונליין כדי לדלג על התור.",
                "kosher_note": "לא כשר; קיימות מנות דגים, ביצים, גבינות וקינוחים.",
                "price_tier": "$",
                "avg_cost_person_usd": 22.0,
                "rating": 4.6,
            },
            {
                "name": "Chez Marianne (המארה)",
                "neighborhood": "לה מארה (Le Marais)",
                "cuisine_style": "פיוז'ן ים-תיכוני צרפתי כשר",
                "description": "הביסטרו המוכר ביותר ברובע היהודי במארה, המפורסם בזכות ויטרינת הסלטים הצבעונית, המאזטים הטריים והאוכל הביתי הנדיב באווירה פריזאית.",
                "signature_dish": "צלחת 5 מזטים לבחירה עם לאפה חמה, סלמון צלוי וקינוחים פרווה",
                "atmosphere": "צבעוני, חם ומזמין ברחוב מרכזי ושוקק במארה",
                "booking_tip": "מצוין לארוחת צהריים מהירה או ערב רגוע; סגור בשבת.",
                "kosher_note": "כשר למהדרין בהשגחת בית דין פריז.",
                "price_tier": "$$",
                "avg_cost_person_usd": 29.0,
                "rating": 4.6,
            },
        ],
        "london": [
            {
                "name": "Dishoom Covent Garden",
                "neighborhood": "קובנט גארדן (Covent Garden)",
                "cuisine_style": "הודי-בומביי עכשווי",
                "description": "מסעדה מעוצבת בהשראת בתי הקפה ההיסטוריים של בומביי, הזוכה לשבחים מכל העולם על טעמים עמוקים, אווירה קולנועית ושירות לבבי במיוחד.",
                "signature_dish": "House Black Daal בבישול איטי של 24 שעות, נאן שום וצ'אי מסאלה חם",
                "atmosphere": "חמים, תאורת מנורות וינטג', מוסיקה קלה ונעימה",
                "booking_tip": "מומלץ להזמין שולחן לצהריים באתר או להגיע ב-17:30 לערב לפני שעות השיא.",
                "kosher_note": "הרבה מנות צמחוניות/טבעוניות מעולות; המסעדה עצמה ללא תעודת כשרות.",
                "price_tier": "$$",
                "avg_cost_person_usd": 34.0,
                "rating": 4.8,
            },
            {
                "name": "Borough Market Street & Fish Kitchen",
                "neighborhood": "שוק בורו (Southwark)",
                "cuisine_style": "אוכל שוק בריטי וים-תיכוני",
                "description": "הגעה למרכז הגסטרונומי התוסס של לונדון מציעה שילוב בלתי נשכח של פיש אנד צ'יפס טרי, ריזוטו פטריות בסיר ענק, גבינות מיושנות ומאפים לוהטים.",
                "signature_dish": "Fish & Chips פריך מדג קוד טרי, ריזוטו כמהין ותותים עם שוקולד חם",
                "atmosphere": "שוק אוכל תוסס ומקורה מתחת לקשתות הרכבת הוויקטוריאניות",
                "booking_tip": "פתוח בשעות היום (בעיקר ג'–א'); הקדימו ל-11:45 כדי לאכול בנחת.",
                "kosher_note": "מבחר ענק של מאפים, גבינות ודוכנים צמחוניים; למסעדה כשרה בחרו ב-Reubens במרילבון.",
                "price_tier": "$",
                "avg_cost_person_usd": 20.0,
                "rating": 4.8,
            },
        ],
        "barcelona": [
            {
                "name": "El Nacional Barcelona",
                "neighborhood": "פסץ' דה גרסיה (Eixample)",
                "cuisine_style": "טאפאס ובראסרי קטלוני",
                "description": "חלל מרהיב בסגנון תעשייתי-וינטג' משנת 1889 המאגד תחת גג זכוכית ענק ארבע מסעדות מתמחות: טאפאס, דגים טריים, בשרים ובר קוקטיילים.",
                "signature_dish": "טאפאס פאטאטאס בראבאס, לחם עם עגבנייה (Pa amb tomàquet) ודגים טריים",
                "atmosphere": "ארכיטקטורה עוצרת נשימה ותקרות גבוהות בלב ברצלונה",
                "booking_tip": "לאזור הטאפאס אפשר להיכנס בהליכה; למסעדת הדגים הזמינו שולחן מראש.",
                "kosher_note": "לא כשר; לארוחה כשרה מהדרין בברצלונה בחרו ב-Shafir או Maccabi.",
                "price_tier": "$$",
                "avg_cost_person_usd": 36.0,
                "rating": 4.7,
            },
            {
                "name": "Cervecería Catalana",
                "neighborhood": "אישמפלה (Eixample)",
                "cuisine_style": "בר טאפאס ופינצ'וס אותנטי",
                "description": "בר הטאפאס הכי מפורסם בברצלונה בקרב מקומיים ומבקרים, עם ויטרינה ארוכה של מנות טריות שיוצאות מהמטבח בכל כמה דקות במחירים הוגנים.",
                "signature_dish": "פינצ'וס סלמון על בגט קלוי, פטריות צלויות ופלפלי פדרון",
                "atmosphere": "המולה ספרדית שמחה, ישיבה על הבר או במרפסת המקורה",
                "booking_tip": "מומלץ להגיע ב-12:30 או ב-19:30 ולהירשם ברשימת ההמתנה אצל המארחת.",
                "kosher_note": "תפריט עשיר בטאפאס ירקות, דגים וגבינות; ללא תעודת כשרות.",
                "price_tier": "$$",
                "avg_cost_person_usd": 28.0,
                "rating": 4.7,
            },
        ],
    }

    alias_map = {
        "bali": ["bali", "באלי"],
        "santorini": ["santorini", "סנטוריני"],
        "rome": ["rome", "רומא"],
        "paris": ["paris", "פריז"],
        "london": ["london", "לונדון"],
        "barcelona": ["barcelona", "ברצלונה"],
    }
    dining = None
    for key, patterns in alias_map.items():
        if any(p in dest_lower or p in dest_clean for p in patterns):
            dining = [dict(item) for item in restaurant_catalogs.get(key, [])]
            break

    if not dining:
        dining = [
            {
                "name": f"Bistrot Authentique {dest_clean}",
                "neighborhood": "מרכז העיר העתיקה",
                "cuisine_style": "ביסטרו מקומי מסורתי",
                "description": f"ביסטרו עטור שבחים בלב האזור ההיסטורי של {dest_clean}, המגיש פרשנות מוקפדת למתכונים מסורתיים מתוצרת שווקים מקומית טרייה.",
                "signature_dish": "מנת השף המסורתית מחומרי גלם עונתיים טריים",
                "atmosphere": "אינטימי, שולחנות עץ, שירות אישי ומרתף יינות אזורי",
                "booking_tip": "מומלץ להזמין שולחן לערב יום-יומיים מראש או להגיע ב-12:30 לצהריים.",
                "kosher_note": "כולל מנות צמחוניות ודגים פשוטים; ללא השגחת כשרות רשמית.",
                "price_tier": "$$",
                "avg_cost_person_usd": 35.0,
                "rating": 4.8,
            },
            {
                "name": f"{dest_clean} Gourmet Terrace",
                "neighborhood": "רובע הנמל והטיילת",
                "cuisine_style": "שף ודגים ים-תיכוני",
                "description": f"מסעדת מרפסת מוארת הצופה אל קו הרקיע והטיילת של {dest_clean}, אידיאלית לארוחת צהריים רגועה או שקיעה רומנטית מול הנוף.",
                "signature_dish": "דגי ים טריים על הגריל, סלטים עונתיים וקינוחים בעבודת יד",
                "atmosphere": "מרפסת אוורירית מול הנוף עם שירות אדיב ומוסיקת רקע שקטה",
                "booking_tip": "בקשו בהזמנה שולחן במרפסת החיצונית.",
                "kosher_note": "זמינות של דגים שלמים בגריל וירקות טריים לפי בקשה.",
                "price_tier": "$$$",
                "avg_cost_person_usd": 48.0,
                "rating": 4.7,
            },
        ]

    for d in dining:
        d["google_maps_url"] = make_maps_url(d["name"])

    dining = _run_async(_enrich_places_with_nominatim(dining, dest_clean))

    return json.dumps({
        "destination": dest_clean,
        "recommendations": dining,
    }, ensure_ascii=False, indent=2)


def get_neighborhood_guide(destination: str) -> str:
    """
    Returns neighborhood transit, walkability ratings, and local tips.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()

    if "bali" in dest_lower or "באלי" in dest_clean:
        data = {
            "destination": "באלי, אינדונזיה",
            "walkability_rating": "בינונית (מומלץ להתנייד במוניות Grab/Gojek או נהג פרטי צמוד)",
            "recommended_transit": "נהג פרטי לטיולי יום מלאים (כ-$40-$50 ליום שלם) ואפליקציית Grab לנסיעות קצרות",
            "neighborhood_breakdown": [
                {"area": "אובוד (Ubud)", "best_for": "טבע, מקדשים, יוגה, ספא וקולינריה מסורתית"},
                {"area": "צ'אנגו (Canggu)", "best_for": "חיי לילה, גלישת גלים, בתי קפה מעוצבים ואווירה צעירה"},
                {"area": "אולוואטו (Uluwatu)", "best_for": "חופי גלישה מוזהבים, צוקים דרמטיים ומלונות יוקרה"},
            ],
            "local_tips": [
                "הזמינו נהג יומי פרטי דרך המלון או אפליקציה — זו הדרך הנוחה והזולה ביותר לחקור את האי בלי דאגות חניה.",
                "הקפידו על שתיית מים מבוקבקים בלבד ושמרו תמיד שטרות מזומן קטנים של רופיה אינדונזית לטיפים ולכניסות למקדשים.",
                "בקרו בטרסות האורז מוקדם בבוקר (לפני 09:00) כדי לחזות בערפילי הבוקר הקסומים ולהימנע מעומס המבקרים.",
            ],
        }
    elif "santorini" in dest_lower or "סנטוריני" in dest_clean:
        data = {
            "destination": "סנטוריני, יוון",
            "walkability_rating": "גבוהה מאוד בתוך הכפרים (סמטאות הולכי רגל), נדרש רכב/אוטובוס בין הכפרים",
            "recommended_transit": "אוטובוסים מקומיים (KTEL) מודרניים או השכרת רכב קטן / טרקטורון (ATV)",
            "neighborhood_breakdown": [
                {"area": "אויה (Oia)", "best_for": "שקיעות אייקוניות, מלונות בוטיק וחנויות יוקרה"},
                {"area": "אימרוביגלי (Imerovigli)", "best_for": "שקט מרבי, נופי צוק הקלדרה ורומנטיקה"},
                {"area": "פירה (Fira)", "best_for": "מסעדות, חיי לילה, קניות ומרכז התחבורה של האי"},
            ],
            "local_tips": [
                "הזמינו מקום מראש במסעדות על שפת הצוק לשעת השקיעה כדי להבטיח שולחן בשורה הראשונה.",
                "נעלו נעלי הליכה נוחות עם אחיזה טובה למדרגות האבן המלוטשות של אויה ופירה.",
            ],
        }
    else:
        data = {
            "destination": dest_clean,
            "walkability_rating": "גבוהה מאוד במרכז העיר ההיסטורי",
            "recommended_transit": "תחבורה ציבורית יעילה (מטרו ואוטובוסים) והליכה רגלית בסמטאות",
            "neighborhood_breakdown": [
                {"area": "המרכז ההיסטורי", "best_for": "אתרי מורשת, מוזיאונים, שווקים ומסעדות שף"},
                {"area": "רובע האמנים והאופנה", "best_for": "בתי קפה בוטיק, גלריות עצמאיות וחיי לילה"},
            ],
            "local_tips": [
                "רכשו כרטיס נסיעה יומי לתחבורה הציבורית לחסכון משמעותי בעלויות הנסיעה.",
                "התחילו את הסיורים באתרי החובה מוקדם בבוקר כדי ליהנות מהאתרים ללא תורים ארוכים.",
            ],
        }

    return json.dumps(data, ensure_ascii=False, indent=2)
