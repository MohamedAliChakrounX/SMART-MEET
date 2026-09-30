# Tasks: Multimodal Conversational Agent

**Input**: Design documents from `/specs/009-multimodal-meeting-agent/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Paths assume Python backend located under `AI/` relative to repository root.
- Core package: `AI/`
- Test suite: `AI/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create Python package directories (`ingestion`, `permissions`, `rag`, `sql_agent`, `dashboard`, `voice`, `api`, `tests`) under `AI/`
- [x] T002 Initialize Python requirements file `AI/requirements.txt` with pinned Flask, LangChain, faster-whisper, kokoro, psycopg2-binary, and pytest dependencies
- [x] T003 [P] Create initial SQL migration script `AI/init.sql` defining relational tables, vector columns, and schema views

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement unified application settings management in `AI/config.py` including DB credentials, Ollama API host, and models definition
- [x] T005 [P] Implement JWT authentication tokens decoding and denylist check logic in `AI/api/auth.py`
- [x] T006 [P] Implement user permissions resolver and 60s TTL memory caching layer in `AI/permissions/resolver.py`
- [x] T007 Setup the global Flask application, JSON logging infrastructure, error handlers, and `/health` check in `AI/app.py`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Voice & Text Conversational RAG with Strict Access Controls (Priority: P1) 🎯 MVP

**Goal**: Ask semantic questions on past meetings via text or voice, filter results strictly by user permissions, auto-detect spoken language, and return French voice feedback with resilient fallback.

**Independent Test**: Send voice query WAV or text search, verify LangChain RAG checks allowed meeting IDs in database, verify Whisper auto-detects language, and verify Kokoro returns base64 audio (or null + warning if Kokoro fails).

### Tests for User Story 1

- [x] T008 [P] [US1] Create Speech-to-Text and Text-to-Speech mock-based unit tests in `AI/tests/test_voice.py`
- [x] T009 [P] [US1] Create RAG retriever test suite validating user permission isolation in `AI/tests/test_permissions.py`

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement Speech-to-Text wrapper in `AI/voice/stt.py` using faster-whisper with language auto-detection
- [x] T011 [P] [US1] Implement Text-to-Speech wrapper in `AI/voice/tts.py` using Kokoro-82M with a resilient fallback mechanism returning null audio + alert on exception
- [x] T012 [P] [US1] Implement custom LangChain `SecurePgVectorRetriever` in `AI/rag/retriever.py` to vector-search only within `ANY(allowed_meeting_ids)`
- [x] T013 [US1] Implement conversation flow execution and sliding history (k=10) from the database in `AI/rag/chain.py` using `llama3.1` and a 40s fail-fast timeout
- [x] T014 [US1] Implement route `/api/chat` under `AI/api/chat.py` integrating RAG retrieval, STT, TTS, JWT authentication, and sliding history memory
- [x] T015 [US1] Implement Ollama error handlers in `AI/app.py` to return custom JSON guides if model connection fails or times out

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Analytical Natural Language to SQL and Dynamic Charts (Priority: P2)

**Goal**: Translate quantitative questions to safe PostgreSQL queries, auto-correct syntax errors (self-healing), filter by allowed meeting IDs, and generate Chart.js visual configurations.

**Independent Test**: Query quantitative data, verify generated SQL targets read-only views, check validation blocks destructive operations and injects permissions, check single self-healing retry on SQL error, verify Chart.js JSON structure.

### Tests for User Story 2

- [x] T016 [P] [US2] Create SQL validation, injection prevention, and self-healing retry loop tests in `AI/tests/test_rag_sql.py`

### Implementation for User Story 2

- [x] T017 [P] [US2] Implement NL2SQL generation logic in `AI/sql_agent/nl2sql.py` using local `qwen2.5-coder` against read-only views
- [x] T018 [US2] Implement SQL abstract validation parser in `AI/sql_agent/nl2sql.py` to block unsafe commands (`DELETE`, `UPDATE`, `DROP`, `INSERT`, `TRUNCATE`) and inject `WHERE meeting_id = ANY(allowed_meeting_ids)`
- [x] T019 [US2] Implement single-retry self-healing mechanism in `AI/sql_agent/nl2sql.py` catching execution exceptions and feeding them back to `qwen2.5-coder`
- [x] T020 [P] [US2] Implement Chart.js JSON structure builder in `AI/dashboard/generator.py` using `qwen2.5:7b` based on retrieved dataset and prompt
- [x] T021 [US2] Implement analytical router in `AI/api/chat.py` redirecting queries containing analytical keywords to the SQL agent and chart builder

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Admin Data Ingestion & Metadata Lifecycle Management (Priority: P3)

