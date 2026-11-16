# 📜 PRD: Wanderlust Voyage AI — Autonomous Travel Planning Platform

## 1. Executive Summary & Vision
Wanderlust Voyage AI is an autonomous, multi-agent travel curation and workspace orchestration platform. It is engineered to eliminate the fragmentation of modern travel planning, where travelers spend 10 to 20 hours toggling between flight aggregators, hotel portals, review sites, and messy spreadsheets.

By uniting an intelligent FastAPI multi-agent backend with a Next.js 15 Liquid Glass frontend, Wanderlust Voyage AI generates hyper-personalized, flight-verified, budget-balanced itineraries in under 30 seconds complete with real-time reasoning logs and automated Google Workspace integration via Google Flow MCP.

## 2. Problem Statement
1. **Cognitive Overload & Tool Switching:** Users navigate 5+ tabs (Skyscanner, Booking.com, TripAdvisor, Google Maps, Excel) to organize a single trip.
2. **Budget Breaches:** Travelers struggle to predict hidden costs, transportation fees, and daily per-diem allowances, resulting in budget overruns.
3. **Opaque AI Generation:** Traditional chatbots output unstructured paragraphs with no transparency into flight validity, place ratings, or pricing confidence.
4. **Post-Planning Disconnect:** After planning, the traveler must manually enter flight times into Google Calendar and copy hotel vouchers into emails.

## 3. Product Goals
- **G1 (Sub-30s Generation):** Execute flight search, hotel curation, attraction discovery, and budget math in under 30 seconds total.
- **G2 (Real-Time Transparency):** Stream agent deliberation events to  with zero latency using SSE/WebSockets.
- **G3 (Budget Constraint Strictness):** Ensure total itinerary cost is strictly within user-defined bounds (Economy, Moderate, Luxury) with detailed percentage breakdowns.
- **G4 (Autonomous Workspace Export):** Seamless 1-click sync to Google Calendar (scheduled flights & tours), Gmail (confirmation briefing), and Google Drive (PDF/Doc itinerary) via Google Flow MCP.
- **G5 (Production Stability):** Resolve Render deployment exit status 127 and ensure 99.9% uptime on .

## 4. Non-Goals
- Direct airline GDS ticket issuance (system generates deep-linked reservation requests and verified price estimates; payment is finalized on trusted booking partners).
- Native offline GPS turn-by-turn navigation (delegates to Google Maps URLs provided in place metadata).

## 5. User Personas
1. **The Fast Vacationer:** Needs an instant 5-day holiday in Bali or Santorini with verified flights, boutique lodging, and top culinary spots.
2. **The Budget Backpacker:** Demands strict daily budget allocation ($50+/day), affordable hostels, and free cultural walking tours.
3. **The Executive Explorer:** Seeks luxury flights, 5-star resorts, private transfers, and calendar schedule integration.
4. **The Observant & Family Group Traveler:** Requires Shabbat/Halacha scheduling, multi-payer group splitting, eSIM/car-rental compliance, and offline travel vault access.

## 6. Success Metrics
| Metric | Target |
|---|---|
| Itinerary Generation Latency | < 30s (parallelized specialist tools) |
| Stream First-Byte (TTFB) | < 1.2s |
| Itinerary Accuracy & Budget Compliance | 100% within requested budget ceiling + Trip Critic audit |
| Deployment Health | 0 build crashes (exit code 0 on Render & Vercel) |
| Workspace Export Success | >= 99% via Google Flow MCP & persistent HITL |

---

## 7. Sprint 10 (V10.0 — Track H Adaptation): Autonomous Agentic Travel Commerce & Proactive AI Discovery

- **Release Target:** `V10.0 (Sprint 10 — 31-Agent Travel Swarm)`
- **Document ID:** `PRD-2026-V10-WANDERLUST-TRACK-H`
- **Design System:** `Liquid Glass 4.0 Pro RTL` (`120Hz Zero-Reflow GPU`, Dual-Theme RTL/LTR)

