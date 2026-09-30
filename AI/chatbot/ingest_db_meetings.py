import os
import sys
import json
import psycopg2

# Inject chatbot directory into sys.path to allow imports from local packages
chatbot_dir = os.path.abspath(os.path.dirname(__file__))
if chatbot_dir not in sys.path:
    sys.path.insert(0, chatbot_dir)

from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from ingestion.chunker import chunk_meeting
from ingestion.embedder import get_embedding

def db_connect():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def format_seconds(seconds):
    if seconds is None:
        return ""
    if seconds > 100000:  # Handle milliseconds safely
        seconds = seconds // 1000
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    else:
        return f"{m:02d}:{s:02d}"

def format_summary(content):
    if not content:
        return ""
    if isinstance(content, dict):
        lines = []
        for key, val in content.items():
            if isinstance(val, list):
                lines.append(f"{key.capitalize()}:")
                for item in val:
                    lines.append(f"  - {item}")
            elif val:
                lines.append(f"{key.capitalize()}: {val}")
        return "\n".join(lines)
    elif isinstance(content, list):
        return "\n".join(f"- {item}" for item in content)
    else:
        return str(content)

def format_behavior(dynamics, speakers):
    parts = []
    if dynamics:
        parts.append(f"Dynamics: {dynamics}")
    if speakers:
        parts.append("Speakers Behavioral Profile:")
        if isinstance(speakers, dict):
            for speaker_name, profile in speakers.items():
                parts.append(f"  Speaker: {speaker_name}")
                if isinstance(profile, dict):
                    for k, v in profile.items():
                         if v:
                             k_clean = k.replace('_', ' ').capitalize()
                             parts.append(f"    {k_clean}: {v}")
                else:
                    parts.append(f"    Profile: {profile}")
    return "\n".join(parts)

def get_user_lookup(cur):
    cur.execute('SELECT id, first_name, last_name, email FROM "user";')
    rows = cur.fetchall()
    user_map = {}
    for uid, fname, lname, email in rows:
        uid_str = str(uid)
        if email:
            user_map[email.lower().strip()] = uid_str
        if fname:
            user_map[fname.lower().strip()] = uid_str
        if lname:
            user_map[lname.lower().strip()] = uid_str
        if fname and lname:
            user_map[f"{fname} {lname}".lower().strip()] = uid_str
    return user_map

def resolve_participants(participants, owner_id, user_map):
    allowed_ids = {str(owner_id)}
    if not participants:
        return list(allowed_ids)
        
    for p in participants:
        if isinstance(p, dict):
            name = p.get("name")
            email = p.get("email") or p.get("email_address")
            if email and email.lower().strip() in user_map:
                allowed_ids.add(user_map[email.lower().strip()])
            elif name and name.lower().strip() in user_map:
                allowed_ids.add(user_map[name.lower().strip()])
        elif isinstance(p, str):
            p_clean = p.lower().strip()
            if p_clean in user_map:
                allowed_ids.add(user_map[p_clean])
    return list(allowed_ids)

def run_synchronization():
    print("Starting vector synchronization...")
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            # 1. Fetch user map for permissions matching
            user_map = get_user_lookup(cur)
            print(f"Loaded {len(user_map)} user references from the database.")
            
            # 2. Fetch all active meetings
            cur.execute("""
                SELECT id, owner_id, title, status, participants, decisions, action_items 
                FROM meeting 
                WHERE deleted_at IS NULL;
            """)
            meetings = cur.fetchall()
            print(f"Found {len(meetings)} active meetings to synchronize.")
            
            # Keep track of statistics
            total_chunks = 0
            
            for idx, m_row in enumerate(meetings):
                meeting_id, owner_id, title, status, participants, decisions, action_items = m_row
                meeting_id_str = str(meeting_id)
                print(f"\n[{idx+1}/{len(meetings)}] Processing: '{title}' ({meeting_id_str})")
                
                # Fetch segments
                cur.execute("""
                    SELECT speaker, content, time_start 
                    FROM transcript_segment 
                    WHERE meeting_id = %s 
                    ORDER BY order_index ASC;
                """, (meeting_id_str,))
                segments = cur.fetchall()
                transcript_list = []
                for spk, cont, t_start in segments:
                    transcript_list.append({
                        "speaker": spk,
                        "content": cont,
                        "timestamp": format_seconds(t_start)
                    })
                
                # Fetch summary
                cur.execute("SELECT content FROM summary WHERE meeting_id = %s;", (meeting_id_str,))
                summary_row = cur.fetchone()
                summary_text = format_summary(summary_row[0]) if summary_row else ""
                
                # Fetch behavior
                cur.execute("SELECT meeting_dynamics, speakers FROM behavioral_interpretation WHERE meeting_id = %s;", (meeting_id_str,))
                behavior_row = cur.fetchone()
                behavior_text = format_behavior(behavior_row[0], behavior_row[1]) if behavior_row else ""
                
                # Build decisions & action items lists safely
                decisions_list = []
                if decisions and isinstance(decisions, list):
                    decisions_list = [str(item) for item in decisions]
                action_items_list = []
                if action_items and isinstance(action_items, list):
                    action_items_list = [str(item) for item in action_items]
                    
                # Compile chunk payload
                data = {
                    "title": title,
                    "transcript": transcript_list,
                    "summary": summary_text,
                    "decisions": decisions_list,
                    "action_items": action_items_list,
                    "behavior": behavior_text
                }
                
                # Generate chunks
                chunks = chunk_meeting(data)
                if not chunks:
                    print(f"  -> Skipping: No indexable content found.")
                    continue
                
                # Compute embeddings & match permissions
                records_to_insert = []
                allowed_ids = resolve_participants(participants, owner_id, user_map)
                
                print(f"  -> Generated {len(chunks)} chunks. Computing embeddings via Ollama...")
                for chunk in chunks:
                    content = chunk["content"]
                    chunk_type = chunk["chunk_type"]
                    
                    try:
                        embedding = get_embedding(content)
                        records_to_insert.append((
                            meeting_id_str,
                            chunk_type,
                            content,
                            embedding,
                            allowed_ids
                        ))
                    except Exception as embed_err:
                        print(f"  [ERROR] Embedding failed for chunk of type '{chunk_type}': {embed_err}")
                        # Propagate so we don't proceed with incomplete ingestion
                        raise embed_err
                
                # Perform idempotent write for this meeting
                print(f"  -> Writing {len(records_to_insert)} chunks to pgvector...")
                cur.execute("DELETE FROM meeting_chunks WHERE meeting_id = %s;", (meeting_id_str,))
                
                insert_query = """
                    INSERT INTO meeting_chunks (meeting_id, chunk_type, content, embedding, allowed_participant_ids)
                    VALUES (%s, %s, %s, %s, %s::uuid[]);
                """
                cur.executemany(insert_query, records_to_insert)
                total_chunks += len(records_to_insert)
                
            conn.commit()
            print(f"\nVector synchronization completed successfully!")
            print(f"Total meetings processed: {len(meetings)}")
            print(f"Total chunks inserted: {total_chunks}")
            
    except Exception as e:
        conn.rollback()
        print(f"\n[CRITICAL ERROR] Vector synchronization failed: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    run_synchronization()
