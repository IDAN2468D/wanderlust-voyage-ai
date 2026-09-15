# AI Multi-Agent Travel Planner 🌍✈️

A production-ready full-stack application for autonomous travel planning powered by **FastAPI**, **Agno Agent Framework**, **Google Gemini Models**, **PostgreSQL** (for agent session memory & conversation history), **JWT Authentication**, and **Next.js 15** with real-time **Server-Sent Events (SSE)** streaming.

---

## 🏗️ Architecture

```
travel-agent-workspace/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py                     # FastAPI app, CORS, lifespans & /health
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic Settings & Env Vars
│   │   │   └── security.py             # Bcrypt Hashing, JWT Tokens & Auth
│   │   ├── tools/
│   │   │   ├── flight_tools.py         # Flight search & accommodation discovery
│   │   │   ├── places_tools.py         # Attractions, dining & neighborhood guides
│   │   │   └── budget_tools.py         # Cost calculation & APPROVED/OVER_BUDGET audit
│   │   ├── agents/
│   │   │   └── orchestrator.py         # Agno Multi-Agent Team & SSE Generator
│   │   └── api/
│   │       ├── schemas.py              # Pydantic Request & Response Models
│   │       ├── auth.py                 # JWT Login & Registration Routes
│   │       └── routes.py               # Sync & Real-Time SSE Streaming Endpoints
│   └── tests/
│       └── test_tools.py               # Pytest suite for tools & budget auditing
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                    # Interactive dashboard & SSE stream reader
    │   └── globals.css
    └── components/
        ├── TripForm.tsx                # Travel parameters & quick-load presets
        ├── AgentStreamLogs.tsx         # Live agent reasoning & tool invocation monitor
        └── TripResultView.tsx          # Structured cards, breakdown bars & markdown
```

---

## 🤖 Cooperating Specialist Agents

The application coordinates an Agent Team Lead with 3 specialized agents:
1. **Flight & Lodging Specialist (`flight_hotel_agent`)**:
   - Analyzes airline options (direct, budget, layovers) and finds top-rated accommodations matching user budget tiers.
   - Tools: `search_flights`, `search_accommodations`.
2. **Itinerary Specialist (`itinerary_agent`)**:
   - Constructs structured day-by-day schedules (Morning, Afternoon, Evening) with cultural attractions, dining, and transit.
   - Tools: `search_attractions`, `search_restaurants`, `get_neighborhood_guide`.
3. **Financial & Budget Auditor (`budget_agent`)**:
   - Tallies flight, accommodation, food, activity, transit, and contingency costs against user budget limits.
   - Emits definitive audit status: `APPROVED` or `OVER_BUDGET` with surplus/deficit and saving recommendations.
   - Tools: `calculate_trip_budget`.
4. **Team Lead Orchestrator (`travel_orchestrator`)**:
   - Coordinates the 3 specialists, delegates sub-tasks, persists conversation state in PostgreSQL using `PostgresAgentStorage`, and synthesizes final plans.

---

## 🚀 Quick Start with Docker Compose

1. Clone or navigate to `travel-agent-workspace/`:
   ```bash
   cd travel-agent-workspace
   ```

2. Configure environment:
   ```bash
   cp backend/.env.example backend/.env
   # Add your GEMINI_API_KEY if using live Gemini LLM
   ```

3. Start all services (PostgreSQL, Backend, Frontend):
   ```bash
   docker compose up --build
   ```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 💻 Running Locally without Docker

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Run Backend Unit Tests
```bash
cd backend
pytest -v tests/test_tools.py
```
