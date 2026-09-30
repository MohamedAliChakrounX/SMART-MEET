import re
import json
import requests
from config import OLLAMA_HOST, OLLAMA_TIMEOUT, MODEL_RAG
from rag.chain import execute_rag_flow, save_chat_message
from sql_agent.nl2sql import execute_with_self_healing
from dashboard.generator import generate_chart_spec

def should_auto_generate_chart_from_text(text: str, query: str) -> bool:
    """
    Analyzes unstructured text and query to determine if generating a dashboard is relevant.
    Avoids calling LLM on pure text/dialogue.
    """
    if not text:
        return False
        
    message_lower = query.lower()
    chart_keywords = [
        "graphique", "chart", "visualis", "dashboard", "dashbord",
        "dashboards", "dashbords", "tableau de bord", "tableaux de bord"
    ]
    if any(ckw in message_lower for ckw in chart_keywords):
        return True
        
    # Match percentage numbers (e.g. 50%, 75.5%)
    percentages = re.findall(r'\b\d+(?:[\.,]\d+)?\s*%', text)
    # Match lists with numbers (e.g. "- Alice : 10", "* Projet Beta : 8")
    list_items_with_numbers = re.findall(r'(?:[-*•]|\d+\.)\s+[^:\n]+:\s*\d+', text)
    # Match parenthetical numbers with metric units (e.g. "Alice (40 min)", "Projet A (85%)")
    parenthetical_numbers = re.findall(r'\b[^(\n]+\(\s*\d+(?:\s*min|\s*h|\s*s|\s*%)\)', text)
    
    # Check if there are keywords indicating data distribution
    data_indicators = ["répartition", "statistiques", "taux de", "évolution", "comparaison des", "comparatif", "indicateurs"]
    has_indicator = any(ind in text.lower() for ind in data_indicators)
    
    # We want at least two data points to make a chart valuable
    if len(percentages) >= 2:
        return True
    if len(list_items_with_numbers) >= 2:
        return True
    if len(parenthetical_numbers) >= 2:
        return True
    if has_indicator and len(re.findall(r'\b\d+\b', text)) >= 3:
        return True
        
    return False

