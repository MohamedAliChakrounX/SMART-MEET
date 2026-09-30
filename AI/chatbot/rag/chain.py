import json
import requests
import psycopg2
from config import OLLAMA_HOST, OLLAMA_TIMEOUT, MODEL_RAG, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from rag.retriever import SecurePgVectorRetriever

def db_connect():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def save_chat_message(session_id: str, user_id: str, role: str, content: str, metadata: dict = None, audio_b64: str = None):
    """Persists a single chat turn in the chat_messages table."""
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            metadata_json = json.dumps(metadata) if metadata else None
            cur.execute(
                """
                INSERT INTO chat_messages (session_id, user_id, role, content, metadata, audio_b64)
                VALUES (%s, %s, %s, %s, %s, %s);
                """,
                (session_id, user_id, role, content, metadata_json, audio_b64)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[Chain] Error saving chat message: {e}")
    finally:
        conn.close()

def get_sliding_chat_history(session_id: str) -> list:
    """Retrieves the latest 10 messages for a session in chronological order."""
    conn = db_connect()
    history = []
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT role, content 
                FROM (
                    SELECT role, content, created_at 
                    FROM chat_messages 
                    WHERE session_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 10
                ) sub
                ORDER BY created_at ASC;
                """,
                (session_id,)
            )
            rows = cur.fetchall()
            for r in rows:
                history.append({"role": r[0], "content": r[1]})
    except Exception as e:
        print(f"[Chain] Error getting chat history: {e}")
    finally:
        conn.close()
    return history

def execute_rag_flow(session_id: str, user_id: str, message: str, allowed_meeting_ids: list) -> dict:
    """
    Executes the conversational RAG pipeline:
    1. Retrieves relevant vector chunks with permission checks
    2. Loads sliding chat history (k=10)
    3. Triggers local llama3.1 LLM with strict 40s timeout
    4. Saves conversation turns to database
    """
    # 1. Retrieve relevant contexts
    retriever = SecurePgVectorRetriever(allowed_meeting_ids=allowed_meeting_ids, k=4)
    docs = retriever.invoke(message)
    
    context_parts = []
    sources_dict = {}
    for d in docs:
        context_parts.append(d.page_content)
        # Extract metadata
        meeting_id = d.metadata.get("meeting_id")
        meeting_title = d.metadata.get("meeting_title")
        chunk_type = d.metadata.get("chunk_type")
        similarity = d.metadata.get("similarity")
        
        # Keep only unique meetings, keeping the one with the highest similarity score
        if meeting_id not in sources_dict or similarity > sources_dict[meeting_id]["similarity"]:
            sources_dict[meeting_id] = {
                "meeting_id": meeting_id,
                "meeting_title": meeting_title,
                "chunk_type": chunk_type,
                "similarity": similarity
            }
            
    sources = list(sources_dict.values())
        
    context_str = "\n\n---\n\n".join(context_parts) if context_parts else "Aucun document pertinent trouvé."
    
    # 2. Build RAG system message
    system_prompt = (
        "Tu es un agent conversationnel multimodal d'entreprise intelligent. Tu as accès aux transcriptions et analyses de réunions.\n"
        "Réponds de manière claire, concise et professionnelle.\n"
        "RÉPONDS TOUJOURS EN FRANÇAIS.\n"
        "Utilise UNIQUEMENT le contexte suivant pour répondre aux questions de l'utilisateur. Si la réponse n'est pas dans le contexte, dis-le poliment.\n\n"
        f"--- CONTEXTE DES RÉUNIONS ---\n{context_str}\n---------------------------"
    )
    
    # 3. Retrieve sliding chat history
    history = get_sliding_chat_history(session_id)
    
    # Assemble messages for Ollama API
    ollama_messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        ollama_messages.append({"role": h["role"], "content": h["content"]})
    ollama_messages.append({"role": "user", "content": message})
    
    # 4. Invoke local Ollama RAG model with strict timeout
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": MODEL_RAG,
        "messages": ollama_messages,
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        
        assistant_content = data["message"]["content"].strip()
        
        # Save messages to history
        save_chat_message(session_id, user_id, "user", message)
        save_chat_message(session_id, user_id, "assistant", assistant_content, metadata={"sources": sources})
        
        return {
            "session_id": session_id,
            "response_text": assistant_content,
            "route_taken": "rag",
            "sources": sources,
            "warning": None
        }
        
    except requests.exceptions.Timeout:
        raise TimeoutError("Ollama local inference service timeout (exceeded 40s). Please verify that Ollama is running local models.")
    except Exception as e:
        raise ConnectionError(f"Error communicating with local LLM: {str(e)}")
