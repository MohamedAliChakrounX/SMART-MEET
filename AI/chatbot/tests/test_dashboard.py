import pytest
from unittest.mock import patch, MagicMock
from dashboard.generator import generate_chart_spec

def test_generate_chart_spec_empty_dataset():
    """Verify that generate_chart_spec returns None for empty datasets."""
    spec = generate_chart_spec([], "Draw a bar chart of meetings per project")
    assert spec is None

@patch("dashboard.generator.requests.post")
def test_generate_chart_spec_success(mock_post):
    """Verify successful Chart.js spec generation when the LLM returns valid JSON."""
    # 1. Setup mock response from local LLM
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": (
                "```json\n"
                "{\n"
                "  \"type\": \"bar\",\n"
                "  \"data\": {\n"
                "    \"labels\": [\"Alpha\", \"Beta\"],\n"
                "    \"datasets\": [\n"
                "      { \"label\": \"Decisions\", \"data\": [5, 10] }\n"
                "    ]\n"
                "  },\n"
                "  \"options\": {\n"
                "    \"responsive\": true\n"
                "  }\n"
                "}\n"
                "```"
            )
        }
    }
    mock_post.return_value = mock_response
    
    # 2. Call generator
    dataset = [
        {"project_id": "Alpha", "total_decisions": 5},
        {"project_id": "Beta", "total_decisions": 10}
    ]
    spec = generate_chart_spec(dataset, "Draw a bar chart of decisions per project")
    
    # 3. Assertions
    assert spec is not None
    assert spec["type"] == "bar"
    assert spec["data"]["labels"] == ["Alpha", "Beta"]
    assert spec["data"]["datasets"][0]["data"] == [5, 10]
    assert spec["options"]["responsive"] is True

@patch("dashboard.generator.requests.post")
def test_generate_chart_spec_resilient_fallback(mock_post):
    """Verify that if LLM returns malformed JSON, generator returns None instead of crashing."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": "Here is your chart config: { malformed json: true "
        }
    }
    mock_post.return_value = mock_response
    
    dataset = [{"project_id": "Alpha", "total_decisions": 5}]
    spec = generate_chart_spec(dataset, "Draw a chart")
    
    # Assert graceful recovery returning None
    assert spec is None

@patch("dashboard.generator.requests.post")
def test_generate_chart_spec_not_relevant(mock_post):
    """Verify that if LLM decides a chart is not relevant, generator returns None."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": "{\"relevant\": false}"
        }
    }
    mock_post.return_value = mock_response
    
    dataset = [{"count": 5}]
    spec = generate_chart_spec(dataset, "how many meetings?")
    assert spec is None

@patch("dashboard.generator.requests.post")
def test_generate_chart_spec_from_text_success(mock_post):
    """Verify generate_chart_spec_from_text successfully parses a text summary into a chart."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "message": {
            "content": "{\"type\": \"pie\", \"data\": {\"labels\": [\"Alice\", \"Bob\"], \"datasets\": [{\"data\": [40, 20]}]}}"
        }
    }
    mock_post.return_value = mock_response
    
    from dashboard.generator import generate_chart_spec_from_text
    spec = generate_chart_spec_from_text(
        "La répartition du temps est de : Alice 40 minutes et Bob 20 minutes.",
        "Affiche la répartition du temps de parole"
    )
    assert spec is not None
    assert spec["type"] == "pie"
    assert spec["data"]["labels"] == ["Alice", "Bob"]
