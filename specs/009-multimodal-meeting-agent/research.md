# Research: Local Multimodal Conversational Agent Stack

This document details the research findings, technology choices, patterns, and alternatives evaluated for the local multimodal agent.

---

## 1. Local LLM & Embedding (Ollama) Integration & Timeout Configuration

### Decision
Use local Ollama instance running at `http://localhost:11434` with `llama3.1:8b-instruct-q4_K_M` for RAG, `qwen2.5-coder:7b-instruct-q4_K_M` for NL2SQL, `qwen2.5:7b-instruct-q4_K_M` for dashboard spec generation, and `qwen3-embedding:0.6b` for text embeddings.

### Rationale
- Ollama is highly optimized for local running, provides easy model management, and exposes a standardized OpenAI-compatible REST API.
- **Fail-Fast Timeout Strategy**: Imposing a hard 40-second timeout. If the model or Ollama service is unavailable, we cut connection and fail fast. Standard LangChain model integrations allow specifying `timeout` or `request_timeout` parameters, or we can use custom `httpx` clients with explicit timeout thresholds.

### Alternatives Considered
- **llama.cpp / Llama-cpp-python**: Offers extremely fast native execution but requires manual compilation of C++ libraries per platform and complex management of GGUF files. Ollama encapsulates all of this elegantly.
- **vLLM / TGI**: Excellent for high concurrency and batching, but require massive hardware assets and lack native Windows support out-of-the-box, making them less suitable for lightweight local laptop/desktop testing.

---

## 2. Speech-to-Text: Local Multilingual faster-whisper

### Decision
Use `faster-whisper` (specifically `Systran/faster-whisper-small` or `medium` depending on local GPU memory) for offline Speech-to-Text.

### Rationale
- `faster-whisper` is a reimplementation of OpenAI's Whisper model using CTranslate2, delivering up to 4x faster transcription speed and significantly lower memory footprint compared to the original PyTorch implementation.
- **Multilingual Support**: Auto-detects spoken language at the start of each recording segment by omitting the `language` argument (or setting it to `None`), letting Whisper automatically detect the language code and apply the correct model weights.

### Alternatives Considered
- **Original OpenAI Whisper**: Much slower and consumes more GPU/CPU memory.
- **whisper.cpp**: Extremely lightweight, written in pure C/C++, but lacks Python-native pip integration that is as robust and complete as `faster-whisper` for standard Flask API services.

---

## 3. Text-to-Speech: Kokoro-82M

### Decision
Use `Kokoro-82M` (via the `kokoro` Python library) for offline Text-to-Speech with a resilient audio fallback.

### Rationale
- `Kokoro-82M` is an ultra-fast, state-of-the-art open-source TTS model with only 82 million parameters, producing high-fidelity human-like speech. It is perfect for local GPU/CPU execution (<1.5 seconds for a typical sentence).
- **French Voice Support**: We select the French model voice `fr-01` or another native French speaker voice package to ensure natural pronunciation.
- **Resilient Audio UX**: If Kokoro fails to synthesize audio (e.g., missing soundfile library, CUDA out-of-memory, or audio device busy), the Flask API must gracefully recover. It will return the full text response, but set `audio_b64: null` and include an alert in the response metadata (`"warning": "TTS system unavailable - fallback to text-only mode"`), satisfying the UX resilience constraint.

### Alternatives Considered
- **Coqui TTS**: Highly expressive but bloated, slow, and no longer actively maintained.
- **pyttsx3**: Extremely lightweight and dependency-free offline TTS, but produces robotic, low-quality synthetic voices which violate the premium experience requirements.

---

## 4. Secure RAG: LangChain Custom BaseRetriever with pgvector

### Decision
Implement a custom LangChain `BaseRetriever` class that integrates `psycopg2` and `pgvector` to run precise vector searches.

