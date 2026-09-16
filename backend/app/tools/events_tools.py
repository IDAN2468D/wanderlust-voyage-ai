import json
from typing import Dict, Any, List, Optional


def search_seasonal_events_and_gems(
    destination: str,
    travel_month: Optional[int] = None,
) -> str:
    """
    Discovers authentic seasonal festivals, hidden secret gems, and scenic sunset/nightlife spots.

    Args:
        destination (str): Destination city or region.
        travel_month (Optional[int]): Month number (1-12).

    Returns:
        str: JSON formatted string containing seasonal festivals, hidden gems, and sunset viewpoints.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()

    events_database: Dict[str, Dict[str, Any]] = {
        "bali": {
            "festivals": [
                {
                    "name": "פסטיבל מופע אש קצ'אק באולוואטו (Kecak Sunset Fire Dance)",
                    "frequency": "מדי ערב לקראת שקיעה",
                    "description": "מופע מסורתי מהפנט של עשרות רקדנים קוראים במקצב אחיד על שפת צוק אדיר מול האוקיינוס ההודי.",
                    "tag": "חובה לכל מטייל",
                },
                {
                    "name": "טקס טיהור מים במקדש טירתה אמפול (Melukat Water Purification)",
                    "frequency": "יומי / בימי ירח מלא",
                    "description": "טבילה רוחנית מקומית בבריכות מי מעיינות קדושים בג'ונגל של טמפקסירינג.",
                    "tag": "חוויה תרבותית אותנטית",
                },
            ],
            "secret_gems": [
                {
                    "name": "מפל טיבומנה (Tibumana Waterfall)",
                    "why_special": "מפל סודי בלב הג'ונגל הפראי עם בריכת שחייה טבעית צלולה ומעט מאוד תיירים יחסית למפלים הגדולים.",
                    "location": "באנגלי (מזרחית לאובוד)",
                    "maps_query": "Tibumana Waterfall, Bali",
                },
                {
                    "name": "צוק קאראנג בומא (Karang Boma Cliff)",
                    "why_special": "נקודת תצפית דרמטית וגבוהה בגובה 70 מטר מעל גלי האוקיינוס — הספוט המושלם ביותר לתמונות שקיעה ללא עומס.",
                    "location": "חצי האי פצ'אטו, אולוואטו",
                    "maps_query": "Karang Boma Cliff, Uluwatu, Bali",
                },
                {
                    "name": "בית קפה וספא בין טרסות האורז של סאייאן (Sayan Valley Viewpoint)",
                    "why_special": "נוף עוצר נשימה על נהר האיונג וטרסות אורז ירוקות זוהרות בשעות הבוקר המוקדמות.",
                    "location": "עמק סאייאן, אובוד",
                    "maps_query": "Sayan Valley, Ubud, Bali",
                },
            ],
            "sunset_nightlife_spots": [
                {"name": "Single Fin Bali (צוק אולוואטו)", "type": "רופטופ בר וגלישה", "neighborhood": "אולוואטו"},
                {"name": "La Brisa Beach Club", "type": "מועדון חוף אקולוגי עשוי עץ ספינות", "neighborhood": "אקו ביץ', צ'אנגו"},
                {"name": "The Sayan House", "type": "קוקטיילים פיוז'ן יפני-לטיני מול השקיעה", "neighborhood": "אובוד"},
            ],
        },
        "santorini": {
            "festivals": [
                {
                    "name": "קולנוע פתוח תחת כיפת השמיים בקמארי (Cine Kamari)",
                    "frequency": "מאי עד אוקטובר מדי לילה",
                    "description": "הקרנת סרטים בגן אקליפטוסים קסום עם קוקטיילים ויין סנטוריני מקומי.",
                    "tag": "חוויית לילה בלתי נשכחת",
                },
                {
                    "name": "פסטיבל היין והגפן של סנטוריני (Ifestia & Wine Tasting)",
                    "frequency": "סוף אוגוסט / ספטמבר",
                    "description": "חגיגת יינות אסירטיקו (Assyrtiko) ומופע זיקוקין מרהיב מעל לוע הר הגעש (קלדרה).",
                    "tag": "קולינריה ותרבות",
                },
            ],
            "secret_gems": [
                {
                    "name": "הכפר הציורי פירגוס (Pyrgos Medieval Village)",
                    "why_special": "כפר ימי-ביניימי שליו בראש ההר עם סמטאות מפותלות, בתי קפה נסתרים ותצפית 360 מעלות על כל האי.",
                    "location": "מרכז סנטוריני",
                    "maps_query": "Pyrgos Kallistis, Santorini",
                },
                {
                    "name": "מפרץ אמורדי (Ammoudi Bay)",
                    "why_special": "נמל דייגים צבעוני למרגלות הצוק של אויה עם טברנות דגים טריים ממש על שפת המים וקפיצה למים מהסלעים.",
                    "location": "למרגלות אויה",
                    "maps_query": "Ammoudi Bay, Oia, Santorini",
                },
                {
                    "name": "סלע סקארוס (Skaros Rock Hike)",
                    "why_special": "מסלול הליכה קצר אך מרטיט מהאימרוביגלי אל חורבות מצודה עתיקה על צוק בולט אל תוך הים.",
                    "location": "אימרוביגלי",
                    "maps_query": "Skaros Rock, Imerovigli, Santorini",
                },
            ],
            "sunset_nightlife_spots": [
                {"name": "PK Cocktail Bar", "type": "קוקטייל לאונג' יוקרתי הצופה על הקלדרה", "neighborhood": "פירה"},
                {"name": "Franco's Bar", "type": "מוזיקה קלאסית ושקיעה בלתי נשכחת", "neighborhood": "פירגוס"},
                {"name": "Sunset Serenade at Kastro", "type": "תצפית שקיעה רומנטית", "neighborhood": "אויה"},
            ],
        },
        "maldives": {
            "festivals": [
                {
                    "name": "ערב בידור מסורתי בודו-ברו (Bodu Beru Cultural Night)",
                    "frequency": "מדי שבוע בריזורטים המובילים",
                    "description": "מקצבי תופים מהפנטים וריקודים מסורתיים סביב מדורת חוף מול האוקיינוס.",
                    "tag": "פולקלור מקומי",
                },
            ],
            "secret_gems": [
                {
                    "name": "מפרץ הנאניפארו (Hanifaru Bay Biosphere)",
                    "why_special": "שמורת טבע מוגנת של אונסק\"ו שבה שוחים יחד עשרות מנטה ריי ענקיים וכרישי לוויתן עדינים.",
                    "location": "בא אטול (Baa Atoll)",
                    "maps_query": "Hanifaru Bay, Baa Atoll, Maldives",
                },
                {
                    "name": "חופי פלנקטון זוהרים (Bioluminescent Beach)",
                    "why_special": "תופעת טבע מרהיבה שבה גלי הים זוהרים בכחול ניאון זוהר בלילה בעקבות פלנקטון זוהר.",
                    "location": "אי וואדהו (Vaadhoo Island)",
                    "maps_query": "Vaadhoo Island, Maldives",
                },
            ],
            "sunset_nightlife_spots": [
                {"name": "Undersea Bar & Lounge", "type": "בר תת-ימי בעומק 5 מטר מתחת לגלים", "neighborhood": "ריזורט קונראד"},
                {"name": "Overwater Sunset Pavilion", "type": "קוקטיילים מעל המים ברשתות תלויות", "neighborhood": "בא אטול"},
            ],
        },
        "swiss_alps": {
            "festivals": [
                {
                    "name": "פסטיבל יונגפראו ומוזיקה אלפינית",
                    "frequency": "עונת הקיץ והסתיו",
                    "description": "נגינה בקרנות אלפיניות (Alphorn) מסורתיות מול הפסגות המושלגות של האייגר והמונך.",
                    "tag": "מסורת שוויצרית",
                },
            ],
            "secret_gems": [
                {
                    "name": "אגם אואשיננזה (Oeschinensee Mountain Lake)",
                    "why_special": "אגם טורקיז מרהיב המוקף בצוקי ענק מושלגים של 500 מטר — אחד המקומות היפים בתבל לשייט סירות עץ.",
                    "location": "קנדרשטג (Kandersteg)",
                    "maps_query": "Oeschinensee, Kandersteg, Switzerland",
                },
                {
                    "name": "הכפר השקט מורן (Mürren Car-Free Village)",
                    "why_special": "כפר הררי מבודד ללא כלי רכב ממונעים, התלוי על מדף צוק מעל עמק 72 המפלים של לאוטרברונן.",
                    "location": "עמק לאוטרברונן",
                    "maps_query": "Mürren, Switzerland",
                },
            ],
            "sunset_nightlife_spots": [
                {"name": "Piz Gloria 360 Revolving Restaurant", "type": "מסעדה מסתובבת על פסגת השילטהורן", "neighborhood": "שילטהורן"},
                {"name": "Iglu-Dorf Zermatt", "type": "בר איגלו עשוי קרח מול המטרהורן", "neighborhood": "צרמט"},
            ],
        },
    }

    # Match or fallback
    data = None
    for key, val in events_database.items():
        if key in dest_lower or (key == "swiss_alps" and ("אלפים" in dest_clean or "שוויץ" in dest_clean)):
            data = val
            break

    if not data:
        data = {
            "festivals": [
                {
                    "name": f"פסטיבל התרבות והאמנות המרכזי של {dest_clean}",
                    "frequency": "עונתי / סופי שבוע",
                    "description": f"חגיגת מוזיקה, שווקי אמנות ואוכל רחוב מקומי בסמטאות העיר העתיקה של {dest_clean}.",
                    "tag": "חוויה מקומית מומלצת",
                },
            ],
            "secret_gems": [
                {
                    "name": f"סמטת האמנים הנסתרת של {dest_clean}",
                    "why_special": "רחוב ציורי מרוצף אבן הרחק ממסלולי התיירים ההמוניים עם גלריות עצמאיות ובתי קפה אותנטיים.",
                    "location": f"העיר העתיקה, {dest_clean}",
                    "maps_query": f"Historic Old Town, {dest_clean}",
                },
                {
                    "name": f"מרפסת תצפית פנורמית סודית ב-{dest_clean}",
                    "why_special": "נוף 360 מעלות על כל קו הרקיע והשקיעה — מקום אידיאלי לצילומים מרהיבים בשקט מופתי.",
                    "location": f"{dest_clean}",
                    "maps_query": f"Panoramic Viewpoint, {dest_clean}",
                },
            ],
            "sunset_nightlife_spots": [
                {"name": f"Skyline Lounge & Rooftop {dest_clean}", "type": "רופטופ בר מודרני עם קוקטיילים ושקיעה", "neighborhood": "מרכז העיר"},
                {"name": f"Old Town Jazz & Wine Cellar", "type": "מרתף יין היסטורי עם הופעות ג'אז חיות", "neighborhood": "הרובע העתיק"},
            ],
        }

    return json.dumps({
        "destination": dest_clean,
        "culture_and_events": data,
    }, ensure_ascii=False, indent=2)
