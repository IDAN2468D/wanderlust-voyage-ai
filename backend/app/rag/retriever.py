"""
RAG Retriever & KnowledgeBase Service — orchestrates Indexing, Retrieval, and Agno Tool Integration.
"""
import json
import os
from typing import Any, Dict, List, Optional

from app.rag.embedder import TravelEmbedder
from app.rag.loader import KnowledgeLoader
from app.rag.splitter import TextChunkSplitter
from app.rag.vector_store import VectorStore


class KnowledgeBaseService:
    """High-level RAG Knowledgebase coordinating Loader, Splitter, Embedder, and VectorStore."""

    def __init__(
        self,
        knowledge_dir: Optional[str] = None,
        store_path: Optional[str] = None,
        chunk_size: int = 480,
        chunk_overlap: int = 80,
    ):
        self.loader = KnowledgeLoader(knowledge_dir=knowledge_dir)
        self.splitter = TextChunkSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.embedder = TravelEmbedder(dimension=256)
        self.vector_store = VectorStore(store_path=store_path)
        self._indexed = False
        self._doc_count = 0

    def ensure_indexed(self, force: bool = False) -> Dict[str, Any]:
        """Run or reuse the Indexing Phase (Load -> Split -> Embed -> VectorStore)."""
        if self._indexed and not force and self.vector_store.records:
            return self.get_stats()

        docs = self.loader.load_all()
        self._doc_count = len(docs)

        if not force and self.vector_store.load_from_disk():
            # Verify persisted record count matches current chunking output cleanly
            expected_chunks = self.splitter.split_documents(docs)
            if len(self.vector_store.records) == len(expected_chunks) and docs:
                self._indexed = True
                return self.get_stats()

        chunks = self.splitter.split_documents(docs)
        self.vector_store.upsert_chunks(chunks, self.embedder, sync_sql=True)
        self._indexed = True
        return self.get_stats()

    def retrieve(
        self,
        query: str,
        destination: Optional[str] = None,
        category: Optional[str] = None,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        """Run the Retrieval Phase: embed query and return top-k matching chunks from VectorStore."""
        self.ensure_indexed()
        enriched_query = f"{destination} {query}".strip() if destination else query
        query_vec = self.embedder.embed_text(enriched_query)
        return self.vector_store.search(
            query_vector=query_vec,
            top_k=top_k,
            destination=destination,
            category=category,
        )

    def get_stats(self) -> Dict[str, Any]:
        docs_count = self._doc_count or len(self.loader.load_all())
        destinations = sorted({r.destination for r in self.vector_store.records})
        return {
            "status": "READY" if self.vector_store.records else "EMPTY",
            "documents_indexed": docs_count,
            "chunks_indexed": len(self.vector_store.records),
            "vector_dimension": self.embedder.dimension,
            "embedder_mode": self.embedder.mode,
            "storage_backend": "hybrid_nosql_json_and_sqlalchemy",
            "store_file": os.path.basename(self.vector_store.store_path),
            "destinations_covered": destinations,
        }


_kb_singleton: Optional[KnowledgeBaseService] = None


def get_knowledge_base() -> KnowledgeBaseService:
    global _kb_singleton
    if _kb_singleton is None:
        _kb_singleton = KnowledgeBaseService()
        _kb_singleton.ensure_indexed()
    return _kb_singleton


def search_travel_knowledge(
    query: str,
    destination: Optional[str] = None,
    top_k: int = 4,
) -> str:
    """
    Search the Wanderlust RAG Travel Knowledgebase for destination guides, visa/passport rules,
    TLV departure tips, transit passes, kosher hubs, and Tax-Free insights.
    """
    kb = get_knowledge_base()
    hits = kb.retrieve(query=query, destination=destination, top_k=top_k)
    return json.dumps(
        {
            "query": query,
            "destination_filter": destination,
            "results_count": len(hits),
            "matches": hits,
        },
        ensure_ascii=False,
    )
