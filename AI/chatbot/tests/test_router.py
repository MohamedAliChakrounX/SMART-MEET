import pytest
from unittest.mock import patch, MagicMock
from sql_agent.router import route_and_execute_intent

@patch("sql_agent.router.execute_rag_flow")
def test_router_defaults_to_rag(mock_execute_rag):
    """Verify that conversational questions default to RAG pipeline."""
    mock_execute_rag.return_value = {
        "response_text": "Ceci est une réponse RAG.",
        "sources": [{"meeting_id": "meet-1"}],
        "route_taken": "rag"
    }
    
    allowed_ids = ["meet-1"]
    result = route_and_execute_intent("session-123", "user-123", "Quelles ont été les décisions prises ?", allowed_ids)
    
    assert result["route_taken"] == "rag"
    assert result["response_text"] == "Ceci est une réponse RAG."
    assert result["sources"] == [{"meeting_id": "meet-1"}]
    mock_execute_rag.assert_called_once_with("session-123", "user-123", "Quelles ont été les décisions prises ?", allowed_ids)

@patch("sql_agent.router.execute_with_self_healing")
@patch("sql_agent.router.generate_chart_spec")
@patch("sql_agent.router.requests.post")
def test_router_routes_to_sql_analytics_without_chart(mock_post, mock_gen_chart, mock_self_healing):
    """Verify that quantitative questions route to sql_analytics and don't build chart if not requested."""
    # 1. Setup mocks
    mock_self_healing.return_value = {
        "status": "success",
        "sql_query": "SELECT COUNT(*) FROM view_meetings;",
        "data": [{"count": 5}],
        "retries_used": 0
    }
    
    # Mock LLM summarization response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": "Il y a eu un total de 5 réunions."
        }
    }
    mock_post.return_value = mock_response
    
    allowed_ids = ["meet-1"]
    
    # 2. Call router
    result = route_and_execute_intent("session-123", "user-123", "Combien de réunions ont eu lieu ?", allowed_ids)
    
    # 3. Assertions
    assert result["route_taken"] == "sql_analytics"
    assert result["response_text"] == "Il y a eu un total de 5 réunions."
    assert result["sql_query"] == "SELECT COUNT(*) FROM view_meetings;"
    assert result["dashboard_spec"] is None
    mock_self_healing.assert_called_once_with("session-123", "Combien de réunions ont eu lieu ?", allowed_ids)
    mock_gen_chart.assert_not_called()

@patch("sql_agent.router.execute_with_self_healing")
@patch("sql_agent.router.generate_chart_spec")
@patch("sql_agent.router.requests.post")
def test_router_routes_to_sql_analytics_with_chart(mock_post, mock_gen_chart, mock_self_healing):
    """Verify that quantitative visual questions route to sql_analytics and compile a chart spec."""
    # 1. Setup mocks
    mock_self_healing.return_value = {
        "status": "success",
        "sql_query": "SELECT project_id, total_decisions FROM view_meeting_analytics;",
        "data": [{"project_id": "P1", "total_decisions": 3}],
        "retries_used": 0
    }
    
    mock_gen_chart.return_value = {
        "type": "bar",
        "data": {"labels": ["P1"], "datasets": [{"data": [3]}]}
    }
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": "Voici le graphique des décisions par projet."
        }
    }
    mock_post.return_value = mock_response
    
    allowed_ids = ["meet-1"]
    
    # 2. Call router
    result = route_and_execute_intent(
        "session-123", "user-123", 
        "Affiche-moi le nombre de décisions par projet sous forme de graphique", 
        allowed_ids
    )
    
    # 3. Assertions
    assert result["route_taken"] == "sql_analytics"
    assert result["response_text"] == "Voici le graphique des décisions par projet."
    assert result["dashboard_spec"] == {
        "type": "bar",
        "data": {"labels": ["P1"], "datasets": [{"data": [3]}]}
    }
    mock_gen_chart.assert_called_once_with(
        [{"project_id": "P1", "total_decisions": 3}],
        "Affiche-moi le nombre de décisions par projet sous forme de graphique"
    )

@patch("sql_agent.router.execute_with_self_healing")
@patch("sql_agent.router.generate_chart_spec")
@patch("sql_agent.router.requests.post")
def test_router_routes_to_sql_analytics_with_auto_chart(mock_post, mock_gen_chart, mock_self_healing):
    """Verify that if dataset contains 2+ rows and has numeric values, a chart is generated automatically."""
    mock_self_healing.return_value = {
        "status": "success",
        "sql_query": "SELECT speaker, interventions_count FROM view_meeting_analytics;",
        "data": [
            {"speaker": "Alice", "interventions_count": 12},
            {"speaker": "Bob", "interventions_count": 8}
        ],
        "retries_used": 0
    }
    
    mock_gen_chart.return_value = {
        "type": "bar",
        "data": {"labels": ["Alice", "Bob"], "datasets": [{"data": [12, 8]}]}
    }
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": "Voici les statistiques de participation."
        }
    }
    mock_post.return_value = mock_response
    
    allowed_ids = ["meet-1"]
    
    result = route_and_execute_intent(
        "session-123", "user-123", 
        "Nombre de réunions par personne",  # No chart keywords!
        allowed_ids
    )
    
    assert result["route_taken"] == "sql_analytics"
    assert result["dashboard_spec"] is not None
    assert result["dashboard_spec"]["type"] == "bar"
    mock_gen_chart.assert_called_once()

@patch("sql_agent.router.execute_rag_flow")
@patch("sql_agent.router.update_last_assistant_message_metadata")
@patch("dashboard.generator.requests.post")
def test_router_routes_to_rag_with_auto_chart(mock_post, mock_update_metadata, mock_execute_rag):
    """Verify that if RAG response contains visualizable data patterns, a chart is generated automatically."""
    mock_execute_rag.return_value = {
        "response_text": "Voici la répartition : Alice 60% et Bob 40% de présence.",
        "sources": [{"meeting_id": "meet-1"}],
        "route_taken": "rag"
    }
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": "{\"type\": \"pie\", \"data\": {\"labels\": [\"Alice\", \"Bob\"], \"datasets\": [{\"data\": [60, 40]}]}}"
        }
    }
    mock_post.return_value = mock_response
    
    allowed_ids = ["meet-1"]
    
    result = route_and_execute_intent(
        "session-123", "user-123", 
        "Quelle est la répartition de la présence ?",  # No chart keywords!
        allowed_ids
    )
    
    assert result["route_taken"] == "rag"
    assert result["dashboard_spec"] is not None
    assert result["dashboard_spec"]["type"] == "pie"
    mock_update_metadata.assert_called_once()
