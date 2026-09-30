import jwt
import psycopg2
from functools import wraps
from flask import request, jsonify, g
import os
import time

from config import JWT_PUBLIC_KEY_PATH, JWT_ALGORITHM, JWT_SECRET_KEY, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# Cache public key content in memory to avoid reading from disk on every request
_cached_public_key = None

def get_public_key():
    global _cached_public_key
    if _cached_public_key is not None:
        return _cached_public_key
        
    if os.path.exists(JWT_PUBLIC_KEY_PATH):
        try:
            with open(JWT_PUBLIC_KEY_PATH, "r", encoding="utf-8") as f:
                _cached_public_key = f.read()
                return _cached_public_key
        except Exception as e:
            print(f"[Auth] Error reading public key file: {e}")
            
    return None

def db_connect():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def decode_token(token):
    """
    Decodes and validates a JWT token.
    Supports RS256 using the public key, and falls back to HS256 for testing/dev environments.
    """
    # 1. Determine key and algorithm
    public_key = get_public_key()
    if public_key and JWT_ALGORITHM == "RS256":
        key = public_key
        algorithms = ["RS256"]
        print("[Auth] Decoding token using RS256 with public key")
    else:
        # Fallback to HS256/symmetric key for testing or fallback configurations
        key = JWT_SECRET_KEY
        algorithms = ["HS256", "RS256"]
        print(f"[Auth] Decoding token using fallback key (HS256/RS256). Public key found: {public_key is not None}")
        
    try:
        # Allow options to be permissive on clock drift if needed (leeway of 10 seconds)
        payload = jwt.decode(token, key, algorithms=algorithms, options={"require": ["exp"]})
        return payload
    except jwt.ExpiredSignatureError as e:
        print(f"[Auth] Token expired error: {e}")
        raise ValueError("Token has expired.")
    except jwt.InvalidTokenError as e:
        print(f"[Auth] Invalid token error: {e}")
        raise ValueError(f"Invalid token: {str(e)}")

def verify_jti_not_denylisted(jti):
    """Checks if the token JTI is in the denylist table."""
    if not jti:
        return True
        
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM token_denylist WHERE jti = %s LIMIT 1;", (jti,))
            result = cur.fetchone()
            if result:
                return False  # Denylisted
    finally:
        conn.close()
    return True

def get_user_from_db(username_or_email):
    """Retrieves user profile from PostgreSQL."""
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            # Query by email since Symfony uses email as user identifier/username
            cur.execute(
                """
                SELECT id, email, roles, team_id, is_active 
                FROM "user" 
                WHERE email = %s AND is_active = TRUE AND deleted_at IS NULL
                LIMIT 1;
                """,
                (username_or_email,)
            )
            res = cur.fetchone()
            if res:
                return {
                    "id": str(res[0]),
                    "email": res[1],
                    "roles": res[2],
                    "team_id": str(res[3]) if res[4] else None
                }
    finally:
        conn.close()
    return None

def token_required(f):
    """Decorator to require a valid authenticated token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check Authorization header
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                
        if not token:
            print("[Auth] Authorization token is missing in headers.")
            return jsonify({"error": "Authorization token is missing."}), 401
            
        try:
            # Decode token
            payload = decode_token(token)
            
            # Check JTI denylist
            jti = payload.get("jti")
            if jti and not verify_jti_not_denylisted(jti):
                print(f"[Auth] Token has been revoked. jti: {jti}")
                return jsonify({"error": "Token has been revoked."}), 401
                
            # Find username/email in payload
            username = payload.get("username") or payload.get("email") or payload.get("sub")
            if not username:
                print(f"[Auth] Invalid token payload: user identifier missing. Keys: {list(payload.keys())}")
                return jsonify({"error": "Invalid token payload: user identifier missing."}), 401
                
            # Fetch user from DB
            user = get_user_from_db(username)
            if not user:
                print(f"[Auth] Active user '{username}' associated with this token is not found or not active in database.")
                return jsonify({"error": "User associated with this token is not active or not found."}), 401
                
            # Assign user to Flask context g
            g.user = user
            g.token_payload = payload
            g.token_jti = jti
            
        except ValueError as e:
            print(f"[Auth] ValueError during authentication: {e}")
            return jsonify({"error": str(e)}), 401
        except Exception as e:
            print(f"[Auth] Exception during authentication: {e}")
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401
            
        return f(*args, **kwargs)
        
    return decorated

def admin_required(f):
    """Decorator to require ROLE_ADMIN role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, "user") or not g.user:
            return jsonify({"error": "Unauthorized."}), 401
            
        roles = g.user.get("roles", [])
        if "ROLE_ADMIN" not in roles:
            return jsonify({"error": "Forbidden: Administrator privileges required."}), 403
            
        return f(*args, **kwargs)
    return decorated
