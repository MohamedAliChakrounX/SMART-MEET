"""
worker.py
=========
Standalone CLI worker — Symfony integration Option B.

Symfony spawns this process after saving the uploaded file:

    $process = new Process([
        'python', 'worker.py',
        '--meeting-id', $meetingId,
        '--audio',      $audioPath,
        '--output',     $outputJsonPath,
    ]);
    $process->start();   // non-blocking

When done, this script writes a JSON file at --output that the Symfony
controller reads on the next status-poll request.

Output JSON schema (written to --output)
-----------------------------------------
{
    "status":       "done" | "error",
    "segments":     [...],          // present on success
    "errorMessage": "..."           // present on error
}

Each segment matches TranscriptionView.jsx:
{
    "id":           1,
    "speaker":      "Speaker A",
    "speakerColor": "#3B82F6",
    "timeStart":    "MM:SS",
    "timeEnd":      "MM:SS",
    "text":         "..."
}

Usage
-----
    python worker.py --meeting-id 42 \\
                     --audio      /tmp/uploads/meeting_42.mp3 \\
                     --output     /tmp/results/42.json \\
                     [--online]
"""

import argparse
import json
import os
import sys
from pathlib import Path


# ── Argument parsing ───────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Meeting-AI transcription worker")
    parser.add_argument("--meeting-id", type=int, required=True,  help="Unique meeting ID")
    parser.add_argument("--audio",      type=str, required=True,  help="Absolute path to audio file")
    parser.add_argument("--output",     type=str, required=True,  help="Path for output JSON file")
    parser.add_argument("--online",     action="store_true",      help="Allow model downloads (default: offline)")
    return parser.parse_args()


# ── Minimal file-backed job store (no server needed) ──────────────────────────

class FileJobStore:
    """Writes progress JSON to disk so Symfony can poll a file or endpoint."""

    def __init__(self, output_path: str):
        self._path = output_path
        self._write({"status": "pending", "progress": 0, "step": "Starting…", "segments": None, "errorMessage": None})

    def create(self, _: int) -> None:
        pass  # Already initialised in __init__

    def update(self, _: int, *, progress: int, step: str) -> None:
        self._write({"status": "processing", "progress": progress, "step": step, "segments": None, "errorMessage": None})

    def set_done(self, _: int, segments: list) -> None:
        self._write({"status": "done", "progress": 100, "step": "Transcription complete!", "segments": segments, "errorMessage": None})

    def set_error(self, _: int, message: str) -> None:
        self._write({"status": "error", "progress": 0, "step": "Processing failed.", "segments": None, "errorMessage": message})

    def get(self, _: int) -> dict:
        with open(self._path, "r", encoding="utf-8") as fh:
            return json.load(fh)

    def _write(self, data: dict) -> None:
        Path(self._path).parent.mkdir(parents=True, exist_ok=True)
        with open(self._path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()

    if not os.path.exists(args.audio):
        result = {"status": "error", "segments": None, "errorMessage": f"Audio file not found: {args.audio}"}
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w") as fh:
            json.dump(result, fh)
        sys.exit(1)

    # Import here so env vars are set by TranscriptionService before any HF import
    from .transcription_service import TranscriptionService

    store   = FileJobStore(args.output)
    service = TranscriptionService(offline_mode=not args.online)
    service.run(args.audio, args.meeting_id, store)

    final = store.get(args.meeting_id)
    print(f"[worker] Finished — status: {final['status']}")
    sys.exit(0 if final["status"] == "done" else 1)


if __name__ == "__main__":
    main()
