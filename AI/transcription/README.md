# Meeting-AI — Python Transcription Module

## Dependencies

```
flask>=3.0
flask-cors>=4.0
faster-whisper>=1.0
pyannote.audio>=3.1
torch>=2.2
torchaudio>=2.2
tqdm
```

Install with:

```bash
pip install flask flask-cors faster-whisper "pyannote.audio>=3.1" torch torchaudio tqdm
```

> **HF Token** — set environment variable `HF_TOKEN` to your HuggingFace token
> (required the first time to download Pyannote weights).

## Running the server (Option A — microservice)

```bash
# First time: allow downloads
OFFLINE_MODE=0 HF_TOKEN=hf_xxx python api_server.py

# Subsequent runs: use cache
python api_server.py        # OFFLINE_MODE defaults to 1
```

## Running as CLI worker (Option B — Symfony Process)

```bash
python worker.py \
  --meeting-id 42 \
  --audio      /tmp/uploads/meeting_42.mp3 \
  --output     /tmp/results/42.json
```
