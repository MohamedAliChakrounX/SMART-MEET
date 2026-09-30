import json
import psycopg2
from cachetools import TTLCache

from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# Initialize cache with max size 1024 and 60-second TTL
_permissions_cache = TTLCache(maxsize=1024, ttl=60)

def db_connect():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def clear_resolver_cache(user_id=None):
    """Utility function to clear cache (e.g. after database updates or permissions changes)."""
    if user_id:
        _permissions_cache.pop(str(user_id), None)
    else:
        _permissions_cache.clear()

def get_allowed_meeting_ids(user):
    """
    Resolves the list of meeting UUID strings that the user is authorized to access.
    Caches the list for 60 seconds (TTL) in memory.
    """
    user_id = str(user["id"])
    
    # 1. Check cache
    if user_id in _permissions_cache:
        return _permissions_cache[user_id]
        
    allowed_ids = []
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            # 2. Check if user is ROLE_ADMIN or has 'view_all' permission key
            cur.execute(
                """
                SELECT 1 
                FROM "user" u
                LEFT JOIN user_permission up ON u.id = up.user_id
                LEFT JOIN permission p ON up.permission_id = p.id
                WHERE u.id = %s AND (
                    u.roles::jsonb @> '["ROLE_ADMIN"]'::jsonb OR p.key = 'view_all'
                )
                LIMIT 1;
                """,
                (user_id,)
            )
            is_unrestricted = cur.fetchone() is not None
            
            if is_unrestricted:
                # User has global view rights: get all meetings that are not soft-deleted
                cur.execute("SELECT id FROM meeting WHERE deleted_at IS NULL;")
                allowed_ids = [str(row[0]) for row in cur.fetchall()]
            else:
                # User has restricted access: check owner, participant list, or project team linking
                user_email = user.get("email")
                team_id = user.get("team_id")
                
                # Format email as JSON array for JSONB containment operator
                email_json = json.dumps([user_email]) if user_email else "[]"
                
                cur.execute(
                    """
                    SELECT m.id 
                    FROM meeting m
                    WHERE m.deleted_at IS NULL AND (
                        m.owner_id = %s
                        OR m.participants::jsonb @> %s
                        OR (m.project_id IS NOT NULL AND %s::uuid IN (
                            SELECT team_id FROM project_team WHERE project_id = m.project_id
                        ))
                    );
                    """,
                    (user_id, email_json, team_id if team_id else None)
                )
                allowed_ids = [str(row[0]) for row in cur.fetchall()]
                
    except Exception as e:
        print(f"[PermissionsResolver] Error resolving permissions: {e}")
        # In case of DB exception, return empty array to fail-safe (Security by Default)
        allowed_ids = []
    finally:
        conn.close()
        
    # 3. Save to cache
    _permissions_cache[user_id] = allowed_ids
    return allowed_ids
