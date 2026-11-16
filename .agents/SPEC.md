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

## 5. Autonomous Agno Team, Multi-Turn Chat, Guardrails, HITL & MCP Extensions
- **Multi-Turn Chat (`POST /api/trips/chat`, `/api/v1/trips/chat`)**:
  - `TripChatRequest`: `session_id`, `message`
  - `TripChatResponse`: `session_id`, `reply`, `updated_plan`
  - Backed by `travel_orchestrator.arun(message, session_id=session_id)` with `PostgresDb`/`PostgresAgentStorage` and deterministic fallback when `GEMINI_API_KEY` is absent.
- **Live External APIs (`httpx.AsyncClient`, 5s timeout + fallback)**:
  - `weather_tools.py`: Open-Meteo Geocoding & Forecast API
  - `budget_tools.py`: Frankfurter Exchange Rate API (`USD`, `EUR`, `ILS`, `GBP`)
  - `places_tools.py`: OpenStreetMap Nominatim Geocoding API
- **Guardrails (`backend/app/agents/guardrails.py`)**:
  - `validate_trip_input`: rejects past/invalid dates, non-positive budgets, and budgets `< $50/day`.
  - `validate_trip_output`: validates required plan keys, Israeli `DD/MM/YYYY` date format, and flags budget overruns.
- **Human-In-The-Loop (HITL)**:
  - `require_approval: bool = False` on `/api/workspace/send-briefing` & `/api/workspace/sync-calendar` returning `status: "pending_approval"` + `action_id`.
  - `POST /api/trips/approve-action` (`action_id`, `approved`) executes or cancels pending actions.
- **Standard MCP Server (`backend/app/mcp/travel_mcp_server.py`)**:
  - Exposes `search_flights`, `get_destination_weather`, `calculate_trip_budget`, and `search_travel_knowledge` under `wanderlust-travel-mcp`.

## 6. RAG Knowledgebase, Vector Store & Reasoning Engine (Booklet Syllabus Alignment)
- **RAG Pipeline (`backend/app/rag/`):**
  - `loader.py` (`KnowledgeLoader`): Ingests structured travel guides, visa/entry advisories, and Israeli traveler handbooks from `backend/app/knowledge/`.
  - `splitter.py` (`TextChunkSplitter`): Overlapping semantic chunk splitter preserving document metadata and tags.
  - `embedder.py` (`TravelEmbedder`): 256-dim bilingual (Hebrew + English) dense vector embedder with optional Gemini `text-embedding-004` live mode.
  - `vector_store.py` (`VectorStore`): Cosine-similarity vector index persisted as NoSQL JSON document store (`backend/data/rag_vector_store.json`) and mirrored to SQLAlchemy `knowledge_chunks` (`KnowledgeChunkModel`).
  - `retriever.py` (`KnowledgeBaseService`, `search_travel_knowledge`): Indexing, semantic retrieval, and context generation for Agno agents & API routes.
- **Reasoning Engine (`backend/app/agents/reasoning.py`):**
  - Attaches `agno.tools.reasoning.ReasoningTools` and `GEMINI_REASONING_MODEL` (`gemini-2.5-flash`) to the Agno orchestrator, plus deterministic 4-stage `run_reasoning_audit(...)` verifying dates, budget invariants, RAG compliance advisories, and itinerary pacing.
- **Knowledge API Contracts:**
  - `POST /api/v1/knowledge/search` (`query`, `destination`, `top_k`) -> ranked RAG chunks with cosine scores.
  - `GET /api/v1/knowledge/stats` -> indexed document count, vector chunk count, embedder mode, storage backend.
  - `POST /api/v1/knowledge/reindex` -> triggers full `Loader -> Splitter -> Embedder -> VectorStore` re-indexing.

