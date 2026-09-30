"""
api_server.py
=============
Point d'entrée principal du microservice AI Meeting.
Expose tous les endpoints Flask consommés par le frontend React.

Endpoints
---------
POST  /api/meetings/upload                  – Accepte un fichier audio, lance le job AI
GET   /api/meetings/<id>/status             – Retourne la progression en temps réel
GET   /api/meetings/<id>/transcript         – Retourne les segments finaux (après done)
PUT   /api/meetings/<id>/transcript         – Sauvegarde les segments édités du frontend
POST  /api/meetings/<id>/generate-summary   – Génère le PV depuis la transcription via Ollama
GET   /api/summaries/<id>                   – Retourne le PV généré en JSON
GET   /api/meetings/<id>/meeting            – Retourne les métadonnées de la réunion
GET   /health                               – Health check

Structure du module
-------------------
AI/
├── api_server.py          ← ce fichier (point d'entrée unique)
├── transcription/
│   ├── job_store.py
│   ├── transcription_service.py
│   └── worker.py
└── pv/
    └── pv_service.py

Intégration Symfony
-------------------
  Option A – Microservice Python (approche actuelle)
    Symfony agit comme reverse-proxy / API gateway.
    Ce serveur Flask tourne sur le port 5001.
    Le contrôleur Symfony transfère les requêtes d'upload ici via HttpClient
    et expose ses propres endpoints au frontend React.

  Option B – Symfony appelle un worker CLI
    Le contrôleur Symfony sauvegarde le fichier et lance :
        python transcription/worker.py --meeting-id=42 --audio=/tmp/upload/42.mp3
    L'état est stocké dans Redis ou une DB au lieu du store en mémoire.

Lancement local
---------------
    pip install flask flask-cors
    python api_server.py

CORS activé pour toutes les origines en développement.
Restreindre au domaine Symfony en production.
"""

import os
import sys
import threading
from datetime import datetime

# Correction de l'encodage sur Windows (évite UnicodeEncodeError sur les emojis ✅)
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback pour versions Python < 3.7 ou environnements particuliers
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

if sys.stderr.encoding != 'utf-8':
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

import uuid
from datetime import date, timezone
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

from transcription.job_store            import JobStore
from transcription.transcription_service import TranscriptionService
from pv.pv_service                       import PvService
from behavioral.interpretation_service  import InterpretationService


from dotenv import load_dotenv
load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────
UPLOAD_DIR   = Path(os.environ.get("UPLOAD_DIR",   "uploads"))
OFFLINE_MODE = os.environ.get("OFFLINE_MODE", "0") == "1"
PORT         = int(os.environ.get("PORT", 5001))

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── Singletons ─────────────────────────────────────────────────────────────────
# Les modèles sont chargés une seule fois au démarrage (peut prendre ~30-60 s).
app     = Flask(__name__)
CORS(app, origins="*")   # restreindre au domaine Symfony en production

store          = JobStore()
pv_svc         = PvService()            # Stateless – une instance, plusieurs appels
interpret_svc  = InterpretationService()  # qwen3:4b – une instance, plusieurs appels

# ── Helper ─────────────────────────────────────────────────────────────────────

def _allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in {".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac"}

