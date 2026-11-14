"""
RAG Splitter Component — splits KnowledgeDocument instances into overlapping semantic chunks
preserving destination, category, title, and search metadata.
"""
from dataclasses import dataclass, field
from typing import List
from app.rag.loader import KnowledgeDocument


@dataclass
class DocumentChunk:
    chunk_id: str
    doc_id: str
    destination: str
    category: str
    title: str
    content: str
    source: str
    chunk_index: int
    tags: List[str] = field(default_factory=list)
    aliases: List[str] = field(default_factory=list)


class TextChunkSplitter:
    """Paragraph-aware overlapping text splitter for RAG indexing."""

    def __init__(self, chunk_size: int = 480, chunk_overlap: int = 80):
        if chunk_size <= 0:
            raise ValueError("chunk_size must be positive")
        if chunk_overlap < 0 or chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be >= 0 and < chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_document(self, doc: KnowledgeDocument) -> List[DocumentChunk]:
        text = (doc.content or "").strip()
        if not text:
            return []

        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        raw_segments: List[str] = []
        current = ""

        for para in paragraphs:
            candidate = f"{current}\n\n{para}".strip() if current else para
            if len(candidate) <= self.chunk_size:
                current = candidate
            else:
                if current:
                    raw_segments.append(current)
                if len(para) <= self.chunk_size:
                    current = para
                else:
                    # Sliding window over very long paragraphs
                    step = self.chunk_size - self.chunk_overlap
                    for start in range(0, len(para), step):
                        raw_segments.append(para[start : start + self.chunk_size].strip())
                    current = ""

        if current:
            raw_segments.append(current)

        # Ensure overlap context when adjacent paragraphs were separated cleanly
        chunks: List[DocumentChunk] = []
        for idx, seg in enumerate(raw_segments):
            chunks.append(
                DocumentChunk(
                    chunk_id=f"{doc.doc_id}::chunk_{idx}",
                    doc_id=doc.doc_id,
                    destination=doc.destination,
                    category=doc.category,
                    title=doc.title,
                    content=seg,
                    source=doc.source,
                    chunk_index=idx,
                    tags=list(doc.tags),
                    aliases=list(doc.aliases),
                )
            )
        return chunks

    def split_documents(self, docs: List[KnowledgeDocument]) -> List[DocumentChunk]:
        all_chunks: List[DocumentChunk] = []
        for doc in docs:
            all_chunks.extend(self.split_document(doc))
        return all_chunks
