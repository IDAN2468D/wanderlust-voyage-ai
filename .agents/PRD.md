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
2. **The Budget Backpacker:** Demands strict daily budget allocation (0/day), affordable hostels, and free cultural walking tours.
3. **The Executive Explorer:** Seeks luxury flights, 5-star resorts, private transfers, and calendar schedule integration.

## 6. Success Metrics
| Metric | Target |
|---|---|
| Itinerary Generation Latency | < 30s |
| Stream First-Byte (TTFB) | < 1.2s |
| Itinerary Accuracy & Budget Compliance | 100% within requested budget ceiling |
| Deployment Health | 0 build crashes (exit code 0 on Render & Vercel) |
| Workspace Export Success | >= 99% via Google Flow MCP |
