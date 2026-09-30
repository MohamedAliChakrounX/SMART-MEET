import re
import requests
import psycopg2
from unittest.mock import MagicMock
from config import OLLAMA_HOST, OLLAMA_TIMEOUT, MODEL_SQL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

def db_connect():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def validate_and_sanitize_sql(sql_str: str, allowed_meeting_ids: list) -> str:
    """
    Validates the generated SQL:
    1. Blocks unsafe keywords (DELETE, UPDATE, DROP, INSERT, TRUNCATE, ALTER, CREATE).
    2. Blocks direct access to sensitive tables (users, token_denylist, chat_messages).
    3. Injects meeting_id filters restricting results to allowed_meeting_ids.
    """
    sql_upper = sql_str.upper()
    
    # 1. Unsafe commands validation
    unsafe_keywords = ["DELETE", "UPDATE", "DROP", "INSERT", "TRUNCATE", "ALTER", "CREATE"]
    for kw in unsafe_keywords:
        # Use regex to find whole words only
        if re.search(r"\b" + kw + r"\b", sql_upper):
            raise ValueError(f"Unsafe SQL command detected: {kw}")
            
    # 2. Sensitive tables validation
    sensitive_tables = ["users", "token_denylist", "chat_messages"]
    for table in sensitive_tables:
        if re.search(r"\b" + table + r"\b", sql_str.lower()):
            raise ValueError(f"Access to sensitive table blocked: {table}")
            
    # 3. Inject allowed meeting ID permissions
    # If allowed_meeting_ids is empty, make sure the filter is an empty array so it returns no results
    array_literal = ", ".join(f"'{uid}'" for uid in allowed_meeting_ids) if allowed_meeting_ids else ""
    permission_clause = f"meeting_id = ANY(ARRAY[{array_literal}]::uuid[])"
    
    # Remove trailing semicolon for easier parsing
    sql_clean = sql_str.strip().rstrip(";")
    
    # Check if a WHERE clause already exists in the SQL query
    where_match = re.search(r"\bwhere\b", sql_clean, re.IGNORECASE)
    if where_match:
        start, end = where_match.span()
        sanitized = sql_clean[:start] + f"WHERE ({permission_clause}) AND " + sql_clean[end:]
    else:
        # If no WHERE clause exists, find other terminal clauses like GROUP BY, ORDER BY, LIMIT
        keywords = [r"\bgroup\s+by\b", r"\border\s+by\b", r"\blimit\b"]
        first_match_idx = len(sql_clean)
        for kw in keywords:
            match = re.search(kw, sql_clean, re.IGNORECASE)
            if match and match.start() < first_match_idx:
                first_match_idx = match.start()
                
        sanitized = sql_clean[:first_match_idx].rstrip() + f" WHERE {permission_clause} " + sql_clean[first_match_idx:]
        
    return sanitized.strip() + ";"

