"""
RAG Embedder Component — produces L2-normalized dense embeddings for bilingual (Hebrew + English)
travel queries and chunks, supporting both Gemini text-embedding-004 (when enabled) and
fast deterministic semantic n-gram projection for hermetic offline / Render Free Tier execution.
"""
import hashlib
import math
import os
import re
from typing import Dict, List

from app.core.config import settings

# Cross-lingual travel concept expansion map so Hebrew & English queries align semantically
_BILINGUAL_SYNONYMS: Dict[str, List[str]] = {
    "רומא": ["rome", "italy", "trastevere", "vatican", "fco"],
    "איטליה": ["italy", "rome", "tax-free", "vat"],
    "טוקיו": ["tokyo", "japan", "suica", "shinkansen", "pasmo"],
    "קיוטו": ["kyoto", "japan", "shinkansen"],
    "יפן": ["japan", "tokyo", "kyoto", "suica", "smartex"],
    "פריז": ["paris", "france", "navigo", "louvre", "marais"],
    "צרפת": ["france", "paris"],
    "לונדון": ["london", "uk", "eta", "oyster", "elizabeth"],
    "בריטניה": ["uk", "london", "eta"],
    "תאילנד": ["thailand", "bangkok", "phuket", "grab", "chabad"],
    "בנגקוק": ["bangkok", "thailand", "grab"],
    "פוקט": ["phuket", "thailand"],
    "אתונה": ["athens", "greece", "piraeus", "acropolis"],
    "יוון": ["greece", "athens", "santorini", "crete", "ferry"],
    "סנטוריני": ["santorini", "greece"],
    "ברצלונה": ["barcelona", "spain", "sagrada", "aerobus"],
    "ספרד": ["spain", "barcelona"],
    "ניו יורק": ["new york", "nyc", "usa", "esta", "omny", "jfk"],
    "שווייץ": ["switzerland", "zurich", "alps", "sbb"],
    "ציריך": ["zurich", "switzerland", "sbb"],
    "באלי": ["bali", "indonesia", "ubud", "uluwatu"],
    "דובאי": ["dubai", "uae", "nol"],
    "נתבג": ["tlv", "ben gurion", "terminal"],
    "נתב״ג": ["tlv", "ben gurion", "terminal"],
    "שבת": ["shabbat", "kosher", "friday", "saturday"],
    "כשרות": ["kosher", "chabad", "חבד"],
    "ויזה": ["visa", "passport", "eta", "esta", "דרכון"],
    "דרכון": ["passport", "visa", "validity"],
    "תחבורה": ["transit", "metro", "train", "bus", "rail", "airport"],
    "כבודה": ["baggage", "luggage", "trolley"],
    "מס": ["tax-free", "vat", "refund"],
}

_TOKEN_RE = re.compile(r"[a-z0-9\u0590-\u05ff]+")


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two equal-length dense vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


class TravelEmbedder:
    """Bilingual semantic embedder with optional Gemini live embeddings."""

    def __init__(self, dimension: int = 256):
        self.dimension = dimension

    @property
    def mode(self) -> str:
        gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
        if settings.ENABLE_RAG_LIVE_EMBEDDINGS and gemini_key:
            return "gemini-text-embedding-004"
        return "bilingual-dense-256d"

    def embed_text(self, text: str) -> List[float]:
        gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
        if settings.ENABLE_RAG_LIVE_EMBEDDINGS and gemini_key:
            try:
                from google import genai

                client = genai.Client(api_key=gemini_key)
                resp = client.models.embed_content(
                    model="text-embedding-004",
                    contents=text,
                )
                if resp and getattr(resp, "embeddings", None):
                    vals = list(resp.embeddings[0].values)
                    if vals:
                        return self._l2_normalize(vals)
            except Exception:
                # Fall back seamlessly to local deterministic embedder
                pass

        return self._embed_local_dense(text)

    def _embed_local_dense(self, text: str) -> List[float]:
        vec = [0.0] * self.dimension
        normalized_text = (text or "").lower().strip()
        if not normalized_text:
            return vec

        tokens = _TOKEN_RE.findall(normalized_text)
        expanded_terms: List[tuple[str, float]] = []

        for tok in tokens:
            expanded_terms.append((tok, 2.2))
            if tok in _BILINGUAL_SYNONYMS:
                for syn in _BILINGUAL_SYNONYMS[tok]:
                    expanded_terms.append((syn, 1.8))

        # Also check multi-word bilingual phrases (e.g., "ניו יורק", "new york")
        for key, syns in _BILINGUAL_SYNONYMS.items():
            if key in normalized_text:
                expanded_terms.append((key, 2.0))
                for syn in syns:
                    expanded_terms.append((syn, 1.5))

        # Character 3-grams preserve Hebrew prefix/suffix morphological invariance (לרומא / ברומא / רומא)
        for tok in tokens:
            if len(tok) >= 3:
                for i in range(len(tok) - 2):
                    expanded_terms.append((f"3g:{tok[i:i+3]}", 0.9))

        for term, weight in expanded_terms:
            digest = hashlib.blake2b(term.encode("utf-8"), digest_size=8).digest()
            idx = int.from_bytes(digest[:4], "little") % self.dimension
            sign = 1.0 if (digest[4] % 2 == 0) else -1.0
            vec[idx] += sign * weight

        return self._l2_normalize(vec)

    @staticmethod
    def _l2_normalize(vec: List[float]) -> List[float]:
        norm = math.sqrt(sum(v * v for v in vec))
        if norm == 0.0:
            return vec
        return [round(v / norm, 6) for v in vec]
