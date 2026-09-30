# Quickstart Guide

This guide provides steps to configure, initialize, and run the offline multimodal conversational meeting agent.

---

## 1. Prerequisites & Hardware

### System Requirements
- **OS**: Windows or Linux
- **VRAM**: GPU with >= 12 GB of VRAM is highly recommended (CUDA-enabled). Can fall back to CPU with significant latency increases.
- **Python**: Python 3.11+

### Local Ollama Services
Ollama must be running on `http://localhost:11434` with the following models pre-loaded:
```bash
# Pull LLM for conversational RAG
ollama pull llama3.1:8b-instruct-q4_K_M

# Pull LLM for NL2SQL querying
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Pull LLM for Dashboard spec compilation
ollama pull qwen2.5:7b-instruct-q4_K_M

# Pull embedding model
ollama pull qwen3-embedding:0.6b
```

---

## 2. Local Installation & Setup

1. **Navigate to the AI directory**:
   ```bash
   cd AI/
   ```

2. **Create a virtual environment & install requirements**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux:
   source venv/bin/activate

   # Install local packages
   pip install -r requirements.txt
   ```

3. **Required system libraries**:
   - For **faster-whisper**: Ensure NVIDIA CUDA Toolkit and cuDNN libraries are installed and added to your system PATH for GPU acceleration.
   - For **Kokoro-82M (soundfile)**:
     - **Windows**: Soundfile is bundled.
     - **Linux**: Install libsndfile: `sudo apt-get install libsndfile1`.

---

## 3. Database Initialization

Execute the migrations or script `init.sql` against your local PostgreSQL instance to set up vector support and the necessary database tables/views:
```bash
# Using psql:
psql -U postgres -d meeting_ia -f init.sql
```

---

## 4. Run the Dev Server

Start the local Flask server:
```bash
cd AI/chatbot
python app.py
```
By default, the server will launch on `http://127.0.0.1:5002`.

---

## 5. Development Verification (Smoketest)

Verify the service is up and running by querying the health check endpoint:
```bash
curl http://127.0.0.1:5002/health
```
**Expected Response**:
```json
{
  "status": "healthy",
  "service": "Multimodal Meeting Agent AI"
}
```
