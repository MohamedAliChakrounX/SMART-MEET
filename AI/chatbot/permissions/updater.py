import psycopg2
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from permissions.resolver import clear_resolver_cache

def db_connect():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def update_meeting_participant_metadata(meeting_id: str, participant_ids: list) -> bool:
    """
    Directly updates the allowed_participant_ids array metadata on meeting_chunks in <100ms.
    Does not run any embedding or re-chunking.
    """
    allowed_ids = list(set([str(pid) for pid in participant_ids]))
    
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE meeting_chunks 
                SET allowed_participant_ids = %s 
                WHERE meeting_id = %s;
                """,
                (allowed_ids, meeting_id)
            )
            
            # Check if any rows were affected
            rowcount = cur.rowcount
            
        conn.commit()
        # Invalidate resolver cache immediately
        clear_resolver_cache()
        return rowcount > 0
        
    except Exception as e:
        conn.rollback()
        print(f"[PermissionsUpdater] Error updating meeting participant metadata: {e}")
        raise e
    finally:
        conn.close()