## 7. Sprint 8 & 9 Extensions: Swarm Specialist Roster, Critic Gate & Interactive Co-Pilot
- **New Specialist & Meta-Agents:**
  1. `trip_disruption_replan_agent` (`backend/app/tools/replan_tools.py`): Stateful day/slot replanning (`POST /api/v1/trips/{session_id}/replan`, `/replan/stream`) with budget & `.ics` recalculation and `ItineraryDiffItem[]`.
  2. `trip_critic_agent` (`backend/app/agents/critic.py`): Pre-completion verification & auto-repair gate auditing flight/hotel/Shabbat alignment, geo-coherence, and baggage/FX math.
  3. `travel_memory_agent` (`backend/app/tools/memory_tools.py`): Persistent `TravelerProfileModel` (`GET/PUT /api/v1/profile/preferences`), passport expiry check, and user-scoped Personal RAG (`owner_user_id` on `KnowledgeChunkModel`, `POST /api/v1/knowledge/ingest-personal`).
  4. `shabbat_halacha_agent` (`backend/app/tools/shabbat_halacha_tools.py`): Candle-lighting/Havdalah times, Friday 14:00 cutoff, Shabbat-compliant lodging & walking radius.
  5. `group_split_agent` (`backend/app/tools/group_split_tools.py`): Multi-traveler cost splitting, child/adult pricing, collaborative voting (`POST /api/v1/trips/{session_id}/group-split`, `/vote`), and Bit/PayBox settlement ledger.
  6. `connectivity_mobility_agent` (`backend/app/tools/connectivity_mobility_tools.py`): eSIM vs. Israeli roaming GB calculator + IDP, ZTL/LEZ, highway vignette, and CDW rental traps.
  7. `protection_rerouting_agent` (`backend/app/tools/protection_rerouting_tools.py`): Insurance riders + 5-day credit-card rule, MCT layover Plan B, and Israeli Aviation Law ("חוק טיבי") / EU261 compensation calculator.
  8. `loyalty_vault_agent` (`backend/app/tools/loyalty_vault_tools.py`): EL AL Matmid / Fly Card / Flying Blue CPP optimizer, TLV lounge eligibility, and pre-flight readiness vault.
  9. `post_booking_concierge_agent` & `watchdog_agent` (`backend/app/tools/concierge_tools.py`): T-30d/T-7d/T-24h readiness timeline (`GET /api/v1/bookings/{booking_ref}/readiness`, `/readiness/stream`), DB-persisted `PendingActionModel` HITL, and `GET /api/v1/ops/live-pulse` + `/api/v1/ops/metrics`.
- **BiDi & Offline UX:**
  - `LocaleContext` (`he` RTL ↔ `en` LTR) in `Navbar.tsx`, Interactive Day-Canvas + Geo-Route Map in `TripResultView.tsx`, and IndexedDB Offline Travel Vault.

---

## 8. Sprint 10 (V10.0 — Track H Adaptation): 6 New Autonomous Agents, APIs, DB Models & Zod Contracts

### 8.1 Swarm Expansion (25 → 31 Autonomous Travel Agents)
| # | Agent ID | Module | Coupled API Route | DB / Persistence |
|---|---|---|---|---|
| `26` | `external_agent_handshake_agent` | `app/tools/acp_gateway_tools.py` | `/api/v1/acp/**` & `/.well-known/agent-commerce.json` | `AgentCommerceSessionModel` |
| `27` | `interests_watchdog_agent` | `app/tools/interests_scout_tools.py` | `/api/v1/interests/**` | `InterestWatcherModel` |
| `28` | `vision_lookbook_agent` | `app/tools/vision_trip_tools.py` | `/api/v1/vision-trip/**` | `VectorStore` + Lookbook Presets |
| `29` | `post_booking_price_guard_agent` | `app/tools/price_guard_tools.py` | `/api/v1/price-guard/**` | `PriceProtectionPolicyModel`, `TravelWalletEntryModel` |
| `30` | `travel_pulse_autopilot_agent` | `app/tools/pulse_negotiator_tools.py` | `/api/v1/pulse/**` | `PulseActionExecutionModel` |
| `31` | `bundle_deal_negotiator_agent` | `app/tools/pulse_negotiator_tools.py` | `/api/v1/trips/negotiate-bundle` | Session & Offer Telemetry |

