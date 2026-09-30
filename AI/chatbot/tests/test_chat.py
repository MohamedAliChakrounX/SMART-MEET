import json
import pytest
import io
from unittest.mock import patch, MagicMock
from app import app

@pytest.fixture
def mock_auth_user():
    return {
        "id": "user-123",
        "email": "user@sfm.com",
        "roles": ["ROLE_USER"],
        "team_id": "team-123"
    }

@pytest.fixture
def mock_auth_admin():
    return {
        "id": "admin-123",
        "email": "admin@sfm.com",
        "roles": ["ROLE_ADMIN"],
        "team_id": "team-123"
    }

@patch("api.chat.get_allowed_meeting_ids")
@patch("sql_agent.router.route_and_execute_intent")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_chat_turn_json_success(mock_get_user, mock_verify_jti, mock_decode, mock_route_intent, mock_get_allowed, mock_auth_user):
    """Verify that a standard JSON POST request to /api/chat works properly."""
    # 1. Setup mocks
    mock_get_user.return_value = mock_auth_user
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    
    mock_route_intent.return_value = {
        "session_id": "session-123",
        "response_text": "Voici la réponse sémantique.",
        "route_taken": "rag",
        "sources": [{"meeting_id": "meeting-123", "chunk_type": "transcript", "similarity": 0.82}],
        "warning": None
    }
    mock_get_allowed.return_value = ["meeting-123"]
    
    client = app.test_client()
    
    # 2. Call endpoint
    response = client.post(
        "/api/chat",
        headers={"Authorization": "Bearer mock-user-token"},
        json={
            "message": "Bonjour",
            "session_id": "session-123"
        }
    )
    
    # 3. Assertions
    assert response.status_code == 200
    data = response.get_json()
    assert data["session_id"] == "session-123"
    assert data["response_text"] == "Voici la réponse sémantique."
    assert data["route_taken"] == "rag"
    assert len(data["sources"]) == 1
    assert data["sources"][0]["meeting_id"] == "meeting-123"
    assert data["audio_b64"] is None


@patch("api.chat.get_allowed_meeting_ids")
@patch("sql_agent.router.route_and_execute_intent")
@patch("api.chat.transcribe_audio")
@patch("api.chat.synthesize_text_to_audio")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_chat_turn_multipart_voice_success(
    mock_get_user, mock_verify_jti, mock_decode, 
    mock_synthesize, mock_transcribe, mock_route_intent, mock_get_allowed, mock_auth_user
):
    """Verify that a multipart form voice request transcribes audio and synthesizes response."""
    # 1. Setup mocks
    mock_get_user.return_value = mock_auth_user
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    
    mock_transcribe.return_value = ("Bonjour de vive voix.", "fr")
    mock_route_intent.return_value = {
        "session_id": "session-123",
        "response_text": "Réponse parlée.",
        "route_taken": "rag",
        "sources": [],
        "warning": None
    }
    mock_synthesize.return_value = (b"mock_wav_binary_data", None)
    mock_get_allowed.return_value = ["meeting-123"]
    
    client = app.test_client()
    
    # 2. Call endpoint with form data & audio file
    audio_file = (io.BytesIO(b"dummy wav data"), "test.wav")
    response = client.post(
        "/api/chat",
        headers={"Authorization": "Bearer mock-user-token"},
        data={
            "audio": audio_file,
            "session_id": "session-123",
            "speech_synthesis_requested": "true"
        },
        content_type="multipart/form-data"
    )
    
    # 3. Assertions
    assert response.status_code == 200
    data = response.get_json()
    assert data["session_id"] == "session-123"
    assert data["user_transcription"] == "Bonjour de vive voix."
    assert data["response_text"] == "Réponse parlée."
    assert data["audio_b64"] is not None # base64 representation of b"mock_wav_binary_data"
    mock_transcribe.assert_called_once()
    mock_synthesize.assert_called_once_with("Réponse parlée.")


