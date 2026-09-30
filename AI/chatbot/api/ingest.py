from flask import Blueprint, request, jsonify, g
import psycopg2

from api.auth import token_required, admin_required, db_connect
from ingestion.chunker import chunk_meeting
from ingestion.embedder import get_embedding
from permissions.resolver import clear_resolver_cache

from permissions.updater import update_meeting_participant_metadata

ingest_bp = Blueprint("ingest", __name__, url_prefix="/api/admin")

@ingest_bp.route("/ingest", methods=["POST"])
@token_required
@admin_required
def ingest_meeting():
    """
    Ingests and indexes a new meeting.
    Runs chunking, embeds the text using qwen3-embedding, 
    and inserts chunks with allowed participants metadata into pgvector.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON request body."}), 400
        
    # Validate required fields
    required_fields = ["meeting_id", "title", "date", "duration", "project_id", "owner_id", "participant_ids", "transcript"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing mandatory field: {field}"}), 400
            
    meeting_id = data["meeting_id"]
    owner_id = data["owner_id"]
    participant_ids = data["participant_ids"]
    
    # Unify participant list (ensure strings/UUIDs and include owner)
    allowed_ids = list(set([str(pid) for pid in participant_ids] + [str(owner_id)]))
    
    try:
        # 1. Generate semantic chunks
        chunks = chunk_meeting(data)
        if not chunks:
            return jsonify({"error": "No indexable content found in meeting (empty transcript, summary, and decisions)."}), 400
            
        # 2. Compute embeddings for each chunk
        records_to_insert = []
        for chunk in chunks:
            content = chunk["content"]
            chunk_type = chunk["chunk_type"]
            
            # Call Ollama local embedding generator
            embedding = get_embedding(content)
            
            records_to_insert.append((
                meeting_id,
                chunk_type,
                content,
                embedding,
                allowed_ids
            ))
            
        # 3. Write to PostgreSQL using a transaction
        conn = db_connect()
        try:
            with conn.cursor() as cur:
                # Make ingestion idempotent: delete existing chunks for this meeting
                cur.execute("DELETE FROM meeting_chunks WHERE meeting_id = %s;", (meeting_id,))
                
                # Batch insert
                insert_query = """
                    INSERT INTO meeting_chunks (meeting_id, chunk_type, content, embedding, allowed_participant_ids)
                    VALUES (%s, %s, %s, %s, %s);
                """
                cur.executemany(insert_query, records_to_insert)
                
            conn.commit()
        except Exception as db_err:
            conn.rollback()
            raise db_err
        finally:
            conn.close()
            
        # 4. Invalidate resolver cache so permission changes take effect immediately
        clear_resolver_cache()
        
        return jsonify({
            "status": "success",
            "meeting_id": meeting_id,
            "chunks_inserted": len(records_to_insert)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Ingestion failed: {str(e)}"}), 500


@ingest_bp.route("/permissions", methods=["PUT"])
@token_required
@admin_required
def update_permissions():
    """
    Instantly updates allowed participant user IDs for a meeting in meeting_chunks metadata.
    This runs in <100ms as it doesn't modify or recompute vector embeddings.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON request body."}), 400
        
    if "meeting_id" not in data or "participant_ids" not in data:
        return jsonify({"error": "Fields 'meeting_id' and 'participant_ids' are required."}), 400
        
    meeting_id = data["meeting_id"]
    participant_ids = data["participant_ids"]
    
    try:
        updated = update_meeting_participant_metadata(meeting_id, participant_ids)
        if not updated:
            return jsonify({"error": f"Meeting '{meeting_id}' not found in the local index."}), 404
            
        return jsonify({
            "status": "success",
            "message": "Permissions metadata synced successfully."
        }), 200
    except Exception as e:
        return jsonify({"error": f"Permissions update failed: {str(e)}"}), 500

