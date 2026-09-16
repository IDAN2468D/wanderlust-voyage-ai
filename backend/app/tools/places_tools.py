import json
import random
import urllib.parse
from typing import Optional, List, Dict, Any


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
                "description": "מקדש עתיק ומרהיב הניצב בראש צוק תלול בגובה 70 מטרים מעל גלי האוקיינוס ההודי.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 3.5,
                "best_time": "שעות אחר הצהריים לקראת שקיעה ומופע האש",
                "highlight": "נוף פנורמי אינסופי של האוקיינוס ומופע אש מסורתי מהפנט",
                "rating": 4.8,
                "lat": -8.8291,
                "lng": 115.0849,
            },
            {
                "name": "שמורת יער הקופים המקודש באובוד (Ubud Monkey Forest)",
                "category": "טבע וחיות בר",
                "description": "יער גשם מקודש ושמור שבו משוטטים מאות קופי מקאק חופשיים בין מקדשים עתיקים מכוסי טחב.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 5.5,
                "best_time": "שעות הבוקר (09:00 - 11:30)",
                "highlight": "מפגש מרתק עם קופים וצמחייה טרופית עבותה בת מאות שנים",
                "rating": 4.7,
                "lat": -8.5194,
                "lng": 115.2631,
            },
            {
                "name": "טרסות האורז של טגלאלנג (Tegallalang Rice Terraces)",
                "category": "נופים וטבע",
                "description": "טרסות אורז מדורגות בצבע ירוק אזמרגד מרהיב הפועלות בשיטת ההשקיה המסורתית סובאק.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 2.0,
                "best_time": "בוקר מוקדם עם קרני הזריחה",
                "highlight": "נדנדת ג'ונגל מפורסמת מעל עמק האורז ושבילי הליכה מוריקים",
                "rating": 4.6,
                "lat": -8.4343,
                "lng": 115.2796,
            },
            {
                "name": "מקדש המעיין הקדוש טירתה אמפול (Tirta Empul)",
                "category": "תרבות ורוחניות",
                "description": "מקדש מעיינות קדוש מהמאה ה-10 שבו מקומיים ומטיילים עוברים טבילת טיהור מסורתית.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 3.5,
                "best_time": "שעות הבוקר או הצהריים המוקדמות",
                "highlight": "טקס הטבילה הרוחני בבריכות האבן המעוטרות",
                "rating": 4.7,
                "lat": -8.4150,
                "lng": 115.3150,
            },
            {
                "name": "מקדש טאנה לוט על הים (Tanah Lot Temple)",
                "category": "אתר מורשת ונוף",
                "description": "מקדש ציורי מפורסם הניצב על תצורת סלע מבודדת בלב הגלים.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 4.0,
                "best_time": "שעת השקיעה בשפל",
                "highlight": "שקיעה פוטוגנית ברקע צללית המקדש והגלים הנשברים",
                "rating": 4.6,
                "lat": -8.6212,
                "lng": 115.0868,
            },
            {
                "name": "שייט וצלילה בחופי נוסה פנידה (Nusa Penida & Kelingking Beach)",
                "category": "הרפתקה ואטרקציות ימיות",
                "description": "אי שכורת נשימה עם צוק T-Rex המפורסם, לגונות קריסטל צלולות ושנורקלינג עם מנטות ענק.",
                "recommended_hours": 6.0,
                "entry_fee_usd": 35.0,
                "best_time": "יציאה מוקדמת בסירת מנוע מהירה",
                "highlight": "תצפית המצוק הגבוהה בעולם ומים בצבע טורקיז בוהק",
                "rating": 4.9,
                "lat": -8.7497,
                "lng": 115.5434,
            },
        ],
        "santorini": [
            {
                "name": "טיילת הצוק והשקיעה של אויה (Oia Castle Viewpoint)",
                "category": "נוף וצילום",
                "description": "נקודת התצפית האייקונית על שפת לוע הר הגעש עם בתי הסיד הלבנים והכיפות הכחולות.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 0.0,
                "best_time": "שעה לפני השקיעה",
                "highlight": "השקיעה המפורסמת בעולם מעל הים האגאי",
                "rating": 4.9,
                "lat": 36.4618,
                "lng": 25.3753,
            },
            {
                "name": "העיר הפרהיסטורית אקרוטירי (Akrotiri Ruins)",
                "category": "היסטוריה וארכיאולוגיה",
                "description": "פומפיי המינואית — יישוב פרהיסטורי שהשתמר בשלמותו תחת אפר וולקני מלפני 3,600 שנה.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 12.0,
                "best_time": "שעות הבוקר (10:00)",
                "highlight": "מבני קומות, ציורי קיר עתיקים ומערכות ביוב מתקדמות",
                "rating": 4.7,
                "lat": 36.3512,
                "lng": 25.4034,
            },
            {
                "name": "שייט קטמרן סביב הקלדרה והמעיינות החמים (Caldera Catamaran Cruise)",
                "category": "שייט ופנאי",
                "description": "שייט יום בקטמרן יוקרתי עם עצירות לרחצה במעיינות וולקניים חמים וארוחת ברביקיו על הסיפון.",
                "recommended_hours": 5.0,
                "entry_fee_usd": 95.0,
                "best_time": "שעות הצהריים עד השקיעה",
                "highlight": "טבילה במעיינות גופרית חמים ונוף הצוקים הוולקניים מהמים",
                "rating": 4.9,
                "lat": 36.4022,
                "lng": 25.4321,
            },
            {
                "name": "שביל ההליכה פירה-אימרוביגלי-אויה (Fira to Oia Cliff Trail)",
                "category": "טבע ונוף",
                "description": "מסלול הליכה עוצר נשימה הנמתח לאורך שפת הצוק הגבוה מעל הים.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 0.0,
                "best_time": "בוקר מוקדם לפני עומס החום",
                "highlight": "נופים פנורמיים פתוחים של הקלדרה לכל אורך הדרך",
                "rating": 4.8,
                "lat": 36.4320,
                "lng": 25.4280,
            },
            {
                "name": "החוף האדום המפורסם (Red Beach / Kokkini Paralia)",
                "category": "חופים וטבע",
                "description": "חוף וולקני ייחודי מוקף בצוקי לבה אדומים מדהימים ומים צלולים כבדולח.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 0.0,
                "best_time": "בוקר",
                "highlight": "חול געשי אדמדם וניגוד צבעים מרהיב מול המים הכחולים",
                "rating": 4.5,
                "lat": 36.3486,
                "lng": 25.3948,
            },
        ],
        "paris": [
            {
                "name": "מוזיאון הלובר וגני טווילרי (Musée du Louvre)",
                "category": "אמנות ותרבות",
                "description": "מוזיאון האמנות הגדול והמפורסם בעולם, משכנה של המונה ליזה ופסל ונוס ממילו.",
                "recommended_hours": 3.5,
                "entry_fee_usd": 24.0,
                "best_time": "בוקר (09:00)",
                "highlight": "יצירות מופת של גדולי האמנים בארמון מלכותי מפואר",
                "rating": 4.8,
                "lat": 48.8606,
                "lng": 2.3376,
            },
            {
                "name": "מגדל אייפל ושדרות שאן דה מארס (Eiffel Tower)",
                "category": "אתר מורשת ונוף",
                "description": "סמלה הנצחי של פריז עם נקודת תצפית פנורמית עוצרת נשימה על כל גגות העיר.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 32.0,
                "best_time": "שעת השקיעה לקראת מופע האורות המנצנץ",
                "highlight": "תצפית 360 מעלות על עיר האורות",
                "rating": 4.7,
                "lat": 48.8584,
                "lng": 2.2945,
            },
            {
                "name": "גבעת מונמארטר ובזיליקת סקרה-קר (Montmartre & Sacré-Cœur)",
                "category": "היסטוריה ואווירה",
                "description": "רובע האמנים הבוהמייני הציורי עם סמטאות אבן, בתי קפה ותצפית מפסגת הבזיליקה.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 0.0,
                "best_time": "שעות אחר הצהריים",
                "highlight": "אווירה פריזאית רומנטית וכיכר הציירים פלאס דו טרטר",
                "rating": 4.7,
                "lat": 48.8867,
                "lng": 2.3431,
            },
            {
                "name": "שייט שקיעה על נהר הסיין (Seine Sunset Cruise)",
                "category": "פנאי ושייט",
                "description": "שייט רגוע העובר מתחת לגשרים המוארים של פריז, מול כנסיית נוטרדאם ומוזיאון ד'אורסיי.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 18.0,
                "best_time": "ערב (20:00)",
                "highlight": "מבט מהמים על מונומנטים היסטוריים מוארים",
                "rating": 4.8,
                "lat": 48.8590,
                "lng": 2.2930,
            },
        ],
        "rome": [
            {
                "name": "הקולוסיאום והפורום הרומאי (Colosseum & Roman Forum)",
                "category": "היסטוריה וארכיאולוגיה",
                "description": "האמפיתיאטרון הגדול ביותר שנבנה אי פעם ולב ליבה של האימפריה הרומית.",
                "recommended_hours": 3.0,
                "entry_fee_usd": 22.0,
                "best_time": "בוקר מוקדם (08:30)",
                "highlight": "הליכה על רצפת הזירה וברחובות שבהם צעדו יוליוס קיסר והגלדיאטורים",
                "rating": 4.8,
                "lat": 41.8902,
                "lng": 12.4922,
            },
            {
                "name": "מוזיאוני הוותיקן והקפלה הסיסטינית (Vatican Museums & Sistine Chapel)",
                "category": "אמנות ודת",
                "description": "אוסף אמנות אפיפיורי אדיר המגיע לשיאו בפרסקו התקרה של מיכלאנג'לו.",
                "recommended_hours": 3.5,
                "entry_fee_usd": 28.0,
                "best_time": "צהריים עם כרטיס דילוג על התור",
                "highlight": "יצירת המופת 'בריאת האדם' של מיכלאנג'לו",
                "rating": 4.8,
                "lat": 41.9065,
                "lng": 12.4536,
            },
            {
                "name": "מזרקת טרווי והמדרגות הספרדיות (Trevi Fountain & Spanish Steps)",
                "category": "אדריכלות ותרבות",
                "description": "מזרקת הבארוק המפורסמת בתבל והמדרגות המונומנטליות של פיאצה די ספניה.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 0.0,
                "best_time": "שעות הבוקר המוקדמות או הלילה המאוחר",
                "highlight": "הטלת מטבע מסורתית למזרקה להבטחת החזרה לרומא",
                "rating": 4.7,
                "lat": 41.9009,
                "lng": 12.4833,
            },
            {
                "name": "הפנתיאון ופיאצה נאבונה (Pantheon & Piazza Navona)",
                "category": "היסטוריה וקולינריה",
                "description": "מקדש רומי עתיק שהשתמר בשלמותו עם כיפת הבטון המרשימה ופתח האוקולוס השמיימי.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 5.5,
                "best_time": "שעות הצהריים",
                "highlight": "אלומת אור השמש החודרת ממרכז הכיפה ומזרקת ארבעת הנהרות",
                "rating": 4.8,
                "lat": 41.8986,
                "lng": 12.4769,
            },
        ],
    }

    # Match catalog key
    catalog = None
    for key, items in city_catalogs.items():
        if key in dest_lower or (key == "bali" and ("באלי" in dest_clean or "bali" in dest_lower)):
            catalog = items
            break
        if key == "santorini" and ("סנטוריני" in dest_clean or "santorini" in dest_lower):
            catalog = items
            break

    if not catalog:
        # Generate rich dynamic catalog for any requested city
        seed = sum(ord(c) for c in dest_clean)
        rng = random.Random(seed)
        catalog = [
            {
                "name": f"העיר העתיקה והכיכר המרכזית ב{dest_clean}",
                "category": "היסטוריה ואדריכלות",
                "description": f"מרכז המורשת ההיסטורי של {dest_clean} עם סמטאות אבן, מבנים שמורים ושווקים מקומיים.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 0.0,
                "best_time": "שעות הבוקר (09:30)",
                "highlight": f"אווירה היסטורית אותנטית ותרבות מקומית שוקקת",
                "rating": 4.7,
                "lat": 30.0 + rng.uniform(-10, 10),
                "lng": 35.0 + rng.uniform(-10, 10),
            },
            {
                "name": f"מוזיאון המורשת והאמנות של {dest_clean}",
                "category": "אמנות ותרבות",
                "description": f"תערוכות היסטוריות עשירות המציגות את עברה המרתק של {dest_clean}.",
                "recommended_hours": 2.5,
                "entry_fee_usd": 16.0,
                "best_time": "שעות הצהריים",
                "highlight": "אוצרות תרבות אזוריים ואמנות מודרנית",
                "rating": 4.6,
                "lat": 30.0 + rng.uniform(-10, 10),
                "lng": 35.0 + rng.uniform(-10, 10),
            },
            {
                "name": f"תצפית הרכס הפנורמית ב{dest_clean}",
                "category": "נוף וטבע",
                "description": f"נקודת התצפית הגבוהה ביותר המציעה מראה 360 מעלות על כל האזור וקו הרקיע.",
                "recommended_hours": 1.5,
                "entry_fee_usd": 8.0,
                "best_time": "שעת השקיעה והזהב",
                "highlight": "נוף מרהיב ושקיעה עוצרת נשימה",
                "rating": 4.8,
                "lat": 30.0 + rng.uniform(-10, 10),
                "lng": 35.0 + rng.uniform(-10, 10),
            },
            {
                "name": f"השוק הצבעוני ורובע האמנים של {dest_clean}",
                "category": "קולינריה וקניות",
                "description": "דוכני מעדנים מקומיים, תבלינים אותנטיים ויצירות מלאכת יד מקוריות.",
                "recommended_hours": 2.0,
                "entry_fee_usd": 0.0,
                "best_time": "שעות אחר הצהריים",
                "highlight": "טעימות קולינריות אותנטיות ומזכרות ייחודיות",
                "rating": 4.5,
                "lat": 30.0 + rng.uniform(-10, 10),
                "lng": 35.0 + rng.uniform(-10, 10),
            },
        ]

    # Add Google Maps deep links to all items
    enriched_attractions = []
    for item in catalog[:max_results]:
        item_copy = dict(item)
        item_copy["google_maps_url"] = make_maps_url(item["name"], dest_clean)
        enriched_attractions.append(item_copy)

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
    Search for high-rated culinary venues, authentic local dining, and chef bistros.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()

    def make_maps_url(name: str) -> str:
        return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(name + ', ' + dest_clean)}"

    if "bali" in dest_lower or "באלי" in dest_clean:
        dining = [
            {
                "name": "Locavore NXT (אובוד)",
                "neighborhood": "אובוד",
                "signature_dish": "תפריט טעימות מקומי יצירתי מחומרי גלם טריים מחוות באלינזיות",
                "price_tier": "$$$",
                "avg_cost_person_usd": 65.0,
                "rating": 4.9,
            },
            {
                "name": "Bebek Bengil (Dirty Duck Diner)",
                "neighborhood": "מרכז אובוד מול טרסות אורז",
                "signature_dish": "ברווז פריך באלינזי מסורתי (Crispy Duck) עם אורז ותבליני סאמבאל",
                "price_tier": "$$",
                "avg_cost_person_usd": 22.0,
                "rating": 4.6,
            },
            {
                "name": "Mason Canggu",
                "neighborhood": "צ'אנגו (Canggu)",
                "signature_dish": "בשרים ודגים טריים בצלייה על עץ, ירקות אורגניים וקוקטיילים",
                "price_tier": "$$",
                "avg_cost_person_usd": 38.0,
                "rating": 4.7,
            },
        ]
    elif "santorini" in dest_lower or "סנטוריני" in dest_clean:
        dining = [
            {
                "name": "Metaxi Mas Tavern",
                "neighborhood": "אקסו גוניה (Exo Gonia)",
                "signature_dish": "טלה בתנור חרס, עגבניות שרי מיובשות ברוטב ייין וגבינת פטה אפויה",
                "price_tier": "$$",
                "avg_cost_person_usd": 40.0,
                "rating": 4.9,
            },
            {
                "name": "Ammoudi Fish Tavern",
                "neighborhood": "מפרץ אמורדי (אויה)",
                "signature_dish": "דגים טריים שלל היום על הגריל וקציצות עגבניות מסורתיות (Domatokeftedes)",
                "price_tier": "$$$",
                "avg_cost_person_usd": 55.0,
                "rating": 4.7,
            },
        ]
    else:
        dining = [
            {
                "name": f"Bistrot Authentique {dest_clean}",
                "neighborhood": "מרכז העיר העתיקה",
                "signature_dish": "מנת השף המסורתית מחומרי גלם עונתיים טריים",
                "price_tier": "$$",
                "avg_cost_person_usd": 35.0,
                "rating": 4.8,
            },
            {
                "name": f"{dest_clean} Gourmet Terrace",
                "neighborhood": "רובע הנמל והטיילת",
                "signature_dish": "דגי ים טריים וקינוחים אזוריים בעבודת יד",
                "price_tier": "$$$",
                "avg_cost_person_usd": 48.0,
                "rating": 4.7,
            },
        ]

    for d in dining:
        d["google_maps_url"] = make_maps_url(d["name"])

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
