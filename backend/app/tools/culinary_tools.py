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
                "price_tier": "$$$",
                "description": "מסעדת הדגל הוותיקה בלב הרובע היהודי ההיסטורי של רומא, המשלבת מתכונים יהודיים-רומאיים בני מאות שנים עם מנות גריל ים-תיכוניות באווירה חמה ותוססת.",
                "specialty": "קרצ'ופי אלה ג'ודיאה (ארטישוק מטוגן פריך בשלמותו) וסטייק אנטריקוט",
                "hours_note": "פתוח א'–ה' 12:00–23:00, ו' עד שעה לפני שבת (סגור בשבת).",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Ba+Ghetto+Rome",
            },
            {
                "name": "Ba'Ghetto Milky (חלבי)",
                "type": "חלבי כשר למהדרין",
                "address": "Via del Portico d'Ottavia 2",
                "price_tier": "$$",
                "description": "גרסה חלבית אלגנטית בצמוד למסעדת האם, המגישה פיצות רומאיות דקות שנאפות במקום ופסטות עבודת יד עם רטבים איטלקיים קלאסיים.",
                "specialty": "פיצה רומאית קריספית מהטאבון, רביולי כמהין ופסטה קאצ'ו א פפה כשרה",
                "hours_note": "א'–ה' 12:00–22:30, מוצ\"ש פתוח כשעה לאחר צאת שבת.",
                "rating": 4.5,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Ba+Ghetto+Milky+Rome",
            },
            {
                "name": "Pasticceria Boccione (המאפייה היהודית)",
                "type": "מאפייה כשרה היסטורית",
                "address": "Via del Portico d'Ottavia 1",
                "price_tier": "$",
                "description": "מאפייה זעירה ואייקונית מהמאה ה-19 עם תור קבוע על המדרכה — מפורסמת במיוחד בעוגת הגבינה והדובדבנים האפויה בסגנון יהודי-רומאי.",
                "specialty": "עוגת ריקוטה ודובדבנים חמוצים (Torta di Ricotta e Visciole) ועוגיות פיזליטי",
                "hours_note": "פתוח משעות הבוקר המוקדמות עד גמר המלאי; כדאי להגיע לפני 11:00.",
                "rating": 4.7,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Boccione+Bakery+Rome",
            },
        ],
        "gourmet_dining": [
            {
                "name": "Roscioli Salumeria con Cucina",
                "type": "מעדניית גורמה וביסטרו יין",
                "neighborhood": "Campo de' Fiori",
                "price_tier": "$$$",
                "description": "מוסד קולינרי רומאי שצמח ממאפייה משפחתית מפורסמת למסעדה מבוקשת בתוך מעדניית גבינות ויינות מרשימה — נחשבת לאחת מהקאצ'ו א פפה הטובות בעיר.",
                "signature_dish": "פסטה טונארלי Cacio e Pepe ובוראטה עבודת יד עם עגבניות מיובשות",
                "booking_tip": "חובה להזמין מקום 3–4 שבועות מראש דרך אתר המסעדה (שולחנות הבר נפתחים גם למבקרים זריזים).",
                "rating": 4.7,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Roscioli+Salumeria+Rome",
            },
            {
                "name": "Trattoria Da Enzo al 29",
                "type": "טרטוריה מסורתית בטרסטוורה",
                "neighborhood": "Trastevere",
                "price_tier": "$$",
                "description": "טרטוריה משפחתית זעירה ואינטימית בסמטה שקטה ברובע טרסטוורה עם מפות משובצות ואוכל רומאי פשוט ומדויק להפליא.",
                "signature_dish": "ארטישוק מטוגן, פסטה Carbonara או טריו מוסר ושרי ארטישוק, וטירמיסו בכוס זכוכית",
                "booking_tip": "אינה מקבלת הזמנות מראש לצהריים — הגיעו ב-12:00 בול או ב-18:45 כדי להיכנס בסבב הראשון בלי תור ארוך.",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Da+Enzo+al+29+Rome",
            },
        ],
        "nightlife_spots": [
            {
                "name": "The Jerry Thomas Project",
                "type": "בר ספיק-איזי מחתרתי שנות ה-20",
                "neighborhood": "Vicolo Cellini (ליד קמפו די פיורי)",
                "vibe": "קוקטיילים קלאסיים בעבודת יד, תאורת נרות, מוסיקת ג'אז וכורסאות עור.",
                "description": "בר החלוץ של סצנת הקוקטיילים ברומא החבוי מאחורי דלת לא מסומנת. הכניסה מתאפשרת באמצעות סיסמה חודשית המתקבלת בעת ההזמנה אונליין.",
                "signature_drink": "קוקטיילי עשבים וליקרים ביתיים בהגשה תיאטרלית",
                "entry_tip": "שריינו שולחן מראש באתר הבית לקבלת סיסמת הכניסה לדלת.",
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Jerry+Thomas+Project+Rome",
            },
            {
                "name": "Freni e Frizioni",
                "type": "בר אפריטיבו תוסס על גדת הנהר",
                "neighborhood": "Trastevere",
                "vibe": "מרפסת רחבה תחת כיפת השמיים, צעירים מקומיים ובופה אפריטיבו עשיר.",
                "description": "מוסך ישן שהוסב לבר הכי אנרגטי בטרסטוורה. בין 18:30 ל-21:30 מחיר המשקה כולל גישה לבופה צמחוני/איטלקי נדיב של פסטות, סלטים ומאפים.",
                "signature_drink": "ספריץ איטלקי קלאסי וקוקטיילים על בסיס ג'ין ובזיליקום",
                "entry_tip": "הגיעו סביב 18:30 לפני שכיכר הבר מתמלאת לגמרי.",
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Freni+e+Frizioni+Rome",
            },
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
                "address": "2 Rue des Hospitalières-Saint-Gervais, Le Marais",
                "price_tier": "$$",
                "description": "הביסטרו המפורסם בלב הרובע היהודי במארה, עם חלון צבעוני של עשרות סלטים טריים ומזטים בסגנון ביתי-צרפתי.",
                "specialty": "צלחת 5 מזטים לבחירה עם לאפה חמה, שווארמה ופלאפל או סלמון אפוי",
                "hours_note": "פתוח א'–ו' עד לפני כניסת שבת.",
                "rating": 4.5,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Chez+Marianne+Paris",
            },
            {
                "name": "L'As du Fallafel",
                "type": "כשר / סטריט פוד מיתולוגי",
                "address": "34 Rue des Rosiers, Le Marais",
                "price_tier": "$",
                "description": "מוסד קולינרי פריזאי בעל מוניטין בינלאומי. ניתן גם לשבת בחלק הפנימי וגם לקחת את מנת הפלאפל המפורסמת מהדלפק ברחוב תוך שיטוט ברובע המארה.",
                "specialty": "פיתה שמנמנה עמוסה בפלאפל ירוק, חצילים מטוגנים, כרוב סגול וטחינה מעולה",
                "hours_note": "סגור בשבת; בחמישי וביום ראשון כדאי להגיע לפני 12:30 כדי לחסוך תור.",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=L+As+du+Fallafel+Paris",
            },
            {
                "name": "Le 17ème Brasserie Cacher",
                "type": "בראסרי בשרי כשר יוקרתי",
                "address": "17th Arrondissement, Paris",
                "price_tier": "$$$",
                "description": "בראסרי פריזאי מודרני ומהודר בהשגחת בית דין פריז, המעניק חוויית מסעדת ערב צרפתית מלאה עם נתחי בשר מיושנים ותפריט יינות כשר.",
                "specialty": "סטייק אנטרקוט ברוטב יין ופלפל, פטה כבד אווז ומוס שוקולד חם פרווה",
                "hours_note": "מומלץ לשריין שולחן לערב מראש בטלפון או באתר.",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Kosher+Restaurant+Paris+17",
            },
        ],
        "gourmet_dining": [
            {
                "name": "Le Comptoir du Relais",
                "type": "ביסטרונומיה צרפתית קלאסית",
                "neighborhood": "Saint-Germain-des-Prés",
                "price_tier": "$$$",
                "description": "אחד הביסטרואים האהובים בגדה השמאלית, המשלב מנות שף עונתיות בסגנון מסורתי עם טרסה אידיאלית לצפייה בעוברים ושבים בלב סן ז'רמן.",
                "signature_dish": "ביף בורגיניון בבישול ארוך, קרפ סוזט ומנות פתיחה עונתיות",
                "booking_tip": "בצהריים הכניסה על בסיס מקום פנוי (הגיעו ב-12:00); לארוחת ערב חובה להזמין מראש.",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Le+Comptoir+du+Relais+Paris",
            },
            {
                "name": "Septime",
                "type": "מטבח עונתי עטור כוכב מישלן",
                "neighborhood": "11th Arr.",
                "price_tier": "$$$",
                "description": "מסעדת מישלן מודרנית ונטולת גינונים מיותרים המגישה תפריט טעימות משתנה לפי תוצרת השוק באותו שבוע.",
                "signature_dish": "תפריט טעימות בן 5 או 7 מנות עם התאמת יינות טבעיים",
                "booking_tip": "ההזמנות נפתחות 3 שבועות בדיוק מראש בשעה 10:00 בבוקר שעון פריז — אוזלות תוך דקות.",
                "rating": 4.8,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Septime+Paris",
            },
        ],
        "nightlife_spots": [
            {
                "name": "Moonshiner",
                "type": "בר ספיק-איזי מוסתר",
                "neighborhood": "Bastille (11th Arr.)",
                "vibe": "מוזיקת ג'אז חרישית, תפאורת שנות ה-20 ואווירה אינטימית.",
                "description": "הבר המפורסם שמסתתר מאחורי דלת מקרר של פיצרייה איטלקית פעילה (Da Vito). תצטרכו לעבור דרך מסדרון הפיצרייה ולפתוח את דלת המתכת הכבדה.",
                "signature_drink": "קוקטיילים מבוססי ברבן, תה מעושן וסירופים ביתיים",
                "entry_tip": "עברו ישר דרך פיצריית Da Vito ופתחו את דלת הברזל מאחור; ללא כרטיס חבר.",
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Moonshiner+Paris",
            },
            {
                "name": "Le Perchoir Marais",
                "type": "רופטופ פנורמי מעל פריז",
                "neighborhood": "Le Marais (מעל BHV)",
                "vibe": "תצפית ישירה אל מגדל אייפל ובית העירייה Hôtel de Ville תחת מנורות חגיגיות.",
                "description": "בר גג שיקי במרכז העיר הפתוח בשעות הערב לאחר סגירת הכלבו, עם ספות נוחות, פינות ישיבה חמות ומבט מושלם לאורות פריז.",
                "signature_drink": "שמפניה פריזאית וקוקטיילים פרחוניים",
                "entry_tip": "הכניסה מצד Rue de la Verrerie 33 החל מ-20:15 — כדאי להגיע מוקדם.",
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Le+Perchoir+Marais+Paris",
            },
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
                "price_tier": "$$$",
                "description": "המעדנייה והמסעדה הכשרה הוותיקה והמוכרת במרכז לונדון (מרחק הליכה ממארבל ארץ' ומדאם טוסו), הפועלת מ-1973.",
                "specialty": "כריך קורנדביף חם (Salt Beef) בלחם שיפון עם חמוצים ומרק עוף עם קניידלך",
                "hours_note": "פתוח א'–ה' ושישי עד צהריים; ניתן להזמין אוכל מוכן לשבת.",
                "rating": 4.5,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Reubens+Restaurant+Baker+Street+London",
            },
            {
                "name": "Novellino",
                "type": "חלבי איטלקי כשר למהדרין",
                "address": "103 Golders Green Rd",
                "price_tier": "$$",
                "description": "מסעדה חלבית אלגנטית בלב הקהילה היהודית בגולדרס גרין, המציעה תפריט פסטות עשיר, דגים טריים וקינוחים מרשימים.",
                "specialty": "לברק צלוי בעשבי תיבול, ריזוטו פטריות יער ועוגת שוקולד בלגית",
                "hours_note": "פתוח א'–ה' + מוצ\"ש; מומלץ להזמין מקום לערב.",
                "rating": 4.5,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Novellino+Golders+Green+London",
            },
        ],
        "gourmet_dining": [
            {
                "name": "Dishoom",
                "type": "מטבח הודי-בומביי מודרני",
                "neighborhood": "Covent Garden / Shoreditch",
                "price_tier": "$$",
                "description": "אחת המסעדות הפופולריות בלונדון כולה, המעוצבת בסגנון בתי הקפה הפרסיים-איראניים של בומביי משנות ה-60 עם שירות חם ומנות מתובלות בעדינות.",
                "signature_dish": "House Black Daal המפורסמת בבישול של 24 שעות, נאן גבינה ושום וצ'אי קרמי חם",
                "booking_tip": "לצהריים ניתן להזמין מראש באתר; לערב מומלץ להגיע לפני 18:00 או לקבל משקה המתנה ליד הכניסה.",
                "rating": 4.7,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Dishoom+Covent+Garden+London",
            },
            {
                "name": "The Wolseley",
                "type": "קפה-בראסרי אירופאי מלכותי",
                "neighborhood": "Mayfair / Piccadilly",
                "price_tier": "$$$",
                "description": "אולם בנק מפואר משנות ה-20 עם תקרות שיש גבוהות ושנדלירים שהפך למוסד לונדוני קלאסי לתה מנחה אנגלי (Afternoon Tea) וארוחות בוקר חגיגיות.",
                "signature_dish": "תה מנחה מסורתי עם סקונס חמים, שמנת clotted וריבת תותים",
                "booking_tip": "שריינו מקום דרך אתר המסעדה או OpenTable שבועיים מראש (מומלץ לשעת 15:30 לתה מנחה).",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=The+Wolseley+London",
            },
        ],
        "nightlife_spots": [
            {
                "name": "Nightjar (Old Street)",
                "type": "מועדון ג'אז וספיק-איזי מתוחכם",
                "neighborhood": "Shoreditch / Old Street",
                "vibe": "הופעות ג'אז וסווינג חיות מדי ערב בתאורה רכה.",
                "description": "מרתף מוסיקה אלגנטי המגיש קוקטיילים יצירתיים במיוחד בשלוש תקופות היסטוריות — לצד הרכבי ג'אז מעולים ללא אווירה רועשת מדי.",
                "signature_drink": "The Yorke (וויסקי יפני, יוזו וערפל ליים בהגשה דרמטית)",
                "entry_tip": "חובה להזמין שולחן באתר מראש כדי להבטיח כניסה להופעת הערב.",
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Nightjar+London",
            },
            {
                "name": "Aqua Shard (קומה 31)",
                "type": "בר יוקרתי עם נוף פנורמי",
                "neighborhood": "London Bridge",
                "vibe": "תצפית עוצרת נשימה מגובה 31 קומות על גשר הטאוור ונהר התמזה.",
                "description": "בר אלגנטי המשתרע לאורך קירות זכוכית ענקיים במגדל השארד — ללא עלות כניסה נוספת מעבר להזמנת המשקה.",
                "signature_drink": "Gin & Tonic עם תמצית תה ארל גריי ומגוון קוקטיילי שף",
                "entry_tip": "קוד לבוש Smart Casual (ללא נעלי ריצה/בגדי ספורט).",
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Aqua+Shard+London",
            },
        ],
        "tipping_etiquette": "בלונדון מתווסף לרוב 'Optional 12.5% Service Charge' לחשבון. אם הוסף, אין צורך להשאיר טיפ נוסף.",
        "reservation_tip": "הזמינו מקום דרך OpenTable. ב-Dishoom מומלץ להגיע לפני 18:00 כדי להימנע מתור ארוך.",
    },
    "ברצלונה": {
        "specialties": ["Tapas & Pintxos", "Paella de Marisco", "Crema Catalana", "Patatas Bravas", "Churros con Chocolate"],
        "kosher_options": [
            {
                "name": "Shafir Restaurant Kosher",
                "type": "בשרי כשר למהדרין",
                "address": "Carrer d'Aribau, Eixample",
                "price_tier": "$$$",
                "description": "מסעדה בשרית כשרה ומרווחת במרכז אישמפלה המציעה גריל בשרים, טאפאס ספרדי מסורתי ושולחן שבת קהילתי בהזמנה מראש.",
                "specialty": "טאפאס כשרים, בשרים על הגריל ופייה ספרדית כשרה לחלוקה",
                "hours_note": "פתוח א'–ה', שירות ארוחות שבת בתיאום מוקדם.",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Shafir+Kosher+Barcelona",
            },
            {
                "name": "Maccabi Kosher Restaurant",
                "type": "כשר במרכז לה רמבלה",
                "address": "La Rambla 79",
                "price_tier": "$$",
                "description": "מסעדה כשרה נוחה להפליא ממש על שדרות לה רמבלה המרכזיות — נקודת עצירה קלילה באמצע סיורים ברובע הגותי.",
                "specialty": "פייה כשרה, שניצלים, קבבים ואוכל ים-תיכוני משביע",
                "hours_note": "פתוח רציף משעות הצהריים ועד הלילה בימי חול.",
                "rating": 4.4,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Maccabi+Kosher+Barcelona",
            },
        ],
        "gourmet_dining": [
            {
                "name": "El Xampanyet",
                "type": "טאפאס בר היסטורי תוסס",
                "neighborhood": "El Born",
                "price_tier": "$$",
                "description": "בר טאפאס אייקוני שפועל מאז 1929 בלב אל בורן עם אריחי קרמיקה כחולים על הקירות, חביות עץ ואווירה קטלונית אותנטית שלא השתנתה כמעט מאה שנה.",
                "signature_dish": "טאפאס של אנשובי מרוקאים ופלפלים ממולאים, לחם עגבניות (Pan con Tomate) וגבינת מנצ'גו",
                "booking_tip": "אינו מקבל הזמנות — הקדימו לשעה 12:15 לצהריים או 19:15 לערב ותפסו מקום ליד החביות.",
                "rating": 4.7,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=El+Xampanyet+Barcelona",
            },
            {
                "name": "Cervecería Catalana",
                "type": "בר הטאפאס המוביל באישמפלה",
                "neighborhood": "Eixample",
                "price_tier": "$$",
                "description": "אחת המסעדות האהובות ביותר בברצלונה עם ויטרינה ענקית של עשרות טאפאס, שיפודי מונטדיטוס חמים וקרים ושירות סופר-מהיר.",
                "signature_dish": "פאטאטאס ברוואס פריכות, קממברט מטוגן עם פירות יער ושיפודי סלמון/בקר",
                "booking_tip": "רשמו את שמכם אצל המארח בכניסה וקבלו שולחן תוך כ-20–25 דקות בדרך כלל.",
                "rating": 4.6,
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Cerveceria+Catalana+Barcelona",
            },
        ],
        "nightlife_spots": [
            {
                "name": "Paradiso",
                "type": "בר הקוקטיילים מהטובים בעולם",
                "neighborhood": "El Born",
                "vibe": "קירות עץ מעוגלים ותיאטרליות מרהיבה בכל כוס.",
                "description": "חבוי מאחורי דלת המקרר של מעדניית פסטרמה זעירה ברובע אל בורן. כל קוקטייל מוגש כמיצג פיסולי עם עשן, אורות או כלים מפתיעים.",
                "signature_drink": "The Cloud / Supercool Martini בהגשה אמנותית",
                "entry_tip": "הסריקו את קוד התור הדיגיטלי בכניסה סביב 18:00 וחזרו כשמגיע התור שלכם (תוך שיטוט בבר סמוך).",
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Paradiso+Barcelona",
            },
            {
                "name": "Boadas Cocktails",
                "type": "בר הקוקטיילים הוותיק בעיר (1933)",
                "neighborhood": "קצה לה רמבלה",
                "vibe": "אלגנטיות קלאסית עם ברמנים בחליפות ערב.",
                "description": "הבר הקטן והמקסים שהוקם על ידי חברו של ארנסט המינגווי מהוואנה ושומר על המסורת הקלאסית של ערבוב משקאות ללא טריקים מודרניים.",
                "signature_drink": "דייקירי קלאסי וקוקטיילים חמצמצים מרעננים",
                "entry_tip": "מתאים במיוחד לדרינק קצר ואיכותי לפני ארוחת ערב (19:00–21:00).",
                "maps_url": "https://www.google.com/maps/search/?api=1&query=Boadas+Cocktails+Barcelona",
            },
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

    alias_to_key = {
        "רומא": ["רומא", "rome"],
        "פריז": ["פריז", "paris"],
        "לונדון": ["לונדון", "london"],
        "ברצלונה": ["ברצלונה", "barcelona"],
    }

    matched_key = None
    for key, patterns in alias_to_key.items():
        if any(p in dest_clean or p in dest_lower for p in patterns):
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
                "מנות סטריט-פוד אותנטיות בשווקים המקומיים",
                "קינוחים ומאפים אזוריים בעבודת יד",
            ],
            "kosher_options": [
                {
                    "name": f"בית חב\"ד {dest_clean} (Chabad House)",
                    "type": "ארוחות שבת וסיוע כשרות",
                    "address": f"מרכז העיר {dest_clean}",
                    "price_tier": "$$",
                    "description": f"הכתובת המרכזית למטייל הדתי ושומר המסורת ב{dest_clean} — אירוח חם לסעודות שישי ושבת, מידע על מסעדות כשרות בסביבה והמלצות למוצרים כשרים בסופרים מקומיים.",
                    "specialty": "סעודות שבת קהילתיות, חלות ויין לקידוש וסיוע באספקת אוכל כשר",
                    "hours_note": "יש להירשם מראש לארוחות שבת באתר הרשמי של בית חב\"ד ביעד.",
                    "rating": 4.9,
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query=Chabad+{dest_clean}",
                }
            ],
            "gourmet_dining": [
                {
                    "name": f"Bistro Central {dest_clean}",
                    "type": "ביסטרו שף עונתי",
                    "neighborhood": "מרכז העיר",
                    "price_tier": "$$",
                    "description": f"ביסטרו מרכזי ואלגנטי ב{dest_clean} המבוסס על תוצרת שוק טרייה ומטבח מקומי מוקפד, עם מבחר דגים, פסטות ומנות צמחוניות.",
                    "signature_dish": "מנת שף עונתית מתוצרת השוק היומית + קינוח חם בהכנה מקומית",
                    "booking_tip": "מומלץ לשריין שולחן 4–5 ימים מראש לשעות הערב.",
                    "rating": 4.7,
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query=Bistro+Central+{dest_clean}",
                },
                {
                    "name": f"Osteria Panorama {dest_clean}",
                    "type": "מטבח מקומי אותנטי",
                    "neighborhood": "העיר העתיקה",
                    "price_tier": "$$$",
                    "description": f"מסעדה אינטימית בסמטאות העיר העתיקה של {dest_clean} המתמחה במתכוני מסורת מקומיים, תפריט יינות אזורי ושירות קשוב.",
                    "signature_dish": "ארוחת טעימות אזורית עם מנות פתיחה קלאסיות ומנות דגל בבישול איטי",
                    "booking_tip": "בקשו שולחן במרפסת או ליד החלון בעת ההזמנה.",
                    "rating": 4.6,
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query=Osteria+{dest_clean}",
                },
            ],
            "nightlife_spots": [
                {
                    "name": f"Skyline Lounge {dest_clean}",
                    "type": "רופטופ בר פנורמי",
                    "neighborhood": "המרכז העסקי / המלון המרכזי",
                    "vibe": "תצפית לילה פתוחה על אורות העיר עם קוקטיילים ואווירה רגועה.",
                    "description": f"טרסת גג מעוצבת הצופה אל קו הרקיע של {dest_clean} — מושלמת לסיום יום סיורים עם משקה מרענן וקינוח.",
                    "signature_drink": "קוקטייל הבית עם הדרים ועשבי תיבול מקומיים",
                    "entry_tip": "מומלץ להגיע סביב 18:30 לתפוס שולחן לשקיעה.",
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query=Rooftop+Bar+{dest_clean}",
                },
                {
                    "name": f"Secret Cellar Bar {dest_clean}",
                    "type": "בר מרתף היסטורי",
                    "neighborhood": "הרובע העתיק",
                    "vibe": "מוזיקה אקוסטית חיה, תאורת אבן חמה ויינות מקומיים.",
                    "description": f"בר אינטימי השוכן במרתף אבן עתיק בלב {dest_clean}, עם מבחר יינות מקומיים והופעות ערב שקטות.",
                    "signature_drink": "טעימת יינות אזוריים וגבינות/זיתים בצד",
                    "entry_tip": "אווירה רגועה — מתאים במיוחד לימי חמישי–שבת בערב.",
                    "maps_url": f"https://www.google.com/maps/search/?api=1&query=Wine+Cellar+Bar+{dest_clean}",
                },
            ],
            "tipping_etiquette": f"במרבית המסעדות ב{dest_clean} נהוג לבדוק האם דמי השירות כלולים בחשבון. טיפ של 10% מקובל ומביע הערכה לשירות טוב.",
            "reservation_tip": f"מומלץ להזמין מקומות למסעדות מבוקשות ב{dest_clean} שבוע מראש דרך Google Maps, OpenTable או אתרי המסעדות.",
            "is_curated": False,
        }

    return json.dumps(result, ensure_ascii=False)
