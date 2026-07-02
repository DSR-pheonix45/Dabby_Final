# Dabby / Datalis — AI Credits, Requirements & Usage Breakdown

> Grounded in the **actual `main` branch** code, verified file-by-file:
> `src/services/llmService.js`, `src/services/templateGeneratorService.js`, `src/services/webSearchService.js`,
> `src/services/localRAG.js`, `backend/services/ai_service.py`, `backend/services/intent_service.py`,
> `backend/services/document_extraction_service.py`, `backend/services/journal_generator.py`, `backend/routers/ai.py`.
> Pricing/limits are provider-published rates *as of mid-2026* — verify on each console before billing decisions.

---

## 1. Providers actually wired in

| Provider | Where | Models used | Env key | Bills you? |
|----------|-------|-------------|---------|------------|
| **Groq** | Frontend **and** backend | `llama-3.3-70b-versatile`, `llama-3.1-70b-versatile`, `mixtral-8x7b-32768`, `llama-3.1-8b-instant`, `llama-3.2-11b-vision-preview` | `VITE_GROQ_API_KEY` / `GROQ_API_KEY` | ✅ Free tier, then per-token |
| **Google Gemini** | Backend only | `gemini-1.5-flash` (Vision + text) | `VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` | ✅ Free tier, then per-token |
| **Tavily** | Frontend only | `advanced` search, 5 results | `VITE_TAVILY_API_KEY` | ✅ 1,000 free credits/mo |
| **Local OCR / RAG** | Both | `pypdf`, `ocrmac` (macOS Vision), `localRAG.js` | *none* | ❌ **$0** |