def _normalize_id(meeting_id):
    """Convert pure-numeric string IDs back to int (matching the upload key type),
    while leaving UUIDs and other formats as strings."""
    s = str(meeting_id)
    if s.isdigit():
        return int(s)
    return s


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Ping rapide — confirme que le serveur et les modèles sont prêts."""
    return jsonify({"status": "ok", "offline_mode": OFFLINE_MODE})


@app.route("/api/meetings/upload", methods=["POST"])
def upload_audio():
    """
    Accepte un upload multipart/form-data.

    Champs attendus
    ---------------
    audio : file   – Fichier audio (MP3, WAV, M4A, WEBM…)
    title : str    – Titre de la réunion (optionnel)

    Réponse
    -------
    201 { "meetingId": int, "title": str }
    """
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided."}), 400

    file = request.files["audio"]
    if not file.filename or not _allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use MP3, WAV, M4A, or WEBM."}), 415

    # Génère un ID entier unique (timestamp Unix + suffixe aléatoire)
    _uid_str   = str(uuid.uuid4().int)
    meeting_id = int(_uid_str[:9])
    ext        = Path(file.filename).suffix.lower()
    save_path  = UPLOAD_DIR / f"meeting_{meeting_id}{ext}"
    title           = request.form.get("title", file.filename.rsplit(".", 1)[0])
    target_language = request.form.get("target_language", "en")

    file.save(str(save_path))

    # Use the audio file's original creation date sent by the frontend
    # (from File.lastModified), falling back to filesystem stat as last resort
    audio_created_at = request.form.get("audioCreatedAt")
    if not audio_created_at:
        try:
            file_stat = os.stat(str(save_path))
            file_ts = getattr(file_stat, 'st_birthtime', None) or file_stat.st_mtime
            audio_created_at = datetime.fromtimestamp(file_ts, tz=timezone.utc).isoformat()
        except Exception:
            audio_created_at = datetime.now(tz=timezone.utc).isoformat()

    # Enregistre le job et lance le thread worker en arrière-plan
    store.create(meeting_id, target_language, audio_created_at=audio_created_at)
    
    # Instantiate the service dynamically so it can free VRAM when done
    service = TranscriptionService(offline_mode=OFFLINE_MODE)

    print(f"[Meeting-AI] Target language for meeting {meeting_id}: {target_language}")
    
    thread = threading.Thread(
        target=service.run,
        args=(str(save_path), meeting_id, store),
        kwargs={"target_language": target_language},
        daemon=True,
        name=f"transcription-{meeting_id}",
    )
    thread.start()

    return jsonify({"meetingId": meeting_id, "title": title}), 201


@app.route("/api/meetings/<meeting_id>/status", methods=["GET"])
def get_status(meeting_id):
    """
    Interroge la progression du job.

    Réponse (correspond au contrat de ProcessingScreen.jsx)
    -------------------------------------------------------
    {
        "status":       "pending" | "processing" | "done" | "error",
        "progress":     0-100,
        "step":         "Label lisible",
        "segments":     [...] | null,
        "errorMessage": "..." | null
    }
    """
    meeting_id = _normalize_id(meeting_id)
    job = store.get(meeting_id)
    if job is None:
        return jsonify({"error": "Meeting not found."}), 404
    return jsonify(job), 200


@app.route("/api/meetings/<meeting_id>/transcript", methods=["GET"])
def get_transcript(meeting_id):
    """
    Retourne les segments finaux une fois le traitement terminé.

    Réponse  →  liste de segments (voir TranscriptionView.jsx)
    [
        {
            "id":           1,
            "speaker":      "Speaker A",
            "speakerColor": "#3B82F6",
            "timeStart":    "00:00",
            "timeEnd":      "00:45",
            "text":         "Bonjour à tous…"
        },
        …
    ]
    """
    meeting_id = _normalize_id(meeting_id)
    job = store.get(meeting_id)
    if job is None:
        return jsonify({"error": "Meeting not found."}), 404
    if job["status"] != "done":
        return jsonify({"error": "Transcript not ready yet.", "status": job["status"]}), 202
    return jsonify(job["segments"]), 200


# ── Endpoints PV ───────────────────────────────────────────────────────────────

@app.route("/api/meetings/<meeting_id>/generate-summary", methods=["POST"])
def generate_summary(meeting_id):
    """
    Démarre la génération d'un PV en arrière-plan.
    """
    meeting_id = _normalize_id(meeting_id)
    job = store.get(meeting_id)
    if job is None:
        return jsonify({"error": "Meeting not found."}), 404
    if job["status"] != "done":
        return jsonify({"error": "Transcript not ready yet.", "status": job["status"]}), 202

    segments = store.get_segments(meeting_id) or job.get("segments", [])
    if not segments:
        return jsonify({"error": "No transcript segments found."}), 422

    # Paramètres optionnels depuis le corps de la requête
    settings = request.get_json(silent=True) or {}

    pv_language = settings.get("language")
    if not pv_language or pv_language.lower() == "default":
        transcript_lang = store.get_language(meeting_id)
        pv_language = str(transcript_lang).upper()
        settings["language"] = pv_language

    print(f"[PV] Starting background PV generation for meeting {meeting_id} with model={settings.get('model', 'default')} lang={settings.get('language', 'default')}")
    
    # Init state
    store.create_pv_job(meeting_id)

    def pv_worker():
        try:
            pv_data = pv_svc.generate_with_progress(
                segments=segments,
                settings=settings,
                progress_callback=lambda pct, msg: store.update_pv_progress(meeting_id, pct, msg),
                cancel_check=lambda: store.is_cancelled(meeting_id)
            )
            pv_data["id"] = meeting_id
            store.store_pv(meeting_id, pv_data)
            print(f"[PV] Finished generating for {meeting_id}")
        except Exception as e:
            msg = str(e)
            print(f"[PV] Failed generating for {meeting_id}: {msg}")
            store.set_pv_error(meeting_id, msg)

    thread = threading.Thread(
        target=pv_worker,
        daemon=True,
        name=f"pv-generation-{meeting_id}",
    )
    thread.start()

    return jsonify({"message": "PV generation started", "meetingId": meeting_id}), 202

@app.route("/api/meetings/<meeting_id>/summary-status", methods=["GET"])
def get_summary_status(meeting_id):
    """
    Retourne l'état d'avancement de la génération du PV.
    """
    meeting_id = _normalize_id(meeting_id)
    status = store.get_pv_status(meeting_id)
    if status is None:
        return jsonify({"error": "No PV generation job found."}), 404
    return jsonify(status), 200


@app.route("/api/meetings/<meeting_id>/summary/translate", methods=["POST"])
def translate_summary(meeting_id):
    """
    Translates the PV using LM Studio.
    Body JSON:
    {
      "target_language": "FR",
      "pv_data": { ... } // Optional. Otherwise takes from job store.
    }
    """
    meeting_id = _normalize_id(meeting_id)
    data = request.get_json(silent=True) or {}
    target_language = data.get("target_language")
    if not target_language:
        return jsonify({"error": "target_language is required"}), 400

    pv_data = data.get("pv_data") or store.get_pv(meeting_id)
    if not pv_data:
        return jsonify({"error": "No summary available to translate"}), 404

    from transcription.transcription_service import TranslationService
    translation_svc = TranslationService()
    
    paths = []
    texts = []
    
    if "title" in pv_data and pv_data["title"]:
        paths.append(("title",))
        texts.append(str(pv_data["title"]))
        
    if "summary" in pv_data and pv_data["summary"]:
        paths.append(("summary",))
        texts.append(str(pv_data["summary"]))
    elif "content" in pv_data and "executiveOverview" in pv_data["content"] and pv_data["content"]["executiveOverview"]:
        paths.append(("content", "executiveOverview"))
        texts.append(str(pv_data["content"]["executiveOverview"]))
        
    if "points" in pv_data and isinstance(pv_data["points"], list):
        for i, pt in enumerate(pv_data["points"]):
            paths.append(("points", i))
            texts.append(str(pt))
    elif "content" in pv_data and "keyDecisions" in pv_data["content"] and isinstance(pv_data["content"]["keyDecisions"], list):
        for i, pt in enumerate(pv_data["content"]["keyDecisions"]):
            paths.append(("content", "keyDecisions", i))
            texts.append(str(pt))
            
    if "actions" in pv_data and isinstance(pv_data["actions"], list):
        for i, act in enumerate(pv_data["actions"]):
            if "action" in act and act["action"]:
                paths.append(("actions", i, "action"))
                texts.append(str(act["action"]))
    elif "content" in pv_data and "nextSteps" in pv_data["content"] and isinstance(pv_data["content"]["nextSteps"], list):
        for i, act in enumerate(pv_data["content"]["nextSteps"]):
            if "task" in act and act["task"]:
                paths.append(("content", "nextSteps", i, "task"))
                texts.append(str(act["task"]))

    if not texts:
        return jsonify({"pv": pv_data, "message": "Nothing to translate"}), 200

    try:
        translated_texts = translation_svc.translate_batch(texts, target_language)
    except Exception as e:
        print(f"[Meeting-AI] Error translating PV: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Free LM Studio VRAM so Ollama can load Mistral for PV generation
        translation_svc.unload_model()

    # Reconstruct the dict
    for path, translated in zip(paths, translated_texts):
        curr = pv_data
        for p in path[:-1]:
            curr = curr[p]
        curr[path[-1]] = translated
        
    store.store_pv(meeting_id, pv_data)

    return jsonify({"pv": pv_data, "message": "Translation complete"}), 200



@app.route("/api/summaries/<meeting_id>", methods=["GET", "PUT"])
def get_or_update_summary(meeting_id):
    """
    Retourne ou met à jour le PV stocké pour une réunion.
    """
    meeting_id = _normalize_id(meeting_id)
    if request.method == "PUT":
        data = request.get_json(silent=True) or {}
        existing = store.get_pv(meeting_id) or {}
        
        # Merge content updates
        if "content" in data:
            if "content" not in existing or not isinstance(existing["content"], dict):
                existing["content"] = {}
            if isinstance(data["content"], dict):
                existing["content"].update(data["content"])
            else:
                existing["content"] = data["content"]
        
        # Merge top-level keys
        for k, v in data.items():
            if k != "content":
                existing[k] = v
                
        store.store_pv(meeting_id, existing)
        return jsonify(existing), 200

    pv = store.get_pv(meeting_id)
    if pv is None:
        return jsonify({"error": "No PV found. Call POST /generate-summary first."}), 404
    return jsonify(pv), 200


@app.route("/api/meetings/<meeting_id>/analytics", methods=["GET"])
def get_analytics(meeting_id):
    """
    Retourne les données d'analyse comportementale de la réunion.
    """
    meeting_id = _normalize_id(meeting_id)
    job = store.get(meeting_id)
    if job is None:
        return jsonify({"error": "Meeting not found."}), 404
        
    analytics_data = store.get_analytics(meeting_id)
    # Use 'is None' so an empty dict {} (no speakers detected) doesn't trigger a 404
    if analytics_data is None:
        # Check if there was an error in behavioral analysis
        if job.get("analytics_error"):
            return jsonify({"error": "Behavioral analysis failed.", "trace": job["analytics_error"]}), 500
            
        # If the job is still processing, return a 202 instead of 404
        if job["status"] in ["pending", "processing"]:
            return jsonify({"error": "Analytics not ready yet.", "status": job["status"]}), 202
        return jsonify({"error": "No analytics found for this meeting."}), 404

    # ── Merge interpretation result if available ────────────────────────────────
    # Priority: JobStore (persisted within session) > _interp_jobs (runtime cache)
    # This lets the Flutter client detect hasInterpretation on GET /analytics,
    # so it skips re-generating an interpretation that already exists.
    persisted_interp = store.get_interpretation(meeting_id)
    if persisted_interp:
        merged = dict(analytics_data)
        merged["interpretation"] = persisted_interp
        return jsonify(merged), 200

    with _interp_lock:
        interp_job = _interp_jobs.get(meeting_id, {})
    if interp_job.get("status") == "done" and interp_job.get("result"):
        merged = dict(analytics_data)
        merged["interpretation"] = interp_job["result"]
        return jsonify(merged), 200

    return jsonify(analytics_data), 200


# ── Interprétation comportementale IA ──────────────────────────────────────────
# Stockage en mémoire des jobs d'interprétation (clé = meeting_id)
_interp_jobs: dict = {}
_interp_lock = threading.Lock()


@app.route("/api/meetings/<meeting_id>/analytics/interpret", methods=["POST"])
def start_interpret(meeting_id):
    """
    Démarre l'interprétation comportementale en arrière-plan (non-bloquant).
    Retourne immédiatement 202. Polls via GET /analytics/interpret.
    Corps JSON optionnel : { "analytics_data": {...} }
    """
    meeting_id = _normalize_id(meeting_id)
    body = request.get_json(silent=True) or {}
    # Allow ?force=true or {"force": true} to bypass the cached result (e.g. after a new upload)
    force = request.args.get("force", "false").lower() == "true" or body.get("force", False)

    # ── Check JobStore first (persists across HTTP requests within the same session) ─
    if not force:
        persisted_interp = store.get_interpretation(meeting_id)
        if persisted_interp:
            return jsonify({"status": "done", "result": persisted_interp, "error": None}), 200

    with _interp_lock:
        existing = _interp_jobs.get(meeting_id, {})
        if not force and existing.get("status") in ("pending", "done"):
            code = 200 if existing["status"] == "done" else 202
            return jsonify(existing), code

    analytics_data = body.get("analytics_data") or store.get_analytics(meeting_id)

    if analytics_data is None:
        job = store.get(meeting_id)
        if job is None:
            return jsonify({"error": "Meeting not found."}), 404
        if job.get("status") in ("pending", "processing"):
            return jsonify({"error": "Analytics not ready yet."}), 202
        return jsonify({"error": "No analytics data found."}), 404

    # Retrieve the real transcript segments for context-aware interpretation
    transcript_segments = store.get_segments(meeting_id) or []
    print(f"[Interpret] Using {len(transcript_segments)} transcript segments for meeting {meeting_id}")

    with _interp_lock:
        _interp_jobs[meeting_id] = {"status": "pending", "result": None, "error": None}

    def _worker():
        try:
            print(f"[Interpret] Starting {interpret_svc.model} for meeting {meeting_id}")
            result = interpret_svc.interpret(analytics_data, transcript_segments=transcript_segments)
            print(f"[Interpret] Done for meeting {meeting_id}")
            with _interp_lock:
                _interp_jobs[meeting_id] = {"status": "done", "result": result, "error": None}
            # ── Persist to JobStore so GET /analytics returns it immediately ──────
            store.store_interpretation(meeting_id, result)
        except Exception as e:
            print(f"[Interpret] Error for meeting {meeting_id}: {e}")
            with _interp_lock:
                _interp_jobs[meeting_id] = {"status": "error", "result": None, "error": str(e)}

    threading.Thread(target=_worker, daemon=True, name=f"interpret-{meeting_id}").start()
    return jsonify({"status": "pending", "message": "Interprétation démarrée"}), 202



@app.route("/api/meetings/<meeting_id>/analytics/interpret", methods=["GET"])
def get_interpret(meeting_id):
    """
    Retourne l'état de l'interprétation comportementale.
    { "status": "pending"|"done"|"error", "result": {...}|null }
    """
    meeting_id = _normalize_id(meeting_id)
    with _interp_lock:
        job = _interp_jobs.get(meeting_id)
    if job is None:
        return jsonify({"status": "not_started"}), 404
    return jsonify(job), 200 if job["status"] == "done" else 202


# DEBUG — dump full in-memory job state (REMOVE IN PRODUCTION!)
@app.route("/api/meetings/<meeting_id>/debug", methods=["GET"])
def debug_job(meeting_id):
    """Return the raw job state dict for debugging."""
    meeting_id = _normalize_id(meeting_id)
    with store._lock:
        job = store._jobs.get(meeting_id)
    if job is None:
        return jsonify({"error": "Job not found"}), 404
    # Avoid huge segment dumps — just show keys + analytics/error
    safe = {k: v for k, v in job.items() if k not in ("segments",)}
    return jsonify(safe), 200


@app.route("/api/meetings/<meeting_id>/transcript", methods=["PUT"])
def update_transcript(meeting_id):
    """
    Sauvegarde les segments de transcription édités depuis le frontend.

    Corps (JSON)
    ------------
    [ { id, speaker, speakerColor, timeStart, timeEnd, text }, ... ]
    """
    meeting_id = _normalize_id(meeting_id)
    job = store.get(meeting_id)
    if job is None:
        return jsonify({"error": "Meeting not found."}), 404

    segments = request.get_json(silent=True)
    if not segments or not isinstance(segments, list):
        return jsonify({"error": "Request body must be a JSON array of segments."}), 400

    store.update_segments(meeting_id, segments)
    return jsonify({"ok": True, "count": len(segments)}), 200


@app.route("/api/meetings/<meeting_id>", methods=["DELETE"])
def cancel_meeting(meeting_id):
    """
    Annulation : marque le job comme annulé pour arrêter l'IA en douceur
    sans tuer tout le serveur Python.
    """
    meeting_id = _normalize_id(meeting_id)
    print(f"\n[Meeting-AI] ANNULATION DEMANDÉE pour le meeting {meeting_id}...\n")
    store.cancel(meeting_id)
    return jsonify({"message": "Job cancellation requested"}), 200


@app.route("/api/meetings/<meeting_id>/translate", methods=["POST"])
@app.route("/api/meetings/<meeting_id>/transcript/translate", methods=["POST"])
def translate_transcript(meeting_id):
    """
    Traduit les segments d'un transcript existant via LM Studio (TowerInstruct).

    Corps JSON attendu
    ------------------
    {
        "target_language": "fr"   # code BCP-47 de la langue cible
    }

    Réponse 200
    -----------
    { "segments": [...], "source_language": "en", "target_language": "fr" }
    """
    meeting_id = _normalize_id(meeting_id)
    body = request.get_json(silent=True) or {}
    target_language = body.get("target_language", "en")
    source_language = body.get("source_language", "en")   # hint from frontend

    # 1. Get segments from body (frontend provides them for saved meetings)
    #    OR from JobStore (for freshly uploaded meetings)
    segments = body.get("segments")
    job = store.get(meeting_id)

    print(f"[Meeting-AI] Translation request for {meeting_id}. Segments in body: {len(segments) if segments else 'None'}, Job in store: {job is not None}")

    if not segments:
        if job is None:
            print(f"[Meeting-AI] Error: Meeting {meeting_id} not found and no segments in body.")
            return jsonify({"error": "Meeting not found in AI store and no segments provided."}), 404
        if job["status"] != "done":
            print(f"[Meeting-AI] Error: Job {meeting_id} status is {job['status']}, not 'done'.")
            return jsonify({"error": "Transcript not ready yet.", "status": job["status"]}), 202
        segments = store.get_segments(meeting_id) or job.get("segments", [])

    if not segments:
        print(f"[Meeting-AI] Error: No segments found for {meeting_id}")
        return jsonify({"error": "No transcript segments found."}), 422

    # Import the translation service from the transcription module
    from transcription.transcription_service import TranslationService

    translation_svc = TranslationService()
    source_language  = body.get("source_language", "en")   # hint from frontend

    # Extract all text segments
    original_texts = [seg.get("text", "") for seg in segments]

    print(f"[Meeting-AI] Translating meeting {meeting_id}: '{source_language}' → '{target_language}' (batch of {len(segments)} segments)")

    try:
        translated_texts = translation_svc.translate_batch(original_texts, target_language)
        if translated_texts == original_texts:
            print("[Meeting-AI] Warning: Translation returned original text (check LM Studio connection/model).")
        else:
            print(f"[Meeting-AI] Successfully translated {len(segments)} segments.")
    except Exception as e:
        print(f"[Meeting-AI] Batch translation error: {e}")
        translated_texts = original_texts   # fallback: keep original
    finally:
        # Free LM Studio VRAM so Ollama can load Mistral for PV generation
        translation_svc.unload_model()

    translated_segments = []
    for i, seg in enumerate(segments):
        new_seg = dict(seg)
        if i < len(translated_texts) and original_texts[i].strip():
            new_seg["text"] = translated_texts[i]
        translated_segments.append(new_seg)

    # Persist the translated segments so the frontend can save them
    store.update_segments(meeting_id, translated_segments)
    store.update_language(meeting_id, target_language)

    return jsonify({
        "segments":        translated_segments,
        "source_language": source_language,
        "target_language": target_language,
    }), 200



@app.route("/api/meetings/<meeting_id>/meeting", methods=["GET"])
def get_meeting_meta(meeting_id):
    """
    Retourne les métadonnées de base d'une réunion
    (utilisé par RefineSummaryView pour pré-remplir les champs).
    """
    meeting_id = _normalize_id(meeting_id)
    job = store.get(meeting_id)
    if job is None:
        return jsonify({"error": "Meeting not found."}), 404

    # Récupère les participants depuis le PV s'il a déjà été généré
    pv = store.get_pv(meeting_id)
    participants = pv.get("participants", []) if pv else []

    audio_date = store.get_audio_created_at(meeting_id) or date.today().isoformat()
    duration_sec = job.get("duration_seconds")
    duration_min = int(duration_sec // 60) if duration_sec else 30

    return jsonify({
        "id":           meeting_id,
        "date":         audio_date,
        "location":     "SFM-RDC",
        "participants": participants,
        "language":     store.get_language(meeting_id),
        "durationMinutes": duration_min,
        "duration_seconds": duration_sec,
    }), 200


@app.route("/api/meetings/<meeting_id>", methods=["GET"])
def get_meeting(meeting_id):
    """
    Alias de get_meeting_meta — même réponse, URL sans suffixe /meeting.
    Utilisé par fetchMeeting du frontend (GET /api/meetings/:id).
    """
    meeting_id = _normalize_id(meeting_id)
    job = store.get(meeting_id)
    if job is None:
        return jsonify({"error": "Meeting not found."}), 404

    pv = store.get_pv(meeting_id)
    participants = pv.get("participants", []) if pv else []

    audio_date = store.get_audio_created_at(meeting_id) or date.today().isoformat()
    duration_sec = job.get("duration_seconds")
    duration_min = int(duration_sec // 60) if duration_sec else 30

    return jsonify({
        "id":           meeting_id,
        "date":         audio_date,
        "location":     "SFM-RDC",
        "participants": participants,
        "language":     store.get_language(meeting_id),
        "durationMinutes": duration_min,
        "duration_seconds": duration_sec,
        # Champs supplémentaires attendus par le frontend mock-shape
        "agendaItems":  [],
        "decisions":    [],
        "actionItems":  [],
    }), 200


@app.route("/api/meetings/<meeting_id>/rename", methods=["POST"])
def rename_meeting(meeting_id):
    """
    Associe un ID temporaire numérique (9 chiffres) à son UUID persistant Symfony.
    Renomme également le fichier audio sur le disque pour correspondre à l'UUID.
    """
    meeting_id = _normalize_id(meeting_id)
    body = request.get_json(silent=True) or {}
    new_id = body.get("new_id")
    if not new_id:
        return jsonify({"error": "new_id is required"}), 400

    new_id = _normalize_id(new_id)
    store.rename(meeting_id, new_id)

    # Renommer le fichier audio sur le disque s'il existe
    renamed_file = False
    for file in UPLOAD_DIR.glob(f"meeting_{meeting_id}.*"):
        if file.is_file():
            ext = file.suffix.lower()
            new_path = UPLOAD_DIR / f"meeting_{new_id}{ext}"
            try:
                os.replace(str(file), str(new_path))
                renamed_file = True
            except Exception as e:
                print(f"[Meeting-AI] Error renaming file: {e}")

    return jsonify({
        "ok": True,
        "message": f"Meeting {meeting_id} renamed to {new_id}.",
        "file_renamed": renamed_file
    }), 200


@app.route("/api/meetings/<meeting_id>/audio", methods=["GET"])
def get_meeting_audio(meeting_id):
    """
    Sert le fichier audio associé à un meeting (soit ID numérique, soit UUID).
    """
    meeting_id = _normalize_id(meeting_id)
    
    # Recherche d'un fichier meeting_{meeting_id}.* dans UPLOAD_DIR
    for file in UPLOAD_DIR.glob(f"meeting_{meeting_id}.*"):
        if file.is_file():
            from flask import send_file
            # Determine correct mimetype based on extension
            ext = file.suffix.lower()
            mimetype = 'audio/mpeg'
            if ext == '.wav':
                mimetype = 'audio/wav'
            elif ext == '.m4a':
                mimetype = 'audio/mp4'
            elif ext == '.webm':
                mimetype = 'audio/webm'
            elif ext == '.ogg':
                mimetype = 'audio/ogg'
            
            return send_file(str(file), mimetype=mimetype, as_attachment=False)
            
    return jsonify({"error": "Audio file not found."}), 404


# ── Point d'entrée ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"[Meeting-AI] Démarrage du serveur AI sur le port {PORT}")
    print(f"[Meeting-AI] Mode hors-ligne : {OFFLINE_MODE}")
    print(f"[Meeting-AI] Répertoire d'upload : {UPLOAD_DIR.resolve()}")
    print(f"[Meeting-AI] Modèle PV : {pv_svc.model} (modifier avec la var d'env PV_MODEL)")
    # use_reloader=False est critique — le rechargement rechargerait les modèles lourds
    app.run(host="0.0.0.0", port=PORT, debug=False, use_reloader=False)
