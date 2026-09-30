import pytest
from unittest.mock import patch, MagicMock
from app import app

@patch("api.chat.get_allowed_meeting_ids")
@patch("sql_agent.router.route_and_execute_intent")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_chat_timeout_global_handler(mock_get_user, mock_verify_jti, mock_decode, mock_route_intent, mock_get_allowed):
    """Verify that when route_and_execute_intent raises TimeoutError, the global error handler catches it and returns 408 + guidance."""
    # 1. Setup mock authentication (normal user)
    mock_get_user.return_value = {
        "id": "user-123",
        "email": "user@sfm.com",
        "roles": ["ROLE_USER"],
        "team_id": "team-123"
    }
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    
    # 2. Setup router execution to raise TimeoutError
    mock_route_intent.side_effect = TimeoutError("Ollama local inference service timeout (exceeded 40s).")
    mock_get_allowed.return_value = ["meeting-123"]
    
    client = app.test_client()
    
    # 3. Perform POST request
    response = client.post(
        "/api/chat",
        headers={"Authorization": "Bearer mock-user-token"},
        json={"message": "What is the sprint status?", "session_id": "session-123"}
    )
    
    # 4. Assertions
    assert response.status_code == 408
    data = response.get_json()
    assert "Ollama local inference service timeout" in data["error"]
    assert "guidance" in data
    assert "Verify that Ollama is currently running" in data["guidance"]


@patch("api.chat.get_allowed_meeting_ids")
@patch("sql_agent.router.route_and_execute_intent")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_chat_connection_global_handler(mock_get_user, mock_verify_jti, mock_decode, mock_route_intent, mock_get_allowed):
    """Verify that when route_and_execute_intent raises ConnectionError, the global error handler catches it and returns 503 + guidance."""
    # 1. Setup mock authentication (normal user)
    mock_get_user.return_value = {
        "id": "user-123",
        "email": "user@sfm.com",
        "roles": ["ROLE_USER"],
        "team_id": "team-123"
    }
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    
    # 2. Setup router execution to raise ConnectionError
    mock_route_intent.side_effect = ConnectionError("Could not connect to local Ollama service.")
    mock_get_allowed.return_value = ["meeting-123"]
    
    client = app.test_client()
    
    # 3. Perform POST request
    response = client.post(
        "/api/chat",
        headers={"Authorization": "Bearer mock-user-token"},
        json={"message": "What is the sprint status?", "session_id": "session-123"}
    )
    
    # 4. Assertions
    assert response.status_code == 503
    data = response.get_json()
    assert "Failed to connect to local Ollama service" in data["error"]
    assert "guidance" in data
    assert "Verify Ollama is running" in data["guidance"]
