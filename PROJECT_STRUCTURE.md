# 🗺️ מפת מבנה הפרויקט המלא – Wanderlust Voyage AI

מערכת בינה מלאכותית אוטונומית רב-סוכנית לתכנון מסעות וחופשות, המבוססת על ארכיטקטורת 5-Layer Agent Stack:
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion, Liquid Glass 4.0 Pro
- **Backend:** FastAPI (Python 3.11/3.12), Google Gemini 2.0 / 3.5, SSE Real-Time Streaming
- **Database & Cache:** PostgreSQL 16 (Agno Memory / Sessions)
- **Containerization & Dev:** Docker Compose, Render.yaml, Vercel

---

## 🌳 עץ התיקיות והקבצים המלא

```text
Wanderlust-Voyage-AI/
│
├── .agents/                                # שכבת ה-Governance, חוקה, הגדרות סוכנים ו-Skills
│   ├── Skills/                             # מפרטי יכולות לסוכנים (Agent Skills)
│   │   ├── budget-currency-optimizer/      # אופטימיזציית תקציב רב-מטבעי
│   │   ├── culture-events-specialist/      # אירועים עונתיים, פסטיבלים ושקיעות
│   │   ├── flight-search-engine/           # מנוע איתור ותמחור טיסות בינלאומיות
│   │   ├── google-flow-travel-mcp/         # גישור Google Flow ו-Google Workspace
│   │   ├── liquid-glass-travel-ui/         # חוקי עיצוב ומערכת רכיבי Liquid Glass
│   │   ├── places-curation-hotel/          # סינון ואיתור מלונות וקולינריה
│   │   ├── safety-health-advisor/          # ויזות, בטיחות, בריאות ואזהרות מסע
│   │   ├── tlv-holiday-flight-board/       # לוח טיסות חגים ייעודי מנתב"ג (TLV)
│   │   ├── travel-orchestrator-agent/      # סוכן-העל המתזמר (Master Orchestrator)
│   │   └── weather-packing-optimizer/      # ניתוח אקלים ורשימת אריזה דינמית
│   ├── AGENTS.md                           # חוקת הפלטפורמה ופקודות בל יעבור (Layer 1)
│   ├── PRD.md                              # מסמך דרישות מוצר (Layer 2)
│   ├── SPEC.md                             # מפרט טכני וארכיטקטורה (Layer 3)
│   ├── PLAN.md                             # תוכנית ביצוע ושלבי פיתוח (Layer 4)
│   ├── PROMPT_COPYABLE.md                  # פרומפט הרצה לסוכנים (Layer 5)
│   └── agents.json                         # מטא-דאטה והגדרות הסוכנים
│
├── backend/                                # שרת ה-API והסוכנים האוטונומיים (FastAPI)
│   ├── app/
│   │   ├── agents/                         # מנועי התיאום והסוכנים
│   │   │   ├── orchestrator.py             # סוכן-העל: סינתזה, ניהול שלבים ושידור חי ב-SSE
│   │   │   └── tlv_flight_agent.py         # סוכן ניתוח לוח טיסות נתב"ג
│   │   ├── api/                            # שכבת ה-Endpoints וה-Routing
│   │   │   ├── auth.py                     # אימות משתמשים (JWT, Google OAuth, הרשמה/התחברות)
│   │   │   ├── routes.py                   # מסלולי תכנון מסע, הורדת יומן (.ics), ייצוא ל-Docs
│   │   │   └── schemas.py                  # מודלי Pydantic לחוזי קלט/פלט טיפוסיים
│   │   ├── core/                           # הגדרות ליבה ואבטחה
│   │   │   ├── config.py                   # טעינת משתני סביבה והגדרות Pydantic Settings
│   │   │   └── security.py                 # הצפנת סיסמאות (Bcrypt) ויצירת טוקני JWT
│   │   ├── services/                       # שירותים חיצוניים
│   │   │   ├── email_service.py            # שליחת תדריכים ואישורי הזמנה (Resend API)
│   │   │   └── email_templates.py          # תבניות HTML מעוצבות לכרטיסים ותדריכים
│   │   ├── tools/                          # 13 הכלים הייעודיים של הסוכנים
│   │   │   ├── briefing_tools.py           # סוכן WhatsApp Butler: תדריכים יומיים
│   │   │   ├── budget_tools.py             # סוכן Budget Optimizer: חישובי מטבע ובלת"ם
│   │   │   ├── calendar_tools.py           # סוכן Calendar Sync: יצירת Google Cal וקובצי .ics
│   │   │   ├── culinary_tools.py           # סוכן Culinary & Kosher: כשרות, חב"ד ומסעדות שף
│   │   │   ├── events_tools.py             # סוכן Culture & Events: פסטיבלים ומופעים
│   │   │   ├── flight_tools.py             # סוכן Flight Search: טיסות ועלויות
│   │   │   ├── places_tools.py             # סוכן Places Curation: מלונות ואטרקציות
│   │   │   ├── safety_tools.py             # סוכן Safety & Health: ויזות ומספרי חירום
│   │   │   ├── sentinel_tools.py           # סוכן Ground Sentinel: מודיעין שטח, שביתות והונאות
│   │   │   ├── shopping_tools.py           # סוכן Shopping & Tax-Free: החזרי מע"מ ואאוטלטים
│   │   │   ├── tlv_flight_board_tools.py   # סוכן TLV Flight Board: לוח טיסות נתב"ג לחגים
│   │   │   ├── transit_tools.py            # סוכן Transit & Metro: כרטיסי מעבר והתניידות
│   │   │   └── weather_tools.py            # סוכן Weather & Packing: מזג אוויר וצ'ק-ליסט אריזה
│   │   └── main.py                         # נקודת הכניסה לשרת FastAPI, הגדרת CORS ו-Routers
│   ├── tests/                              # בדיקות אוטומטיות (Pytest)
│   │   └── test_new_specialist_tools.py    # בדיקות יחידה לכל כלי הסוכנים
│   ├── Dockerfile                          # תמונת דוקר לסביבת Python FastAPI
│   ├── requirements.txt                    # תלויות הפייתון (FastAPI, Pydantic, Resend וכו')
│   └── pytest.ini                          # הגדרות הרצת בדיקות
│
├── frontend/                               # ממשק המשתמש (Next.js 15 App Router)
│   ├── app/                                # דפי האפליקציה (Routing)
│   │   ├── about/                          # דף אודות הפלטפורמה והסוכנים
│   │   ├── api/auth/callback/google/       # ניתוב חזרה מאימות Google OAuth
│   │   ├── blog/                           # בלוג תיירות וטיפים
│   │   ├── destinations/                   # מדריכי יעדים בעולם
│   │   ├── experiences/                    # חוויות מיוחדות ואטרקציות
│   │   ├── flights/                        # חיפוש ולוח טיסות מנתב"ג
│   │   ├── login/                          # מסך כניסה והרשמה
│   │   ├── profile/                        # אזור אישי וניהול חופשות שמורות
│   │   ├── trips/                          # ארכיון החופשות והמסלולים
│   │   ├── globals.css                     # סגנונות עיצוב גלובליים, Liquid Glass ו-Inputs
│   │   ├── layout.tsx                      # שלד ראשי (Root Layout) כולל Navbar ו-Footer
│   │   └── page.tsx                        # דף הבית הראשי: Hero, טופס פנורמי, תוצאות ו-SSE
│   ├── components/                         # רכיבי ממשק משתמש (Liquid Glass 4.0 Pro)
│   │   ├── AgentStreamLogs.tsx             # לוח שידור חי של חשיבת 13 הסוכנים ב-SSE
│   │   ├── BookingPaymentModal.tsx         # מודאל תשלום, סליקת אשראי והנפקת כרטיס טיסה
│   │   ├── Footer.tsx                      # תחתית האתר וקישורים מהירים
│   │   ├── Navbar.tsx                      # סרגל ניווט עליון, בורר מטבע, פרופיל משתמש
│   │   ├── SearchModal.tsx                 # חלון חיפוש מהיר באתר
│   │   ├── TripForm.tsx                    # טופס תכנון מסע פנורמי ואינטראקטיבי
│   │   ├── TripResultView.tsx              # תצוגת תוצאות המסע המלאה (לו"ז, כרטיסים, מפות, יומן)
│   │   └── VideoModal.tsx                  # חלון צפייה בסרטוני יעדים
│   ├── context/                            # ניהול מצב גלובלי (React Context)
│   │   ├── AuthContext.tsx                 # ניהול מצב התחברות משתמש וטוקן
│   │   └── CurrencyContext.tsx             # ניהול מטבעות חי (ILS ₪, USD $, EUR €)
│   ├── utils/                              # כלי עזר בצד הלקוח
│   │   └── calendarIcs.ts                  # מחולל ומוריד קובצי יומן תקניים (.ics) ישירות בדפדפן
│   ├── public/                             # קבצים סטטיים ותמונות
│   ├── Dockerfile                          # תמונת דוקר רב-שלבית (Multi-stage) ל-Next.js
│   ├── next.config.ts                      # הגדרות Next.js Standalone
│   ├── tailwind.config.ts                  # הגדרות צבעי מנטה, זכוכית וטיפוגרפיה
│   ├── tsconfig.json                       # הגדרות TypeScript
│   └── package.json                        # תלויות ה-Node.js
│
├── docker-compose.yml                      # הרמת המערך המלא: Postgres, Backend ו-Frontend
├── render.yaml                             # קובץ הגדרת פריסה לענן Render (Backend FastAPI)
├── start.bat                               # סקריפט הפעלה מיידית בלחיצה כפולה לחלונות
├── .env / .env.example                     # משתני סביבה ומפתחות API
└── README.md                               # מדריך ההפעלה וההתקנה המרכזי
```