### 8.2 Backend REST API Contracts (`/api/v1/*` + `/api/*` Compat)
1. **ACP / UCP External Agent Travel Gateway**:
   - `GET /.well-known/agent-commerce.json` & `GET /api/v1/acp/manifest` — Signed capability manifest, supported currencies (`ILS`, `USD`, `EUR`), OAuth/delegation rules, and cryptographic merchant signature.
   - `POST /api/v1/acp/tokens/delegate` — Issues HMAC-SHA256 `DelegatedSpendToken` with `max_authorized_ils`, `allowed_categories`, `expires_at`.
   - `POST /api/v1/acp/checkout` — Validates spend token, enforces TLV/Shabbat carrier audit, creates `BookingModel` + `AgentCommerceSessionModel`, and auto-registers Price Protection.
   - `GET /api/v1/acp/sessions` — Lists recent delegated agent commerce sessions.
2. **Proactive Travel Interests Scout**:
   - `GET /api/v1/interests?user_id={user_id}` — Lists active natural-language travel watchers & semantic match alerts.
   - `POST /api/v1/interests` — Creates watcher (`raw_prompt_hebrew`, `target_category`, `max_price_ils`, `auto_reserve_vip`), extracts keywords, and performs immediate vector/catalog scoring.
   - `POST /api/v1/interests/{interest_id}/evaluate` — Re-evaluates live catalog/TLV fares and triggers VIP 15-min hold if `match_score >= 0.80`.
   - `DELETE /api/v1/interests/{interest_id}` — Deletes or archives an interest watcher.
3. **Screenshot-to-Trip & Virtual Fit Assessment**:
   - `GET /api/v1/vision-trip/presets` — Curated shoppable travel lookbooks (`SANTORINI_CLIFFSIDE`, `TOKYO_NEON_FOOD`, `SWISS_ALPINE_CHALET`, `AMALFI_COAST_LUXURY`, `BALI_JUNGLE_VILLA`).
   - `POST /api/v1/vision-trip/decompose-screenshot` — Decomposes screenshot URL/base64 or scene preset into 2–5 `(x, y, w, h)` bounding-box hotspots mapped to bookable travel components with `-10%` Complete-the-Trip bundle pricing in `ILS`/`USD`.
   - `POST /api/v1/vision-trip/fit-assessment` — Computes `fit_accuracy_pct` (0–100%), Shabbat/family/flight-duration compatibility, and return/cancellation-risk reduction score.
4. **Post-Booking Price Drop Guard & Travel Wallet**:
   - `GET /api/v1/price-guard?user_id={user_id}` — Returns active 14/30-day policies, wallet balance (`₪`), and ledger credits.
   - `POST /api/v1/price-guard/register` — Registers a booking reference for 14-day (`STANDARD`) or 30-day (`GOLD`/`PLATINUM`) protection.
   - `POST /api/v1/price-guard/scan-drops` — Scans live fares/rates; when `current_price_ils < paid_amount_ils`, issues automatic wallet credit (`TravelWalletEntryModel`).
5. **Sidekick Pulse & Bundle Deal Negotiator**:
   - `GET /api/v1/pulse/actions` — Returns proactive TravelOps / FX / Price-Guard / Booking Pulse Action Cards.
   - `POST /api/v1/pulse/actions/{action_id}/execute` — Executes 1-click pulse automation and persists execution telemetry.
   - `POST /api/v1/trips/negotiate-bundle` — Negotiates multi-SKU Flight + Hotel + Transfer/eSIM bundle discount with counter-offer reasoning.

