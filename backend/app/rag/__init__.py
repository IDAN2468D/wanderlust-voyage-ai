"""
Wanderlust Voyage AI - Modular RAG Knowledgebase Package.
Components: KnowledgeLoader -> TextChunkSplitter -> TravelEmbedder -> VectorStore -> KnowledgeBaseService.
"""
from app.rag.loader import KnowledgeDocument, KnowledgeLoader
from app.rag.splitter import DocumentChunk, TextChunkSplitter
from app.rag.embedder import TravelEmbedder, cosine_similarity
from app.rag.vector_store import VectorStore, VectorRecord
from app.rag.retriever import (
    KnowledgeBaseService,
    get_knowledge_base,
    search_travel_knowledge,
)

__all__ = [
    "KnowledgeDocument",
    "KnowledgeLoader",
    "DocumentChunk",
    "TextChunkSplitter",
    "TravelEmbedder",
    "cosine_similarity",
    "VectorStore",
    "VectorRecord",
    "KnowledgeBaseService",
    "get_knowledge_base",
    "search_travel_knowledge",
]