---

## 👥 מערך 13 הסוכנים האוטונומיים

| # | סוכן | תפקיד מרכזי | כלי פעולה ראשי |
|---|------|-------------|----------------|
| 1 | **Travel Orchestrator** | סוכן-העל: ניהול שלבי החשיבה, תיאום וסינתזה סופית | [`orchestrator.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/agents/orchestrator.py) |
| 2 | **Flight Search Engine** | איתור טיסות, בדיקת מחירים, זמני המראה וכבודה | [`flight_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/flight_tools.py) |
| 3 | **Places & Hotel Curator** | סינון מלונות מומלצים, אטרקציות ודירוגי איכות | [`places_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/places_tools.py) |
| 4 | **Budget & Currency Optimizer** | ניהול תקציב, המרת מטבעות (₪, $, €) וכרית בלת"ם 10% | [`budget_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/budget_tools.py) |
| 5 | **Weather & Packing Optimizer** | תחזית אקלים מפורטת והרכבת צ'ק-ליסט אריזה חכם | [`weather_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/weather_tools.py) |
| 6 | **Culture & Events Specialist** | גילוי פסטיבלים, אירועים מיוחדים ונקודות תצפית לשקיעה | [`events_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/events_tools.py) |
| 7 | **Safety & Health Advisor** | בדיקת ויזות, מספרי חירום והנחיות בריאות | [`safety_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/safety_tools.py) |
| 8 | **Transit & Metro Navigator** | כרטיסי נסיעה יומיים/שבועיים, העברות שדה וציוני הליכה | [`transit_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/transit_tools.py) |
| 9 | **Culinary & Kosher Guide** | איתור מסעדות כשרות, בתי חב"ד, מנות דגל ומסעדות שף | [`culinary_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/culinary_tools.py) |
| 10 | **Shopping & Tax-Free Specialist** | חישוב החזרי מע"מ (VAT Refund), דלפקים בשדה ואאוטלטים | [`shopping_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/shopping_tools.py) |
| 11 | **Calendar & Workspace Syncer** | סנכרון ישיר ל-Google Calendar והורדת קובץ `.ics` תקני | [`calendar_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/calendar_tools.py) |
| 12 | **Ground Sentinel & Alert Agent** | מודיעין שטח, בדיקת סיכון שביתות, אזהרות כייסים ושגרירויות | [`sentinel_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/sentinel_tools.py) |
| 13 | **WhatsApp Concierge Butler** | הפקת תדריכים יומיים מוכנים עם כפתורי העתקה ושיתוף | [`briefing_tools.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/tools/briefing_tools.py) |

---

## 🔄 זרימת המידע במערכת (End-to-End Dataflow)

1. **קליטת נתוני המטייל:** המשתמש מזין יעד, תאריכים, הרכב נוסעים ותקציב ב-[`TripForm.tsx`](file:///c:/Users/kazam/Desktop/App/New%20folder/frontend/components/TripForm.tsx).
2. **פתיחת ערוץ SSE חי:** נשלחת בקשה ל-`GET /api/v1/trips/stream` המפעילה את סוכן-העל ב-[`orchestrator.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/agents/orchestrator.py).
3. **תהליך חשיבה ודופק חי (Live Deliberation):** כל אחד מ-13 הסוכנים נקרא בתורו, מחשב את חלקו ומשדר אירוע התקדמות חי שמוצג ב-[`AgentStreamLogs.tsx`](file:///c:/Users/kazam/Desktop/App/New%20folder/frontend/components/AgentStreamLogs.tsx).
4. **סינתזה סופית:** סוכן-העל מאחד את כל המידע למסלול מלא (Itinerary, עלויות, שעות, מפות וטיפים).
5. **תצוגה עשירה ואינטראקטיבית:** המידע מוצג ב-[`TripResultView.tsx`](file:///c:/Users/kazam/Desktop/App/New%20folder/frontend/components/TripResultView.tsx) עם לשוניות ייעודיות לכל תחום.
6. **פעולות המשך וסגירת חופשה:**
   - הורדת קובץ יומן מלא (`.ics`) ישירות למחשב או לטלפון באמצעות [`calendarIcs.ts`](file:///c:/Users/kazam/Desktop/App/New%20folder/frontend/utils/calendarIcs.ts).
   - שליחת תדריך מעוצב למייל באמצעות [`email_service.py`](file:///c:/Users/kazam/Desktop/App/New%20folder/backend/app/services/email_service.py).
   - סליקת אשראי והנפקת כרטיסי עלייה למטוס ב-[`BookingPaymentModal.tsx`](file:///c:/Users/kazam/Desktop/App/New%20folder/frontend/components/BookingPaymentModal.tsx).
