# Interactive CLI Chat Client
# Allows real-time interaction with the local Multimodal Conversational Agent.

import os
import sys
import uuid
import time
import requests

# Set path bootstrap to resolve chatbot packages
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sql_agent.router import route_and_execute_intent
from api.auth import db_connect
from config import OLLAMA_HOST, MODEL_RAG, MODEL_SQL

def check_ollama():
    """Checks if Ollama service is active and responsive."""
    print("Checking Ollama local service...")
    try:
        res = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=3)
        if res.status_code == 200:
            print(f"[OK] Ollama is active on {OLLAMA_HOST}")
            models = [m["name"] for m in res.json().get("models", [])]
            print(f"[Info] Installed models: {', '.join(models)}")
            return True
    except Exception as e:
        print(f"[Warning] Could not contact Ollama on {OLLAMA_HOST}: {e}")
        print("Please make sure Ollama is running ('ollama serve').")
        return False

def get_db_meetings():
    """Fetches meeting IDs from the database to automatically authorize them."""
    try:
        conn = db_connect()
        with conn.cursor() as cur:
            cur.execute("SELECT id, title FROM meeting LIMIT 50;")
            rows = cur.fetchall()
            conn.close()
            return rows
    except Exception as e:
        print(f"[Info] Note: Could not query 'meeting' table: {e}")
        return []

def main():
    print("=" * 60)
    print("      MULTIMODAL MEETING AGENT - INTERACTIVE CHAT CLIENT      ")
    print("=" * 60)
    
    check_ollama()
    
    # 1. Fetch allowed meeting IDs
    meetings = get_db_meetings()
    if meetings:
        print(f"\n[Security] Found {len(meetings)} meetings in your local database:")
        for m_id, m_title in meetings[:5]:
            print(f"  - {m_title} (ID: {m_id})")
        allowed_ids = [str(m[0]) for m in meetings]
    else:
        print("\n[Security] No meetings found in local database or connection skipped.")
        print("Creating mock allowed ID for testing...")
        allowed_ids = ["00000000-0000-0000-0000-000000000000"]
        
    session_id = str(uuid.uuid4())
    mock_user_id = "019d485a-e7c0-797b-acd2-2b0ddc6c7bac"
    
    print("\nChatbot initialized. Type your questions (Type 'exit' to quit).")
    print("-" * 60)
    
    while True:
        try:
            prompt = input("\nVous > ").strip()
            if not prompt:
                continue
            if prompt.lower() in ("exit", "quit", "q"):
                print("Goodbye!")
                break
                
            print("\n[Agent] Inférence locale en cours...")
            t0 = time.perf_counter()
            
            # Execute the conversational routing pipeline
            res = route_and_execute_intent(
                session_id=session_id,
                user_id=mock_user_id,
                message=prompt,
                allowed_meeting_ids=allowed_ids
            )
            
            duration = round(time.perf_counter() - t0, 2)
            
            print(f"\n[Agent] (Route: {res['route_taken']} | Temps: {duration}s)")
            print(f"\nAssistant > {res['response_text']}")
            
            if res.get("sql_query"):
                print(f"\n[SQL exécuté] : {res['sql_query']}")
                
            if res.get("dashboard_spec"):
                print(f"\n[Graphique généré] : Spécification Chart.js compilée !")
                import json
                print(json.dumps(res["dashboard_spec"], indent=2, ensure_ascii=False))
                
            print("-" * 60)
            
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as err:
            print(f"\n[Erreur] Une exception est survenue : {err}")

if __name__ == "__main__":
    main()
