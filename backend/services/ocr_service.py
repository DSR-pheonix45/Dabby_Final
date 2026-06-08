"""
Local document text extraction — no external API/key required.

Strategy (cheapest first):
  1. Digital PDFs  -> pdfplumber (text + tables), fallback pypdf.  [pure-python]
  2. Scanned PDFs  -> rasterize + Tesseract OCR, IF available.     [needs tesseract+poppler]
  3. Images        -> Tesseract OCR, IF available.
  4. Anything else -> best-effort UTF-8 decode.

Most invoices/bills exported from accounting software are digital PDFs, so step 1
handles them with zero system dependencies. True image OCR (steps 2-3) only kicks
in when there's no text layer, and only if Tesseract is installed.
"""
import io
import importlib.util


def _has(module: str) -> bool:
    try:
        return importlib.util.find_spec(module) is not None
    except Exception:
        return False


class DocumentExtractor:
    def __init__(self):
        self.pdf_text = _has("pdfplumber") or _has("pypdf")
        # Image OCR needs the python wrappers AND the tesseract/poppler binaries.
        self.ocr_available = _has("pytesseract") and _has("pdf2image") and _has("PIL")
        # Text extraction is always available for digital PDFs.
        self.enabled = True

    # ---- public ----
    def extract_text(self, content: bytes, filename: str = "doc.pdf") -> dict:
        name = (filename or "").lower()
        is_pdf = name.endswith(".pdf") or content[:4] == b"%PDF"
        is_img = name.endswith((".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"))

        text, method = "", "none"
        if is_pdf:
            text = self._pdf_text(content)
            method = "pdf-text"
            if not text.strip() and self.ocr_available:
                text = self._ocr_pdf(content)
                method = "ocr"
        elif is_img:
            if self.ocr_available:
                text = self._ocr_image(content)
                method = "ocr"
        else:
            try:
                text = content.decode("utf-8", "ignore")
                method = "raw"
            except Exception:
                text = ""

        scanned = is_pdf and method == "pdf-text" and not text.strip()
        return {
            "text": text.strip(),
            "method": method,
            "ocr_available": self.ocr_available,
            # True when we detected an image-only PDF but OCR wasn't installed.
            "needs_ocr": bool(scanned and not self.ocr_available),
        }

    # ---- pure-python PDF text ----
    def _pdf_text(self, content: bytes) -> str:
        try:
            import pdfplumber
            parts = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages[:50]:
                    parts.append(page.extract_text() or "")
                    for tbl in (page.extract_tables() or []):
                        parts.append("\n".join("\t".join((c or "") for c in row) for row in tbl))
            t = "\n".join(parts).strip()
            if t:
                return t
        except Exception as e:
            print(f"[extract] pdfplumber failed: {e}")
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            return "\n".join((p.extract_text() or "") for p in reader.pages[:50])
        except Exception as e:
            print(f"[extract] pypdf failed: {e}")
        return ""

    # ---- Tesseract OCR (optional) ----
    def _ocr_pdf(self, content: bytes) -> str:
        try:
            from pdf2image import convert_from_bytes
            import pytesseract
            images = convert_from_bytes(content, dpi=200)
            return "\n".join(pytesseract.image_to_string(img) for img in images[:20])
        except Exception as e:
            print(f"[extract] PDF OCR failed: {e}")
            return ""

    def _ocr_image(self, content: bytes) -> str:
        try:
            import pytesseract
            from PIL import Image
            return pytesseract.image_to_string(Image.open(io.BytesIO(content)))
        except Exception as e:
            print(f"[extract] image OCR failed: {e}")
            return ""


document_extractor = DocumentExtractor()
# Backwards-compatible alias used by the router.
ocr_service = document_extractor
