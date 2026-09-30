"""
job_store.py
============
Thread-safe in-memory store for tracking AI processing job states.

This is the shared communication layer between the background transcription
worker and the Flask status endpoint (`GET /api/meetings/:id/status`).

Symfony integration note
------------------------
In production you would replace this with a Redis store (or a database
table). The interface (`update`, `set_done`, `set_error`, `get`) is
intentionally minimal so the swap is trivial.

Progress / Status contract (matches ProcessingScreen.jsx expectations)
----------------------------------------------------------------------
{
    "status":       "pending" | "processing" | "done" | "error",
    "progress":     int,          # 0-100
    "step":         str,          # Human-readable current step label
    "segments":     list | null,  # Populated only on status == "done"
    "errorMessage": str  | null   # Populated only on status == "error"
}
"""

import threading
from typing import Optional


class JobStore:
    """
    Stores job state in a dict protected by a threading.Lock.

    One singleton instance is shared between Flask request handlers
    and the background transcription thread.
    """

    def __init__(self):
        self._lock: threading.Lock = threading.Lock()
        self._jobs: dict           = {}

    # ── Write ──────────────────────────────────────────────────────────────────

    def create(self, meeting_id, language: str = "en", audio_created_at: str = None) -> None:
        """Register a new job in 'pending' state."""
        with self._lock:
            self._jobs[meeting_id] = {
                "status":       "pending",
                "progress":     0,
                "step":         "Queued — waiting for processing…",
                "segments":     None,
                "errorMessage": None,
                "language":     language,
                "audio_created_at": audio_created_at,
            }

    def update(self, meeting_id, *, progress: int, step: str) -> None:
        """Update progress percentage and step label during processing."""
        with self._lock:
            job = self._jobs.get(meeting_id)
            if job:
                job["status"]   = "processing"
                job["progress"] = progress
                job["step"]     = step

    def set_done(self, meeting_id, segments: list) -> None:
        """Mark job as complete and attach the resulting segments."""
        with self._lock:
            # Update the EXISTING job dict rather than replacing it,
            # so keys stored before this call (e.g. 'analytics', 'pv') are preserved.
            job = self._jobs.get(meeting_id, {})
            job["status"]       = "done"
            job["progress"]     = 100
            job["step"]         = "Transcription complete!"
            job["segments"]     = segments
            job["errorMessage"] = None
            self._jobs[meeting_id] = job

    def set_error(self, meeting_id, message: str) -> None:
        """Mark job as failed with an error message."""
        with self._lock:
            job = self._jobs.get(meeting_id, {})
            job["status"]       = "error"
            job["errorMessage"] = message
            self._jobs[meeting_id] = job

    def cancel(self, meeting_id) -> None:
        """Mark job as cancelled to allow worker threads to abort gracefully."""
        with self._lock:
            job = self._jobs.get(meeting_id)
            if job:
                job["cancelled"] = True
                job["status"]    = "error"
                job["errorMessage"] = "Transcription cancelled by user."

    # ── Read ───────────────────────────────────────────────────────────────────

    def is_cancelled(self, meeting_id) -> bool:
        """Check if the job has been flagged for cancellation."""
        with self._lock:
            return self._jobs.get(meeting_id, {}).get("cancelled", False)

    def get(self, meeting_id) -> Optional[dict]:
        """Return the current job state dict, or None if unknown."""
        with self._lock:
            return self._jobs.get(meeting_id)

    # ── PV storage ─────────────────────────────────────────────────────────────

    def create_pv_job(self, meeting_id) -> None:
        """Register a new PV generation job in 'pending' state."""
        with self._lock:
            job = self._jobs.get(meeting_id, {})
            job["pv_status"]   = "pending"
            job["pv_progress"] = 0
            job["pv_step"]     = "Préparation de la génération..."
            job["pv_error"]    = None
            self._jobs[meeting_id] = job

    def update_pv_progress(self, meeting_id, progress: int, step: str) -> None:
        """Update PV progress percentage and step label."""
        with self._lock:
            job = self._jobs.get(meeting_id)
            if job:
                job["pv_status"]   = "processing"
                job["pv_progress"] = progress
                job["pv_step"]     = step

    def set_pv_error(self, meeting_id, message: str) -> None:
        """Mark PV job as failed."""
        with self._lock:
            job = self._jobs.get(meeting_id, {})
            job["pv_status"] = "error"
            job["pv_error"]  = message
            self._jobs[meeting_id] = job

    def store_pv(self, meeting_id, pv_data: dict) -> None:
        """Persist a generated PV alongside the job state and mark as done."""
        with self._lock:
            job = self._jobs.get(meeting_id, {})
            job["pv_status"]   = "done"
            job["pv_progress"] = 100
            job["pv_step"]     = "Terminé !"
            job["pv"] = pv_data
            self._jobs[meeting_id] = job

    def get_pv_status(self, meeting_id) -> Optional[dict]:
        """Return just the PV status dictionary."""
        with self._lock:
            job = self._jobs.get(meeting_id)
            if not job:
                return None
            return {
                "status":   job.get("pv_status", "pending"),
                "progress": job.get("pv_progress", 0),
                "step":     job.get("pv_step", ""),
                "error":    job.get("pv_error"),
                "pv":       job.get("pv")
            }

    def get_pv(self, meeting_id) -> Optional[dict]:
        """Return the stored PV dict, or None if not yet generated."""
        with self._lock:
            return self._jobs.get(meeting_id, {}).get("pv")

    # ── Edited transcript storage ───────────────────────────────────────────────

    def update_segments(self, meeting_id, segments: list) -> None:
        """Replace the stored transcript segments (frontend edit)."""
        with self._lock:
            job = self._jobs.get(meeting_id, {})
            job["segments"] = segments
            self._jobs[meeting_id] = job

    def get_segments(self, meeting_id) -> Optional[list]:
        """Return the (possibly edited) transcript segments."""
        with self._lock:
            return self._jobs.get(meeting_id, {}).get("segments")

    # ── Behavioral Analytics storage ──────────────────────────────────────────

    def store_analytics(self, meeting_id, analytics_data: dict) -> None:
        """Persist generated behavioral analytics alongside the job state."""
        with self._lock:
            job = self._jobs.get(meeting_id, {})
            job["analytics"] = analytics_data
            self._jobs[meeting_id] = job

    def get_analytics(self, meeting_id) -> Optional[dict]:
        """Return the stored behavioral analytics dict, or None if not generated."""
        with self._lock:
            return self._jobs.get(meeting_id, {}).get("analytics")

    def store_interpretation(self, meeting_id, interpretation: dict) -> None:
        """Persist the AI behavioral interpretation result alongside the job."""
        with self._lock:
            job = self._jobs.get(meeting_id, {})
            job["interpretation"] = interpretation
            self._jobs[meeting_id] = job

    def get_interpretation(self, meeting_id) -> Optional[dict]:
        """Return the stored behavioral interpretation dict, or None if not done."""
        with self._lock:
            return self._jobs.get(meeting_id, {}).get("interpretation")

    # ── Language tracking ─────────────────────────────────────────────────────

    def update_language(self, meeting_id, language: str) -> None:
        """Update the language of the transcript."""
        with self._lock:
            job = self._jobs.get(meeting_id, {})
            job["language"] = language
            self._jobs[meeting_id] = job

    def get_language(self, meeting_id) -> str:
        """Return the current language of the transcript."""
        with self._lock:
            return self._jobs.get(meeting_id, {}).get("language", "en")

    # ── Audio creation date tracking ──────────────────────────────────────────

    def get_audio_created_at(self, meeting_id) -> Optional[str]:
        """Return the audio file's creation date (ISO string), or None."""
        with self._lock:
            return self._jobs.get(meeting_id, {}).get("audio_created_at")

    def rename(self, old_id, new_id) -> None:
        """Rename a meeting ID in the store to associate it with its persistent ID (UUID)."""
        with self._lock:
            if old_id in self._jobs:
                self._jobs[new_id] = self._jobs.pop(old_id)
