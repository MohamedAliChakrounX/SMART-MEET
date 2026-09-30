"""
pv_service.py
=============
Generates a structured Procès-Verbal (PV) from meeting transcript segments
using a locally running Ollama model.

Input
-----
    segments : list[dict]   – Transcript segments produced by TranscriptionService
                              Each segment: { id, speaker, text, timeStart, timeEnd, ... }
    settings : dict         – Optional generation settings (model, language, temperature)

Output
------
    dict – Structured PV matching the frontend JSON contract:
    {
        "title":        str,
        "date":         str,
        "location":     str,
        "type":         str,
        "participants": [{ "name", "function", "signature", "comment" }],
        "content": {
            "executiveOverview": str,
            "keyDecisions":      [str],
            "nextSteps":         [{ "task", "owner", "due", "completed" }]
        }
    }

Symfony integration note
------------------------
In production this module is called from a Symfony controller via a Python
subprocess or via an HTTP call to the Flask endpoint
POST /api/meetings/:id/generate-summary.

The controller simply POSTs the meeting_id and optional generation settings.
The Flask server reads the stored transcript segments by meeting_id, calls
this service, stores the result, and returns it to the frontend.
"""

from __future__ import annotations

import json
import os
from datetime import date
from typing import Callable, Optional

import requests

from .pv_parser import extract_json


# ── Defaults ───────────────────────────────────────────────────────────────────

OLLAMA_URL   = os.environ.get("OLLAMA_URL",   "http://localhost:11434/api/generate")
DEFAULT_MODEL = "mistral:7b-instruct-q4_K_M"
DEFAULT_TEMPERATURE = 0.2
DEFAULT_LANGUAGE    = "EN"


# ── Service class ──────────────────────────────────────────────────────────────

