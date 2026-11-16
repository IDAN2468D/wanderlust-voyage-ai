"""
Agent #32 — ElasticVacationSearchAgent Engine (Sprint 11 / V11.0).
Provides Hybrid BM25 + 768d kNN Dense Vector search with Reciprocal Rank Fusion (RRF),
sub-15ms Edge N-Gram bilingual autocomplete, real-time faceted aggregations, and geo_point radius ranking.
Uses Elasticsearch 8.15 AsyncElasticsearch when available, with deterministic In-Memory 768d fallback.
"""
import math
import re
import time
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.tools.elasticsearch_catalog import (
    _CONCEPT_EXPANSIONS,
    EMBEDDING_DIMS,
    GEO_LANDMARK_ANCHORS,
    VACATION_INDEX_MAPPING,
    VACATION_SEED_PACKAGES,
    embed_768d,
)

try:
    from elasticsearch import AsyncElasticsearch
except ImportError:  # pragma: no cover - local dev without optional package installed
    AsyncElasticsearch = None  # type: ignore[assignment]

_TOKEN_RE = re.compile(r"[a-z0-9\u0590-\u05ff_]+")
_RRF_K = 60

_VIBE_LABELS_HE: Dict[str, str] = {
    "ROMANTIC": "רומנטי וזוגי",
    "SNOW_ALPINE": "שלג וחורף אלפיני",
    "WELLNESS_SPA": "ספא ורוגע",
    "KOSHER_FRIENDLY": "כשר ושומר שבת",
    "CULINARY": "קולינריה ושווקים",
    "BEACH_LUXURY": "חופים ובטן-גב יוקרתי",
    "FAMILY": "משפחות וילדים",
    "URBAN_CULTURE": "עיר, אמנות ושופינג",
    "WINTER": "חופשת חורף",
}


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    return sum(a * b for a, b in zip(vec_a, vec_b))


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r_km = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2.0) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2.0) ** 2
    return round(2.0 * r_km * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a))), 2)


def _levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ch_a in enumerate(a, start=1):
        curr = [i]
        for j, ch_b in enumerate(b, start=1):
            cost = 0 if ch_a == ch_b else 1
            curr.append(min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost))
        prev = curr
    return prev[-1]


def _fuzzy_token_match(q_tok: str, doc_tokens: List[str]) -> float:
    best = 0.0
    max_edits = 1 if len(q_tok) <= 5 else 2
    for d_tok in doc_tokens:
        if q_tok == d_tok:
            return 1.0
        if len(q_tok) >= 2 and d_tok.startswith(q_tok):
            best = max(best, 0.85)
        elif len(q_tok) >= 3 and q_tok in d_tok:
            best = max(best, 0.72)
        elif len(q_tok) >= 4 and abs(len(q_tok) - len(d_tok)) <= max_edits:
            dist = _levenshtein(q_tok, d_tok)
            if dist <= max_edits:
                best = max(best, 0.68 if dist == 1 else 0.52)
    return best


def _resolve_geo_point(geo_filter: Optional[Dict[str, Any]]) -> Optional[Tuple[float, float, float, str]]:
    if not geo_filter:
        return None
    radius_km = float(geo_filter.get("radius_km") or 25.0)
    anchor_id = geo_filter.get("anchor_id")
    if anchor_id and anchor_id in GEO_LANDMARK_ANCHORS:
        anc = GEO_LANDMARK_ANCHORS[anchor_id]
        return float(anc["lat"]), float(anc["lon"]), radius_km, str(anc["label_he"])
    lat = geo_filter.get("lat")
    lon = geo_filter.get("lon")
    if lat is not None and lon is not None:
        return float(lat), float(lon), radius_km, f"({float(lat):.2f}, {float(lon):.2f})"
    return None


def _strip_embedding(doc: Dict[str, Any], distance_km: Optional[float] = None) -> Dict[str, Any]:
    clean = {k: v for k, v in doc.items() if k != "embedding"}
    if distance_km is not None:
        clean["distance_km"] = distance_km
    return clean