def update_last_assistant_message_metadata(session_id: str, metadata: dict):
    """Updates the metadata column for the last saved assistant message in the database."""
    from rag.chain import db_connect
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            metadata_json = json.dumps(metadata)
            cur.execute(
                """
                UPDATE chat_messages 
                SET metadata = %s 
                WHERE id = (
                    SELECT id 
                    FROM chat_messages 
                    WHERE session_id = %s AND role = 'assistant' 
                    ORDER BY created_at DESC 
                    LIMIT 1
                );
                """,
                (metadata_json, session_id)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[Router] Error updating chat message metadata: {e}")
    finally:
        conn.close()

def route_and_execute_intent(session_id: str, user_id: str, message: str, allowed_meeting_ids: list) -> dict:
    """
    Intelligently routes the incoming turn:
    1. If message contains quantitative/analytical keywords, routes to sql_analytics.
    2. Runs NL2SQL agent with self-healing.
    3. Generates Chart.js specification if visual chart is requested or auto-evaluated as valuable.
    4. Otherwise, falls back to conversational RAG.
    """
    analytical_keywords = [
        "statistique", "graphique", "chart", "nombre de", "combien de", 
        "total", "moyenne", "durée", "analytics", "dashboard", "dashbord",
        "dashboards", "dashbords", "tableau de bord", "tableaux de bord",
        "visualis", "répartition", "compte"
    ]
    
    is_analytical = False
    message_lower = message.lower()
    for kw in analytical_keywords:
        if kw in message_lower:
            is_analytical = True
            break
            
    if not is_analytical:
        # Route to RAG
        print(f"[Router] Routing to 'rag' for query: '{message[:60]}...'")
        rag_res = execute_rag_flow(session_id, user_id, message, allowed_meeting_ids)
        
        # Automatically evaluate relevance of RAG response for a chart
        if should_auto_generate_chart_from_text(rag_res["response_text"], message):
            print("[Router] Auto-evaluation: RAG response contains visualizable data. Compiling Chart.js specification...")
            try:
                from dashboard.generator import generate_chart_spec_from_text
                dash_spec = generate_chart_spec_from_text(rag_res["response_text"], message)
                if dash_spec:
                    rag_res["dashboard_spec"] = dash_spec
                    new_metadata = {"sources": rag_res.get("sources", []), "dashboard_config": dash_spec}
                    update_last_assistant_message_metadata(session_id, new_metadata)
            except Exception as e:
                print(f"[Router] Failed to generate dashboard from direct RAG response: {e}")
        return rag_res
        
    print(f"[Router] Routing to 'sql_analytics' for query: '{message[:60]}...'")
    
    # Execute SQL agent with self-healing
    sql_res = execute_with_self_healing(session_id, message, allowed_meeting_ids)
    
    if sql_res["status"] == "error":
        print(f"[Router] SQL agent execution failed: {sql_res['error']}. Falling back to RAG...")
        # Graceful resilience: fall back to RAG
        rag_res = execute_rag_flow(session_id, user_id, message, allowed_meeting_ids)
        
        # Check if RAG response contains visualizable data
        if should_auto_generate_chart_from_text(rag_res["response_text"], message):
            print("[Router] Attempting to generate Dashboard from RAG text fallback...")
            try:
                from dashboard.generator import generate_chart_spec_from_text
                dash_spec = generate_chart_spec_from_text(rag_res["response_text"], message)
                if dash_spec:
                    rag_res["dashboard_spec"] = dash_spec
                    new_metadata = {"sources": rag_res.get("sources", []), "dashboard_config": dash_spec}
                    update_last_assistant_message_metadata(session_id, new_metadata)
            except Exception as e:
                print(f"[Router] Failed to generate dashboard from RAG text: {e}")
                
        return rag_res
        
    dataset = sql_res["data"]
    sql_query = sql_res["sql_query"]
    
    # Check if a chart was explicitly requested
    chart_keywords = [
        "graphique", "chart", "visualis", "dashboard", "dashbord",
        "dashboards", "dashbords", "tableau de bord", "tableaux de bord"
    ]
    wants_chart = any(ckw in message_lower for ckw in chart_keywords)
    
    # Auto-eval criteria:
    # 1. Dataset is not empty
    # 2. Dataset has at least 2 rows
    # 3. Dataset contains at least one numeric field and at least one string/date field
    is_auto_pertinent = False
    if not wants_chart:
        if dataset and len(dataset) >= 2:
            has_numeric = False
            first_row = dataset[0]
            for key, val in first_row.items():
                if isinstance(val, (int, float)) and not isinstance(val, bool):
                    has_numeric = True
                    break
            if has_numeric:
                is_auto_pertinent = True
                print(f"[Router] Auto-evaluation: dataset has {len(dataset)} rows with numeric columns. Generating dashboard automatically.")
    
    dashboard_spec = None
    if wants_chart or is_auto_pertinent:
        print("[Router] Compiling Chart.js specification...")
        dashboard_spec = generate_chart_spec(dataset, message)
        
    # Generate Natural Language summary of the quantitative results in French
    print("[Router] Generating natural language summary for SQL dataset...")
    summary_text = generate_dataset_summary(message, dataset)
    
    # Save the turn to conversation database
    save_chat_message(session_id, user_id, "user", message)
    meta_payload = {}
    if dashboard_spec:
        meta_payload["dashboard_config"] = dashboard_spec
    save_chat_message(session_id, user_id, "assistant", summary_text, metadata=meta_payload)
    
    return {
        "session_id": session_id,
        "conversation_id": session_id,
        "response_text": summary_text,
        "route_taken": "sql_analytics",
        "sql_query": sql_query,
        "dashboard_spec": dashboard_spec,
        "sources": [],
        "warning": None
    }

def generate_dataset_summary(user_query: str, dataset: list) -> str:
    """
    Calls MODEL_RAG to summarize the quantitative dataset retrieved from PostgreSQL.
    """
    system_prompt = (
        "Tu es un agent conversationnel d'entreprise expert en analyse de données.\n"
        "On te fournit la question d'un utilisateur et les données réelles récupérées en base.\n"
        "Rédige une réponse claire, concise et professionnelle.\n"
        "RÉPONDS TOUJOURS EN FRANÇAIS.\n"
        "Synthétise précisément les données sans inventer de faits."
    )
    
    user_content = (
        f"Question utilisateur: {user_query}\n\n"
        f"Données brutes SQL:\n{dataset}"
    )
    
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": MODEL_RAG,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()
        return response.json()["message"]["content"].strip()
    except Exception as e:
        print(f"[Router] Summary generation failed: {e}. Using fallback layout.")
        # Rule-based fallback summary if Ollama fails
        if not dataset:
            return "Aucune donnée trouvée pour répondre à votre question."
        return f"Voici les résultats bruts de votre requête analytique :\n{dataset}"
