# 📋 PLAN: Implementation Roadmap & Sprints

## Sprint 1: Agentic Core & Tool Verification (Days 1-2)
- [x] Audit `backend/app/agents/orchestrator.py` and specialist tools
- [x] Validate flight, places, and budget data schemas
- [x] Implement deterministic fallback datasets for offline reliability
- [x] Unit test flight search algorithms and price calculations

## Sprint 2: Real-Time Streaming & Next.js UI Integration (Days 3-4)
- [x] Connect `frontend/components/AgentStreamLogs.tsx` to FastAPI SSE stream
- [x] Render live thought badges, step-by-step progress, and agent deliberation cards
- [x] Format `TripResultView.tsx` with day tabs, cost breakdown cards, and Google Maps links
- [x] Polish `TripForm.tsx` with date pickers, budget ranges, and travel styles

## Sprint 3: Deployment Hardening & Render Fix (Day 5)
- [x] Fix Render start command and environment variables (status 127 resolution)
- [x] Align Vercel `NEXT_PUBLIC_API_URL` environment configuration with Render production URL
- [x] Verify CORS headers in `backend/app/main.py` for cross-origin streaming

## Sprint 4: Google Flow MCP & Workspace Sync (Days 6-7)
- [x] Bind Google Flow MCP server configuration in `agents.json`
- [x] Enable 1-click Google Calendar schedule export for flight takeoff and hotel check-in
- [x] Implement Gmail confirmation email dispatcher and Google Drive itinerary backup

## Sprint 5: BiDi Hebrew Localization & Travel Polish (Day 8)
- [x] Validate RTL layout styling across all destination modals and result cards
- [x] Enforce Israeli date convention `DD/MM/YYYY` and ILS (₪) currency conversion

## Sprint 6: Full Course Spec Upgrade (Agno Live Team, Live APIs, Guardrails, HITL, Evals & MCP)
- [x] Wire live `travel_orchestrator.arun(...)` + multi-turn chat (`POST /api/trips/chat`) with fallback
- [x] Integrate Open-Meteo, Frankfurter, and OSM Nominatim via `httpx.AsyncClient` (5s timeout + fallback)
- [x] Implement `guardrails.py` (`validate_trip_input`, `validate_trip_output`) and HITL approval workflow
- [x] Expose standard MCP server (`travel_mcp_server.py`) and add `test_agent_eval.py` + `test_mcp_server.py`

## Sprint 7: Persistent PostgreSQL/SQLite DB, Rotating Newsletter, RAG Vector Store & Reasoning Model
- [x] Add SQLAlchemy ORM persistence (`users`, `bookings`, `trips`, `newsletter_subscribers`, `contact_inquiries`, `knowledge_chunks`) with Render PostgreSQL + SQLite fallback
- [x] Implement rotating RTL newsletter system via Resend + Footer preview modal
- [x] Build modular RAG Knowledgebase (`Loader -> Splitter -> Embedder -> VectorStore -> Retriever`) + NoSQL JSON vector store + `/api/v1/knowledge/*` endpoints
- [x] Integrate `ReasoningTools` + `run_reasoning_audit` + SSE `[STAGE: KNOWLEDGE_RAG]` / `[STAGE: REASONING]` + UI tab in `TripResultView.tsx`
- [x] Add `search_travel_knowledge` tool to `travel_mcp_server.py` and full pytest + build + E2E verification

## Sprint 8: Swarm Hardening, Parallel Orchestrator & Core Meta-Agents
- [x] Harden `auth.py`, `calendar_tools.py`, `flight_tools.py` (TLV carriers), `render.yaml`, and unify Frankfurter FX rates
- [x] Parallelize `stream_multi_agent_execution` in `orchestrator.py` and wire `travelers` / `return_date`
- [x] Add `TravelerProfileModel`, `PendingActionModel`, `TripVoteModel`, and `owner_user_id` RAG scoping
- [x] Implement `trip_disruption_replan_agent`, `trip_critic_agent`, `travel_memory_agent`, and `post_booking_concierge_agent`

## Sprint 9: Domain Specialists, BiDi Locale, Interactive Day-Canvas & Offline Vault
- [x] Implement `shabbat_halacha_agent`, `group_split_agent`, `connectivity_mobility_agent`, `protection_rerouting_agent`, and `loyalty_vault_agent`
- [x] Add `LocaleContext` (`HE` RTL ↔ `EN` LTR), Live Ops & FX Ticker, Day Re-Planner Co-Pilot Drawer, Geo-Route Map, Group Split/Voting, and IndexedDB Offline Travel Vault
- [x] Full pytest + flake8 + `verify_agent_suite.py` + `tsc --noEmit` + `next build` verification

## Sprint 10 (V10.0 — Track H): Autonomous Agentic Travel Commerce & Proactive AI Discovery (31 Agents)
- [x] Update 5-Layer Stack docs (`PRD.md`, `SPEC.md`, `PLAN.md`, `PROMPT_COPYABLE.md`, `agents.json`, 4 new Skills)
- [x] Add SQLAlchemy ORM models (`AgentCommerceSessionModel`, `InterestWatcherModel`, `PriceProtectionPolicyModel`, `TravelWalletEntryModel`, `PulseActionExecutionModel`)
- [x] Implement 6 new specialist tools & agents (#26–#31): `acp_gateway_tools.py`, `interests_scout_tools.py`, `vision_trip_tools.py`, `price_guard_tools.py`, `pulse_negotiator_tools.py`
- [x] Expose FastAPI `/api/v1/{acp,interests,vision-trip,price-guard,pulse}/*`, `/.well-known/agent-commerce.json`, `/api/v1/trips/negotiate-bundle` + wire into `orchestrator.py` & `travel_mcp_server.py`
- [x] Build Zod validator suite (`frontend/lib/validators/trackHSchemas.ts`), Next.js proxy (`frontend/app/api/track-h/route.ts`), modular `<= 200 LOC` Liquid Glass RTL components, and `/discover` hub
- [x] Write comprehensive pytest unit + API + MCP tests and verify `pytest`, `verify_agent_suite.py`, `npx tsc --noEmit`, `npm run build`, and `<= 200 LOC` guardrails

## Sprint 11 (V11.0): Elasticsearch 8 Hybrid Vacation Search & Agent #32 (`ElasticVacationSearchAgent`)
- [x] Update Spec-First 5-Layer docs (`PRD.md`, `SPEC.md`, `PLAN.md`, `agents.json`, `Skills/elastic-vacation-search/SKILL.md`)
- [x] Implement `elasticsearch_catalog.py` (768d embedder + `wanderlust_vacations_v1` mapping + geo coordinates) & `elasticsearch_vacation_tools.py` (`AsyncElasticsearch` + In-Memory BM25/kNN RRF fallback)
- [x] Expose FastAPI `/api/v1/search/vacations*`, MCP tool `search_vacations_elasticsearch`, & Docker Compose ES 8.15 service
- [x] Build Zod schemas (`searchSchemas.ts`), Next.js proxy (`/api/elastic-search`), and `ElasticVacationSearchModal.tsx` (`<= 200 LOC`)
- [x] Verify full pytest suite, `verify_agent_suite.py` (32 agents), `tsc --noEmit`, `next build`, and CI pipeline