class PvService:
    """
    Stateless service: each call to `generate()` is independent.
    Can be instantiated once and reused across requests.
    """

    def __init__(
        self,
        ollama_url:  str = OLLAMA_URL,
        model:       str = DEFAULT_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
        language:    str = DEFAULT_LANGUAGE,
    ):
        self.ollama_url  = ollama_url
        self.model       = model
        self.temperature = temperature
        self.language    = language

    # ── Public API ─────────────────────────────────────────────────────────────

    def generate_with_progress(
        self,
        segments:  list[dict],
        settings:  Optional[dict] = None,
        progress_callback: Optional[Callable] = None,
        cancel_check: Optional[Callable] = None,
    ) -> dict:
        """
        Generate a PV from transcript segments in 4 steps to provide progress updates.
        """
        def check_cancel():
            if cancel_check and cancel_check():
                raise Exception("PV Generation Cancelled")

        def update_progress(pct: int, msg: str):
            if progress_callback:
                progress_callback(pct, msg)

        cfg = {
            "model":       self.model,
            "language":    self.language,
            "temperature": self.temperature,
            "format":      "standard",
        }
        if settings:
            cfg.update({k: v for k, v in settings.items() if v is not None})

        transcript_text = self._format_transcript(segments)
        lang   = str(cfg["language"])
        model  = str(cfg["model"])
        temp   = float(cfg.get("temperature", self.temperature))
        fmt    = str(cfg.get("format", "standard")).lower()

        try:
            check_cancel()
            update_progress(10, "Préparation du document et lecture globale...")
            system_prompt, prompt_full = self._build_prompt_full(transcript_text, lang, fmt)

            check_cancel()
            update_progress(50, "Analyse et rédaction en cours (peut prendre qq minutes)...")
            res_full = self._call_ollama(prompt_full, model, temp, cancel_check, system_prompt=system_prompt)

            check_cancel()
            update_progress(95, "Finalisation du document...")

            # extract_json uses _normalise() to output a perfectly structured PV dict
            pv = extract_json(res_full) if res_full else self._fallback_pv(segments)

            # Enrich participants from speaker list if LLM left them empty
            if not pv.get("participants"):
                pv["participants"] = self._extract_participants(segments)

            return pv

        except Exception as e:
            if str(e) == "PV Generation Cancelled":
                raise e
            print(f"[PvService] Error during multi-step generation: {e}")
            return self._fallback_pv(segments)

    # ── Private helpers ────────────────────────────────────────────────────────

    def _format_transcript(self, segments: list[dict]) -> str:
        """Convert segment dicts into a readable plain-text transcript."""
        lines = []
        for seg in segments:
            speaker = seg.get("speaker", "Speaker")
            time    = seg.get("timeStart", "")
            text    = seg.get("text", "")
            lines.append(f"[{time}] {speaker}: {text}")
        return "\n".join(lines)

    def _build_prompt_full(self, transcript_text: str, language: str, fmt: str = "standard") -> str:
        format_style = {
            "court":    "Be very concise and synthetic — keep each section to 1-2 sentences maximum.",
            "standard": "Keep it concise and professional.",
            "detaille": "Be thorough and detailed — provide comprehensive coverage of all discussion points.",
        }.get(fmt, "Keep it concise and professional.")
        lang_map = {
            "EN": {
                "label": "ENGLISH",
                "instr": "Analyze the entire meeting transcript and generate a complete structured report in ENGLISH.",
                "format_instr": "RESPOND EXACTLY WITH THE FOLLOWING MARKDOWN FORMAT (DO NOT USE JSON).",
                "style_instr": "Keep it concise and professional.",
                "h1": "Title",
                "h2": "Date",
                "h3": "Participants",
                "h4": "Executive Summary",
                "h5": "Key Decisions",
                "h6": "Actions",
                "p1": "[A short, concise meeting title]",
                "p2": "[Date of the meeting or today's date]",
                "p3": "- [Name 1]\n- [Name 2]",
                "p4": "[A 2-4 sentence executive summary of the entire meeting]",
                "p5": "- [Decision 1]\n- [Decision 2]",
                "p6": "- [Action Description] - [Owner or TBD] - [Due Date or None]"
            },
            "AR": {
                "label": "ARABIC",
                "instr": "قم بتحليل نص الاجتماع بالكامل وإنشاء تقرير منظم باللغة العربية.",
                "format_instr": "أجب تمامًا بتنسيق MARKDOWN التالي (لا تستخدم JSON).",
                "style_instr": "حافظ على الإيجاز والاحترافية.",
                "h1": "العنوان",
                "h2": "التاريخ",
                "h3": "المشاركون",
                "h4": "ملخص تنفيذي",
                "h5": "القرارات الرئيسية",
                "h6": "الإجراءات",
                "p1": "[عنوان قصير وموجز للاجتماع]",
                "p2": "[تاريخ الاجتماع أو تاريخ اليوم]",
                "p3": "- [الاسم 1]\n- [الاسم 2]",
                "p4": "[ملخص تنفيذي من 2-4 جمل للاجتماع بأكمله]",
                "p5": "- [القرار 1]\n- [القرار 2]",
                "p6": "- [وصف الإجراء] - [المسؤول أو سيتم تحديده] - [تاريخ الاستحقاق أو لا يوجد]"
            },
            "FR": {
                "label": "FRENCH",
                "instr": "Analyse l'intégralité de la transcription de la réunion et génère un compte-rendu structuré complet en FRANÇAIS.",
                "format_instr": "RÉPONDS EXACTEMENT AVEC LE FORMAT MARKDOWN SUIVANT (N'UTILISE PAS DE JSON).",
                "style_instr": "Reste concis et professionnel.",
                "h1": "Titre",
                "h2": "Date",
                "h3": "Participants",
                "h4": "Résumé Exécutif",
                "h5": "Décisions Clés",
                "h6": "Actions",
                "p1": "[Un titre de réunion court et concis]",
                "p2": "[Date de la réunion ou date du jour]",
                "p3": "- [Nom 1]\n- [Nom 2]",
                "p4": "[Un résumé exécutif de 2 à 4 phrases de toute la réunion]",
                "p5": "- [Décision 1]\n- [Décision 2]",
                "p6": "- [Description de l'action] - [Responsable ou TBD] - [Date d'échéance ou aucune]"
            }
        }
        
        info = lang_map.get(language, lang_map["EN"])
        # Override with the requested format style
        info = dict(info)
        info["style_instr"] = format_style
        label = info["label"]

        system_prompt = (
            f"You are a professional meeting minutes writer. "
            f"You MUST write your ENTIRE response in {label} — every word, every sentence. "
            f"The meeting transcript may be in a different language. That is expected. "
            f"Your job is to summarize and translate the content into {label}. "
            f"NEVER switch to the transcript's language. Output strictly in {label} only."
        )

        user_prompt = f"""{info['instr']}
TRANSCRIPT:
---
{transcript_text}
---
{info['format_instr']}
{info['style_instr']}

CRITICAL: ALL text below MUST be written in {label}. Do NOT use any other language.

# 1. {info['h1']}
{info['p1']}

# 2. {info['h2']}
{info['p2']}

# 3. {info['h3']}
{info['p3']}

# 4. {info['h4']}
{info['p4']}

# 5. {info['h5']}
{info['p5']}

# 6. {info['h6']}
{info['p6']}
"""
        return system_prompt, user_prompt

    def _call_ollama(self, prompt: str, model: str, temperature: float, cancel_check: Optional[Callable] = None, system_prompt: str = "") -> Optional[str]:
        """Call the Ollama chat API with an optional system role for language enforcement."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model":      model,
            "messages":   messages,
            "stream":     True,
            "keep_alive": 300,  # Keep model in VRAM for 5 min (avoids reload overhead between calls)
            "options": {
                "temperature": temperature,
                "num_ctx":     8192,   # Balanced context window for 6GB VRAM (RTX 4050)
                "num_gpu":     999,    # Force all layers on GPU
            }
        }

        try:
            response = requests.post(
                self.ollama_url.replace("/api/generate", "/api/chat"),
                json=payload,
                stream=True,
                timeout=None,
            )
            response.raise_for_status()

            generated_text = []
            for line in response.iter_lines():
                if cancel_check and cancel_check():
                    print("[PvService] User cancelled generation during Ollama streaming.")
                    raise Exception("PV Generation Cancelled")

                if not line:
                    continue
                try:
                    chunk_data = json.loads(line.decode("utf-8"))
                    # /api/chat returns {"message": {"content": "..."}}
                    content = chunk_data.get("message", {}).get("content", "")
                    generated_text.append(content)
                    if chunk_data.get("done", False):
                        break
                except (json.JSONDecodeError, UnicodeDecodeError):
                    continue

            return "".join(generated_text)

        except requests.exceptions.ConnectionError:
            print(
                f"[PvService] ERROR: Cannot connect to Ollama at {self.ollama_url}.\n"
                f"            Make sure Ollama is running: 'ollama serve'\n"
                f"            And the model is pulled: 'ollama pull {model}'"
            )
            return None
        except requests.exceptions.Timeout:
            print("[PvService] ERROR: Ollama request timed out.")
            return None
        except Exception as e:
            print(f"[PvService] ERROR: Unexpected error calling Ollama: {e}")
            return None

    def _extract_participants(self, segments: list[dict]) -> list[dict]:
        """Build participant list from unique speaker names in the transcript."""
        seen = set()
        participants = []
        for seg in segments:
            speaker = seg.get("speaker", "")
            if speaker and speaker not in seen:
                seen.add(speaker)
                participants.append({
                    "name":      speaker,
                    "function":  "Participant",
                    "signature": "",
                    "comment":   ""
                })
        return participants

    def _fallback_pv(self, segments: list[dict]) -> dict:
        """Return a minimal but valid PV when Ollama is unavailable."""
        speakers = list({seg.get("speaker", "") for seg in segments if seg.get("speaker")})
        full_text = " ".join(seg.get("text", "") for seg in segments)
        # Rough word-count summary
        word_count = len(full_text.split())
        return {
            "title":    "Réunion — PV généré localement",
            "date":     date.today().strftime("%d/%m/%Y"),
            "location": "Non mentionné",
            "type":     "Interne",
            "participants": [
                {"name": s, "function": "Participant", "signature": "", "comment": ""}
                for s in speakers
            ],
            "content": {
                "executiveOverview": (
                    f"PV généré sans IA (Ollama non disponible). "
                    f"La réunion impliquait {len(speakers)} participant(s) "
                    f"pour un total de {word_count} mots transcrits."
                ),
                "keyDecisions": ["(À compléter manuellement)"],
                "nextSteps":    [{"task": "(À compléter manuellement)", "owner": "TBD", "due": "", "completed": False}],
            }
        }
