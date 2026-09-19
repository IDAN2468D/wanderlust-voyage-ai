import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("culinary_tools")

CITY_CULINARY_DATABASE: Dict[str, Dict[str, Any]] = {
    "רומא": {
        "specialties": ["Cacio e Pepe", "Carbonara", "Supplì", "Artichokes alla Giudia", "Gelato Artigianale"],
        "kosher_options": [
            {
                "name": "Ba'Ghetto (הגטו היהודי)",
                "type": "בשרי / גלאט כשר",
                "address": "Via del Portico d'Ottavia 1",
                "specialty": "קרצ'ופי אלה ג'ודיאה (ארטישוק מטוגן רומאי מסורתי)",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Ba+Ghetto+Rome",
            },
            {
                "name": "Ba'Ghetto Milky (חלבי)",
                "type": "חלבי כשר למהדרין",
                "address": "Via del Portico d'Ottavia 2",
                "specialty": "פיצה רומאית קריספית ופסטה קאצ'ו א פפה כשרה",
                "rating": 4.5,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Ba+Ghetto+Milky+Rome",
            },
            {
                "name": "Bona Pasticceria Ebraica",
                "type": "מאפייה כשרה היסטורית",
                "address": "Via del Portico d'Ottavia",
                "specialty": "עוגת ריקוטה ודובדבנים מסורתית",
                "rating": 4.7,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Boccione+Bakery+Rome",
            },
        ],
        "gourmet_dining": [
            {"name": "Roscioli Salumeria con Cucina", "type": "ביסטרו יין ופחמימות עילי", "neighborhood": "Campo de' Fiori", "rating": 4.7},
            {"name": "Trattoria Da Enzo al 29", "type": "טרטוריה מסורתית מפורסמת", "neighborhood": "Trastevere", "rating": 4.6},
        ],
        "nightlife_spots": [
            {"name": "The Jerry Thomas Project", "type": "בר ספיק-איזי מחתרתי (חובה סיסמה מראש)", "vibe": "קוקטיילים קלאסיים שנות ה-20"},
            {"name": "Freni e Frizioni", "type": "בר אפריטיבו תוסס ליד הנהר", "vibe": "אפריטיבו איטלקי צעיר ומוזיקה"},
        ],
        "tipping_etiquette": "באיטליה השירות לרוב כלול או מופיע כ-Coperto (דמי עריכת שולחן, 2-3 אירו). עיגול החשבון למעלה ב-5%-10% במסעדות ערב מנומס אך אינו חובה.",
        "reservation_tip": "הזמינו שולחנות בטרסטוורה וברוסקיולי לפחות שבועיים מראש דרך TheFork או אתר המסעדה.",
    },
    "פריז": {
        "specialties": ["Croissant & Pain au Chocolat", "Soupe à l'oignon", "Boeuf Bourguignon", "Crêpes & Galettes", "Macarons"],
        "kosher_options": [
            {
                "name": "Chez Marianne (המארה)",
                "type": "פיוז'ן ים-תיכוני כשר",
                "address": "Rue des Rosiers, Le Marais",
                "specialty": "פלטת מזטים פריזאית-מזרח תיכונית",
                "rating": 4.5,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Chez+Marianne+Paris",
            },
            {
                "name": "L'As du Fallafel",
                "type": "כשר / סטריט פוד מיתולוגי",
                "address": "34 Rue des Rosiers",
                "specialty": "פיתה עמוסה בחצילים מטוגנים וטחינה משובחת",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=L+As+du+Fallafel+Paris",
            },
            {
                "name": "Le 17ème Brasserie Cacher",
                "type": "בראסרי בשרי כשר יוקרתי",
                "address": "17th Arrondissement",
                "specialty": "סטייק אנטרקוט פריזאי וקינוחים עיליים",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Kosher+Restaurant+Paris+17",
            },
        ],
        "gourmet_dining": [
            {"name": "Le Comptoir du Relais", "type": "ביסטרונומיה צרפתית", "neighborhood": "Saint-Germain-des-Prés", "rating": 4.6},
            {"name": "Septime", "type": "מישלן מודרני עונתי", "neighborhood": "11th Arr.", "rating": 4.8},
        ],
        "nightlife_spots": [
            {"name": "Moonshiner", "type": "בר ספיק-איזי מוסתר בתוך פיצרייה", "vibe": "ג'אז, ויסקי וקוקטיילים אינטימיים"},
            {"name": "Le Perchoir Marais", "type": "רופטופ פנורמי מול מגדל אייפל", "vibe": "נוף מרהיב, יין ואווירה שיקית"},
        ],
        "tipping_etiquette": "בצרפת חוקית החשבון כולל תמיד 'Service Compris' (15% שירות). נהוג להשאיר מטבע של 1-2 אירו בבית קפה, או 5%-7% במסעדת יוקרה.",
        "reservation_tip": "למסעדות מבוקשות בפריז הזמינו דרך TheFork (LaFourchette) לפחות 3 שבועות מראש.",
    },
    "לונדון": {
        "specialties": ["Sunday Roast with Yorkshire Pudding", "Fish and Chips", "English Afternoon Tea", "Chicken Tikka Masala"],
        "kosher_options": [
            {
                "name": "Reubens Restaurant (Baker Street)",
                "type": "כשר גלאט מסורתי",
                "address": "79 Baker St, Marylebone",
                "specialty": "קורנדביף ניו-יורקי פרימיום ומרק קניידלך",
                "rating": 4.5,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Reubens+Restaurant+Baker+Street+London",
            },
            {
                "name": "Novellino",
                "type": "חלבי איטלקי כשר",
                "address": "Golders Green",
                "specialty": "פסטות טריות וקינוחי קרם עשירים",
                "rating": 4.5,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Novellino+Golders+Green+London",
            },
        ],
        "gourmet_dining": [
            {"name": "Dishoom", "type": "מסעדת בומביי אגדית", "neighborhood": "Covent Garden / Shoreditch", "rating": 4.7},
            {"name": "The Wolseley", "type": "קפה-בראסרי מלכותי", "neighborhood": "Mayfair / Piccadilly", "rating": 4.6},
        ],
        "nightlife_spots": [
            {"name": "Nightjar (Old Street)", "type": "מועדון ג'אז וספיק-איזי מתוחכם", "vibe": "קוקטיילים תקופתיים עם הגשה אמנותית"},
            {"name": "Aqua Shard", "type": "בר יוקרתי בקומה ה-31 של מגדל השארד", "vibe": "תצפית מרהיבה על התמזה וגשר לונדון"},
        ],
        "tipping_etiquette": "בלונדון מתווסף לרוב 'Optional 12.5% Service Charge' לחשבון. אם הוסף, אין צורך להשאיר טיפ נוסף.",
        "reservation_tip": "הזמינו מקום דרך OpenTable. ב-Dishoom מומלץ להגיע לפני 18:00 כדי להימנע מתור ארוך.",
    },
    "ברצלונה": {
        "specialties": ["Tapas & Pintxos", "Paella de Marisco", "Crema Catalana", "Jamon Iberico", "Churros con Chocolate"],
        "kosher_options": [
            {
                "name": "Shafir Restaurant Kosher",
                "type": "בשרי כשר למהדרין",
                "address": "Carrer d'Aribau",
                "specialty": "טאפאס כשרים, בשרים מובחרים ופייה ספרדית כשרה",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Shafir+Kosher+Barcelona",
            },
            {
                "name": "Maccabi Kosher Restaurant",
                "type": "כשר / מרכז הראמבלס",
                "address": "La Rambla 79",
                "specialty": "אוכל ים-תיכוני וספרדי כשר במיקום מרכזי",
                "rating": 4.4,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Maccabi+Kosher+Barcelona",
            },
        ],
        "gourmet_dining": [
            {"name": "El Xampanyet", "type": "טאפאס בר היסטורי תוסס", "neighborhood": "El Born", "rating": 4.7},
            {"name": "Cervecería Catalana", "type": "מוסד הטאפאס המוביל בעיר", "neighborhood": "Eixample", "rating": 4.6},
        ],
        "nightlife_spots": [
            {"name": "Paradiso", "type": "בר הקוקטיילים המדורג ראשון בעולם (חבוי מאחורי מעדניית פסטרמה)", "vibe": "חוויה תיאטרלית יוצאת דופן"},
            {"name": "Boadas Cocktails", "type": "בר הקוקטיילים הוותיק ביותר בברצלונה (משנת 1933)", "vibe": "ברמנים בחליפות וקוקטיילים מדויקים"},
        ],
        "tipping_etiquette": "בספרד טיפ אינו חובה. מקובל להשאיר עודף או 5%-10% עבור שירות יוצא מן הכלל.",
        "reservation_tip": "הספרדים סועדים מאוחר (ארוחת צהריים 14:00-16:00, ערב מ-21:00). ל-Paradiso מומלץ לעמוד בתור בשעה 18:30.",
    },
}


