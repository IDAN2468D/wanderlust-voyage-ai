---
name: elastic-vacation-search
description: 'Hybrid BM25 + 768-dim Dense Vector (RRF) Elasticsearch 8 vacation search with sub-15ms Edge N-Gram autocomplete, real-time faceted aggregations, and geo_point radius ranking (Agent #32).'
license: MIT
---

# Elasticsearch 8 Hybrid Vacation Search (`ElasticVacationSearchAgent` — Agent #32)

## Protocol Flow
1. Index curated and dynamic vacation packages into `wanderlust_vacations_v1` with `dense_vector` (`768` dims, cosine similarity), `geo_point` (`coordinates`), `completion`/`search_as_you_type` (`destination_he` / `destination_en`), `scaled_float` (`price_ils`), and keyword facets (`vibe_tags`, `weather_badge`, `star_rating`).
2. Execute Hybrid Search (`POST /api/v1/search/vacations`) fusing exact/fuzzy BM25 (`fuzziness: AUTO`) and 768-dim semantic kNN via **Reciprocal Rank Fusion (RRF, k=60)** with real-time faceted aggregations and optional `geo_distance` proximity filtering.
3. Provide sub-15ms instant autocomplete (`GET /api/v1/search/vacations/autocomplete?q=...`) and automatic **In-Memory Hybrid Fallback** when Elasticsearch container is offline.
