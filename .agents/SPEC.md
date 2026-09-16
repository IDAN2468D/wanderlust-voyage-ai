# ⚙️ SPEC: Technical Architecture & System Specification

## 1. High-Level Architecture
```
[Next.js 15 Frontend (Vercel)] ──► POST /api/v1/trips/plan (SSE Stream)
                │
                ▼
[FastAPI Backend (Render)] ──► MultiAgentOrchestrator
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
[FlightTool] [PlacesTool] [BudgetTool]
    │           │           │
    └───────────┬───────────┘
                ▼
[Aggregated Itinerary & Cost Engine]
                │
                ▼
[Google Flow MCP / Workspace Bridge] ──► Calendar Events, Gmail Confirmation, Drive Doc
```

## 2. API Contract: POST `/api/v1/trips/plan`
### Request Schema (`TripPlanRequest`)
```json
{
  "destination": "Bali, Indonesia",
  "origin": "Tel Aviv (TLV)",
  "departure_date": "2026-10-15",
  "return_date": "2026-10-22",
  "travelers": 2,
  "budget": 3500,
  "currency": "USD",
  "travel_style": "ADVENTURE_LUXURY",
  "interests": ["beaches", "temples", "culinary", "scuba"]
}
```

### Response / Stream Payload
- **Stream Event 1 (Status):** `{"stage": "routing", "message": "Analyzing traveler preferences and initializing specialist agents..."}`
- **Stream Event 2 (Flight):** `{"stage": "flights", "message": "Searching direct & 1-stop routes TLV -> DPS..."}`
- **Stream Event 3 (Places):** `{"stage": "places", "message": "Curating boutique cliffside villas in Uluwatu & cultural dining..."}`
- **Stream Event 4 (Budget):** `{"stage": "budget", "message": "Balancing total cost ($3,240 / $3,500 budget ceiling)..."}`
- **Stream Event 5 (Result):** Full `TripPlanResponse` with structured days, activities, flight options, hotel bookings, and Google Maps deep links.

## 3. Tool Specifications
### `flight_tools.py`
- `search_flights(origin, destination, departure_date, return_date, travelers, max_price)`: Returns ranked flight segments with airline, flight number, duration, layovers, and price.
### `places_tools.py`
- `search_places(destination, category, query, budget_tier)`: Returns places with name, rating, address, opening hours, pricing tier, and geo coordinates.
### `budget_tools.py`
- `calculate_trip_budget(flights_cost, lodging_cost, daily_allowance, days, travelers)`: Returns structured breakdown: Flights (%), Lodging (%), Activities (%), Dining (%), Buffer (%).

## 4. Render Deployment Fix (Exit Status 127)
- **Root Cause:** Status 127 in Render indicates missing binary or misconfigured start command in `render.yaml` or static web service mode.
- **Solution:**
  1. Set Service Type to `Web Service` (Python 3.11+ runtime or Docker).
  2. Build Command: `pip install --upgrade pip && pip install -r backend/requirements.txt`
  3. Start Command: `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
