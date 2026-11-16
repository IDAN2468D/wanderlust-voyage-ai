---
name: proactive-interests-scout
description: 'Monitors continuous natural-language Hebrew and English travel interest watchers against semantic VectorStore guides and live TLV flight/hotel fares, with optional 15-minute VIP auto-reserve.'
license: MIT
---

# Proactive Travel Interests Scout

## Protocol Flow
1. Accept natural-language travel wish prompt (`POST /api/v1/interests`) with `max_price_ils`, `target_category`, and `auto_reserve_vip`.
2. Extract semantic keywords, destination hints, and price ceiling in `₪`.
3. Score candidate packages/routes (`semantic_match_score >= 0.80`) and emit `VIP_AUTO_RESERVED_15M` holds when enabled.
