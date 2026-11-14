"""Comprehensive tests for the Modular RAG Knowledgebase, VectorStore, Reasoning Engine, and API integration."""
import json
import math
from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.agents.orchestrator import synthesize_deterministic_plan
from app.agents.reasoning import get_agno_reasoning_tools, run_reasoning_audit
from app.main import app
from app.rag.embedder import TravelEmbedder, cosine_similarity
from app.rag.loader import KnowledgeDocument, KnowledgeLoader
from app.rag.retriever import KnowledgeBaseService
from app.rag.splitter import TextChunkSplitter
from app.rag.vector_store import VectorStore


client = TestClient(app)


def test_knowledge_loader_and_splitter():
    """Verify KnowledgeLoader loads JSON guides and Markdown handbook, and splitter respects size/overlap."""
    loader = KnowledgeLoader()
    docs = loader.load_all()
    assert len(docs) >= 12
    destinations = {d.destination for d in docs}
    assert any("Rome" in d for d in destinations)
    assert any("Tokyo" in d for d in destinations)
    assert any("Tel Aviv" in d for d in destinations)

    splitter = TextChunkSplitter(chunk_size=260, chunk_overlap=40)
    long_doc = KnowledgeDocument(
        doc_id="test_long",
        destination="Rome, Italy",
        category="guide",
        title="Long Test",
        content=("A" * 200) + "\n\n" + ("B" * 350),
        source="unit_test.md",
        tags=["rome"],
        aliases=["רומא"],
    )
    chunks = splitter.split_document(long_doc)
    assert len(chunks) >= 3
    assert all(len(c.content) <= 260 for c in chunks)
    assert chunks[0].chunk_id == "test_long::chunk_0"


def test_bilingual_embedder_and_cosine_ranking():
    """Verify L2-normalization and cross-lingual Hebrew/English semantic similarity ranking."""
    embedder = TravelEmbedder(dimension=256)
    q_vec = embedder.embed_text("תחבורה ציבורית ודרכון ברומא")
    assert len(q_vec) == 256
    norm = math.sqrt(sum(v * v for v in q_vec))
    assert abs(norm - 1.0) < 1e-4

    rome_vec = embedder.embed_text("Rome FCO Leonardo Express Metro Vaticano Italy")
    tokyo_vec = embedder.embed_text("Tokyo Japan Suica Shinkansen Narita Shibuya")
    assert cosine_similarity(q_vec, rome_vec) > cosine_similarity(q_vec, tokyo_vec)


def test_vector_store_persistence_and_service_retrieve(tmp_path):
    """Verify VectorStore persists to NoSQL JSON collection in tmp_path, reloads cleanly, and retrieves matches."""
    store_file = tmp_path / "test_rag_vector_store.json"
    kb = KnowledgeBaseService(store_path=str(store_file))
    stats = kb.ensure_indexed(force=True)
    assert stats["status"] == "READY"
    assert stats["documents_indexed"] >= 12
    assert stats["chunks_indexed"] >= stats["documents_indexed"]
    assert store_file.exists()

    # Reload into a fresh VectorStore instance
    reloaded = VectorStore(store_path=str(store_file))
    assert reloaded.load_from_disk() is True
    assert len(reloaded.records) == stats["chunks_indexed"]

    hits = kb.retrieve(query="Shinkansen Suica Narita", destination="Tokyo", top_k=3)
    assert len(hits) == 3
    assert any("Tokyo" in h["destination"] or "טוקיו" in h["content"] for h in hits)
    assert all(0.0 <= h["score"] <= 1.0 for h in hits)