### 8.3 Next.js 15 Frontend Modular Architecture (`<= 200 LOC` per File) + Zod
| File Path (`frontend/...`) | Max LOC | Responsibility |
|---|---|---|
| `lib/validators/trackHSchemas.ts` | `< 120` | Shared Zod schemas (`AcpDelegatedCheckoutSchema`, `CreateInterestWatcherSchema`, `ScreenshotDecomposeRequestSchema`, `PriceProtectionScanSchema`, `BundleNegotiateSchema`) |
| `app/api/track-h/route.ts` | `< 180` | Next.js App Router proxy to FastAPI V10.0 endpoints with Zod validation & graceful fallback |
| `components/track-h/ScreenshotLookbookModal.tsx` | `< 195` | Interactive Screenshot-to-Trip hotspot overlay (`transform-gpu`), Web Audio spatial ping, `-10%` bundle trigger |
| `components/track-h/ProactiveInterestsCard.tsx` | `< 195` | Natural-language travel interests radar + VIP 15-min Auto-Reserve + live match alerts |
| `components/track-h/PriceGuardShieldCard.tsx` | `< 190` | Post-booking 14/30-day Price Drop Shield + instant drop scan + `₪` Wallet ledger |
| `components/track-h/SidekickPulseStrip.tsx` | `< 175` | Proactive Sidekick Pulse action cards with 1-click execution |
| `components/track-h/AcpAgentBridgeModal.tsx` | `< 190` | ACP/UCP Delegated Spend Token (`₪`) + Atomic AI Checkout + Bundle Deal Negotiator |
| `app/discover/page.tsx` | `< 195` | Unified Track H / V10.0 Discovery Hub (`/discover`) in Liquid Glass 4.0 Pro RTL |

### 8.4 MCP Server Extensions (`backend/app/mcp/travel_mcp_server.py`)
- `get_acp_commerce_manifest()`
- `create_travel_interest_watcher(user_id, raw_prompt_hebrew, target_category, max_price_ils, auto_reserve_vip)`
- `decompose_travel_screenshot(scene_type, travelers, budget_ceiling_ils, image_source_url)`
- `scan_booking_price_drops(user_id, booking_ref, paid_amount_ils, destination, vip_tier)`

---

## 9. Sprint 11 (V11.0) Technical Spec: Elasticsearch 8 Hybrid Search (`wanderlust_vacations_v1`)

### 9.1 Index Mapping (`wanderlust_vacations_v1`)
- `package_id` (`keyword`) — Unique package SKU identifier (e.g. `PKG-PARIS-EIFFEL-LUX`)
- `destination_he` / `destination_en` (`text` + `search_as_you_type` + `completion`) — Hebrew & English destination names
- `vibe_tags` (`keyword`) — `ROMANTIC`, `CULINARY`, `SNOW_ALPINE`, `BEACH_LUXURY`, `KOSHER_FRIENDLY`, `FAMILY`, `WELLNESS_SPA`, `URBAN_CULTURE`
- `price_ils` (`scaled_float`, `scaling_factor: 100`) — Package price in ILS (`₪`)
- `coordinates` (`geo_point`) — Latitude / longitude for `geo_distance` radius & proximity scoring
- `embedding` (`dense_vector`, `dims: 768`, `index: true`, `similarity: "cosine"`) — 768d semantic vector
- `star_rating` (`integer`), `weather_badge` (`keyword`), `shabbat_friendly` (`boolean`), `iata_code` (`keyword`)

### 9.2 FastAPI Endpoints (`backend/app/api/track_h_routes.py`)
- `POST /api/v1/search/vacations` — Hybrid BM25 + 768d kNN search fused via RRF (`k=60`), real-time facet aggregations, and `geo_point` radius filter/sort
- `GET /api/v1/search/vacations/autocomplete?q=...&limit=8` — Instant Edge N-Gram & prefix autocomplete with latency metric (`took_ms`)
- `GET /api/v1/search/vacations/status` — Cluster/engine status (`elasticsearch_8` vs `in_memory_hybrid_768d`), indexed docs count, and `embedding_dims: 768`
- `POST /api/v1/search/vacations/reindex` — Idempotent index creation (`wanderlust_vacations_v1`) & bulk seed indexing

### 9.3 Frontend Modular Files (`<= 200 LOC` per File) + MCP
- `frontend/lib/validators/searchSchemas.ts` — Zod validation contracts
- `frontend/app/api/elastic-search/route.ts` — Next.js App Router proxy + offline hybrid fallback
- `frontend/components/track-h/elasticSearchTypes.ts` — Types, geo-point landmark anchors & client fallback
- `frontend/components/track-h/ElasticVacationSearchModal.tsx` (`<= 195 LOC`) — Liquid Glass 4.0 Pro RTL Hybrid Search & Facets UI
- MCP Tool (`backend/app/mcp/travel_mcp_server.py`): `search_vacations_elasticsearch(query, max_price_ils, vibe_tags, shabbat_only, limit)`
