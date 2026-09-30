import pytest
from unittest.mock import patch, MagicMock
from langchain_core.documents import Document

# Import SecurePgVectorRetriever
from rag.retriever import SecurePgVectorRetriever

def test_retriever_empty_allowed_ids():
    """Verify that SecurePgVectorRetriever returns empty list immediately if allowed_meeting_ids is empty."""
    retriever = SecurePgVectorRetriever(allowed_meeting_ids=[], k=4)
    docs = retriever.invoke("What are the project priorities?")
    assert docs == []

@patch("rag.retriever.get_embedding")
@patch("rag.retriever.db_connect")
def test_retriever_success(mock_db_connect, mock_get_embedding):
    """Verify SecurePgVectorRetriever queries database with allowed_meeting_ids and yields correct documents."""
    # 1. Setup mocks
    mock_get_embedding.return_value = [0.1] * 1024
    
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_db_connect.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    # Mock return rows: content, chunk_type, meeting_id, similarity, meeting_title
    mock_cur.fetchall.return_value = [
        ("We should focus on frontend stability.", "transcript", "019d496f-440d-76d4-a394-00e467e72345", 0.85, "Meeting Alpha"),
        ("Decided to launch beta next week.", "decision", "019d496f-440d-76d4-a394-00e467e72346", 0.72, "Meeting Beta")
    ]
    
    # 2. Instantiate and call
    allowed_ids = ["019d496f-440d-76d4-a394-00e467e72345", "019d496f-440d-76d4-a394-00e467e72346"]
    retriever = SecurePgVectorRetriever(allowed_meeting_ids=allowed_ids, k=2, min_similarity=0.7)
    docs = retriever.invoke("sprint priority")
    
    # 3. Assertions
    assert len(docs) == 2
    
    doc1 = docs[0]
    assert doc1.page_content == "We should focus on frontend stability."
    assert doc1.metadata["chunk_type"] == "transcript"
    assert doc1.metadata["meeting_id"] == "019d496f-440d-76d4-a394-00e467e72345"
    assert doc1.metadata["similarity"] == 0.85
    
    doc2 = docs[1]
    assert doc2.page_content == "Decided to launch beta next week."
    assert doc2.metadata["chunk_type"] == "decision"
    assert doc2.metadata["meeting_id"] == "019d496f-440d-76d4-a394-00e467e72346"
    assert doc2.metadata["similarity"] == 0.72
    
    mock_get_embedding.assert_called_once_with("sprint priority")
    mock_cur.execute.assert_called_once()
    mock_conn.close.assert_called_once()

@patch("rag.retriever.get_embedding")
@patch("rag.retriever.db_connect")
def test_retriever_min_similarity_filter(mock_db_connect, mock_get_embedding):
    """Verify that retriever filters out documents whose similarity is less than min_similarity."""
    mock_get_embedding.return_value = [0.1] * 1024
    
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_db_connect.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    # One is 0.85 similarity, one is 0.55 similarity
    mock_cur.fetchall.return_value = [
        ("High similarity chunk", "transcript", "019d496f-440d-76d4-a394-00e467e72345", 0.85, "Meeting Alpha"),
        ("Low similarity chunk", "transcript", "019d496f-440d-76d4-a394-00e467e72345", 0.55, "Meeting Alpha")
    ]
    
    # Limit min_similarity to 0.70
    retriever = SecurePgVectorRetriever(
        allowed_meeting_ids=["019d496f-440d-76d4-a394-00e467e72345"],
        k=2,
        min_similarity=0.70
    )
    docs = retriever.invoke("some query")
    
    # Should only return the one above 0.70
    assert len(docs) == 1
    assert docs[0].page_content == "High similarity chunk"
