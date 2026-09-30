import base64
import logging
import os
import time
import uuid
from flask import Blueprint, request, jsonify, g

from api.auth import token_required, db_connect
from permissions.resolver import get_allowed_meeting_ids
from voice.stt import transcribe_audio
from voice.tts import synthesize_text_to_audio
from rag.chain import execute_rag_flow, save_chat_message

logger = logging.getLogger("meeting_agent")

chat_bp = Blueprint("chat", __name__, url_prefix="/api")

@chat_bp.route("/chat", methods=["POST"])
@token_required
def chat_turn():
    """
    Handles a single conversational turn.
    Supports JSON payloads (text) and Multipart form payloads (voice).
    """
    user_id = g.user["id"]
    
    # 1. Resolve user allowed meeting IDs (permissions)
    allowed_ids = get_allowed_meeting_ids(g.user)
    
    # 2. Extract parameters from body (supports JSON or multipart form)
    is_json = request.is_json
    
    if is_json:
        data = request.get_json() or {}
        session_id = data.get("session_id") or data.get("conversation_id")
        message = data.get("message", "").strip()
        speech_synthesis_requested = data.get("speech_synthesis_requested", False)
        selected_meeting_ids = data.get("meeting_ids")
        audio_file = None
    else:
        # Multipart form data (voice)
        session_id = request.form.get("session_id") or request.form.get("conversation_id")
        message = request.form.get("message", "").strip()
        
        speech_synthesis_requested_str = request.form.get("speech_synthesis_requested", "false").lower()
        speech_synthesis_requested = speech_synthesis_requested_str in ("true", "1")
        
        selected_meeting_ids = None
        selected_meeting_ids_str = request.form.get("meeting_ids")
        if selected_meeting_ids_str:
            try:
                import json
                selected_meeting_ids = json.loads(selected_meeting_ids_str)
            except Exception:
                pass
        audio_file = request.files.get("audio")
        
    # Intersect allowed_ids with user-selected meeting_ids if provided
    if selected_meeting_ids is not None:
        if isinstance(selected_meeting_ids, str):
            selected_meeting_ids = [selected_meeting_ids]
        if isinstance(selected_meeting_ids, (list, tuple)):
            allowed_ids = [mid for mid in allowed_ids if mid in selected_meeting_ids]
            
    # Standardize session_id (generate unique UUID if not provided)
    if not session_id:
        session_id = str(uuid.uuid4())
        
    user_transcription = None
    warning_message = None
    timing = {}  # Collects per-step latencies (seconds) for structured logging

    # 3. Handle Voice Inbound (STT) if audio file is attached
    if audio_file:
        from config import UPLOAD_DIR
        # Save temp audio file
        temp_filename = f"stt_{uuid.uuid4().hex}_{audio_file.filename}"
        temp_path = os.path.join(UPLOAD_DIR, temp_filename)
        audio_file.save(temp_path)

        try:
            # Transcribe audio file (French voice auto-detected or specified)
            logger.info(f"[Chat][STT] Transcribing audio file: {temp_path}")
            t0 = time.perf_counter()
            transcription, detected_lang = transcribe_audio(temp_path)
            stt_duration = round(time.perf_counter() - t0, 3)
            timing["stt_seconds"] = stt_duration
            message = transcription
            user_transcription = transcription
            logger.info(
                f"[Chat][STT] Transcription done in {stt_duration}s — "
                f"'{message[:60]}' (lang: {detected_lang})"
            )
        except Exception as e:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return jsonify({"error": f"Audio transcription failed: {str(e)}"}), 400
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
                    
    if not message:
        return jsonify({"error": "Empty message prompt or transcription."}), 400
        
    try:
        # 4. Routing logic: decide RAG vs SQL agent
        route_taken = "rag"
        sql_query = None
        dashboard_spec = None

        try:
            from sql_agent.router import route_and_execute_intent
            logger.info(f"[Chat][Router] Dispatching query to intent router (session={session_id})")
            t0 = time.perf_counter()
            result = route_and_execute_intent(session_id, user_id, message, allowed_ids)
            inference_duration = round(time.perf_counter() - t0, 3)
            route_taken = result["route_taken"]
            timing[f"{route_taken}_seconds"] = inference_duration
            logger.info(
                f"[Chat][Router] Route='{route_taken}' completed in {inference_duration}s"
            )
            response_text = result["response_text"]
            sql_query = result.get("sql_query")
            dashboard_spec = result.get("dashboard_spec")
            sources = result.get("sources", [])
        except ImportError:
            # Fallback to standard RAG pipeline when router module is unavailable
            logger.info(f"[Chat][RAG] Falling back to direct RAG pipeline (session={session_id})")
            t0 = time.perf_counter()
            rag_res = execute_rag_flow(session_id, user_id, message, allowed_ids)
            rag_duration = round(time.perf_counter() - t0, 3)
            timing["rag_seconds"] = rag_duration
            logger.info(f"[Chat][RAG] RAG flow completed in {rag_duration}s")
            response_text = rag_res["response_text"]
            sources = rag_res["sources"]

        # 5. Handle Voice Outbound (TTS) if synthesis is requested
        audio_b64 = None
        if speech_synthesis_requested:
            logger.info("[Chat][TTS] Synthesizing response audio...")
            t0 = time.perf_counter()
            audio_bytes, warn_msg = synthesize_text_to_audio(response_text)
            tts_duration = round(time.perf_counter() - t0, 3)
            timing["tts_seconds"] = tts_duration
            if audio_bytes:
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                logger.info(f"[Chat][TTS] Synthesis completed in {tts_duration}s ({len(audio_bytes)} bytes)")
            else:
                warning_message = warn_msg
                logger.warning(f"[Chat][TTS] Synthesis failed in {tts_duration}s: {warn_msg}")

        # Log consolidated timing summary for the full turn
        logger.info(
            f"[Chat][Timing] Turn complete — "
            + ", ".join(f"{k}={v}" for k, v in timing.items())
            + f" | route={route_taken} | session={session_id}"
        )

        # 6. Construct response matching chat.json contract
        resp_payload = {
            "session_id": session_id,
            "conversation_id": session_id,
            "user_transcription": user_transcription,
            "response_text": response_text,
            "route_taken": route_taken,
            "sql_query": sql_query,
            "dashboard_spec": dashboard_spec,
            "sources": sources,
            "audio_b64": audio_b64,
            "warning": warning_message,
            "timing": timing
        }

        return jsonify(resp_payload), 200

    except TimeoutError as te:
        raise te
    except ConnectionError as ce:
        raise ce
    except Exception as e:
        return jsonify({"error": f"Internal agent error: {str(e)}"}), 500