> ⚠️ **No OpenAI / Anthropic keys are used.** `requirements.txt` pulls only `groq`, `google-generativeai`, `pypdf`.
> ⚠️ **There is NO Gemini embedding / pgvector RAG on `main`.** RAG here is `localRAG.js` — client-side keyword filtering, free. (That semantic-embedding RAG only exists on the `fintech-overhaul` branch, not what's deployed here.)

---

## 2. Every AI call site, mapped

### Groq (the workhorse — cheap 8B for structured tasks, 70B for chat/generation)

| Call site | File | Model | Purpose |
|-----------|------|-------|---------|
| Dabby chat (fallback chain) | `llmService.js` | 70B → 70B → mixtral → 8B | Conversational consultant |
| Template / financial-model gen | `templateGeneratorService.js` | `llama-3.3-70b` → `8b` fallback | Generate structured templates |
| Invoice scan (text) | `ai_service.py` | `llama-3.1-8b-instant` | Extract invoice fields → JSON |
| Transaction categorization | `ai_service.py` | `llama-3.1-8b-instant` | Map txn → Chart of Accounts |
| Accounting Intent Engine | `intent_service.py` | `llama-3.1-8b-instant` (max 2048 tok) | Classify business event |
| Document extraction (13-step) | `document_extraction_service.py` | `llama-3.1-8b-instant` (text), `llama-3.2-11b-vision-preview` (image path) | Structured doc → JSON |
| Journal generation | `journal_generator.py` | Groq primary | Draft double-entry journals |

**Groq guardrails in code:** `max_tokens 4096` (2048 for intent), `temperature 0.1`, `response_format: json_object` for all structured calls, document text truncated to **12,000 chars** before extraction "to respect Groq TPM rate limits", chat context capped at **32,000 chars** default.

### Gemini (`gemini-1.5-flash`) — Vision OCR + fallback brain

| Call site | Purpose | When it fires |
|-----------|---------|---------------|
| `ai_service.scan_document_vision` | Extract data from image/PDF invoices | When Groq text path is unavailable |
| `document_extraction_service._extract_with_vision_gemini_fallback` | OCR scanned docs & images | **After** pypdf (digital PDF) and native macOS OCR both fail |
| `intent_service._classify_with_gemini` | Intent classification | Fallback when Groq fails |
| `_extract_with_gemini_text` | Text extraction | Fallback when Groq fails |

> **Windows/Linux servers note:** the "free" native OCR path uses `ocrmac` (Apple Vision) — **macOS-only**. On a Windows dev box or a Linux server, scanned images / image-only PDFs skip straight to **Gemini Vision (paid)**. Digital PDFs still go through `pypdf` (free) first. So on non-Mac hosts, expect more Gemini spend on scanned documents.

### Tavily — web search grounding
Only fires when a user toggles web search on a chat. `advanced` depth, 5 results, `include_answer`. One call per opted-in message.

### Local / free
- `pypdf` — digital-PDF text extraction (backend), $0
- `ocrmac` — Apple Vision OCR (backend, macOS only), $0
- `localRAG.js` — client-side CSV/row relevance filtering, $0

---

## 3. Token cost per action (estimated)

| Action | Model | Input tok | Output tok | Notes |
|--------|-------|----------:|-----------:|-------|
| Simple chat | Groq 70B | 700–1.5k | 50–200 | |
| Chat w/ file+ledger context | Groq 70B | up to ~8k | 300–800 | 32k-char context cap |
| Invoice scan (text) | Groq 8B | 1–4k | 200–600 | ~10× cheaper than 70B |
| Transaction categorize | Groq 8B | 300–800 | 50–150 | |
| Intent classify | Groq 8B | 1–3k | 300–600 | max 2048 out |
| Doc extraction (text) | Groq 8B | 3–8k | 500–1.5k | 12k-char input truncation |
| Doc extraction (scanned img) | **Gemini Vision** | image + ~500 | 500–1.5k | paid on non-Mac hosts |
| Template / model gen | Groq 70B | 1–2k | 1.5–3k | |

---

## 4. Pricing & free tiers (approximate — verify on console)

**Groq** (per 1M tokens):
| Model | Input | Output |
|-------|------:|-------:|
| `llama-3.3-70b-versatile` | ~$0.59 | ~$0.79 |
| `llama-3.1-8b-instant` | ~$0.05 | ~$0.08 |
| `mixtral-8x7b-32768` | ~$0.24 | ~$0.24 |
| `llama-3.2-11b-vision` | ~$0.18 | ~$0.18 |

- **Free dev tier** (approx): ~30 RPM, ~1,000 RPD, ~12k TPM, ~100k TPD — the 12k-char/32k-char caps in code exist to stay inside TPM.

**Gemini `gemini-1.5-flash`** (per 1M tokens, approx):
- Input ~$0.075 (text) / images billed per-tile; Output ~$0.30.
- Generous **free tier** (~15 RPM, ~1M TPM, ~1,500 RPD) — most dev/demo scanning is free.

**Tavily:**
- Free: **1,000 credits/month**; `advanced` = **2 credits/search** → ~500 advanced searches/mo free.
- Paid: ~$30/mo Researcher tier (~4,000 credits) or pay-as-you-go.

---

## 5. Worked monthly estimates

**Light user** (~5 chats/day + a few doc scans):
- Groq: comfortably inside free tier → **$0**
- Gemini: a handful of scans, free tier → **$0**
- Tavily: rarely toggled → **$0**
- **Total ≈ $0/month**

**Heavy user** (~40 context chats/day + 20 doc scans/day, non-Mac server):
- Groq chat: ~1,200 chats × (7k in + 500 out) ≈ 8.4M in + 0.6M out on 70B ≈ **~$5.5/mo**
- Groq extraction/intent/categorize (8B): high volume but ~10× cheaper ≈ **~$1–2/mo**
- Gemini Vision (scanned docs on non-Mac): ~600 scans/mo ≈ **~$2–5/mo**
- Tavily (if power-using web search): may hit the 500-search free cap → **$0–30/mo**
- **Total ≈ $8–15/mo per heavy user** (Groq-dominated)

**Fleet posture:**
- Dev / demo: all free tiers → **$0**
- Early prod (≤50 users): **~$50–150/mo**, mostly Groq
- Scale: keep routine structured tasks on 8B (already done), reserve 70B for chat, run on **macOS/Linux+Tesseract** to keep OCR off Gemini, default Tavily to `basic` depth

---

## 6. Requirements checklist

| Key | Powers | If missing |
|-----|--------|------------|
| `VITE_GROQ_API_KEY` / `GROQ_API_KEY` | Chat, extraction, intent, categorize, journals, templates | Those features fail / fall back to Gemini |
| `VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` | Vision OCR + fallback for all Groq tasks | Scanned-image docs can't be read; no fallback |
| `VITE_TAVILY_API_KEY` | Web-search grounding | Web search shows "unavailable"; chat still works |
| *(none)* | Digital-PDF text (`pypdf`), local RAG, macOS OCR | Always works |

**Both Groq and Gemini keys are recommended** — the extraction/intent engines are explicitly built as **Groq-primary, Gemini-fallback**. Running with only one loses the resilience (and, without Gemini, loses all image OCR on non-Mac hosts).

---

## 7. Cost-control levers already in the code
- **8B model for all structured tasks** (extraction, intent, categorize) — ~10× cheaper than 70B, already the default.
- **12k-char extraction truncation** + **32k-char chat cap** bound input tokens regardless of file size.
- **JSON mode** (`response_format`) cuts wasted output tokens and re-tries.
- **Local-first OCR** (pypdf → macOS Vision → Gemini) means Gemini only bills for genuinely scanned docs.
- **Web search is opt-in per message** — zero Tavily spend by default.
- **`localRAG.js` pre-filters** rows client-side before anything hits Groq.

---

*Generated from a direct read of the `main` branch. Rates marked "approximate" drift — confirm on console.groq.com, ai.google.dev, and tavily.com before any billing commitment.*
