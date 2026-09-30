import json
import pytest
from unittest.mock import patch, MagicMock

# Import app to test endpoints
from app import app
from ingestion.chunker import chunk_meeting

@pytest.fixture
def mock_meeting_payload():
    return {
        "meeting_id": "019d496f-440d-76d4-a394-00e467e72345",
        "title": "Sprint Planning Meeting",
        "date": "2026-05-20",
        "duration": 45,
        "project_id": "019d496f-440a-7966-9f60-8cb25f26d8b7",
        "owner_id": "019d496f-440a-7966-9f60-8cb25f26d8b6",
        "participant_ids": [
            "019d496f-440a-7966-9f60-8cb25f26d8b6",
            "019d496f-440a-7966-9f60-8cb25f26d8b8"
        ],
        "transcript": [
            {"speaker": "Speaker A", "content": "Welcome everyone. Let's discuss our priorities.", "timestamp": "00:00:15"},
            {"speaker": "Speaker B", "content": "Sure, I'll update the tasks in the board.", "timestamp": "00:00:45"},
            {"speaker": "Speaker A", "content": "Great, thanks B.", "timestamp": "00:01:05"},
            {"speaker": "Speaker B", "content": "We need to make sure we deploy on Friday.", "timestamp": "00:01:30"},
            {"speaker": "Speaker C", "content": "I'll do the release checks.", "timestamp": "00:02:00"},
            {"speaker": "Speaker A", "content": "Perfect, let's wrap up.", "timestamp": "00:02:30"}
        ],
        "summary": "This was a standard sprint planning session. We agreed to update tasks and deploy on Friday.",
        "decisions": [
            "Deploy sprint package on Friday morning.",
            "Verify all release checks are green."
        ],
        "action_items": [
            "Speaker B to update task status in the board.",
            "Speaker C to execute release checks."
        ]
    }

def test_semantic_chunking(mock_meeting_payload):
    """
    Validates that the semantic chunker correctly breaks down the meeting payload
    into chunks of different types (transcript, summary, decision, action_item).
    """
    chunks = chunk_meeting(mock_meeting_payload)
    
    # Verify we got chunks
    assert len(chunks) > 0
    
    # Group chunks by type
    chunk_types = [c["chunk_type"] for c in chunks]
    
    assert "transcript" in chunk_types
    assert "summary" in chunk_types
    assert "decision" in chunk_types
    assert "action_item" in chunk_types
    
    # Verify content formats
    transcript_chunks = [c for c in chunks if c["chunk_type"] == "transcript"]
    assert len(transcript_chunks) >= 2 # 6 turns, grouping size 5 with 1 overlap should give 2 chunks
    assert "Sprint Planning Meeting" in transcript_chunks[0]["content"]
    assert "Speaker A" in transcript_chunks[0]["content"]
    
    decision_chunks = [c for c in chunks if c["chunk_type"] == "decision"]
    assert len(decision_chunks) == 2
    assert "Deploy sprint package" in decision_chunks[0]["content"]

@patch("api.ingest.db_connect")
@patch("api.ingest.get_embedding")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_ingest_meeting_api_endpoint(mock_get_user, mock_verify_jti, mock_decode, mock_embed, mock_db, mock_meeting_payload):
    """
    Tests /api/admin/ingest POST route.
    Mocks authentication (with ROLE_ADMIN) and database connection.
    """
    # 1. Setup mock user authentication (admin)
    mock_get_user.return_value = {
        "id": "019d496f-440a-7966-9f60-8cb25f26d8b6",
        "email": "admin@sfm.com",
        "roles": ["ROLE_ADMIN"],
        "team_id": "019d496f-440a-7966-9f60-8cb25f26d8b5"
    }
    mock_decode.return_value = {"jti": "mock-jti", "username": "admin@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    
    # 2. Setup mock embedding (size 1024 vector)
    mock_embed.return_value = [0.1] * 1024
    
    # 3. Setup mock database operations
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_db.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    # Create test client
    client = app.test_client()
    
    # Perform POST request
    response = client.post(
        "/api/admin/ingest",
        headers={"Authorization": "Bearer mock-admin-token"},
        json=mock_meeting_payload
    )
    
    # Assert successful response
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data["meeting_id"] == mock_meeting_payload["meeting_id"]
    assert data["chunks_inserted"] > 0
    
    # Verify database calls
    mock_cur.execute.assert_any_call("DELETE FROM meeting_chunks WHERE meeting_id = %s;", (mock_meeting_payload["meeting_id"],))
    assert mock_cur.executemany.called

@patch("api.ingest.update_meeting_participant_metadata")
@patch("api.auth.decode_token")
@patch("api.auth.verify_jti_not_denylisted")
@patch("api.auth.get_user_from_db")
def test_update_permissions_api_endpoint(mock_get_user, mock_verify_jti, mock_decode, mock_update_metadata, mock_meeting_payload):
    """
    Tests /api/admin/permissions PUT route.
    Mocks authentication (with ROLE_ADMIN) and permissions updater.
    """
    # 1. Setup mock user authentication (admin)
    mock_get_user.return_value = {
        "id": "019d496f-440a-7966-9f60-8cb25f26d8b6",
        "email": "admin@sfm.com",
        "roles": ["ROLE_ADMIN"],
        "team_id": "019d496f-440a-7966-9f60-8cb25f26d8b5"
    }
    mock_decode.return_value = {"jti": "mock-jti", "username": "admin@sfm.com", "exp": 9999999999}
    mock_verify_jti.return_value = True
    
    # 2. Setup mock metadata updater to return True (success)
    mock_update_metadata.return_value = True
    
    client = app.test_client()
    
    # Perform PUT request
    response = client.put(
        "/api/admin/permissions",
        headers={"Authorization": "Bearer mock-admin-token"},
        json={
            "meeting_id": mock_meeting_payload["meeting_id"],
            "participant_ids": [
                "019d496f-440a-7966-9f60-8cb25f26d8b6",
                "019d496f-440a-7966-9f60-8cb25f26d8b9"
            ]
        }
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "Permissions metadata synced successfully." in data["message"]
    
    # Verify that updater function was called with correct args
    mock_update_metadata.assert_called_once_with(
        mock_meeting_payload["meeting_id"],
        [
            "019d496f-440a-7966-9f60-8cb25f26d8b6",
            "019d496f-440a-7966-9f60-8cb25f26d8b9"
        ]
    )
