"""
RAG Loader Component — loads curated JSON destination guides and Markdown handbooks
into normalized KnowledgeDocument objects for the Indexing Phase.
"""
import json
import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class KnowledgeDocument:
    doc_id: str
    destination: str
    category: str
    title: str
    content: str
    source: str
    tags: List[str] = field(default_factory=list)
    aliases: List[str] = field(default_factory=list)


class KnowledgeLoader:
    """Loads structured JSON and Markdown travel documents from a knowledge directory."""

    def __init__(self, knowledge_dir: str | None = None):
        if knowledge_dir is None:
            app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            knowledge_dir = os.path.join(app_dir, "knowledge")
        self.knowledge_dir = knowledge_dir

    def load_all(self) -> List[KnowledgeDocument]:
        docs: List[KnowledgeDocument] = []
        if not os.path.isdir(self.knowledge_dir):
            return docs

        for fname in sorted(os.listdir(self.knowledge_dir)):
            full_path = os.path.join(self.knowledge_dir, fname)
            if not os.path.isfile(full_path):
                continue

            if fname.endswith(".json"):
                docs.extend(self._load_json(full_path, fname))
            elif fname.endswith(".md"):
                docs.extend(self._load_markdown(full_path, fname))

        return docs

    def _load_json(self, path: str, source_name: str) -> List[KnowledgeDocument]:
        loaded: List[KnowledgeDocument] = []
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        items = raw if isinstance(raw, list) else [raw]
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            loaded.append(
                KnowledgeDocument(
                    doc_id=str(item.get("doc_id") or f"{source_name}_{idx}"),
                    destination=str(item.get("destination") or "Global"),
                    category=str(item.get("category") or "travel_guide"),
                    title=str(item.get("title") or "Travel Guide"),
                    content=str(item.get("content") or "").strip(),
                    source=source_name,
                    tags=[str(t) for t in (item.get("tags") or [])],
                    aliases=[str(a) for a in (item.get("aliases") or [])],
                )
            )
        return loaded

    def _load_markdown(self, path: str, source_name: str) -> List[KnowledgeDocument]:
        with open(path, "r", encoding="utf-8") as f:
            raw_text = f.read().strip()

        if not raw_text:
            return []

        base_id = os.path.splitext(source_name)[0]
        # Split top-level ## sections into focused KnowledgeDocuments when present
        sections = [sec.strip() for sec in raw_text.split("\n## ") if sec.strip()]
        if len(sections) <= 1:
            return [
                KnowledgeDocument(
                    doc_id=base_id,
                    destination="Tel Aviv (TLV) / Global",
                    category="israeli_traveler_handbook",
                    title=raw_text.splitlines()[0].lstrip("# ").strip(),
                    content=raw_text,
                    source=source_name,
                    tags=["tlv", "נתבג", "שבת", "דרכון", "israeli", "handbook"],
                    aliases=["tlv", "israel", "נתב\"ג", "נתבג", "ישראל"],
                )
            ]

        docs: List[KnowledgeDocument] = []
        doc_header = sections[0].splitlines()[0].lstrip("# ").strip()
        for idx, sec in enumerate(sections):
            lines = sec.splitlines()
            sec_title = lines[0].lstrip("# ").strip()
            body = "\n".join(lines[1:]).strip() if len(lines) > 1 else sec
            if not body:
                continue
            docs.append(
                KnowledgeDocument(
                    doc_id=f"{base_id}_sec_{idx}",
                    destination="Tel Aviv (TLV) / Global",
                    category="israeli_traveler_handbook",
                    title=f"{doc_header} — {sec_title}" if idx > 0 else sec_title,
                    content=f"{sec_title}\n{body}",
                    source=source_name,
                    tags=["tlv", "נתבג", "שבת", "דרכון", "budget", "calendar", "handbook"],
                    aliases=["tlv", "israel", "נתב\"ג", "נתבג", "ישראל", "global"],
                )
            )
        return docs