**Goal**: Ingest transcripts, chunk text semantically, generate 1024-D embeddings using qwen3-embedding, and allow instant updates of allowed participant IDs without re-embedding.

**Independent Test**: Ingest a test transcript, verify meeting chunks are populated with vector embeddings. Issue a PUT request for permissions, confirm database metadata updates in less than 100ms without modifying embeddings.

### Tests for User Story 3

- [x] T022 [P] [US3] Create chunking parsing and embedding vector validation tests in `AI/tests/test_ingestion.py`

### Implementation for User Story 3

- [x] T023 [P] [US3] Implement semantic chunking logic in `AI/ingestion/chunker.py` for transcripts, summaries, decisions, and action items
- [x] T024 [P] [US3] Implement local embedding generator in `AI/ingestion/embedder.py` mapping text to vector database via Ollama `qwen3-embedding`
- [x] T025 [US3] Implement REST endpoint `/api/admin/ingest` under `AI/api/ingest.py` restricted to `ROLE_ADMIN` running chunker and embedding pipeline
- [x] T026 [US3] Implement REST endpoint `/api/admin/permissions` under `AI/api/ingest.py` performing fast updates of participant metadata in table `meeting_chunks`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T027 [P] Implement background scheduler tasks in `AI/app.py` for token denylist purging (hourly) and inactive chat sessions cleanup (daily, >90 days retention)
- [x] T030 Setup comprehensive logs and duration reporting of local AI inference tasks across all endpoints in `AI/app.py`
- [x] T031 Perform manual validation using the walkthrough steps detailed in `AI/specs/009-multimodal-meeting-agent/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User Story 1 (P1) is the MVP and starts immediately.
  - User Story 2 (P2) and User Story 3 (P3) can execute sequentially or in parallel once Phase 2 is completed.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independently testable.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independently testable.

### Within Each User Story

- Test suites must be written first and fail before execution of the corresponding implementation tasks.
- Models and utility modules before services and pipeline chains.
- Pipeline chains before API controller endpoints.
- Integration tests run after routes are registered.

### Parallel Opportunities

- All Setup tasks marked `[P]` can run in parallel (T002, T003).
- All Foundational tasks marked `[P]` can run in parallel (T005, T006).
- Once Foundational phase is complete, tasks marked `[P]` in User Story 1 (T008, T009, T010, T011, T012) can be worked on in parallel.
- Work on User Story 2 and User Story 3 can proceed in parallel once the foundation is active.

---

## Parallel Example: User Story 1

```bash
# Launch voice mocks and database resolver tests together:
Task: "Create Speech-to-Text and Text-to-Speech mock-based unit tests in AI/tests/test_voice.py"
Task: "Create RAG retriever test suite validating user permission isolation in AI/tests/test_permissions.py"

# Develop STT, TTS and vector retriever modules in parallel:
Task: "Implement Speech-to-Text wrapper in AI/voice/stt.py"
Task: "Implement Text-to-Speech wrapper in AI/voice/tts.py"
Task: "Implement custom LangChain SecurePgVectorRetriever in AI/rag/retriever.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1 ( RAG, STT, TTS).
4. **STOP and VALIDATE**: Run `pytest AI/tests/test_voice.py` and `pytest AI/tests/test_permissions.py`. Test conversational Turn with mock/real audio file.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation is ready.
2. Add User Story 1 (RAG + Voice) → Test independently → Deploy/Demo (MVP!).
3. Add User Story 2 (NL2SQL + Charts) → Test independently → Deploy/Demo.
4. Add User Story 3 (Ingest + Admin permissions) → Test independently → Deploy/Demo.
5. Setup Polish jobs and schedules.
