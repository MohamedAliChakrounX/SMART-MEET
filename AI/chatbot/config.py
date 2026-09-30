import os

# Base Directories
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Database Settings
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME", "meetingDB")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "000")

DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Ollama API Settings
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "40"))  # Strict 40s fail-fast timeout

# Local AI Models
MODEL_RAG = os.environ.get("MODEL_RAG", "llama3.1:8b-instruct-q4_K_M")
MODEL_EMBEDDING = os.environ.get("MODEL_EMBEDDING", "qwen3-embedding:0.6b")
MODEL_SQL = os.environ.get("MODEL_SQL", "qwen2.5-coder:7b-instruct-q4_K_M")
MODEL_DASHBOARD = os.environ.get("MODEL_DASHBOARD", "qwen2.5:7b-instruct-q4_K_M")

# Voice Service Settings
# faster-whisper configuration
STT_MODEL_SIZE = os.environ.get("STT_MODEL_SIZE", "small")  # 'base', 'small', 'medium'
STT_DEVICE = os.environ.get("STT_DEVICE", "cuda")          # 'cuda' or 'cpu'
STT_COMPUTE_TYPE = os.environ.get("STT_COMPUTE_TYPE", "float16")  # 'float16', 'int8', 'float32'

# Kokoro TTS configuration
# Kokoro-82M requires kokoro library or local models loading
TTS_VOICE = os.environ.get("TTS_VOICE", "af_bella")        # default voice (Bella is clean)
TTS_LANG = os.environ.get("TTS_LANG", "fr")                # Target output language: French

# JWT Authentication
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "RS256")    # LexikJWT uses RS256 by default
JWT_PUBLIC_KEY_PATH = os.environ.get(
    "JWT_PUBLIC_KEY_PATH", 
    os.path.abspath(os.path.join(BASE_DIR, "../../Backend/config/jwt/public.pem"))
)
# Fallback symmetric secret if HS256 is used in tests/development
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback_secret_key_for_testing_only")

# Application Config
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

PORT = int(os.environ.get("PORT", "5002"))

