from typing import List
import psycopg2
from pydantic import Field
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document

from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from rag.embedder import get_embedding

def db_connect():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

class SecurePgVectorRetriever(BaseRetriever):
    """
    Custom LangChain retriever executing vector similarity search on PostgreSQL.
    Enforces access control by restricting search to allowed_meeting_ids.
    """
    allowed_meeting_ids: List[str] = Field(default_factory=list)
    k: int = Field(default=4)
    min_similarity: float = Field(default=0.0)  # Filter by minimum similarity score if desired
    
    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        # 1. If user is not allowed to access any meetings, return empty immediately
        if not self.allowed_meeting_ids:
            return []
            
        try:
            # 2. Embed the textual user query
            query_vector = get_embedding(query)
        except Exception as e:
            print(f"[SecurePgVectorRetriever] Embedding generation failed: {e}")
            return []
            
        documents = []
        conn = db_connect()
        try:
            with conn.cursor() as cur:
                # 3. Query DB using Cosine Distance operator <=>
                # 1 - (embedding <=> query_vector) computes Cosine Similarity
                query_sql = """
                    SELECT mc.content, mc.chunk_type, mc.meeting_id, 1 - (mc.embedding <=> %s::vector) AS similarity, m.title AS meeting_title
                    FROM meeting_chunks mc
                    JOIN meeting m ON mc.meeting_id = m.id
                    WHERE mc.meeting_id = ANY(%s::uuid[])
                    ORDER BY mc.embedding <=> %s::vector
                    LIMIT %s;
                """
                cur.execute(query_sql, (query_vector, self.allowed_meeting_ids, query_vector, self.k))
                rows = cur.fetchall()
                
                for row in rows:
                    content, chunk_type, meeting_id, similarity, meeting_title = row
                    
                    if similarity >= self.min_similarity:
                        doc = Document(
                            page_content=content,
                            metadata={
                                "chunk_type": chunk_type,
                                "meeting_id": str(meeting_id),
                                "similarity": float(similarity),
                                "meeting_title": meeting_title
                            }
                        )
                        documents.append(doc)
                        
        except Exception as e:
            print(f"[SecurePgVectorRetriever] Database similarity query failed: {e}")
            documents = []
        finally:
            conn.close()
            
        return documents