def test_reasoning_audit_shabbat_and_budget_checks():
    """Verify run_reasoning_audit flags Friday/Saturday departures and budget overruns cleanly."""
    # Find next Friday and next Monday
    today = date.today()
    days_to_friday = (4 - today.weekday()) % 7 or 7
    next_friday = (today + timedelta(days=days_to_friday)).strftime("%Y-%m-%d")
    next_monday = (today + timedelta(days=days_to_friday + 3)).strftime("%Y-%m-%d")

    rag_hits = [{"title": "מדריך רומא", "destination": "Rome", "score": 0.85}]

    # Friday + budget overrun scenario
    over_trace = run_reasoning_audit(
        origin="TLV",
        destination="Rome",
        start_date=next_friday,
        duration_days=5,
        total_budget=1500.0,
        budget_report={
            "total_projected_expenses_usd": 1900.0,
            "audit_status": "OVER_BUDGET",
            "remaining_balance_usd": -400.0,
        },
        rag_hits=rag_hits,
    )
    assert over_trace["steps"][0]["step_id"] == 1
    assert "שישי" in over_trace["steps"][0]["thought"]
    assert over_trace["steps"][1]["verdict"] == "WARNING"
    assert any("תקציב" in rec for rec in over_trace["recommendations"])

    # Monday + approved budget scenario
    ok_trace = run_reasoning_audit(
        origin="TLV",
        destination="Rome",
        start_date=next_monday,
        duration_days=5,
        total_budget=3000.0,
        budget_report={
            "total_projected_expenses_usd": 2200.0,
            "audit_status": "APPROVED",
            "remaining_balance_usd": 800.0,
        },
        rag_hits=rag_hits,
    )
    assert ok_trace["steps"][1]["verdict"] == "VERIFIED"
    assert ok_trace["confidence_score"] >= 0.94


def test_agno_reasoning_tools_available():
    """Verify Agno ReasoningTools can be instantiated cleanly."""
    rt = get_agno_reasoning_tools()
    assert rt is not None


def test_knowledge_api_endpoints_and_trip_integration():
    """Verify /api/v1/knowledge/* endpoints and RAG/Reasoning inclusion in trip plan & SSE stream."""
    stats_res = client.get("/api/v1/knowledge/stats")
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert stats_data["status"] == "READY"
    assert stats_data["chunks_indexed"] >= 12
    assert stats_data["vector_dimension"] == 256

    search_res = client.post(
        "/api/v1/knowledge/search",
        json={"query": "כניסה לישראל דרכון שבת נתבג", "destination": "Tel Aviv", "top_k": 3},
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["status"] == "SUCCESS"
    assert search_data["results_count"] == 3
    assert len(search_data["matches"]) == 3

    reindex_res = client.post("/api/v1/knowledge/reindex")
    assert reindex_res.status_code == 200
    assert reindex_res.json()["status"] == "READY"

    future_start = (date.today() + timedelta(days=25)).strftime("%Y-%m-%d")
    plan_res = client.post(
        "/api/v1/trips/plan",
        json={
            "origin": "TLV",
            "destination": "Rome",
            "start_date": future_start,
            "duration_days": 5,
            "total_budget": 2800,
            "travel_style": "balanced",
        },
    )
    assert plan_res.status_code == 200
    plan_json = plan_res.json()
    assert isinstance(plan_json.get("rag_knowledge"), list) and len(plan_json["rag_knowledge"]) > 0
    assert isinstance(plan_json.get("reasoning_trace"), dict)
    assert len(plan_json["reasoning_trace"]["steps"]) == 4

    # Verify SSE stream emits KNOWLEDGE_RAG and REASONING stages and includes payloads in done
    with client.stream(
        "POST",
        "/api/v1/trips/plan/stream",
        json={
            "origin": "TLV",
            "destination": "Tokyo",
            "start_date": future_start,
            "duration_days": 6,
            "total_budget": 3500,
        },
    ) as stream_res:
        assert stream_res.status_code == 200
        raw_body = "".join(stream_res.iter_text())

    assert "KNOWLEDGE_RAG" in raw_body
    assert "REASONING" in raw_body
    assert "search_travel_knowledge" in raw_body
    assert "reasoning_audit" in raw_body

    # Extract final done JSON
    done_blocks = [b for b in raw_body.split("\n\n") if b.startswith("event: done")]
    assert len(done_blocks) == 1
    done_payload = json.loads(done_blocks[0].split("data:", 1)[1].strip())
    assert len(done_payload.get("rag_knowledge", [])) > 0
    assert len(done_payload.get("reasoning_trace", {}).get("steps", [])) == 4


def test_synthesize_deterministic_plan_includes_rag_and_reasoning():
    """Verify direct orchestrator synthesis includes grounded RAG knowledge and reasoning trace."""
    future_start = (date.today() + timedelta(days=20)).strftime("%Y-%m-%d")
    plan = synthesize_deterministic_plan(
        origin="TLV",
        destination="Paris",
        start_date=future_start,
        duration_days=4,
        total_budget=2500,
        interests=["Art", "Food"],
    )
    assert len(plan.get("rag_knowledge", [])) >= 1
    assert len(plan.get("reasoning_trace", {}).get("steps", [])) == 4