### 7.1 Executive Expansion (25 → 31 Autonomous Travel Agents)
Sprint 10 brings the four leading 2026 Agentic Commerce breakthroughs into Wanderlust Voyage AI:
1. **ACP / UCP External AI Travel Handshake (`/api/v1/acp/**`)**: Allows external AI shopping/travel assistants (`OpenAI ACP`, `Perplexity Pro`, `Google UCP`, `Amazon Buy for Me`, `Claude MCP`) to discover signed travel capabilities (`GET /.well-known/agent-commerce.json`, `GET /api/v1/acp/manifest`), mint bounded `DelegatedSpendToken` ceilings in `₪` (`ILS`), and execute single-trip atomic booking checkouts with automatic TLV/Shabbat safety checks.
2. **Proactive Travel Interests & Fare Radar (`/api/v1/interests/**`)**: Continuous natural-language Hebrew/English interest watchers (e.g., *"טיסות ישירות מנתב"ג לטוקיו באוקטובר מתחת ל-₪3,400 כולל מזוודה"*), parsed into structured constraints + semantic VectorStore embeddings (`Match Score >= 0.80`) with 15-minute **VIP Auto-Reserve** holds.
3. **Screenshot-to-Trip & Vision Fit Assessment (`/api/v1/vision-trip/**`)**: Decomposes travel inspiration screenshots/lookbooks into 2–5 clickable **Liquid Glass Hotspots** `(x, y, w, h)` mapped to flights, boutique stays, culinary spots, and experiences with a `-10%` Complete-the-Trip bundle discount + personalized `Fit Accuracy Score %`.
4. **Post-Booking Price Drop Guard & Travel Wallet (`/api/v1/price-guard/**`)**: Automatically registers confirmed bookings for 14-day (Standard) / 30-day (VIP Platinum) fare & hotel drop monitoring; when a live price drops below the paid amount, computes the `Price Delta ILS` and credits the user's **Wanderlust Travel Wallet** in `₪` automatically.
5. **Sidekick TravelOps Pulse & Bundle Deal Negotiator (`/api/v1/pulse/**`, `/api/v1/trips/negotiate-bundle`)**: Transforms passive FX/route telemetry into 1-click proactive **Pulse Action Cards** + AI-powered multi-component bundle negotiation.

### 7.2 V10.0 Business KPIs
| Metric | Baseline (Sprint 9) | Target (Sprint 10 V10.0) | Primary Driver |
|---|---|---|---|
| **AI-Referred Booking Conversion** | `3.8%` | `6.2% (+63%)` | Single-call ACP/UCP delegated checkout + signed manifest |
| **Multi-Component Bundle Value** | `₪5,200` | `₪6,900 (+33%)` | Screenshot-to-Trip `-10%` bundle builder & AI negotiator |
| **90-Day Traveler Retention** | `44%` | `68% (+24%)` | Automatic Price Guard `₪` wallet credits & Interest Radar alerts |
| **TravelOps Anomaly Reaction** | `4.5 hrs` | `< 60 sec` | Proactive Sidekick Pulse 1-click skill execution |

### 7.3 Strict Engineering Guardrails
- **Spec-First**: All API schemas adhere to Pydantic v2 (FastAPI) and Zod boundary validation (Next.js App Router).
- **Modular UI Cap**: Every new React/Next.js Track H component and route file is strictly `<= 200 LOC`.
- **BiDi & Israeli Locale**: Full RTL (`dir="rtl"`) and LTR (`dir="ltr"`) support, `DD/MM/YYYY` dates, and `ILS (₪)` / `USD ($)` / `EUR (€)` parity.

---

## 8. Sprint 11 (V11.0): Elasticsearch 8 Hybrid Vacation Search Engine & 32-Agent Swarm

- **Release Target:** `V11.0 (Sprint 11 — 32-Agent Travel Swarm)`
- **Document ID:** `PRD-2026-V11-ELASTICSEARCH-HYBRID`
- **Design System:** `Liquid Glass 4.0 Pro RTL` (`<= 200 LOC` modular UI components)

### 8.1 Capabilities & Product Requirements
1. **Hybrid BM25 + 768d kNN Vector Search (`POST /api/v1/search/vacations`)**: Combines lexical keyword & typo-tolerant (`fuzziness: AUTO`) BM25 scoring with 768-dimensional semantic vectors (`gemini-embedding-001` / bilingual 768d projection) via **Reciprocal Rank Fusion (RRF)**.
2. **Sub-15ms Edge N-Gram Instant Autocomplete (`GET /api/v1/search/vacations/autocomplete`)**: Prefix + fuzzy autocomplete across Hebrew/English destinations, airports (`TLV`, `CDG`, `JTR`, `FCO`, `HND`), and trip titles.
3. **Real-Time Faceted Aggregations**: Live counts (`vibe_tags`, `price_ils` ranges, `star_rating`, `weather_badge`, price `stats`).
4. **Geo-Point Proximity & Radius Filtering (`geo_point`)**: Filter & rank results within `radius_km` of iconic landmarks (`Paris Eiffel`, `Rome Colosseum`, `Tokyo Shibuya`, `Santorini Oia`, `Jerusalem Kotel`) or custom `(lat, lon)`.
5. **Agent #32 (`ElasticVacationSearchAgent`) + MCP Tool + Zero-Downtime Fallback**: Seamless `AsyncElasticsearch` execution against Elasticsearch 8.15 with deterministic **In-Memory Hybrid Fallback** when Elasticsearch container is offline.
