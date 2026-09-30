import pytest
from unittest.mock import patch, MagicMock
from sql_agent.nl2sql import validate_and_sanitize_sql, execute_with_self_healing

def test_validate_sql_blocks_unsafe_commands():
    """Verify that destructive SQL operations are strictly blocked."""
    allowed_ids = ["019d496f-440d-76d4-a394-00e467e72345"]
    
    unsafe_queries = [
        "DELETE FROM view_meetings;",
        "UPDATE view_meetings SET duration = 50;",
        "DROP VIEW view_meetings;",
        "INSERT INTO view_meetings (title) VALUES ('Hacked');",
        "TRUNCATE view_meetings;",
        "ALTER TABLE meetings ADD COLUMN secret TEXT;"
    ]
    
    for q in unsafe_queries:
        with pytest.raises(ValueError) as excinfo:
            validate_and_sanitize_sql(q, allowed_ids)
        assert "Unsafe SQL command detected" in str(excinfo.value)

def test_validate_sql_blocks_sensitive_tables():
    """Verify that direct access to sensitive tables (like users, token_denylist) is blocked."""
    allowed_ids = ["019d496f-440d-76d4-a394-00e467e72345"]
    
    sensitive_queries = [
        "SELECT password FROM users;",
        "SELECT * FROM token_denylist;",
        "SELECT * FROM chat_messages;"
    ]
    
    for q in sensitive_queries:
        with pytest.raises(ValueError) as excinfo:
            validate_and_sanitize_sql(q, allowed_ids)
        assert "Access to sensitive table blocked" in str(excinfo.value)

def test_inject_permissions_no_where():
    """Verify that permission clauses are correctly injected in queries without existing WHERE."""
    allowed_ids = ["019d496f-440d-76d4-a394-00e467e72345"]
    
    # 1. Simple select
    q = "SELECT * FROM view_meetings;"
    sanitized = validate_and_sanitize_sql(q, allowed_ids)
    assert "meeting_id = any(" in sanitized.lower()
    
    # 2. Select with order by or limit
    q2 = "SELECT title FROM view_meeting_analytics ORDER BY total_decisions DESC LIMIT 5;"
    sanitized2 = validate_and_sanitize_sql(q2, allowed_ids)
    assert "meeting_id = any(" in sanitized2.lower()
    # Check that ORDER BY and LIMIT are still at the end
    assert sanitized2.lower().strip().endswith("limit 5;")

def test_inject_permissions_with_where():
    """Verify that permission clauses are correctly injected and combined with existing WHERE clauses."""
    allowed_ids = ["019d496f-440d-76d4-a394-00e467e72345"]
    q = "SELECT * FROM view_meetings WHERE duration > 30;"
    
    sanitized = validate_and_sanitize_sql(q, allowed_ids)
    assert "meeting_id = any(" in sanitized.lower()
    assert "duration > 30" in sanitized.lower()
    assert "and" in sanitized.lower()

@patch("sql_agent.nl2sql.db_connect")
@patch("sql_agent.nl2sql.generate_sql_from_llm")
def test_self_healing_success_on_retry(mock_generate, mock_db_connect):
    """Verify that SQL execution self-healing retry loop catches error, prompts LLM with error, and succeeds on second try."""
    # 1. Setup mocks
    # First LLM output is bad (syntactically invalid SQL)
    # Second LLM output is corrected SQL
    mock_generate.side_effect = [
        "SELECT * FROM view_meetings WHERE duraction > 30;", # Typo in column 'duraction'
        "SELECT * FROM view_meetings WHERE duration > 30;"  # Corrected column
    ]
    
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_db_connect.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    # First execution raises ProgrammingError (column duraction does not exist)
    # Second execution succeeds
    import psycopg2
    mock_cur.execute.side_effect = [
        psycopg2.ProgrammingError("column \"duraction\" does not exist"),
        None
    ]
    
    # Return mock results for the second run
    mock_cur.fetchall.return_value = [("Meeting A", 45)]
    mock_cur.description = [
        MagicMock(name="title"),
        MagicMock(name="duration")
    ]
    # Set name attribute for description elements
    mock_cur.description[0].name = "title"
    mock_cur.description[1].name = "duration"
    
    # 2. Execute with self-healing
    allowed_ids = ["019d496f-440d-76d4-a394-00e467e72345"]
    result = execute_with_self_healing("session-123", "Show meetings longer than 30 mins", allowed_ids)
    
    # 3. Assertions
    assert result["status"] == "success"
    assert len(result["data"]) == 1
    assert result["data"][0]["title"] == "Meeting A"
    assert result["data"][0]["duration"] == 45
    assert result["retries_used"] == 1
    
    # Ensure LLM was called twice: once for initial and once for correction
    assert mock_generate.call_count == 2