# ── Auxiliary History Management Endpoints ────────────────────────────────────

@chat_bp.route("/chat/history", methods=["GET"])
@token_required
def get_user_sessions():
    """Lists unique chat conversations/sessions for the logged user."""
    user_id = g.user["id"]
    conn = db_connect()
    sessions = []
    try:
        with conn.cursor() as cur:
            # Group by session_id and get the last message preview
            cur.execute(
                """
                SELECT session_id, MAX(created_at) as last_activity,
                       (SELECT content FROM chat_messages WHERE session_id = cm.session_id ORDER BY created_at DESC LIMIT 1) as last_message
                FROM chat_messages cm
                WHERE user_id = %s
                GROUP BY session_id
                ORDER BY last_activity DESC;
                """,
                (user_id,)
            )
            rows = cur.fetchall()
            for r in rows:
                sessions.append({
                    "conversation_id": r[0],
                    "session_id": r[0],
                    "last_activity": r[1].isoformat() if r[1] else None,
                    "last_message": r[2][:80] + "..." if r[2] and len(r[2]) > 80 else (r[2] or "")
                })
    except Exception as e:
        print(f"[ChatHistory] Error fetching history list: {e}")
    finally:
        conn.close()
        
    return jsonify(sessions), 200


@chat_bp.route("/chat/<session_id>", methods=["GET"])
@token_required
def get_session_history(session_id):
    """Retrieves full conversation logs for a specific session."""
    user_id = g.user["id"]
    conn = db_connect()
    messages = []
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT role, content, created_at, audio_b64, metadata
                FROM chat_messages
                WHERE session_id = %s AND user_id = %s
                ORDER BY created_at ASC;
                """,
                (session_id, user_id)
            )
            rows = cur.fetchall()
            for r in rows:
                messages.append({
                    "role": r[0],
                    "content": r[1],
                    "created_at": r[2].isoformat() if r[2] else None,
                    "audio_b64": r[3],
                    "metadata": r[4]
                })
    except Exception as e:
        print(f"[ChatHistory] Error fetching session details: {e}")
    finally:
        conn.close()
        
    return jsonify({
        "session_id": session_id,
        "conversation_id": session_id,
        "messages": messages
    }), 200


@chat_bp.route("/chat/<session_id>", methods=["DELETE"])
@token_required
def delete_session(session_id):
    """Deletes conversation history logs for a session."""
    user_id = g.user["id"]
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM chat_messages WHERE session_id = %s AND user_id = %s;",
                (session_id, user_id)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Failed to delete conversation: {str(e)}"}), 500
    finally:
        conn.close()
        
    return jsonify({
        "status": "success",
        "message": f"Session '{session_id}' deleted successfully."
    }), 200


@chat_bp.route("/chat/meetings", methods=["GET"])
@token_required
def get_chat_meetings():
    """
    Returns the metadata of all meetings the user has permission to consult.
    Used in the chatbot interface for selecting target meetings.
    """
    allowed_ids = get_allowed_meeting_ids(g.user)
    if not allowed_ids:
        return jsonify([]), 200
        
    conn = db_connect()
    meetings = []
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 
                    m.id, 
                    m.title, 
                    m.start_at, 
                    m.status, 
                    m.description,
                    p.id AS project_id,
                    p.name AS project_name,
                    COALESCE(
                        (SELECT json_agg(json_build_object('id', t.id::text, 'name', t.name, 'department_name', d.name))
                         FROM project_team pt
                         JOIN team t ON pt.team_id = t.id
                         LEFT JOIN department d ON t.department_id = d.id
                         WHERE pt.project_id = m.project_id),
                        '[]'::json
                    ) AS teams,
                    COALESCE(
                        (SELECT json_agg(json_build_object('id', d.id::text, 'name', d.name))
                         FROM project_team pt
                         JOIN team t ON pt.team_id = t.id
                         JOIN department d ON t.department_id = d.id
                         WHERE pt.project_id = m.project_id),
                        '[]'::json
                    ) AS departments
                FROM meeting m
                LEFT JOIN project p ON m.project_id = p.id
                WHERE m.id = ANY(%s::uuid[]) AND m.deleted_at IS NULL
                ORDER BY m.start_at DESC;
                """,
                (allowed_ids,)
            )
            rows = cur.fetchall()
            for r in rows:
                meetings.append({
                    "id": str(r[0]),
                    "title": r[1],
                    "start_at": r[2].isoformat() if r[2] else None,
                    "status": r[3],
                    "description": r[4],
                    "project": {"id": str(r[5]), "name": r[6]} if r[5] else None,
                    "teams": r[7],
                    "departments": r[8]
                })
    except Exception as e:
        logger.error(f"[ChatMeetings] Error fetching allowed meetings: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        
    return jsonify(meetings), 200



@chat_bp.route("/chat/stream", methods=["POST"])
@token_required
def chat_stream_turn():
    """
    Handles a streaming conversational turn (SSE).
    """
    user_id = g.user["id"]
    
    # 1. Resolve user allowed meeting IDs (permissions)
    allowed_ids = get_allowed_meeting_ids(g.user)
    
    data = request.get_json() or {}
    session_id = data.get("session_id") or data.get("conversation_id")
    message = data.get("message", "").strip()
    selected_meeting_ids = data.get("meeting_ids")
    
    # Standardize session_id (generate unique UUID if not provided)
    if not session_id:
        session_id = str(uuid.uuid4())
        
    if not message:
        return jsonify({"error": "Empty message prompt."}), 400
        
    # Intersect allowed_ids with user-selected meeting_ids if provided
    if selected_meeting_ids is not None:
        if isinstance(selected_meeting_ids, str):
            selected_meeting_ids = [selected_meeting_ids]
        if isinstance(selected_meeting_ids, (list, tuple)):
            allowed_ids = [mid for mid in allowed_ids if mid in selected_meeting_ids]
            
    def generate():
        import json
        import time
        
        # Yield metadata event
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': session_id, 'session_id': session_id})}\n\n"
        
        try:
            # Routing logic: decide RAG vs SQL agent
            route_taken = "rag"
            sql_query = None
            dashboard_spec = None
            sources = []
            
            try:
                from sql_agent.router import route_and_execute_intent
                logger.info(f"[ChatStream][Router] Dispatching query to intent router (session={session_id})")
                result = route_and_execute_intent(session_id, user_id, message, allowed_ids)
                route_taken = result["route_taken"]
                response_text = result["response_text"]
                sql_query = result.get("sql_query")
                dashboard_spec = result.get("dashboard_spec")
                sources = result.get("sources", [])
            except ImportError:
                # Fallback to standard RAG pipeline
                logger.info(f"[ChatStream][RAG] Falling back to direct RAG pipeline (session={session_id})")
                rag_res = execute_rag_flow(session_id, user_id, message, allowed_ids)
                response_text = rag_res["response_text"]
                sources = rag_res["sources"]
                
            # Yield response tokens
            words = response_text.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
                time.sleep(0.01)  # Smooth typing simulation
                
            # Yield dashboard if available
            if dashboard_spec:
                yield f"data: {json.dumps({'type': 'dashboard', 'config': dashboard_spec})}\n\n"
                
            # Yield sources
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
            
            # Yield done
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            logger.error(f"[ChatStream] Error during streaming: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
            
    from flask import Response, stream_with_context
    return Response(stream_with_context(generate()), mimetype="text/event-stream")


# ── Direct STT/TTS routes for Chatbot voice functionality ──────────────────────

@chat_bp.route("/stt", methods=["POST"])
@token_required
def speech_to_text():
    """
    Direct endpoint for audio transcription (STT).
    Expects multipart form with an 'audio' file and optional 'language'.
    """
    audio_file = request.files.get("audio")
    if not audio_file:
        return jsonify({"error": "No audio file provided."}), 400
        
    language = request.form.get("language")
    
    from config import UPLOAD_DIR
    temp_filename = f"stt_direct_{uuid.uuid4().hex}_{audio_file.filename}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)
    audio_file.save(temp_path)
    
    try:
        logger.info(f"[Chat][STT] Transcribing direct audio: {temp_path}")
        transcription, detected_lang = transcribe_audio(temp_path, target_language=language)
        return jsonify({
            "text": transcription,
            "language": detected_lang
        }), 200
    except Exception as e:
        logger.error(f"[Chat][STT] Direct STT failed: {e}")
        return jsonify({"error": f"Audio transcription failed: {str(e)}"}), 500
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@chat_bp.route("/tts", methods=["POST"])
@token_required
def text_to_speech():
    """
    Direct endpoint for text-to-speech synthesis (TTS).
    Expects JSON with 'text' and optional 'language'.
    """
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
        
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Empty text provided."}), 400
        
    # language is optional
    language = data.get("language", "fr")
    
    try:
        logger.info(f"[Chat][TTS] Synthesizing text direct: '{text[:50]}'")
        audio_bytes, warn_msg = synthesize_text_to_audio(text)
        if not audio_bytes:
            return jsonify({"error": f"TTS synthesis failed: {warn_msg}"}), 500
            
        import io
        from flask import send_file
        return send_file(
            io.BytesIO(audio_bytes),
            mimetype="audio/wav",
            as_attachment=False
        )
    except Exception as e:
        logger.error(f"[Chat][TTS] Direct TTS failed: {e}")
        return jsonify({"error": f"TTS synthesis failed: {str(e)}"}), 500