def _bm25_score(query: str, doc: Dict[str, Any]) -> float:
    q_norm = (query or "").lower().strip()
    if not q_norm:
        return 1.0

    q_tokens = _TOKEN_RE.findall(q_norm)
    expanded_terms: List[str] = list(q_tokens)
    for tok in q_tokens:
        for stem, exps in _CONCEPT_EXPANSIONS.items():
            if stem in tok or tok in stem:
                expanded_terms.extend(e.lower() for e in exps)

    weighted_fields: List[Tuple[str, float]] = [
        (f"{doc.get('destination_he', '')} {doc.get('destination_en', '')} {doc.get('iata_code', '')}", 3.6),
        (f"{doc.get('title_he', '')} {doc.get('title_en', '')}", 2.4),
        (" ".join(doc.get("vibe_tags", [])) + " " + str(doc.get("weather_badge", "")), 2.1),
        (f"{doc.get('description_he', '')} {doc.get('hotel_name', '')} {doc.get('country_he', '')} {doc.get('country_en', '')}", 1.5),
    ]

    score = 0.0
    for field_text, weight in weighted_fields:
        f_tokens = _TOKEN_RE.findall(field_text.lower())
        if not f_tokens:
            continue
        for tok in q_tokens:
            match_strength = _fuzzy_token_match(tok, f_tokens)
            if match_strength > 0:
                score += match_strength * weight
        for exp in set(expanded_terms):
            if exp in field_text.lower():
                score += 0.55 * weight

    return round(score, 4)


