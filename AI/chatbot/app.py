import json
import logging
import os
import sys
import time

# Dynamic root path injection: ensures all local packages (rag, sql_agent, api, etc.)
# are imported absolutely from the chatbot directory, preserving the clean import scheme.
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import PORT

# ── JSON Logging Setup ─────────────────────────────────────────────────────────
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno
        }
        if hasattr(record, "duration"):
            log_data["duration_seconds"] = record.duration
            
        return json.dumps(log_data)

# Configure structured logging to standard output
logger = logging.getLogger("meeting_agent")
logger.setLevel(logging.INFO)
log_handler = logging.StreamHandler(sys.stdout)
log_handler.setFormatter(JsonFormatter())
logger.addHandler(log_handler)

# ── Flask App Initialization ───────────────────────────────────────────────────
app = Flask(__name__)
# Enable CORS for frontend compatibility
CORS(app, origins="*")

# ── Error Handlers ─────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Resource not found."}), 404

@app.errorhandler(TimeoutError)
def timeout_error_handler(error):
    logger.error(f"Timeout: {str(error)}")
    return jsonify({
        "error": "Ollama local inference service timeout (exceeded 40s).",
        "guidance": (
            "The local LLM service (Ollama) took too long to respond. To resolve this:\n"
            "1. Verify that Ollama is currently running ('ollama serve' or check tray icon).\n"
            "2. Ensure the required model is pulled locally ('ollama pull llama3.1').\n"
            "3. If this is the first execution, a cold-start might occur as the model is loaded into VRAM. Please try again."
        )
    }), 408

@app.errorhandler(ConnectionError)
def connection_error_handler(error):
    logger.error(f"ConnectionError: {str(error)}")
    return jsonify({
        "error": "Failed to connect to local Ollama service.",
        "guidance": (
            "The microservice was unable to communicate with Ollama. To resolve this:\n"
            "1. Verify Ollama is running by accessing 'http://localhost:11434' in your browser.\n"
            "2. Ensure your local firewall is not blocking port 11434.\n"
            "3. Check the OLLAMA_HOST environment variable or config.py."
        )
    }), 503

@app.errorhandler(500)
def internal_server_error(error):
    logger.exception("An unhandled exception occurred.")
    return jsonify({"error": "Internal server error."}), 500

# Request timing / Logging middleware
@app.before_request
def start_timer():
    request.start_time = time.time()

@app.after_request
def log_request(response):
    if request.path == "/health":
        return response
        
    duration = time.time() - request.start_time
    logger.info(
        f"{request.method} {request.path} completed with status {response.status_code}",
        extra={"duration": duration}
    )
    return response

# ── Health Endpoint ─────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    """Diagnostic health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "service": "Multimodal Meeting Agent AI"
    }), 200

# ── Import & Register Blueprints ────────────────────────────────────────────────
# Blueprints will be imported dynamically to prevent circular dependencies.
try:
    from api.chat import chat_bp
    app.register_blueprint(chat_bp)
except ImportError as e:
    logger.warning(f"Could not register chat blueprint yet: {e}")

try:
    from api.ingest import ingest_bp
    app.register_blueprint(ingest_bp)
except ImportError as e:
    logger.warning(f"Could not register ingest blueprint yet: {e}")

def start_background_schedulers():
    """Starts background threads for housekeeping tasks (token denylist and chat retention)."""
    import threading
    
    def purge_tokens_loop():
        while True:
            try:
                logger.info("[Scheduler] Purging expired blacklisted tokens...")
                from api.auth import db_connect
                conn = db_connect()
                try:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM token_denylist WHERE expires_at < CURRENT_TIMESTAMP;")
                    conn.commit()
                    logger.info("[Scheduler] Expired blacklisted tokens purged successfully.")
                except Exception as e:
                    conn.rollback()
                    logger.error(f"[Scheduler] Error purging expired tokens: {e}")
                finally:
                    conn.close()
            except Exception as e:
                logger.error(f"[Scheduler] Connection error in token purge loop: {e}")
                
            # Sleep for 1 hour
            time.sleep(3600)

    def purge_chat_history_loop():
        while True:
            try:
                logger.info("[Scheduler] Purging inactive chat sessions (>90 days)...")
                from api.auth import db_connect
                conn = db_connect()
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            DELETE FROM chat_messages 
                            WHERE session_id IN (
                                SELECT session_id 
                                FROM chat_messages 
                                GROUP BY session_id 
                                HAVING MAX(created_at) < NOW() - INTERVAL '90 days'
                            );
                            """
                        )
                    conn.commit()
                    logger.info("[Scheduler] Inactive chat sessions purged successfully.")
                except Exception as e:
                    conn.rollback()
                    logger.error(f"[Scheduler] Error purging inactive chat sessions: {e}")
                finally:
                    conn.close()
            except Exception as e:
                logger.error(f"[Scheduler] Connection error in chat history purge loop: {e}")
                
            # Sleep for 24 hours
            time.sleep(86400)

    # Start loops as daemon threads so they exit when the main app exits
    t_tokens = threading.Thread(target=purge_tokens_loop, daemon=True, name="TokenPurgeThread")
    t_chat = threading.Thread(target=purge_chat_history_loop, daemon=True, name="ChatPurgeThread")
    
    t_tokens.start()
    t_chat.start()

if __name__ == "__main__":
    port = int(PORT) if 'PORT' in globals() else 5002
    logger.info(f"Starting Multimodal Agent server on port {port}")
    start_background_schedulers()
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
