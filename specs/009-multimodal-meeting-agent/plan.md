# Implementation Plan: Multimodal Conversational Agent for Enterprise Meetings

**Branch**: `009-multimodal-meeting-agent` | **Date**: 2026-05-20 | **Spec**: [spec.md](file:///E:/sfm-PFE/Meeting-IA-sfm/specs/009-multimodal-meeting-agent/spec.md)
**Input**: Feature specification from `/specs/009-multimodal-meeting-agent/spec.md`

## Summary

L'objectif est de concevoir et d'implémenter de A à Z un agent conversationnel multimodal (texte + voix) s'exécutant 100 % en local. L'agent interroge l'historique complet des réunions d'entreprise en combinant de la recherche sémantique (RAG via LangChain) et des requêtes analytiques relationnelles (NL2SQL avec auto-correction), tout en respectant strictement les droits d'accès des utilisateurs. Il génère à la demande des spécifications de dashboards (Chart.js), transcrit la voix via Whisper, et synthétise les réponses parlées en français via Kokoro-82M.

L'approche technique s'appuie sur une architecture Flask modulaire, s'intégrant directement avec PostgreSQL + pgvector et appelant Ollama en local pour les modèles d'embedding et de génération.

## Technical Context

**Language/Version**: Python 3.11+  
**Primary Dependencies**: Flask (3.0+), LangChain (0.1+), psycopg2-binary, pgvector, PyJWT, faster-whisper, kokoro, soundfile, requests, numpy, cachetools  
**Storage**: PostgreSQL (15+) avec extension `pgvector` activée  
**Testing**: pytest  
**Target Platform**: Serveur local Windows/Linux équipé d'un GPU compatible CUDA (VRAM >= 12 Go requis)  
**Project Type**: Microservice / API Web REST  
**Performance Goals**: RAG Latency < 5s (retrieval + LLM local), TTS Latency < 1.5s pour 20 mots, Whisper WER < 10%  
**Constraints**: 100 % local (pas d'appels cloud), isolation complète des chunks selon les permissions utilisateur, validation stricte anti-injection SQL, timeout à 40s si Ollama est hors-ligne.  
**Scale/Scope**: Cible de 1000 utilisateurs concomitants, historique de chat purgé automatiquement après 90 jours d'inactivité.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Service Isolation (NON-NEGOTIABLE)
- **Gate Status**: ⚠️ **Déviation Documentée (Voir Complexity Tracking)**
- **Justification**: L'agent conversationnel nécessite une intégration directe et performante avec la base vectorielle pgvector, LangChain (Python) et les services audio locaux (Whisper, Kokoro). Faire transiter l'authentification et les requêtes SQL à travers Symfony dégraderait fortement la latence (SC-002, SC-004) et compliquerait inutilement la stack. Le service Flask is donc autonome pour ses API de chat, d'ingestion sémantique et de validation de droits, tout en partageant la même base PostgreSQL.

### II. API-First Design
- **Gate Status**: ✅ **Pass**
- **Justification**: Tous les contrats d'API pour `/api/auth`, `/api/chat` et `/api/ingest` sont explicitement définis et documentés au format JSON/Multipart sous `specs/009-multimodal-meeting-agent/contracts/` avant le début de l'implémentation.

### III. Security by Default (NON-NEGOTIABLE)
- **Gate Status**: ✅ **Pass**
- **Justification**:
  1. Authentification JWT obligatoire sur toutes les API (sauf `/login` et `/refresh`).
  2. Révocation immédiate vérifiée en BDD locale dans `TokenDenylist` à chaque appel.
  3. Filtrage d'accès déterministe appliqué à la source via un résolveur de permissions en mémoire (TTL 60s).
  4. Clauses de filtrage strictes (`meeting_id = ANY(allowed_ids)`) injectées dynamiquement dans les requêtes RAG et SQL (post-génération LLM, pré-exécution BDD).
  5. Validation anti-injection sur les verbes SQL destructeurs (`DELETE`, `DROP`, `UPDATE`, `INSERT`, `TRUNCATE`).

### IV. Data Ownership & Persistence
- **Gate Status**: ✅ **Pass**
- **Justification**: Toutes les entités persistantes (Users, Meetings, Chunks, Chat Sessions) reposent sur PostgreSQL. L'historique de chat de l'agent est stocké dans la table `chat_messages` avec purge automatique à 90 jours.

### V. Observability & Structured Logging
- **Gate Status**: ✅ **Pass**
- **Justification**: Émission de logs structurés (JSON format), traçage de la durée d'inférence de chaque modèle (Ollama RAG, SQL, Dashboard, Whisper, Kokoro) et intégration d'un endpoint `/health` de diagnostic.

### VI. Test Coverage Standards
- **Gate Status**: ✅ **Pass**
- **Justification**: Suite de tests avec `pytest` couvrant le chunker, le retriever de sécurité, la validation SQL, le générateur de graphiques, ainsi que les mocks des services Whisper et Kokoro.

## Project Structure

### Documentation (this feature)

```text
specs/009-multimodal-meeting-agent/
├── spec.md              # Spécification fonctionnelle validée (avec clarifications)
├── plan.md              # Ce document d'implémentation
├── research.md          # Phase 0 : Choix technologiques et rationalisation locale
├── data-model.md        # Phase 1 : Schéma BDD, tables et vues SQL de sécurité
├── quickstart.md        # Phase 1 : Guide de démarrage et configurations Ollama/Whisper/Kokoro
├── contracts/           # Phase 1 : Schémas JSON et contrats d'endpoints de l'API Flask
│   ├── auth.json
│   ├── chat.json
│   └── ingest.json
└── tasks.md             # Phase 2 : Liste des tâches détaillées d'implémentation
```

### Source Code (repository root)

La structure modulaire Python imposée sera implémentée dans un sous-dossier autonome dédié `AI/agent/` pour ne pas interférer avec le microservice existant, ou restructurée proprement sous `AI/` pour enrichir la stack Python actuelle. Compte tenu du caractère "de A à Z" et auto-contenu demandé par l'utilisateur, nous concevons le code au sein du répertoire principal `AI/` restructuré de la manière suivante :

```text
AI/
├── app.py                      # Point d'entrée de l'application Flask
├── config.py                   # Paramètres centralisés (DB, Ollama, TTS, STT)
├── requirements.txt            # Dépendances Python épinglées
├── init.sql                    # Script de migration pour pgvector et les tables/vues
│
├── ingestion/                  # 1. Module d'ingestion et d'embedding
│   ├── __init__.py
│   ├── chunker.py              # Découpage sémantique des données de réunions
│   └── embedder.py             # Appels qwen3-embedding et persistance psycopg2
│
├── permissions/                # 2. Module de contrôle d'accès
│   ├── __init__.py
│   └── resolver.py             # Résolveur de réunions autorisées et cache TTL 60s
│
├── rag/                        # 3. Pipeline RAG sémantique
│   ├── __init__.py
│   ├── retriever.py            # LangChain BaseRetriever personnalisé filtrant par IDs
│   └── chain.py                # ConversationalRetrievalChain locale (llama3.1:8b)
│
├── sql_agent/                  # 4. Agent SQL intelligent
│   ├── __init__.py
│   └── nl2sql.py               # Génération, validation, injection de filtre & self-healing
│
├── dashboard/                  # 5. Visualisation de données
│   ├── __init__.py
│   └── generator.py            # Générateur de spécifications de graphiques Chart.js
│
├── voice/                      # 6. Services audio locaux
│   ├── __init__.py
│   ├── stt.py                  # Transcription vocale faster-whisper locale
│   └── tts.py                  # Synthèse vocale Kokoro-82M locale avec résilience
│
├── api/                        # 7. Contrôleurs et routes Flask
│   ├── __init__.py
│   ├── auth.py                 # Authentification JWT, Refresh et TokenDenylist
│   ├── chat.py                 # Chat texte/voix, routage RAG vs SQL, et graphes
│   └── ingest.py               # Routes d'administration pour ingestion et permissions
│
└── tests/                      # Suite de tests automatisés pytest
    ├── __init__.py
    ├── test_ingestion.py
    ├── test_permissions.py
    ├── test_rag_sql.py
    └── test_voice.py
```

**Structure Decision**: Option 1 : Projet unique Flask modulaire logé au sein de la structure `AI/` du dépôt, optimisant les scripts de démarrage existants et conservant les dépendances Python regroupées.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Service Isolation** (Gestion de la sécurité, des sessions de chat et de la persistance directe en Python/Flask) | L'agent conversationnel s'appuie nativement sur l'écosystème LangChain et psycopg2 + pgvector pour son retriever sécurisé et son agent SQL. De plus, les pipelines audio (STT/TTS) nécessitent des manipulations directes de flux binaires en Python. | **Symfony proxying** : Faire transiter toutes les requêtes RAG, SQL, Whisper et Kokoro via Symfony ajouterait une latence réseau importante (~500ms à 1s par appel), dégraderait l'expérience utilisateur et complexifierait les flux multipart. L'intégration de LangChain en PHP (ex: via des ports tiers) est immature et peu sécurisée comparée à sa version Python de référence. |