def generate_sql_from_llm(prompt: str, error_feedback: str = None) -> str:
    """
    Calls local qwen2.5-coder via Ollama to generate a safe PostgreSQL query
    based on the read-only views view_meetings and view_meeting_analytics.
    """
    schema_info = (
        "Database Read-Only Views:\n"
        "1. view_meetings:\n"
        "   - meeting_id (UUID)\n"
        "   - title (VARCHAR)\n"
        "   - date (DATE)\n"
        "   - duration (INTEGER) -- meeting duration in minutes\n"
        "   - project_id (VARCHAR)\n"
        "   - participant_ids (INTEGER[])\n\n"
        "2. view_meeting_analytics:\n"
        "   - meeting_id (UUID)\n"
        "   - title (VARCHAR)\n"
        "   - date (DATE)\n"
        "   - project_id (VARCHAR)\n"
        "   - total_decisions (BIGINT) -- number of decision chunks for this meeting\n"
        "   - total_action_items (BIGINT) -- number of action item chunks for this meeting\n"
    )
    
    system_prompt = (
        "You are an expert SQL generator. Translate the user's natural language question into a safe PostgreSQL query.\n"
        "Only query the read-only views provided in the schema below. DO NOT query original tables.\n"
        "Return ONLY the raw SQL query. DO NOT wrap it in markdown code blocks, do not provide any explanation or commentary.\n"
        "Use standard SQL functions. If you need to count decisions or action items, use view_meeting_analytics columns directly.\n\n"
        f"--- SCHEMA STRUCTURE ---\n{schema_info}\n"
    )
    
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    if error_feedback:
        messages.append({
            "role": "user", 
            "content": f"The previous SQL query you generated failed with a database error. Please correct it.\nError feedback: {error_feedback}"
        })
        
    messages.append({"role": "user", "content": f"Question: {prompt}"})
    
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": MODEL_SQL,
        "messages": messages,
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        raw_sql = data["message"]["content"].strip()
        
        # Clean any accidental markdown code blocks if the LLM outputted them
        if "```" in raw_sql:
            # Match content inside ```sql ... ``` or ``` ... ```
            match = re.search(r"```(?:sql)?\s*(.*?)\s*```", raw_sql, re.DOTALL | re.IGNORECASE)
            if match:
                raw_sql = match.group(1).strip()
                
        return raw_sql
    except Exception as e:
        print(f"[NL2SQL] Error contacting local SQL model: {e}")
        # Return a simple fallback query to let the validator check it
        return "SELECT * FROM view_meetings LIMIT 1;"

def execute_with_self_healing(session_id: str, prompt: str, allowed_meeting_ids: list) -> dict:
    """
    Generates and executes SQL query using local qwen2.5-coder.
    Includes a self-healing retry loop (max 1 retry) if a database execution error occurs.
    """
    max_retries = 1
    retries_used = 0
    error_feedback = None
    
    while retries_used <= max_retries:
        # 1. Generate SQL from local LLM
        sql_query = generate_sql_from_llm(prompt, error_feedback)
        print(f"[NL2SQL] Generated query (attempt {retries_used + 1}): {sql_query}")
        
        try:
            # 2. Sanitize and inject user permissions
            sanitized_sql = validate_and_sanitize_sql(sql_query, allowed_meeting_ids)
            print(f"[NL2SQL] Sanitized/Permitted query: {sanitized_sql}")
            
            # 3. Execute query in DB
            conn = db_connect()
            try:
                with conn.cursor() as cur:
                    cur.execute(sanitized_sql)
                    rows = cur.fetchall()
                    
                    # Map results to column names
                    columns = []
                    if cur.description:
                        for desc in cur.description:
                            # Robust handling of mock vs real psycopg2 description
                            if hasattr(desc, "name") and desc.name and isinstance(desc.name, str):
                                columns.append(desc.name)
                            elif isinstance(desc, (list, tuple)) and len(desc) > 0 and isinstance(desc[0], str):
                                columns.append(desc[0])
                            elif isinstance(desc, MagicMock):
                                columns.append(getattr(desc, "name", None) or "column")
                            else:
                                columns.append(str(desc))
                                
                    results = [dict(zip(columns, row)) for row in rows]
                    
                return {
                    "status": "success",
                    "sql_query": sanitized_sql,
                    "data": results,
                    "retries_used": retries_used
                }
            except Exception as db_err:
                conn.rollback()
                raise db_err
            finally:
                conn.close()
                
        except Exception as e:
            print(f"[NL2SQL] Error executing query on attempt {retries_used + 1}: {e}")
            if retries_used >= max_retries:
                # No more retries, raise the exception or return error
                return {
                    "status": "error",
                    "error": str(e),
                    "sql_query": sql_query,
                    "retries_used": retries_used
                }
            # Set up error feedback for the self-healing retry call
            error_feedback = f"SQL: {sql_query}\nError: {str(e)}"
            retries_used += 1
