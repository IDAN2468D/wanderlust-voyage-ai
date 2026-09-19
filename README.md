# 🌍 AgentTravelPlanner ✈️

<div align="center">

![AgentTravelPlanner Banner](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop)

### **Autonomous Multi-Agent Travel Orchestration Platform**
*Powered by 13 Cooperating Specialist AI Agents, Real-Time SSE Deliberation Streaming, Next.js 15, and FastAPI.*

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0%20%2F%203.5-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

[🌐 Live Frontend](http://localhost:3000) • [⚡ Backend API](https://wanderlust-voyage-ai.onrender.com) • [📚 Interactive Swagger Docs](https://wanderlust-voyage-ai.onrender.com/docs) • [🗺️ Project Structure](PROJECT_STRUCTURE.md)

</div>

---

## 🌟 Overview

**AgentTravelPlanner** replaces dozens of hours of stressful flight hunting, hotel reviews, manual budget calculations, and itinerary assembling with an **autonomous committee of 13 specialist AI agents**. 

The system executes real-time deterministic reasoning, searches flights and hotels, verifies visa and safety warnings, schedules kosher/culinary experiences, computes tax-free VAT refunds, and streams its thought deliberation live via **Server-Sent Events (SSE)** directly to a luxury **Liquid Glass 4.0 Pro** user interface.

---

## 🤖 The 13 Autonomous Specialist Agents

Every step of the travel planning lifecycle is assigned to a dedicated specialist agent operating under typed Pydantic contracts and deterministic toolchains:

| # | Specialist Agent | Codename | Primary Responsibility & Toolset |
|---|------------------|----------|-----------------------------------|
| 1 | 🧭 **Master Orchestrator** | `travel_orchestrator` | Coordinates multi-agent deliberation, manages SSE stages 1–13, synthesizes end-to-end trip plans, and persists memory in PostgreSQL. |
| 2 | ✈️ **Flight Search Engine** | `flight_search_agent` | Evaluates direct vs layover flights, seat class costs, checked baggage (23kg), and arrival timings. ([`flight_tools.py`](backend/app/tools/flight_tools.py)) |
| 3 | 🏨 **Places & Hotel Curator** | `places_hotel_agent` | Curates 8.8+ rated boutique hotels and resorts, local attractions, and landmark ratings. ([`places_tools.py`](backend/app/tools/places_tools.py)) |
| 4 | 💰 **Budget & Currency Optimizer** | `budget_agent` | Handles live tri-currency conversions (₪ ILS, $ USD, € EUR), audits line items, and allocates mandatory 10% contingency buffers. ([`budget_tools.py`](backend/app/tools/budget_tools.py)) |
| 5 | ⛅ **Weather & Packing Optimizer** | `weather_packing_agent` | Analyzes destination climate forecasts, day/night delta, rain probability, and creates customized luggage checklists. ([`weather_tools.py`](backend/app/tools/weather_tools.py)) |
| 6 | 🎭 **Culture & Events Specialist** | `events_agent` | Identifies local seasonal festivals, concerts, sunset viewpoints, and cultural experiences. ([`events_tools.py`](backend/app/tools/events_tools.py)) |
| 7 | 🛡️ **Safety & Health Advisor** | `safety_agent` | Verifies passport validity (6+ months), emergency hotlines, Israeli embassy contacts, and health advisories. ([`safety_tools.py`](backend/app/tools/safety_tools.py)) |
| 8 | 🚇 **Transit & Metro Navigator** | `transit_agent` | Recommends city transit passes (Navigo, Oyster, Roma Pass), airport shuttles, walkability scores, and navigation apps. ([`transit_tools.py`](backend/app/tools/transit_tools.py)) |
| 9 | 🍽️ **Culinary & Kosher Guide** | `culinary_agent` | Maps glatt kosher restaurants, Chabad centers with Google Maps links, regional signature dishes, chef venues, and tipping etiquette. ([`culinary_tools.py`](backend/app/tools/culinary_tools.py)) |
| 10 | 🛍️ **Shopping & Tax-Free Specialist** | `shopping_agent` | Calculates national VAT refunds (France, Italy, Spain), digital airport customs kiosks (PABLO, DIVA, Otello), and luxury outlets. ([`shopping_tools.py`](backend/app/tools/shopping_tools.py)) |
| 11 | 📅 **Calendar & Workspace Syncer** | `calendar_sync_agent` | Builds RFC 5545 iCalendar files (`.ics`) with flight alarms, hotel bookings, and daily events, plus 1-click Google Calendar sync. ([`calendar_tools.py`](backend/app/tools/calendar_tools.py)) |
| 12 | 🚨 **Ground Sentinel & Alert Agent** | `sentinel_agent` | Scans transport strike risks, common tourist scam warnings, and emergency embassy dispatch. ([`sentinel_tools.py`](backend/app/tools/sentinel_tools.py)) |
| 13 | 📱 **WhatsApp Concierge Butler** | `whatsapp_butler` | Formats day-by-day itineraries into beautiful WhatsApp messages with 1-click clipboard copy and direct WhatsApp share. ([`briefing_tools.py`](backend/app/tools/briefing_tools.py)) |

---

## ✨ Key Features

- **⚡ Transparent SSE Deliberation Stream:** Users never stare at a blank loading spinner. The UI renders a live reasoning pulse showing which agent is currently computing.
- **🖼️ Zero-Failure Image Architecture:** Featured destinations and experiences load ultra-crisp, high-resolution photography directly via Unsplash's global CDN with zero server-side memory bottleneck.
- **📅 Instant Client-Side `.ics` Downloader:** RFC 5545 compliant calendar exporter generated directly in the browser via `Blob` with UTF-8 BOM (`\ufeff`), ensuring Hebrew names load flawlessly in Apple Calendar, Google Calendar, and Windows Outlook.
- **💳 Complete Booking Cockpit & 3D Virtual Card:** Interactive checkout supporting Israeli ID validation, installments, CVV security, Apple Pay, Google Pay, Bit, and 1-Click Demo Fill (`⚡`).
- **🌐 Full Hebrew (RTL) & English BiDi Localization:** Engineered from the ground up for Israeli travelers with TLV departures, Shabbat/holiday flight schedules, Chabad integration, and ILS/USD/EUR currency toggle.
- **📄 Google Workspace Integration:** One-click export to Google Docs and direct email briefings dispatched via Resend transactional email API.

---

## 🏗️ Architecture & Dataflow

```mermaid
flowchart TD
    User([👤 User / Traveler]) -->|Input Parameters| UI[Next.js 15 App Router Frontend]
    UI -->|GET /api/v1/trips/stream| API[FastAPI Orchestrator Gateway]
    
    subgraph MultiAgentEngine [13 Specialist Autonomous Agents]
        API --> Orchestrator[Master Orchestrator]
        Orchestrator --> Flights[Flight Search Engine]
        Orchestrator --> Hotels[Places & Hotels Curator]
        Orchestrator --> Budget[Budget & Currency Optimizer]
        Orchestrator --> Weather[Weather & Packing Agent]
        Orchestrator --> Culture[Culture & Events Specialist]
        Orchestrator --> Safety[Safety & Health Advisor]
        Orchestrator --> Transit[Transit & Metro Navigator]
        Orchestrator --> Culinary[Culinary & Kosher Guide]
        Orchestrator --> Shopping[Shopping & Tax-Free Specialist]
        Orchestrator --> Calendar[Calendar & Workspace Syncer]
        Orchestrator --> Sentinel[Ground Sentinel & Alert Agent]
        Orchestrator --> WhatsApp[WhatsApp Concierge Butler]
    end

    MultiAgentEngine -->|Persistent Sessions| DB[(PostgreSQL 16 Storage)]
    MultiAgentEngine -->|Reasoning & Synthesis| Gemini[Google Gemini 2.0 / 3.5 Models]
    
    API -.->|Server-Sent Events (SSE)| Logs[AgentStreamLogs UI Component]
    Orchestrator -->|Final Structured Plan| Results[TripResultView Dashboard]
    
    Results -->|Direct Browser Download| ICS[RFC 5545 .ics Calendar]
    Results -->|Transactional Dispatch| Email[Resend Email Service]
    Results -->|Checkout & Ticket| Modal[Booking & Boarding Pass Cockpit]
```

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Node.js 20+](https://nodejs.org/) (for local frontend development)
- [Python 3.11+](https://www.python.org/) (for local backend development)
- [Google Gemini API Key](https://ai.google.dev/)

---

### Option 1: One-Click Launch with Windows Script ⚡
Double click **[`start.bat`](start.bat)** in the root directory:
```bat
start.bat
```
This script automatically checks Docker status, builds all images, starts PostgreSQL, FastAPI backend, and Next.js frontend, and verifies all service endpoints.

---

### Option 2: Docker Compose (Cross-Platform) 🐳

1. **Clone the repository:**
   ```bash
   git clone https://github.com/IDAN2468D/wanderlust-voyage-ai.git AgentTravelPlanner
   cd AgentTravelPlanner
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   # Add your GEMINI_API_KEY in .env
   ```

3. **Spin up all containers:**
   ```bash
   docker compose up --build -d
   ```

4. **Verify running services:**
   ```bash
   docker compose ps
   ```

- **Frontend Portal:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend API:** [http://localhost:8000](http://localhost:8000)
- **Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Option 3: Local Development (Without Docker) 💻

#### 1. Backend Service
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Mac / Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev
```

#### 3. Run Automated Tests
```bash
cd backend
pytest -v tests/test_new_specialist_tools.py
```

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|:--------:|
| `GEMINI_API_KEY` | Google Gemini API Key for LLM reasoning | `""` | **Yes** |
| `GEMINI_MODEL` | Model version (`gemini-2.0-flash` or `gemini-3.5-flash-lite`) | `gemini-2.0-flash` | No |
| `JWT_SECRET_KEY` | Secret key for signing session tokens (min 32 chars) | `travel-planner-super-secret-jwt-key...` | No |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID for 1-click login | `""` | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | `""` | No |
| `RESEND_API_KEY` | Resend API key for emailing trip briefings (`re_...`) | `""` | No |
| `POSTGRES_USER` | PostgreSQL database username | `travel_agent` | No |
| `POSTGRES_PASSWORD` | PostgreSQL database password | `travel_agent_secret` | No |
| `POSTGRES_DB` | PostgreSQL database name | `travel_agent_db` | No |
| `NEXT_PUBLIC_API_URL`| Public backend endpoint for frontend requests | `http://localhost:8000` | No |

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health, version, and active Gemini model status |
| `GET` | `/api/v1/trips/stream` | **Real-time SSE channel** streaming deliberation logs and trip synthesis |
| `POST` | `/api/v1/trips/plan` | Synchronous REST endpoint for headless trip compilation |
| `GET` | `/api/workspace/download-ics` | Direct download of RFC 5545 `.ics` calendar pack |
| `POST` | `/api/v1/workspace/sync-calendar` | Generates 1-click Google Calendar templated event URL |
| `POST` | `/api/v1/workspace/send-briefing` | Dispatches formatted HTML trip briefing via Resend API |
| `POST` | `/api/v1/workspace/dispatch-booking-email` | Dispatches official boarding pass and payment voucher to passenger |
| `POST` | `/api/v1/workspace/export-docs` | Google Docs exporter bridge |
| `POST` | `/api/auth/register` | User account registration with Bcrypt encryption |
| `POST` | `/api/auth/login` | JWT bearer token authentication |
| `GET` | `/api/auth/me` | Active authenticated user profile |

---

## 🧪 Testing & Verification

Run the automated Pytest test suite:
```bash
# In backend/ directory:
pytest tests/ -v
```
Run frontend typecheck:
```bash
# In frontend/ directory:
npx tsc --noEmit
```

---

## 📄 License

This project is distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

<div align="center">

**Built with ❤️ for passionate travelers worldwide by the AgentTravelPlanner Team.**

</div>
