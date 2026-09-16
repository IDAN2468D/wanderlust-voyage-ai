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
