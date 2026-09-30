"""
download_model.py
=================
One-time setup: downloads the Darija ASR model files into models/.

Model used
----------
  anaszil/whisper-large-v3-turbo-darija
  - LoRA adapter fine-tuned on Moroccan Darija audio
  - Requires the OpenAI Whisper Large v3 Turbo base model (~1.6 GB)
  - LoRA adapter itself is tiny (~400 MB)

Run from the AI/ directory:
    python download_model.py

After downloading, start the server normally:
    python api_server.py
"""

import os
import sys

BASE_REPO    = "openai/whisper-large-v3-turbo"
ADAPTER_REPO = "anaszil/whisper-large-v3-turbo-darija"

BASE_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "whisper-base")
ADAPTER_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "whisper-darija-lora")


def main():
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("[ERROR] huggingface_hub is not installed. Fix: pip install huggingface-hub")
        sys.exit(1)

    # Remove offline flags so the download can reach HuggingFace
    for var in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_DATASETS_OFFLINE"):
        os.environ.pop(var, None)

    print(f"\n[1/2] Downloading base model: {BASE_REPO}")
    print(f"      → {BASE_DIR}\n")
    snapshot_download(
        repo_id=BASE_REPO,
        local_dir=BASE_DIR,
        ignore_patterns=["*.msgpack", "*.h5", "flax_model*", "tf_model*", "rust_model*", "onnx*"],
    )

    print(f"\n[2/2] Downloading LoRA adapter: {ADAPTER_REPO}")
    print(f"      → {ADAPTER_DIR}\n")
    snapshot_download(
        repo_id=ADAPTER_REPO,
        local_dir=ADAPTER_DIR,
    )

    print("\n[Meeting-AI] Download complete.")
    print("[Meeting-AI] You can now run: python api_server.py\n")


if __name__ == "__main__":
    main()
