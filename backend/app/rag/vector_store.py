"""
RAG Vector Store Component — Hybrid NoSQL JSON Vector Document Store + SQLAlchemy ORM mirror.
Supports persistent vector storage, cosine-similarity ranking, and metadata boosting.
"""
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.rag.embedder import TravelEmbedder, cosine_similarity
from app.rag.splitter import DocumentChunk

logger = logging.getLogger("rag_vector_store")


@dataclass
class VectorRecord:
    chunk_id: str
    doc_id: str
    destination: str
    category: str
    title: str
    content: str
    source: str
    tags: List[str] = field(default_factory=list)
    aliases: List[str] = field(default_factory=list)
    embedding: List[float] = field(default_factory=list)
    owner_user_id: Optional[str] = None


class VectorStore:
    """Persistent cosine-similarity vector store backed by a NoSQL JSON collection + SQL mirror."""

    def __init__(self, store_path: Optional[str] = None):
        if store_path is None:
            backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            data_dir = os.path.join(backend_root, "data")
            os.makedirs(data_dir, exist_ok=True)
            store_path = os.path.join(data_dir, "rag_vector_store.json")
        self.store_path = store_path
        self.records: List[VectorRecord] = []

    def upsert_chunks(
        self,
        chunks: List[DocumentChunk],
        embedder: TravelEmbedder,
        sync_sql: bool = True,
    ) -> int:
        """Index chunks into embeddings, save NoSQL JSON collection, and mirror into SQL."""
        new_records: List[VectorRecord] = []
        for chunk in chunks:
            embedding_input = (
                f"{chunk.title}\n{chunk.destination}\n"
                f"{' '.join(chunk.aliases)} {' '.join(chunk.tags)}\n{chunk.content}"
            )
            vec = embedder.embed_text(embedding_input)
            new_records.append(
                VectorRecord(
                    chunk_id=chunk.chunk_id,
                    doc_id=chunk.doc_id,
                    destination=chunk.destination,
                    category=chunk.category,
                    title=chunk.title,
                    content=chunk.content,
                    source=chunk.source,
                    tags=list(chunk.tags),
                    aliases=list(chunk.aliases),
                    embedding=vec,
                )
            )

        self.records = new_records
        self._save_json_store()
        if sync_sql:
            self._sync_to_sql()
        return len(self.records)

    def load_from_disk(self) -> bool:
        """Load persisted vector records from the NoSQL JSON document store."""
        if not os.path.exists(self.store_path):
            return False
        try:
            with open(self.store_path, "r", encoding="utf-8") as f:
                payload = json.load(f)
            items = payload.get("records") if isinstance(payload, dict) else []
            if not isinstance(items, list) or not items:
                return False
            self.records = [
                VectorRecord(
                    chunk_id=str(item["chunk_id"]),
                    doc_id=str(item["doc_id"]),
                    destination=str(item.get("destination", "Global")),
                    category=str(item.get("category", "travel_guide")),
                    title=str(item.get("title", "")),
                    content=str(item.get("content", "")),
                    source=str(item.get("source", "")),
                    tags=[str(t) for t in (item.get("tags") or [])],
                    aliases=[str(a) for a in (item.get("aliases") or [])],
                    embedding=[float(x) for x in (item.get("embedding") or [])],
                )
                for item in items
                if isinstance(item, dict) and item.get("chunk_id")
            ]
            return len(self.records) > 0
        except Exception as exc:
            logger.warning(f"Failed loading NoSQL vector store from {self.store_path}: {exc}")
            return False

    def append_chunks(
        self,
        chunks: List[DocumentChunk],
        embedder: TravelEmbedder,
        owner_user_id: Optional[str] = None,
        sync_sql: bool = True,
    ) -> int:
        """Append or replace personal chunks without wiping global corpus."""
        added = 0
        existing_ids = {r.chunk_id for r in self.records}
        for chunk in chunks:
            embedding_input = (
                f"{chunk.title}\n{chunk.destination}\n"
                f"{' '.join(chunk.aliases)} {' '.join(chunk.tags)}\n{chunk.content}"
            )
            vec = embedder.embed_text(embedding_input)
            rec = VectorRecord(
                chunk_id=chunk.chunk_id,
                doc_id=chunk.doc_id,
                destination=chunk.destination,
                category=chunk.category,
                title=chunk.title,
                content=chunk.content,
                source=chunk.source,
                tags=list(chunk.tags),
                aliases=list(chunk.aliases),
                embedding=vec,
                owner_user_id=owner_user_id,
            )
            if chunk.chunk_id in existing_ids:
                self.records = [rec if r.chunk_id == chunk.chunk_id else r for r in self.records]
            else:
                self.records.append(rec)
                existing_ids.add(chunk.chunk_id)
            added += 1

        self._save_json_store()
        if sync_sql:
            self._sync_to_sql()
        return added

    def search(
        self,
        query_vector: List[float],
        top_k: int = 4,
        destination: Optional[str] = None,
        category: Optional[str] = None,
        owner_user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Rank chunks by cosine similarity with destination/alias metadata alignment."""
        dest_norm = (destination or "").lower().strip()
        cat_norm = (category or "").lower().strip()

        scored: List[tuple[float, VectorRecord]] = []
        for rec in self.records:
            if rec.owner_user_id is not None and rec.owner_user_id != owner_user_id:
                continue
            if cat_norm and rec.category.lower() != cat_norm:
                continue

            sim = cosine_similarity(query_vector, rec.embedding)
            # Small deterministic boost when query destination matches document aliases
            boost = 0.0
            if dest_norm:
                dest_tokens = [tok for tok in dest_norm.replace(",", " ").split() if len(tok) >= 2]
                searchable_meta = " ".join(
                    [rec.destination.lower(), rec.title.lower(), *[a.lower() for a in rec.aliases], *[t.lower() for t in rec.tags]]
                )
                if dest_norm in searchable_meta or any(tok in searchable_meta for tok in dest_tokens):
                    boost = 0.18
                elif rec.category == "israeli_traveler_handbook":
                    boost = 0.04
            if owner_user_id and rec.owner_user_id == owner_user_id:
                boost += 0.12

            final_score = min(1.0, max(0.0, sim + boost))
            scored.append((final_score, rec))

        scored.sort(key=lambda pair: pair[0], reverse=True)
        results: List[Dict[str, Any]] = []
        for score, rec in scored[: max(1, top_k)]:
            results.append(
                {
                    "chunk_id": rec.chunk_id,
                    "doc_id": rec.doc_id,
                    "owner_user_id": rec.owner_user_id,
                    "destination": rec.destination,
                    "category": rec.category,
                    "title": rec.title,
                    "content": rec.content,
                    "source": rec.source,
                    "tags": rec.tags,
                    "score": round(score, 4),
                }
            )
        return results

    def _save_json_store(self) -> None:
        try:
            os.makedirs(os.path.dirname(self.store_path), exist_ok=True)
            payload = {
                "schema_version": 1,
                "storage_type": "nosql_json_vector_store",
                "count": len(self.records),
                "records": [
                    {
                        "chunk_id": r.chunk_id,
                        "doc_id": r.doc_id,
                        "destination": r.destination,
                        "category": r.category,
                        "title": r.title,
                        "content": r.content,
                        "source": r.source,
                        "tags": r.tags,
                        "aliases": r.aliases,
                        "embedding": r.embedding,
                        "owner_user_id": r.owner_user_id,
                    }
                    for r in self.records
                ],
            }
            with open(self.store_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False)
        except Exception as exc:
            logger.warning(f"Could not save NoSQL vector store: {exc}")

    def _sync_to_sql(self) -> None:
        try:
            from app.db.database import get_db_session
            from app.db.models import KnowledgeChunkModel

            with get_db_session() as db:
                db.query(KnowledgeChunkModel).delete()
                for rec in self.records:
                    db.add(
                        KnowledgeChunkModel(
                            chunk_id=rec.chunk_id,
                            doc_id=rec.doc_id,
                            owner_user_id=rec.owner_user_id,
                            destination=rec.destination,
                            category=rec.category,
                            title=rec.title,
                            content=rec.content,
                            tags_json=json.dumps(rec.tags, ensure_ascii=False),
                            embedding_json=json.dumps(rec.embedding),
                        )
                    )
                db.commit()
        except Exception as exc:
            logger.warning(f"Could not mirror knowledge chunks to SQL table: {exc}")
