import requests
from config import OLLAMA_HOST, OLLAMA_TIMEOUT, MODEL_EMBEDDING

def get_embedding(text: str) -> list:
    """
    Computes a vector embedding for the input text using Ollama's qwen3-embedding:0.6b.
    Returns a list of 1024 floats.
    """
    if not text or not isinstance(text, str):
        raise ValueError("Input text must be a non-empty string.")
        
    url = f"{OLLAMA_HOST}/api/embeddings"
    payload = {
        "model": MODEL_EMBEDDING,
        "prompt": text
    }
    
    try:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        
        embedding = data.get("embedding")
        if not embedding or not isinstance(embedding, list):
            # Try newer Ollama endpoint schema/fallback
            url_embed = f"{OLLAMA_HOST}/api/embed"
            payload_embed = {
                "model": MODEL_EMBEDDING,
                "input": text
            }
            resp_embed = requests.post(url_embed, json=payload_embed, timeout=OLLAMA_TIMEOUT)
            resp_embed.raise_for_status()
            data_embed = resp_embed.json()
            embeddings = data_embed.get("embeddings")
            if embeddings and isinstance(embeddings, list) and len(embeddings) > 0:
                embedding = embeddings[0]
                
        if not embedding:
            raise ValueError(f"No embedding returned from Ollama for model '{MODEL_EMBEDDING}'.")
            
        return embedding
        
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Failed to communicate with Ollama embedding service: {e}")