def _compute_facets(docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    vibe_counts: Counter = Counter()
    star_counts: Counter = Counter()
    weather_counts: Counter = Counter()
    shabbat_count = 0
    prices: List[float] = []
    range_counts = {"under_3500": 0, "between_3500_5500": 0, "over_5500": 0}

    for doc in docs:
        for tag in doc.get("vibe_tags", []):
            vibe_counts[tag] += 1
        star_counts[str(doc.get("star_rating", 4))] += 1
        weather_counts[str(doc.get("weather_badge", "MILD_SPRING"))] += 1
        if doc.get("shabbat_friendly"):
            shabbat_count += 1
        price = float(doc.get("price_ils", 0.0))
        prices.append(price)
        if price < 3500:
            range_counts["under_3500"] += 1
        elif price <= 5500:
            range_counts["between_3500_5500"] += 1
        else:
            range_counts["over_5500"] += 1

    return {
        "vibes": [
            {"key": k, "label_he": _VIBE_LABELS_HE.get(k, k), "count": c}
            for k, c in vibe_counts.most_common()
        ],
        "price_ranges": [
            {"key": "under_3500", "label_he": "עד ₪3,500", "max_ils": 3500, "count": range_counts["under_3500"]},
            {"key": "between_3500_5500", "label_he": "₪3,500–₪5,500", "min_ils": 3500, "max_ils": 5500, "count": range_counts["between_3500_5500"]},
            {"key": "over_5500", "label_he": "מעל ₪5,500", "min_ils": 5500, "count": range_counts["over_5500"]},
        ],
        "stars": [{"stars": int(k), "count": c} for k, c in sorted(star_counts.items(), reverse=True)],
        "weather": [{"key": k, "count": c} for k, c in weather_counts.most_common()],
        "shabbat_friendly_count": shabbat_count,
        "price_stats": {
            "min_ils": min(prices) if prices else 0.0,
            "max_ils": max(prices) if prices else 0.0,
            "avg_ils": round(sum(prices) / len(prices), 1) if prices else 0.0,
            "count": len(prices),
        },
    }


class ElasticVacationSearchEngine:
    """Dual-mode Elasticsearch 8.15 + In-Memory Hybrid BM25/768d kNN Vacation Search Engine."""

    def __init__(self) -> None:
        self._index_name = settings.ELASTICSEARCH_INDEX
        self._docs: List[Dict[str, Any]] = [dict(pkg) for pkg in VACATION_SEED_PACKAGES]
        self._doc_map: Dict[str, Dict[str, Any]] = {d["package_id"]: d for d in self._docs}

    def _create_es_client(self) -> Optional[Any]:
        if AsyncElasticsearch is None or not settings.ELASTICSEARCH_URL:
            return None
        kwargs: Dict[str, Any] = {"hosts": [settings.ELASTICSEARCH_URL], "request_timeout": 2}
        if settings.ELASTICSEARCH_API_KEY:
            kwargs["api_key"] = settings.ELASTICSEARCH_API_KEY
        return AsyncElasticsearch(**kwargs)

    async def _close_es_client(self, client: Any) -> None:
        if client is not None and hasattr(client, "close"):
            try:
                await client.close()
            except Exception:
                pass

    async def _try_live_ping(self) -> Optional[Any]:
        client = self._create_es_client()
        if client is None:
            return None
        try:
            ok = await client.ping()
            if ok:
                return client
        except Exception:
            pass
        await self._close_es_client(client)
        return None

    async def get_status(self) -> Dict[str, Any]:
        client = await self._try_live_ping()
        cluster_reachable = False
        indexed_docs = len(self._docs)
        engine_mode = "in_memory_hybrid_768d"

        if client is not None:
            try:
                exists = await client.indices.exists(index=self._index_name)
                if exists:
                    cnt = await client.count(index=self._index_name)
                    indexed_docs = int(cnt.get("count", len(self._docs)))
                cluster_reachable = True
                engine_mode = "elasticsearch_8"
            except Exception:
                cluster_reachable = False
            finally:
                await self._close_es_client(client)

        return {
            "status": "READY",
            "agent": "ElasticVacationSearchAgent (#32)",
            "engine_mode": engine_mode,
            "cluster_reachable": cluster_reachable,
            "elasticsearch_url": settings.ELASTICSEARCH_URL or "disabled",
            "index_name": self._index_name,
            "indexed_docs": indexed_docs,
            "embedding_dims": EMBEDDING_DIMS,
            "rrf_k": _RRF_K,
            "geo_anchors": [
                {"id": k, "label_he": v["label_he"], "lat": v["lat"], "lon": v["lon"]}
                for k, v in GEO_LANDMARK_ANCHORS.items()
            ],
        }

    async def ensure_index_and_seed(self, force_reindex: bool = False) -> Dict[str, Any]:
        t0 = time.perf_counter()
        client = await self._try_live_ping()
        if client is None:
            return {
                "status": "IN_MEMORY_READY",
                "engine_mode": "in_memory_hybrid_768d",
                "index_name": self._index_name,
                "indexed_docs": len(self._docs),
                "embedding_dims": EMBEDDING_DIMS,
                "took_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            }

        try:
            exists = await client.indices.exists(index=self._index_name)
            if exists and force_reindex:
                await client.indices.delete(index=self._index_name)
                exists = False
            if not exists:
                await client.indices.create(index=self._index_name, body=VACATION_INDEX_MAPPING)

            operations: List[Dict[str, Any]] = []
            for doc in self._docs:
                operations.append({"index": {"_index": self._index_name, "_id": doc["package_id"]}})
                operations.append(doc)
            await client.bulk(operations=operations, refresh="wait_for")
            cnt = await client.count(index=self._index_name)
            indexed_docs = int(cnt.get("count", len(self._docs)))
            return {
                "status": "REINDEXED" if force_reindex else "SEEDED",
                "engine_mode": "elasticsearch_8",
                "index_name": self._index_name,
                "indexed_docs": indexed_docs,
                "embedding_dims": EMBEDDING_DIMS,
                "took_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            }
        finally:
            await self._close_es_client(client)

    def _build_es_filters(
        self,
        vibe_tags: Optional[List[str]],
        min_price_ils: Optional[float],
        max_price_ils: Optional[float],
        min_stars: Optional[int],
        shabbat_only: bool,
        weather_badge: Optional[str],
        geo_tuple: Optional[Tuple[float, float, float, str]],
    ) -> List[Dict[str, Any]]:
        filters: List[Dict[str, Any]] = []
        if vibe_tags:
            filters.append({"terms": {"vibe_tags": [t.upper() for t in vibe_tags]}})
        if min_price_ils is not None or max_price_ils is not None:
            price_range: Dict[str, float] = {}
            if min_price_ils is not None:
                price_range["gte"] = float(min_price_ils)
            if max_price_ils is not None:
                price_range["lte"] = float(max_price_ils)
            filters.append({"range": {"price_ils": price_range}})
        if min_stars is not None:
            filters.append({"range": {"star_rating": {"gte": int(min_stars)}}})
        if shabbat_only:
            filters.append({"term": {"shabbat_friendly": True}})
        if weather_badge:
            filters.append({"term": {"weather_badge": weather_badge.upper()}})
        if geo_tuple is not None:
            lat, lon, radius_km, _ = geo_tuple
            filters.append({
                "geo_distance": {
                    "distance": f"{radius_km}km",
                    "coordinates": {"lat": lat, "lon": lon},
                }
            })
        return filters

    async def _search_via_live_es(
        self,
        client: Any,
        query: str,
        q_vec: List[float],
        vibe_tags: Optional[List[str]],
        min_price_ils: Optional[float],
        max_price_ils: Optional[float],
        min_stars: Optional[int],
        shabbat_only: bool,
        weather_badge: Optional[str],
        geo_tuple: Optional[Tuple[float, float, float, str]],
        limit: int,
        use_hybrid_rrf: bool,
        sort_by: str,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any], int]:
        exists = await client.indices.exists(index=self._index_name)
        if not exists:
            await client.indices.create(index=self._index_name, body=VACATION_INDEX_MAPPING)
            ops: List[Dict[str, Any]] = []
            for doc in self._docs:
                ops.append({"index": {"_index": self._index_name, "_id": doc["package_id"]}})
                ops.append(doc)
            await client.bulk(operations=ops, refresh="wait_for")

        filters = self._build_es_filters(
            vibe_tags, min_price_ils, max_price_ils, min_stars, shabbat_only, weather_badge, geo_tuple
        )
        bm25_must: Dict[str, Any] = (
            {
                "multi_match": {
                    "query": query,
                    "fields": ["destination_he^4", "destination_en^4", "iata_code^3", "title_he^2", "title_en^2", "description_he", "hotel_name"],
                    "fuzziness": "AUTO",
                }
            }
            if query.strip()
            else {"match_all": {}}
        )
        bm25_resp = await client.search(
            index=self._index_name,
            body={
                "size": max(limit * 3, 20),
                "_source": {"excludes": ["embedding"]},
                "query": {"bool": {"must": [bm25_must], "filter": filters}},
                "aggs": {
                    "vibes": {"terms": {"field": "vibe_tags", "size": 12}},
                    "stars": {"terms": {"field": "star_rating", "size": 5}},
                    "weather": {"terms": {"field": "weather_badge", "size": 8}},
                    "price_stats": {"stats": {"field": "price_ils"}},
                },
            },
        )
        bm25_hits = bm25_resp.get("hits", {}).get("hits", [])
        bm25_ranks: Dict[str, Tuple[int, float, Dict[str, Any]]] = {}
        for idx, hit in enumerate(bm25_hits, start=1):
            src = hit.get("_source", {})
            pid = src.get("package_id") or hit.get("_id")
            bm25_ranks[pid] = (idx, float(hit.get("_score") or 0.0), src)

        knn_ranks: Dict[str, Tuple[int, float, Dict[str, Any]]] = {}
        if use_hybrid_rrf and query.strip():
            knn_body: Dict[str, Any] = {
                "size": max(limit * 3, 20),
                "_source": {"excludes": ["embedding"]},
                "knn": {
                    "field": "embedding",
                    "query_vector": q_vec,
                    "k": 16,
                    "num_candidates": 32,
                    **({"filter": {"bool": {"filter": filters}}} if filters else {}),
                },
            }
            knn_resp = await client.search(index=self._index_name, body=knn_body)
            for idx, hit in enumerate(knn_resp.get("hits", {}).get("hits", []), start=1):
                src = hit.get("_source", {})
                pid = src.get("package_id") or hit.get("_id")
                knn_ranks[pid] = (idx, float(hit.get("_score") or 0.0), src)

        all_pids = list(dict.fromkeys([*bm25_ranks.keys(), *knn_ranks.keys()]))
        fused: List[Dict[str, Any]] = []
        for pid in all_pids:
            b_rank, b_score, b_src = bm25_ranks.get(pid, (999, 0.0, {}))
            k_rank, k_score, k_src = knn_ranks.get(pid, (999, 0.0, {}))
            doc = b_src or k_src
            rrf = (1.0 / (_RRF_K + b_rank) if b_rank < 999 else 0.0) + (
                1.0 / (_RRF_K + k_rank) if (use_hybrid_rrf and k_rank < 999) else 0.0
            )
            dist_km: Optional[float] = None
            if geo_tuple is not None and doc.get("coordinates"):
                dist_km = _haversine_km(
                    geo_tuple[0], geo_tuple[1], float(doc["coordinates"]["lat"]), float(doc["coordinates"]["lon"])
                )
            fused.append({
                **_strip_embedding(doc, dist_km),
                "bm25_score": round(b_score, 4),
                "knn_score": round(k_score, 4),
                "bm25_rank": b_rank if b_rank < 999 else None,
                "knn_rank": k_rank if k_rank < 999 else None,
                "rrf_score": round(rrf, 6),
            })

        if sort_by == "price_asc":
            fused.sort(key=lambda x: (float(x.get("price_ils", 0.0)), -x["rrf_score"]))
        elif sort_by == "distance" and geo_tuple is not None:
            fused.sort(key=lambda x: (x.get("distance_km") if x.get("distance_km") is not None else 99999.0, -x["rrf_score"]))
        else:
            fused.sort(key=lambda x: x["rrf_score"], reverse=True)

        facets = _compute_facets([self._doc_map[p] for p in all_pids if p in self._doc_map] or [f for f in fused])
        total_raw = bm25_resp.get("hits", {}).get("total", len(fused))
        total_hits = int(total_raw.get("value", len(fused))) if isinstance(total_raw, dict) else int(total_raw or len(fused))
        return fused[:limit], facets, max(total_hits, len(fused))

    async def hybrid_search(
        self,
        query: str = "",
        vibe_tags: Optional[List[str]] = None,
        min_price_ils: Optional[float] = None,
        max_price_ils: Optional[float] = None,
        min_stars: Optional[int] = None,
        shabbat_only: bool = False,
        weather_badge: Optional[str] = None,
        geo_filter: Optional[Dict[str, Any]] = None,
        limit: int = 8,
        use_hybrid_rrf: bool = True,
        sort_by: str = "rrf",
    ) -> Dict[str, Any]:
        t0 = time.perf_counter()
        geo_tuple = _resolve_geo_point(geo_filter)
        q_vec = embed_768d(query) if query.strip() else []
        req_vibes = {v.upper() for v in (vibe_tags or []) if v}

        client = await self._try_live_ping()
        if client is not None:
            try:
                results, facets, total_hits = await self._search_via_live_es(
                    client,
                    query,
                    q_vec,
                    vibe_tags,
                    min_price_ils,
                    max_price_ils,
                    min_stars,
                    shabbat_only,
                    weather_badge,
                    geo_tuple,
                    limit,
                    use_hybrid_rrf,
                    sort_by,
                )
                return {
                    "status": "SUCCESS",
                    "engine_mode": "elasticsearch_8",
                    "index_name": self._index_name,
                    "query": query,
                    "fusion_method": "RRF_BM25_KNN_768D" if use_hybrid_rrf else "BM25_ONLY",
                    "embedding_dims": EMBEDDING_DIMS,
                    "rrf_k": _RRF_K,
                    "took_ms": round((time.perf_counter() - t0) * 1000.0, 2),
                    "total_hits": total_hits,
                    "geo_anchor_label": geo_tuple[3] if geo_tuple else None,
                    "results": results,
                    "facets": facets,
                }
            except Exception:
                pass
            finally:
                await self._close_es_client(client)

        # In-Memory Hybrid BM25 + 768d kNN + RRF + Real-Time Facets Fallback
        eligible_docs: List[Tuple[Dict[str, Any], Optional[float]]] = []
        for doc in self._docs:
            price = float(doc["price_ils"])
            if min_price_ils is not None and price < min_price_ils:
                continue
            if max_price_ils is not None and price > max_price_ils:
                continue
            if min_stars is not None and int(doc["star_rating"]) < min_stars:
                continue
            if shabbat_only and not doc.get("shabbat_friendly"):
                continue
            if weather_badge and doc.get("weather_badge") != weather_badge.upper():
                continue
            if req_vibes and not (req_vibes & set(doc.get("vibe_tags", []))):
                continue

            dist_km: Optional[float] = None
            if geo_tuple is not None:
                coords = doc["coordinates"]
                dist_km = _haversine_km(geo_tuple[0], geo_tuple[1], float(coords["lat"]), float(coords["lon"]))
                if dist_km > geo_tuple[2]:
                    continue
            elif doc.get("coordinates"):
                dist_km = None
            eligible_docs.append((doc, dist_km))

        scored_items: List[Dict[str, Any]] = []
        for doc, dist_km in eligible_docs:
            b_score = _bm25_score(query, doc) if query.strip() else 1.0
            k_score = round(_cosine_similarity(q_vec, doc["embedding"]), 4) if (use_hybrid_rrf and q_vec) else 0.0
            scored_items.append({
                "doc": doc,
                "distance_km": dist_km,
                "bm25_score": b_score,
                "knn_score": k_score,
            })

        bm25_sorted = sorted(scored_items, key=lambda x: (x["bm25_score"], -x["doc"]["price_ils"]), reverse=True)
        knn_sorted = sorted(scored_items, key=lambda x: (x["knn_score"], x["bm25_score"]), reverse=True)

        bm25_rank_map = {item["doc"]["package_id"]: idx for idx, item in enumerate(bm25_sorted, start=1) if item["bm25_score"] > 0}
        knn_rank_map = {item["doc"]["package_id"]: idx for idx, item in enumerate(knn_sorted, start=1) if item["knn_score"] > 0.05}

        if query.strip() and use_hybrid_rrf:
            relevant = [
                it for it in scored_items
                if it["bm25_score"] > 0.35 or it["knn_score"] > 0.08
            ]
            if not relevant:
                relevant = scored_items
        else:
            relevant = scored_items

        results: List[Dict[str, Any]] = []
        for it in relevant:
            pid = it["doc"]["package_id"]
            b_rank = bm25_rank_map.get(pid)
            k_rank = knn_rank_map.get(pid) if use_hybrid_rrf else None
            rrf = (1.0 / (_RRF_K + b_rank) if b_rank is not None else 0.0) + (
                1.0 / (_RRF_K + k_rank) if k_rank is not None else 0.0
            )
            if not query.strip():
                rrf = round(0.03 + (0.002 * it["doc"]["star_rating"]), 6)

            results.append({
                **_strip_embedding(it["doc"], it["distance_km"]),
                "bm25_score": it["bm25_score"],
                "knn_score": it["knn_score"],
                "bm25_rank": b_rank,
                "knn_rank": k_rank,
                "rrf_score": round(rrf, 6),
            })

        if sort_by == "price_asc":
            results.sort(key=lambda x: (float(x["price_ils"]), -x["rrf_score"]))
        elif sort_by == "distance" and geo_tuple is not None:
            results.sort(key=lambda x: (x.get("distance_km") if x.get("distance_km") is not None else 99999.0, -x["rrf_score"]))
        else:
            results.sort(key=lambda x: (x["rrf_score"], x["knn_score"], x["bm25_score"]), reverse=True)

        facets = _compute_facets([it["doc"] for it in relevant])
        return {
            "status": "SUCCESS",
            "engine_mode": "in_memory_hybrid_768d",
            "index_name": self._index_name,
            "query": query,
            "fusion_method": "RRF_BM25_KNN_768D" if use_hybrid_rrf else "BM25_ONLY",
            "embedding_dims": EMBEDDING_DIMS,
            "rrf_k": _RRF_K,
            "took_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "total_hits": len(results),
            "geo_anchor_label": geo_tuple[3] if geo_tuple else None,
            "results": results[:limit],
            "facets": facets,
        }

    async def autocomplete(self, q: str, limit: int = 8) -> Dict[str, Any]:
        t0 = time.perf_counter()
        norm_q = (q or "").lower().strip()

        client = await self._try_live_ping()
        if client is not None and norm_q:
            try:
                es_resp = await client.search(
                    index=self._index_name,
                    body={
                        "size": limit,
                        "_source": ["package_id", "iata_code", "destination_he", "destination_en", "title_he", "title_en", "price_ils", "vibe_tags"],
                        "query": {
                            "multi_match": {
                                "query": norm_q,
                                "type": "bool_prefix",
                                "fields": ["destination_he", "destination_en", "title_he", "title_en", "iata_code"],
                            }
                        },
                    },
                )
                suggestions = []
                for hit in es_resp.get("hits", {}).get("hits", []):
                    src = hit.get("_source", {})
                    suggestions.append({
                        "package_id": src.get("package_id"),
                        "iata_code": src.get("iata_code"),
                        "destination_he": src.get("destination_he"),
                        "destination_en": src.get("destination_en"),
                        "title_he": src.get("title_he"),
                        "price_ils": src.get("price_ils"),
                        "match_type": "edge_ngram_es8",
                        "score": round(float(hit.get("_score") or 1.0), 3),
                    })
                if suggestions:
                    return {
                        "status": "SUCCESS",
                        "engine_mode": "elasticsearch_8",
                        "query": q,
                        "took_ms": round((time.perf_counter() - t0) * 1000.0, 2),
                        "suggestions": suggestions[:limit],
                    }
            except Exception:
                pass
            finally:
                await self._close_es_client(client)

        if not norm_q:
            top_defaults = [
                {
                    "package_id": d["package_id"],
                    "iata_code": d["iata_code"],
                    "destination_he": d["destination_he"],
                    "destination_en": d["destination_en"],
                    "title_he": d["title_he"],
                    "price_ils": d["price_ils"],
                    "match_type": "popular_default",
                    "score": 1.0,
                }
                for d in self._docs[:limit]
            ]
            return {
                "status": "SUCCESS",
                "engine_mode": "in_memory_hybrid_768d",
                "query": q,
                "took_ms": round((time.perf_counter() - t0) * 1000.0, 2),
                "suggestions": top_defaults,
            }

        scored: List[Tuple[float, str, Dict[str, Any]]] = []
        for doc in self._docs:
            dest_he = doc["destination_he"].lower()
            dest_en = doc["destination_en"].lower()
            iata = doc["iata_code"].lower()
            title_he = doc["title_he"].lower()
            title_en = doc["title_en"].lower()

            score = 0.0
            mtype = "edge_ngram_prefix"
            if iata.startswith(norm_q):
                score = 4.0
                mtype = "iata_exact"
            elif dest_he.startswith(norm_q) or dest_en.startswith(norm_q):
                score = 3.5
                mtype = "edge_ngram_prefix"
            elif norm_q in dest_he or norm_q in dest_en:
                score = 2.6
                mtype = "substring_dest"
            elif norm_q in title_he or norm_q in title_en:
                score = 2.0
                mtype = "search_as_you_type"
            else:
                b_s = _bm25_score(norm_q, doc)
                if b_s >= 1.2:
                    score = round(1.2 + b_s * 0.25, 3)
                    mtype = "fuzzy_typo"
            if score > 0:
                scored.append((score, mtype, doc))

        scored.sort(key=lambda x: (x[0], -float(x[2]["price_ils"])), reverse=True)
        suggestions = [
            {
                "package_id": d["package_id"],
                "iata_code": d["iata_code"],
                "destination_he": d["destination_he"],
                "destination_en": d["destination_en"],
                "title_he": d["title_he"],
                "price_ils": d["price_ils"],
                "match_type": mtype,
                "score": round(sc, 3),
            }
            for sc, mtype, d in scored[:limit]
        ]
        return {
            "status": "SUCCESS",
            "engine_mode": "in_memory_hybrid_768d",
            "query": q,
            "took_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "suggestions": suggestions,
        }


_ENGINE_SINGLETON: Optional[ElasticVacationSearchEngine] = None


def get_elastic_search_engine() -> ElasticVacationSearchEngine:
    global _ENGINE_SINGLETON
    if _ENGINE_SINGLETON is None:
        _ENGINE_SINGLETON = ElasticVacationSearchEngine()
    return _ENGINE_SINGLETON