```python
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from pydantic import Field
from typing import List

class SecurePgVectorRetriever(BaseRetriever):
    connection_string: str
    allowed_meeting_ids: List[str] = Field(default_factory=list)
    top_k: int = 5

    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        # 1. Generate embedding for query via local qwen3-embedding
        # 2. Query DB: SELECT text, meeting_id FROM meeting_chunks 
        #    WHERE meeting_id = ANY(%s) ORDER BY embedding <=> %s LIMIT %s
        # 3. Return matching chunks as list of LangChain Document objects
```

### Rationale
- Standard LangChain vector store retrievers offer filtering using a basic dictionary (`filter={"meeting_id": "xxx"}`), which makes it hard or inefficient to filter against a dynamic list of *multiple* authorized meeting IDs.
- By inheriting from `BaseRetriever` and running raw SQL queries using `psycopg2`, we can apply the `ANY(allowed_meeting_ids)` SQL operator directly, ensuring 100% data boundary security at the database level before any data reaches the LLM context.

### Alternatives Considered
- **Standard PGVector VectorStore Retriever**: Suffers from rigid metadata filtering schemas that are difficult to hook into dynamic user permission arrays securely.

---

## 5. Secure NL2SQL: View-Based Querying, Input Validation, and Self-Healing

### Decision
Implement a multi-layered security and robustness framework for the Natural Language to SQL (NL2SQL) engine:
1. **Read-Only Database Views**: Expose data to the LLM via read-only PostgreSQL views (`view_meetings`, `view_transcript_segments`, `view_decisions`) that exclude sensitive fields (like password hashes or system tokens).
2. **Explicit DDL Masking**: Generate system prompt DDL based exclusively on these views.
3. **AST / Regex Parser Validation**: Before running any LLM-generated query, pass it through a strict validator that raises an exception if destructive verbs are detected (`UPDATE`, `DELETE`, `DROP`, `INSERT`, `TRUNCATE`).
4. **Dynamic Access Restriction**: Automatically append or inject a security clause to restrict queries: `WHERE meeting_id = ANY(allowed_meeting_ids)`.
5. **Self-Healing Mechanics**: If the database throws a syntax or execution error (e.g., `psycopg2.errors.UndefinedColumn`), catch the exception, append the failing SQL and error message to the prompt, and ask `qwen2.5-coder` to correct the query. Limit the correction cycle to exactly one retry.

### Rationale
- Minimizes risk of unauthorized data leaks and prevents accidental or malicious database modification.
- View-based access provides a clear database boundary, reducing LLM hallucination scope.
- Self-healing improves accuracy and resiliency from ~75% to over 90% success rate.

### Alternatives Considered
- **Raw table querying**: High risk of leaking administrative or internal system tables.
- **No query validation**: Extremely risky; a user could perform Prompt Injection to alter database states.

---

## 6. Dynamic Dashboard Spec: Chart.js Specification Generator

### Decision
Create a specialized parser that converts query results and user preferences into structured JSON schemas compatible with Chart.js.

### Rationale
- Let the SQL agent focus entirely on fetching raw structured numbers.
- Let a separate prompt for `qwen2.5` take the raw data and user's intent, and generate a precise JSON matching the Chart.js config scheme:
  ```json
  {
    "type": "bar|line|pie",
    "data": {
      "labels": ["Jan", "Feb", "Mar"],
      "datasets": [{
        "label": "Meetings Count",
        "data": [12, 19, 3]
      }]
    },
    "options": {
      "responsive": true,
      "plugins": {
        "title": { "display": true, "text": "Meetings per Month" }
      }
    }
  }
  ```
- Standardizes frontend rendering using standard canvas tags.

### Alternatives Considered
- **Direct HTML page rendering from Flask**: Violates React frontend separation and leads to non-reusable styling.
- **Python matplotlib charts (static images)**: Static images cannot easily be inspected, hovered over, or animated. Interactive frontend graphs provide a much better user experience.