@patch("api.chat.db_connect")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_chat_history_list_endpoints(mock_get_user, mock_verify_jti, mock_decode, mock_db_connect, mock_auth_user):
    """Verify auxiliary GET /api/chat/history and GET /api/chat/<session_id>."""
    # 1. Setup mocks
    mock_get_user.return_value = mock_auth_user
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_db_connect.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    import datetime
    # Mock history list: session_id, last_activity, last_message
    mock_cur.fetchall.side_effect = [
        [("session-123", datetime.datetime(2026, 5, 20, 12, 0), "Hello")],  # First call (history list)
        [("user", "Hello", datetime.datetime(2026, 5, 20, 12, 0), "audio_data", None)]  # Second call (details)
    ]
    
    client = app.test_client()
    
    # Test GET history list
    response = client.get(
        "/api/chat/history",
        headers={"Authorization": "Bearer mock-user-token"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["session_id"] == "session-123"
    assert data[0]["last_message"] == "Hello"
    
    # Test GET session details
    response = client.get(
        "/api/chat/session-123",
        headers={"Authorization": "Bearer mock-user-token"}
    )
    assert response.status_code == 200
    details = response.get_json()
    assert details["session_id"] == "session-123"
    assert len(details["messages"]) == 1
    assert details["messages"][0]["role"] == "user"
    assert details["messages"][0]["content"] == "Hello"


@patch("api.chat.db_connect")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_delete_session_endpoint(mock_get_user, mock_verify_jti, mock_decode, mock_db_connect, mock_auth_user):
    """Verify DELETE /api/chat/<session_id> deletes the session history."""
    # 1. Setup mocks
    mock_get_user.return_value = mock_auth_user
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_db_connect.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    client = app.test_client()
    
    # Test DELETE session
    response = client.delete(
        "/api/chat/session-123",
        headers={"Authorization": "Bearer mock-user-token"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "deleted successfully" in data["message"]
    
    mock_cur.execute.assert_called_once_with(
        "DELETE FROM chat_messages WHERE session_id = %s AND user_id = %s;",
        ("session-123", "user-123")
    )
    mock_conn.commit.assert_called_once()


@patch("api.chat.get_allowed_meeting_ids")
@patch("api.chat.db_connect")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_get_chat_meetings_success(mock_get_user, mock_verify_jti, mock_decode, mock_db_connect, mock_get_allowed, mock_auth_user):
    """Verify that GET /api/chat/meetings retrieves all permitted meetings with metadata."""
    mock_get_user.return_value = mock_auth_user
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    mock_get_allowed.return_value = ["meeting-123"]
    
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_db_connect.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    import datetime
    # Mock row structure matching query columns:
    # m.id, m.title, m.start_at, m.status, m.description, p.id, p.name, teams, departments
    mock_cur.fetchall.return_value = [
        (
            "meeting-123", "Réunion Générale", datetime.datetime(2026, 5, 20, 10, 0), "Completed", "Desc",
            "project-123", "Projet Alpha", [{"id": "team-123", "name": "Équipe R&D"}], [{"id": "dept-123", "name": "Département Technique"}]
        )
    ]
    
    client = app.test_client()
    response = client.get(
        "/api/chat/meetings",
        headers={"Authorization": "Bearer mock-user-token"}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["id"] == "meeting-123"
    assert data[0]["title"] == "Réunion Générale"
    assert data[0]["project"]["name"] == "Projet Alpha"
    assert data[0]["teams"][0]["name"] == "Équipe R&D"
    assert data[0]["departments"][0]["name"] == "Département Technique"


@patch("api.chat.transcribe_audio")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_stt_endpoint_success(mock_get_user, mock_verify_jti, mock_decode, mock_transcribe, mock_auth_user):
    """Verify that POST /api/stt correctly processes audio files and returns transcription."""
    mock_get_user.return_value = mock_auth_user
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    mock_transcribe.return_value = ("Bonjour direct stt.", "fr")
    
    client = app.test_client()
    audio_file = (io.BytesIO(b"dummy wav data for direct stt"), "test_direct.wav")
    
    response = client.post(
        "/api/stt",
        headers={"Authorization": "Bearer mock-user-token"},
        data={
            "audio": audio_file,
            "language": "fr"
        },
        content_type="multipart/form-data"
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["text"] == "Bonjour direct stt."
    assert data["language"] == "fr"
    mock_transcribe.assert_called_once()


@patch("api.chat.synthesize_text_to_audio")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_tts_endpoint_success(mock_get_user, mock_verify_jti, mock_decode, mock_synthesize, mock_auth_user):
    """Verify that POST /api/tts synthesizes text to speech and returns WAV audio file."""
    mock_get_user.return_value = mock_auth_user
    mock_decode.return_value = {"jti": "mock-jti", "username": "user@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    mock_synthesize.return_value = (b"mock_direct_tts_wav_binary_data", None)
    
    client = app.test_client()
    
    response = client.post(
        "/api/tts",
        headers={"Authorization": "Bearer mock-user-token"},
        json={
            "text": "Bonjour direct tts",
            "language": "fr"
        }
    )
    
    assert response.status_code == 200
    assert response.content_type == "audio/wav"
    assert response.data == b"mock_direct_tts_wav_binary_data"
    mock_synthesize.assert_called_once_with("Bonjour direct tts")