def get_culinary_guide(destination: str, dietary_preferences: Optional[List[str]] = None) -> str:
    """
    Returns curated gourmet dining, kosher venues, nightlife spots, and etiquette for destination.
    """
    dest_clean = destination.strip()
    dest_lower = dest_clean.lower()
    preferences = [p.lower() for p in (dietary_preferences or [])]

    matched_key = None
    for key in CITY_CULINARY_DATABASE:
        if key in dest_clean or dest_lower in key.lower():
            matched_key = key
            break

    if matched_key:
        city_info = CITY_CULINARY_DATABASE[matched_key]
        result = {
            "destination": dest_clean,
            "specialties": city_info["specialties"],
            "kosher_options": city_info["kosher_options"],
            "gourmet_dining": city_info["gourmet_dining"],
            "nightlife_spots": city_info["nightlife_spots"],
            "tipping_etiquette": city_info["tipping_etiquette"],
            "reservation_tip": city_info["reservation_tip"],
            "is_curated": True,
        }
    else:
        result = {
            "destination": dest_clean,
            "specialties": [
                f"מאכלי שף מסורתיים של אזור {dest_clean}",
                "מנות סטריט-פוד אותנטיות בשווקים",
                "קינוחים אזוריים מפורסמים",
            ],
            "kosher_options": [
                {
                    "name": f"בית חב\"ד {dest_clean} (Chabad House)",
                    "type": "ארוחות שבת וסיוע כשרות",
                    "address": f"מרכז העיר {dest_clean}",
                    "specialty": "סעודות שבת קהילתיות, אספקת אוכל כשר ומצרכים",
                    "rating": 4.9,
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query=Chabad+{dest_clean}",
                }
            ],
            "gourmet_dining": [
                {"name": f"Bistro Central {dest_clean}", "type": "ביסטרו שף עונתי", "neighborhood": "מרכז העיר", "rating": 4.7},
                {"name": f"Osteria Panorama {dest_clean}", "type": "מטבח מקומי אותנטי", "neighborhood": "העיר העתיקה", "rating": 4.6},
            ],
            "nightlife_spots": [
                {"name": f"Skyline Lounge {dest_clean}", "type": "רופטופ בר פנורמי", "vibe": "קוקטיילים ושקיעה"},
                {"name": f"Secret Cellar Bar {dest_clean}", "type": "בר מרתף היסטורי", "vibe": "מוזיקה חיה ויינות מקומיים"},
            ],
            "tipping_etiquette": f"במרבית המסעדות ב{dest_clean} נהוג לבדוק האם דמי השירות כלולים בחשבון. טיפ של 10% מקובל ומביע הערכה לשירות טוב.",
            "reservation_tip": f"מומלץ להזמין מקומות למסעדות מבוקשות ב{dest_clean} שבוע מראש דרך Google Maps, OpenTable או אתרי המסעדות.",
            "is_curated": False,
        }

    return json.dumps(result, ensure_ascii=False)
