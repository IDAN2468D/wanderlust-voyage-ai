---
name: acp-travel-commerce
description: 'Exposes signed Agentic Commerce Protocol (ACP/UCP) discovery manifests, issues bounded DelegatedSpendToken ceilings in ILS (₪), and executes single-trip atomic AI travel checkouts.'
license: MIT
---

# ACP / UCP Travel Commerce Gateway

## Protocol Flow
1. Serve signed capability manifest at `GET /.well-known/agent-commerce.json` and `GET /api/v1/acp/manifest`.
2. Issue bounded `DelegatedSpendToken` (`POST /api/v1/acp/tokens/delegate`) with `max_authorized_ils`, `allowed_categories`, and HMAC-SHA256 signature.
3. Execute atomic single-trip checkout (`POST /api/v1/acp/checkout`) enforcing TLV carrier & Shabbat compliance, creating a persisted `BookingModel` + `AgentCommerceSessionModel`, and auto-enrolling in Price Drop Guard.
