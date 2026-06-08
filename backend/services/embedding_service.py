"""
Embedding service for semantic RAG. Uses Google text-embedding-004 (768-dim)
via the GEMINI key. Degrades gracefully (enabled=False) if no key is configured,
so the rest of the backend still runs.
"""
import os


class EmbeddingService:
    MODEL = "models/text-embedding-004"
    DIM = 768

    def __init__(self):
        self.key = os.environ.get("VITE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        self.enabled = bool(self.key)
        self._genai = None
        if self.enabled:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.key)
                self._genai = genai
            except Exception as e:
                print(f"[Embeddings] Disabled — could not init Gemini: {e}")
                self.enabled = False

    def embed(self, text: str, task_type: str = "retrieval_document"):
        if not self.enabled:
            raise RuntimeError("Embeddings unavailable: set GEMINI_API_KEY to enable semantic RAG.")
        res = self._genai.embed_content(
            model=self.MODEL,
            content=(text or "")[:8000],
            task_type=task_type,
        )
        return res["embedding"]

    @staticmethod
    def chunk(text: str, size: int = 1200, overlap: int = 150):
        """Split text into ~`size`-char chunks on paragraph/sentence boundaries."""
        text = (text or "").strip()
        if not text:
            return []
        chunks = []
        start = 0
        n = len(text)
        while start < n:
            end = min(start + size, n)
            if end < n:
                # try to break on a paragraph or sentence boundary
                for sep in ("\n\n", "\n", ". "):
                    idx = text.rfind(sep, start + size // 2, end)
                    if idx != -1:
                        end = idx + len(sep)
                        break
            chunks.append(text[start:end].strip())
            start = max(end - overlap, end) if overlap and end < n else end
        return [c for c in chunks if c]


embedding_service = EmbeddingService()
