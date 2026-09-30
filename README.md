<div align="center">

<img src="photos_video_demo/SMART-MEET.png" alt="SMART-MEET — AI Meeting Intelligence Platform" width="100%"/>

<br/>

# SMART-MEET

**An end-to-end AI platform for intelligent meeting capture, transcription, summarization, and conversational analysis.**

<br/>

[![Symfony](https://img.shields.io/badge/Backend-Symfony%207.4-black?style=flat-square&logo=symfony&logoColor=white)](https://symfony.com/)
[![React](https://img.shields.io/badge/Frontend%20Web-React%2019%20%2B%20Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Flutter](https://img.shields.io/badge/Mobile-Flutter%203.x-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev/)
[![Python](https://img.shields.io/badge/AI%20Services-Python%203.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Ollama](https://img.shields.io/badge/LLM-Ollama%20Mistral%20%7C%20Llama%203.1-white?style=flat-square)](https://ollama.ai/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](.)
[![PFE](https://img.shields.io/badge/Context-Final%20Year%20Project-orange?style=flat-square)](.)

</div>

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Video Demonstration](#video-demonstration)
3. [Application Screenshots](#application-screenshots)
4. [Key Features](#key-features)
5. [System Architecture](#system-architecture)
6. [Technology Stack](#technology-stack)
7. [Installation and Configuration](#installation-and-configuration)
8. [Usage](#usage)
9. [API Reference](#api-reference)
10. [Project Structure](#project-structure)
11. [Testing](#testing)
12. [Roadmap](#roadmap)
13. [License and Authors](#license-and-authors)

---

## Project Overview

**SMART-MEET** is a full-stack, AI-powered meeting intelligence platform developed as a Final Year Engineering Project (PFE). It addresses a practical challenge faced by organizations that rely on meetings as a core operational process but lack the tools to capture, structure, and exploit meeting content systematically.

The platform ingests audio recordings of meetings and delivers an end-to-end intelligent workflow:

- **Automatic transcription** with speaker diarization, identifying each participant's contributions with precise timestamps.
- **Structured minutes generation** (Proces-Verbal) produced by a locally hosted large language model, following organizational document standards.
- **Behavioral and acoustic analytics** surfacing participation balance, engagement levels, interruption dynamics, and vocal stress indicators.
- **Conversational AI assistant** capable of answering natural-language questions about any meeting in the archive, using both semantic retrieval (RAG) and structured data querying (Text-to-SQL).

SMART-MEET is delivered through three complementary interfaces: a **React web application**, a **Flutter mobile application**, and a **Symfony REST API backend** — all communicating with two specialized **Python/Flask AI microservices**.

---

## Video Demonstration

> The full demonstration video (`demo_PFE.mp4`) is included in the repository under `photos_video_demo/`. Due to its file size, it cannot be streamed inline on GitHub. Click the thumbnail below to access it locally, or download the file directly from the repository.

<div align="center">

[![Watch the Demo](photos_video_demo/SMART-MEET.png)](photos_video_demo/demo_PFE.mp4)

*Click the image above to open the demonstration video (local playback).*

</div>

---

## Application Screenshots

<div align="center">

### Mobile — Archive Library and AI Assistant

<img src="photos_video_demo/bbb.png" alt="Archive library with export options and conversational AI assistant on mobile" width="80%"/>

*Archive library with multi-format export (PDF, Word, Excel) alongside the conversational AI assistant with quick-suggestion prompts.*

<br/>

### Mobile — Recording, Transcription and Minutes

<img src="photos_video_demo/bbb (1).png" alt="New meeting recording screen, speaker-diarized transcription view, and structured minutes" width="80%"/>

*Live audio recording with waveform visualization, speaker-diarized transcription segments, and the auto-generated structured Proces-Verbal ready for validation.*

<br/>

### Mobile — Behavioral Analytics

<img src="photos_video_demo/bbb (3).png" alt="Behavioral analytics dashboard showing speaking-time distribution and per-speaker vocal stress indicators" width="80%"/>

*Group overview with key metrics (engagement score, balance index, interruption count) and per-speaker breakdown of speaking time, vocal stress, and fragmentation.*

</div>

---

## Key Features

### Transcription and Speaker Diarization

- Automatic speech-to-text powered by **Faster-Whisper**, with precise segment-level timestamps.
- Intelligent speaker identification and labeling across the full recording.
- Multilingual support (French, English, and others) with audio preprocessing via `ffmpeg` and `soundfile` (mono 16 kHz normalization).
- Inline transcript editor allowing manual correction before summary generation.

### AI-Generated Meeting Minutes

- Structured minutes generated by a local LLM (**Mistral** or **Llama 3.1** via Ollama).
- Normalized document sections: agenda, executive summary, key decisions, action items with assignees and deadlines, identified risks.
- Robust JSON parser ensuring structural integrity of the generated output.
- One-click export to **PDF**, **Word (.docx)**, and **JSON** formats.

### Behavioral and Acoustic Analytics

- Acoustic feature extraction using **OpenSMILE** and audio processing libraries (pitch, energy, speech rate, silences, interruptions).
- Per-speaker speaking-time distribution with interactive donut chart visualizations.
- Group-level engagement, balance, and participation metrics.
- Per-speaker indicators: monopolization rate, vocal stress level, speech fragmentation, and average turn duration.

### Multimodal AI Assistant

- **Retrieval-Augmented Generation (RAG)**: meeting transcripts and summaries are vectorized and stored in **pgvector**; the assistant retrieves relevant passages by cosine similarity, with source citations.
- **Text-to-SQL agent**: translates natural-language business queries into safe, read-only SQL queries.
- **Intelligent router** automatically selects the RAG pipeline for qualitative questions or the SQL agent for quantitative statistics.
- **Voice interface**: speech input via Faster-Whisper STT; audio responses synthesized via **Kokoro-TTS**.

### Multi-Platform Interfaces

- **React 19 web application**: full-featured dashboard with dark/light mode, FR/EN internationalization, real-time processing progress bar, and interactive data visualizations.
- **Flutter mobile application**: native Android/iOS/Windows app mirroring all web features, with on-device audio recording and a floating AI assistant available on every screen.

### Security and Access Control

- **JWT authentication** (asymmetric RSA keys) via LexikJWTAuthenticationBundle, with token refresh and server-side token invalidation.
- **Role-based access control** (RBAC): `ROLE_USER`, `ROLE_MANAGER`, `ROLE_ADMIN`.
- Organizational data model: departments, projects, teams, and user permissions.
- Internal webhook endpoints secured with a shared secret for AI pipeline callbacks.

---

## System Architecture

```
                    +---------------------------+
                    |       Client Applications |
                    |                           |
                    |  React 19 + Vite          |
                    |  (Port 5173)              |
                    |                           |
                    |  Flutter 3.x              |
                    |  Android / iOS / Windows  |
                    +-------------+-------------+
                                  |
                              JWT / REST
                                  |
                    +-------------v-------------+
                    |   API Gateway & Backend   |
                    |                           |
                    |  Symfony 7.4 / PHP 8.2+   |
                    |  (Port 8000)              |
                    |  JWT Auth | RBAC          |
                    |  Doctrine ORM             |
                    |  PDF / Word Export        |
                    +------+----------+---------+
                           |          |
                   Doctrine ORM   Webhooks / HTTP Proxy
                           |          |
           +---------------+  +-------+----------+  +------------------+
           |  PostgreSQL   |  |  AI Microservice |  |  Chatbot Agent   |
           |  14+ pgvector |  |  Flask           |  |  Flask           |
           |  (Port 5432)  |  |  (Port 5001)     |  |  (Port 5002)     |
           |               |  |                  |  |                  |
           |  Vector store |  |  Faster-Whisper  |  |  LangChain RAG   |
           |  (embeddings) |  |  OpenSMILE       |  |  NL2SQL Agent    |
           |               |  |  LLM via Ollama  |  |  Voice I/O       |
           +-------+-------+  +--------+---------+  +--------+---------+
                   |                   |                      |
                   +-------------------+----------------------+
                                       |
                            +----------v----------+
                            |  Ollama Local LLM   |
                            |  (Port 11434)       |
                            |  Mistral / Llama 3.1|
                            |  nomic-embed-text   |
                            +---------------------+
```

**Data flow summary:**

1. A client uploads an audio file or starts a live recording via the web or mobile interface.
2. The audio is sent to the AI microservice (port 5001), which runs transcription, diarization, acoustic feature extraction, and LLM-based minutes generation asynchronously.
3. Results are pushed back to Symfony via internal webhooks and persisted in PostgreSQL.
4. The chatbot microservice (port 5002) ingests vectorized meeting content into pgvector and serves conversational queries through RAG or SQL routing.
5. All clients poll for processing status and fetch final results through the Symfony REST API.

---

## Technology Stack

### Backend — API Gateway

| Component | Technology |
|---|---|
| Framework | Symfony 7.4 / PHP 8.2+ |
| ORM | Doctrine ORM 3.x |
| Authentication | LexikJWTAuthenticationBundle (RSA), JWT Refresh Token |
| Database | PostgreSQL 14+ with pgvector extension |
| PDF Export | DomPDF 3.x |
| Word Export | PHPOffice/PHPWord |
| CORS | NelmioCorsBundle |
| Tests | PHPUnit 11 |

### AI Microservices — Python / Flask

| Component | Technology |
|---|---|
| Web Framework | Flask 3.x + Flask-CORS |
| Speech-to-Text | Faster-Whisper 1.x (CTranslate2 engine, CUDA/CPU) |
| Acoustic Analysis | OpenSMILE, NumPy, SoundFile |
| Conversational AI | LangChain (RAG pipeline, NL2SQL agent) |
| LLM Inference | Ollama — Mistral / Llama 3.1 (local, no cloud dependency) |
| Embeddings | nomic-embed-text via Ollama |
| Vector Store | pgvector (PostgreSQL extension) |
| Text-to-Speech | Kokoro-TTS |
| Auth Validation | PyJWT (RSA public key verification) |
| Tests | Pytest 8.x |

### Frontend Web

| Component | Technology |
|---|---|
| Framework | React 19 + Vite 7.x |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion, Anime.js |
| Charts | Recharts, Chart.js |
| Icons | Lucide React |
| Notifications | Sonner, React Hot Toast |
| HTTP Client | Axios |
| Tests | Vitest + Testing Library |

### Frontend Mobile

| Component | Technology |
|---|---|
| Framework | Flutter 3.x / Dart 3.x |
| Navigation | go_router |
| State Management | Provider |
| Charts | fl_chart |
| Audio Recording | record |
| Audio Playback | just_audio + audio_session |
| Secure Storage | flutter_secure_storage |
| Fonts | Google Fonts |
| File Operations | file_picker, open_file, share_plus |

---

## Installation and Configuration

### Prerequisites

| Component | Minimum Version | Recommended |
|---|---|---|
| OS | Windows 10/11, macOS, or Linux | Windows 11 / Ubuntu 22.04 |
| PHP | 8.2+ (`pdo_pgsql`, `openssl`, `curl`, `mbstring`) | PHP 8.3 |
| Composer | 2.6+ | Latest |
| Node.js | 18+ | 20 LTS |
| Python | 3.10+ | 3.11 with CUDA support |
| Flutter SDK | 3.19+ | 3.24+ |
| PostgreSQL | 14+ with `pgvector` extension | 16 |
| Ollama | 0.1.30+ | Latest (NVIDIA GPU recommended: RTX 3060 or higher) |

---

### Step 1 — Database (PostgreSQL + pgvector)

Connect to your PostgreSQL instance and run the following:

```sql
CREATE DATABASE meeting_ia;
\c meeting_ia
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### Step 2 — Ollama and Language Models

```bash
# Start the Ollama server
ollama serve

# In a separate terminal, pull the required models
ollama pull mistral
ollama pull nomic-embed-text
```

> Optionally pull Llama 3.1 for improved generation quality: `ollama pull llama3.1`

---

### Step 3 — AI Microservices (Python)

```bash
cd AI

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Launch the services:**

```bash
# Option A (Windows, GPU-accelerated): run the provided batch script
start_ai_services.bat

# Option B (manual launch — two terminals)

# Terminal 1: AI transcription and minutes service (port 5001)
python api_server.py

# Terminal 2: Chatbot multimodal agent (port 5002)
cd chatbot
python app.py
```

---

### Step 4 — Backend (Symfony 7.4)

```bash
cd Backend

# Install PHP dependencies
composer install

# Run database migrations
php bin/console doctrine:migrations:migrate --no-interaction

# Generate the JWT key pair
php bin/console lexik:jwt:generate-keypair --skip-if-exists

# Create the default administrator / test user
php bin/console app:create-test-user

# Start the development server
php -S 0.0.0.0:8000 -t public
```

---

### Step 5 — Frontend Web (React + Vite)

```bash
cd Frontend-Web
npm install
npm run dev
```

The web application will be available at **`http://localhost:5173`**.

---

### Step 6 — Frontend Mobile (Flutter)

```bash
cd Frontend-Mobile
flutter pub get
flutter run
```

Select your target device or emulator when prompted.

---

### Environment Variables

#### Backend — `Backend/.env.local`

```env
APP_ENV=dev
APP_SECRET=your_app_secret_key_here
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/meeting_ia?serverVersion=16&charset=utf8"
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=your_jwt_passphrase
INTERNAL_WEBHOOK_SECRET=your_internal_webhook_secret_key
AI_SERVICE_URL=http://127.0.0.1:5001
CHATBOT_SERVICE_URL=http://127.0.0.1:5002
CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'
```

#### AI Chatbot — `AI/chatbot/config.py` or `.env`

```env
PORT=5002
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=meeting_ia
DB_USER=postgres
DB_PASSWORD=postgres
OLLAMA_HOST=http://127.0.0.1:11434
LLM_MODEL=mistral
EMBEDDING_MODEL=nomic-embed-text
JWT_PUBLIC_KEY_PATH=../../Backend/config/jwt/public.pem
```

---

## Usage

### Default Credentials (Development)

After running `php bin/console app:create-test-user`:

| Field | Value |
|---|---|
| Email | `test@example.com` |
| Password | `password123` |

> Change these credentials before any deployment outside a local development environment.

### Typical Workflow

1. **Upload or record** a meeting audio file (MP3, WAV, M4A) via the web or mobile interface.
2. **Monitor processing**: the real-time progress bar tracks each stage — transcription, diarization, acoustic analysis, and minutes generation.
3. **Review and correct** the speaker-diarized transcript directly in the interface before generating the summary.
4. **Generate and validate** the structured Proces-Verbal, then export it to PDF or Word.
5. **Explore analytics**: navigate to the behavioral dashboard to review speaking-time distribution, engagement scores, and per-speaker metrics.
6. **Query the AI assistant**: ask questions about any archived meeting in natural language, using text or voice input.

---

## API Reference

### Authentication and Users — Symfony `:8000`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate and receive a JWT token |
| `GET` | `/api/v1/auth/me` | Retrieve the authenticated user profile |
| `POST` | `/api/v1/auth/logout` | Invalidate the current token |
| `GET` | `/api/v1/admin/users` | List and manage users (`ROLE_ADMIN` only) |

### Meetings, Transcripts and Minutes — Symfony `:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/meetings` | Paginated meeting list with filters |
| `POST` | `/api/v1/meetings` | Create a new meeting record |
| `GET` | `/api/v1/meetings/{id}` | Full meeting details |
| `GET` | `/api/v1/meetings/{id}/transcript` | Retrieve the diarized transcript |
| `PUT` | `/api/v1/meetings/{id}/transcript` | Save edited transcript segments |
| `GET` | `/api/v1/meetings/{id}/summary` | Retrieve the generated minutes |
| `GET` | `/api/v1/meetings/{id}/export/{format}` | Download as `pdf`, `docx`, or `json` |
| `GET` | `/api/v1/meetings/{id}/analytics` | Behavioral metrics and speaking-time data |

### AI Pipeline — Flask `:5001`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/meetings/upload` | Submit an audio file and start the AI job |
| `GET` | `/api/meetings/{id}/status` | Real-time processing progress (0 to 100%) |
| `POST` | `/api/meetings/{id}/generate-summary` | Trigger LLM-based minutes generation |
| `GET` | `/health` | AI microservice health check |

### Chatbot Agent — Flask `:5002`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Send a text or audio message; receive RAG/SQL answer |
| `POST` | `/chat/voice` | Full voice round-trip (audio in, TTS audio out) |
| `POST` | `/ingest` | Index a meeting content into pgvector |
| `GET` | `/health` | Chatbot microservice health check |

---

## Project Structure

```
Meeting-IA-sfm/
|
+-- AI/                                  # Python AI microservices
|   +-- api_server.py                    # AI service entry point (port 5001)
|   +-- requirements.txt                 # Python dependencies
|   +-- start_ai_services.bat            # Windows GPU launcher script
|   +-- transcription/
|   |   +-- transcription_service.py     # Faster-Whisper inference + diarization
|   |   +-- acoustic_features.py         # OpenSMILE feature extraction
|   |   +-- audio_utils.py               # Audio preprocessing and format conversion
|   |   +-- job_store.py                 # Async job state management
|   +-- pv/
|   |   +-- pv_service.py                # LLM prompting and orchestration
|   |   +-- pv_parser.py                 # JSON validation and parsing
|   +-- behavioral/
|   |   +-- interpretation_service.py    # Acoustic metrics and AI interpretation
|   +-- chatbot/                         # Multimodal chatbot agent (port 5002)
|       +-- app.py                       # Chatbot service entry point
|       +-- config.py                    # RAG, DB, and Ollama configuration
|       +-- api/                         # Endpoints (/chat, /ingest, /auth)
|       +-- rag/                         # RAG engine (pgvector + LangChain)
|       +-- sql_agent/                   # Text-to-SQL agent and hybrid router
|       +-- voice/                       # Voice I/O (STT Whisper + TTS Kokoro)
|
+-- Backend/                             # Symfony 7.4 REST API
|   +-- src/
|   |   +-- Controller/                  # REST controllers (Auth, Meetings, Analytics)
|   |   +-- Entity/                      # Doctrine entities (Meeting, Summary, User)
|   |   +-- Repository/                  # Doctrine data repositories
|   |   +-- Security/                    # JWT authenticators and RBAC voters
|   |   +-- Service/                     # Business services (PDF export, webhooks)
|   |   +-- Command/                     # CLI commands (user management)
|   +-- config/                          # Symfony packages (Security, LexikJWT, CORS)
|   +-- migrations/                      # PostgreSQL schema migrations
|   +-- tests/                           # PHPUnit tests
|   +-- compose.yaml                     # Docker Compose (PostgreSQL + pgvector)
|   +-- setup.bat / setup.sh             # Automated setup scripts
|   +-- composer.json                    # PHP dependencies
|
+-- Frontend-Web/                        # React 19 + Vite web application
|   +-- src/
|   |   +-- components/                  # Reusable UI components
|   |   +-- pages/                       # Pages (Upload, Archive, Analytics, Chatbot)
|   |   +-- context/                     # React contexts (Auth, Theme)
|   |   +-- services/                    # Axios API clients
|   |   +-- hooks/                       # Custom hooks (useAudioRecorder, useChat)
|   |   +-- i18n/                        # Internationalization (FR / EN)
|   +-- vite.config.js
|   +-- package.json
|
+-- Frontend-Mobile/                     # Flutter 3.x mobile application
|   +-- lib/
|   |   +-- main.dart                    # Application entry point
|   |   +-- router.dart                  # GoRouter navigation
|   |   +-- pages/                       # Screens (Upload, Archive, Transcription, Chatbot)
|   |   +-- providers/                   # State management (MeetingProvider, AuthProvider)
|   |   +-- widgets/                     # Custom widgets (ChatbotBottomSheet, AudioRecorder)
|   |   +-- services/                    # HTTP services and secure storage
|   |   +-- theme/                       # Light and dark theme definitions
|   +-- pubspec.yaml
|
+-- photos_video_demo/                   # Visual assets
|   +-- SMART-MEET.png                   # Project banner
|   +-- bbb.png                          # Archive and AI assistant screenshot
|   +-- bbb (1).png                      # Recording, transcription, and PV screenshot
|   +-- bbb (3).png                      # Behavioral analytics screenshot
|   +-- demo_PFE.mp4                     # Full feature demonstration video
|
+-- specs/                               # Functional and technical specifications
```

---

## Testing

```bash
# Backend — PHPUnit
cd Backend
php bin/phpunit

# Frontend Web — Vitest
cd Frontend-Web
npm run test

# AI Microservices — Pytest
cd AI
pytest

# Mobile — Flutter test
cd Frontend-Mobile
flutter test
```

---

## Roadmap

The following improvements have been identified for future iterations:

- **Real-time transcription streaming**: display transcript segments live during audio recording rather than after the processing job completes.
- **Multi-speaker profile persistence**: retain speaker identity mappings across sessions within the same organizational context.
- **Automated meeting digests**: scheduled email or push notification summaries after each processed meeting.
- **Cloud deployment**: Dockerized production configuration with Nginx, Gunicorn, and environment-specific secrets management.
- **Extended integrations**: export of action items to calendar applications and project management tools.

---

## License and Authors

This software was developed as part of a **Final Year Engineering Project (PFE)** and is the exclusive property of its authors and affiliated academic institution.

**Author:** Mohamed Ali Chakroun  
**Contact:** mohamedalichakroun.x@gmail.com

All rights reserved. Redistribution, commercial use, or modification without explicit written authorization from the authors is strictly prohibited.

---

<div align="center">

Developed with precision as a Final Year Engineering Project (PFE).

</div>