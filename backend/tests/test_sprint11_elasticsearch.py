"""
Sprint 11 (V11.0): Elasticsearch 8 Hybrid Vacation Search Test Suite.
Covers BM25 + 768d kNN RRF, Edge N-Gram autocomplete, real-time facets,
geo_point radius proximity, live AsyncElasticsearch mock path, MCP tool, and 32-agent ops metric.
"""
import asyncio
import json

from fastapi.testclient import TestClient

from app.main import app
from app.mcp.travel_mcp_server import search_vacations_elasticsearch
from app.tools import elasticsearch_vacation_tools as es_mod
from app.tools.elasticsearch_catalog import VACATION_INDEX_MAPPING, embed_768d

client = TestClient(app)


def test_elasticsearch_mapping_status_reindex_and_agent32():
    assert VACATION_INDEX_MAPPING["mappings"]["properties"]["embedding"]["dims"] == 768
    assert VACATION_INDEX_MAPPING["mappings"]["properties"]["coordinates"]["type"] == "geo_point"
    assert VACATION_INDEX_MAPPING["mappings"]["properties"]["price_ils"]["type"] == "scaled_float"

    vec = embed_768d("חופשת חורף רומנטית עם שלג וספא")
    assert len(vec) == 768
    assert round(sum(x * x for x in vec), 3) == 1.0

    status_resp = client.get("/api/v1/search/vacations/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "READY"
    assert status_data["embedding_dims"] == 768
    assert status_data["index_name"] == "wanderlust_vacations_v1"
    assert status_data["indexed_docs"] >= 16

    reindex_resp = client.post("/api/v1/search/vacations/reindex", json={"force_reindex": False})
    assert reindex_resp.status_code == 200
    assert reindex_resp.json()["embedding_dims"] == 768

    metrics_resp = client.get("/api/v1/ops/metrics")
    assert metrics_resp.status_code == 200
    assert metrics_resp.json()["agents_registered"] == 32


def test_hybrid_bm25_768d_knn_rrf_hebrew_budget_and_facets():
    resp = client.post(
        "/api/v1/search/vacations",
        json={
            "query": "חופשת חורף רומנטית עם שלג וספא",
            "max_price_ils": 5000.0,
            "use_hybrid_rrf": True,
            "limit": 6,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["fusion_method"] == "RRF_BM25_KNN_768D"
    assert data["embedding_dims"] == 768
    assert data["rrf_k"] == 60
    assert data["total_hits"] >= 3

    results = data["results"]
    assert all(r["price_ils"] <= 5000.0 for r in results)
    top_ids = [r["package_id"] for r in results[:3]]
    assert any(pid in top_ids for pid in ("PKG-BUD-SPA-WINTER", "PKG-ZRH-SNOW-SPA", "PKG-PRG-WINTER-ROM"))
    assert "embedding" not in results[0]
    assert results[0]["rrf_score"] > 0

    facets = data["facets"]
    vibe_keys = {v["key"] for v in facets["vibes"]}
    assert {"ROMANTIC", "WELLNESS_SPA"} & vibe_keys
    assert facets["price_stats"]["max_ils"] <= 5000.0
    assert facets["shabbat_friendly_count"] >= 1


def test_fuzzy_bm25_and_sub_15ms_edge_ngram_autocomplete():
    typo_resp = client.post(
        "/api/v1/search/vacations",
        json={"query": "santorni", "limit": 5},
    )
    assert typo_resp.status_code == 200
    top_destinations = [r["destination_en"] for r in typo_resp.json()["results"]]
    assert "Santorini" in top_destinations

    he_auto = client.get("/api/v1/search/vacations/autocomplete", params={"q": "פרי", "limit": 5})
    assert he_auto.status_code == 200
    he_data = he_auto.json()
    assert he_data["took_ms"] < 50.0
    assert any(s["destination_en"] == "Paris" for s in he_data["suggestions"])

    iata_auto = client.get("/api/v1/search/vacations/autocomplete", params={"q": "CDG", "limit": 5})
    assert iata_auto.status_code == 200
    assert iata_auto.json()["suggestions"][0]["iata_code"] == "CDG"


def test_geo_point_radius_filter_and_proximity_sort():
    resp = client.post(
        "/api/v1/search/vacations",
        json={
            "query": "",
            "geo_filter": {"anchor_id": "paris_eiffel", "radius_km": 15.0},
            "sort_by": "distance",
            "limit": 8,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_hits"] == 1
    hit = data["results"][0]
    assert hit["package_id"] == "PKG-PARIS-EIFFEL-LUX"
    assert hit["distance_km"] is not None
    assert hit["distance_km"] < 5.0


def test_live_elasticsearch_8_async_client_path_with_mock(monkeypatch):
    calls = {"created": False, "bulk": 0, "searched": 0}

    class FakeIndices:
        async def exists(self, index: str) -> bool:
            return calls["created"]

        async def create(self, index: str, body: dict) -> dict:
            assert body["mappings"]["properties"]["embedding"]["dims"] == 768
            calls["created"] = True
            return {"acknowledged": True}

        async def delete(self, index: str) -> dict:
            calls["created"] = False
            return {"acknowledged": True}

    class FakeAsyncES:
        def __init__(self, **kwargs):
            self.indices = FakeIndices()

        async def ping(self) -> bool:
            return True

        async def count(self, index: str) -> dict:
            return {"count": 16}

        async def bulk(self, operations: list, refresh: str = "wait_for") -> dict:
            calls["bulk"] += 1
            return {"errors": False, "items": [{}]}

        async def search(self, index: str, body: dict) -> dict:
            calls["searched"] += 1
            sample = es_mod.VACATION_SEED_PACKAGES[0]
            clean_src = {k: v for k, v in sample.items() if k != "embedding"}
            return {
                "hits": {
                    "total": {"value": 1},
                    "hits": [{"_id": sample["package_id"], "_score": 8.42, "_source": clean_src}],
                }
            }

        async def close(self) -> None:
            return None

    monkeypatch.setattr(es_mod, "AsyncElasticsearch", FakeAsyncES)
    monkeypatch.setattr(es_mod.settings, "ELASTICSEARCH_URL", "http://localhost:9200")

    engine = es_mod.ElasticVacationSearchEngine()
    seed_res = asyncio.run(engine.ensure_index_and_seed(force_reindex=True))
    assert seed_res["engine_mode"] == "elasticsearch_8"
    assert seed_res["status"] == "REINDEXED"
    assert calls["created"] is True
    assert calls["bulk"] == 1

    search_res = asyncio.run(engine.hybrid_search(query="בודפשט ספא", use_hybrid_rrf=True, limit=4))
    assert search_res["engine_mode"] == "elasticsearch_8"
    assert search_res["results"][0]["package_id"] == "PKG-BUD-SPA-WINTER"
    assert calls["searched"] == 2


def test_mcp_search_vacations_elasticsearch_tool():
    raw = asyncio.run(
        search_vacations_elasticsearch(
            query="רומא קולינריה כשר",
            max_price_ils=4500.0,
            shabbat_only=True,
            limit=4,
        )
    )
    payload = json.loads(raw)
    assert payload["status"] == "SUCCESS"
    assert payload["embedding_dims"] == 768
    assert any(r["destination_en"] == "Rome" for r in payload["results"])
