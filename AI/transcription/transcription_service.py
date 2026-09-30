"""
transcription_service.py
========================
Core AI transcription + speaker-diarization service.

This module is intentionally framework-agnostic.
A Symfony controller will:
    1. Save the uploaded audio file to a temp path.
    2. Call `TranscriptionService.run(audio_path, meeting_id)`.
    3. Read back the result JSON from the job store.

Architecture notes
------------------
- Models are loaded **once** at service initialization (expensive) and
  reused across requests — critical for performance in a server context.
- `run()` is designed to be called from a background worker / queue so
  the HTTP response is returned immediately while processing happens
  asynchronously (matches the polling pattern in ProcessingScreen.jsx).
- Status/progress updates are pushed to `JobStore` (see job_store.py)
  so the polling endpoint can report live progress.

Output – transcript segments (JSON-serializable list)
------------------------------------------------------
Each element matches the shape expected by TranscriptionView.jsx:
{
    "id":           int,      # 1-based segment index
    "speaker":      str,      # e.g. "Speaker A"
    "speakerColor": str,      # deterministic hex colour per speaker label
    "timeStart":    str,      # "MM:SS"  (from segment start)
    "timeEnd":      str,      # "MM:SS"  (from segment end)
    "text":         str       # Transcribed / translated text
}
"""

import os
import sys
import datetime
import traceback
import threading
from pathlib import Path
from typing import Any, Optional

import torch

from .audio_utils import prepare_audio
from .job_store   import JobStore

# ── Module-level GPU lock ───────────────────────────────────────────────────────
# Prevents two concurrent transcription jobs from loading Whisper into VRAM
# simultaneously, which causes CUDA OOM on GPUs with limited memory (e.g. RTX 4050).
# Each job acquires this lock before loading models and releases it when done.
_GPU_LOCK = threading.Lock()


# ── Speaker colour palette (matches frontend palette) ──────────────────────────
# Colours cycle if there are more speakers than palette entries.
_SPEAKER_COLOURS = [
    "#3B82F6",   # blue
    "#10B981",   # emerald
    "#8B5CF6",   # violet
    "#F59E0B",   # amber
    "#EF4444",   # red
    "#06B6D4",   # cyan
    "#EC4899",   # pink
    "#84CC16",   # lime
]


# ── Main service class ─────────────────────────────────────────────────────────

class TranscriptionService:
    """
    Loads AI models once and exposes a single `run()` method.

    Usage (from a Symfony PHP <-> Python bridge or a standalone worker)
    -------------------------------------------------------------------
    service = TranscriptionService(offline_mode=True)
    service.run(
        audio_path = "/tmp/uploads/meeting_42.mp3",
        meeting_id = 42,
        store      = job_store_instance          # JobStore
    )

    Symfony integration
    -------------------
    The Symfony controller calls a Python script (via `Process` or a
    message queue) that instantiates this class and calls `run()`.
    The controller then relies on `GET /api/meetings/:id/status` to read
    progress / result from the shared JobStore.
    """

    def __init__(self, offline_mode: bool = True):
        """
        Load AI models.

        Parameters
        ----------
        offline_mode : bool
            If True, sets HuggingFace env vars to avoid any HTTP calls
            (requires models to have been downloaded previously).
        """
        self._configure_env(offline_mode)
        self._configure_stdout()
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._pipeline = None
        self._model    = None
        self._translation_svc: Optional["TranslationService"] = None

    # ── Public ────────────────────────────────────────────────────────────────

    def run(self, audio_path: str, meeting_id, store: JobStore,
            target_language: str = "en") -> None:
        """
        Full pipeline: audio prep → diarization → transcription → alignment → [translation].

        Parameters
        ----------
        target_language : str
            BCP-47 language code for the desired transcript output (e.g. 'en', 'fr', 'ar').
            If different from the detected audio language, a post-transcription translation
            step is performed via LM Studio (TowerInstruct-Mistral-7B-v0.2).

        Result is stored in *store* under *meeting_id*.
        On success  → ``store.set_done(meeting_id, segments)``
        On failure  → ``store.set_error(meeting_id, message)``

        This method is blocking; run it inside a thread / worker process.
        """
        import concurrent.futures
        tmp_wav = audio_path + "_16k.wav"
        try:
            # ── Acquire GPU lock (serialize jobs to prevent CUDA OOM) ──────
            device_type = self._device.type
            lock_held = False
            if device_type == "cuda":
                store.update(meeting_id, progress=2, step="Waiting for GPU (another job is running)…")
                _GPU_LOCK.acquire()
                lock_held = True

            # ── Loading Models Just-In-Time ────────────────────────────────
            store.update(meeting_id, progress=5, step="Loading AI Models into VRAM…")
            if self._pipeline is None:
                self._pipeline = self._load_diarization_pipeline()
            if self._model is None:
                self._model = self._load_whisper_model()
            if store.is_cancelled(meeting_id):
                return
            
            # ── Step 1: Audio preparation ─────────────────────────────────
            store.update(meeting_id, progress=10, step="Preparing audio…")
            audio_dict = prepare_audio(audio_path, tmp_wav)
            if store.is_cancelled(meeting_id): return

            # ── Step 2 & 3: Diarization & Transcription (Parallel) ────────
            store.update(meeting_id, progress=25, step="Diarization + transcription (parallel)…")

            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future_diar   = executor.submit(self._run_diarization, audio_dict)
                future_trans  = executor.submit(
                    self._run_transcription, tmp_wav, meeting_id, store, target_language
                )
                diarization = future_diar.result()
                transcript_segments, detected_lang = future_trans.result()

            if store.is_cancelled(meeting_id): return

            # ── Step 4: Alignment ─────────────────────────────────────────
            store.update(meeting_id, progress=78, step="Writing transcript…")
            segments = self._align(transcript_segments, diarization)
            if store.is_cancelled(meeting_id): return

            # ── Step 5: Translation (if needed) ───────────────────────────
            # detected_lang is a BCP-47 code returned by Whisper (e.g. 'fr', 'ar', 'en').
            # We translate whenever the detected language differs from the target.
            # This includes Darja (detected as 'ar') → 'fr' or 'en'.
            _ARABIC_VARIANTS = {"ar", "arb", "apc", "ary", "aeb"}  # MSA + dialects Whisper may return
            detected_is_arabic = detected_lang in _ARABIC_VARIANTS or detected_lang.startswith("ar")
            needs_translation = detected_lang != target_language
            if needs_translation:
                store.update(meeting_id, progress=82,
                             step=f"Translating transcript to {target_language.upper()}…")
                print(f"[Meeting-AI] Translating from '{detected_lang}' → '{target_language}' "
                      f"(Arabic/Darja detected: {detected_is_arabic})")
                segments = self._translate_segments(
                    segments, detected_lang, target_language, store, meeting_id
                )

            if store.is_cancelled(meeting_id): return

            # ── Step 6: Behavioral Analytics ───────────────────────────────
            store.update(meeting_id, progress=88, step="Analyzing behavior…")
            from .acoustic_features import AcousticFeatureExtractor
            from .behavioral_analysis import BehavioralAnalyzer
            
            try:
                # Obtenir la durée de l'audio complet pour les stats
                total_duration = _get_wav_duration(tmp_wav)
                
                # Save total duration to job store so it can be queried by frontend
                with store._lock:
                    job = store._jobs.get(meeting_id, {})
                    job["duration_seconds"] = total_duration
                    store._jobs[meeting_id] = job
                
                # Récupérer les segments pyannote bruts pour les stats de parole
                raw_speaker_stats = self._get_speaker_statistics(diarization, total_duration)
                interruptions_data = self._detect_interruptions(diarization)
                
                feature_extractor = AcousticFeatureExtractor()
                behavioral_analyzer = BehavioralAnalyzer()

                # Reformater les segments (secondes brutes) pour l'extracteur OpenSMILE
                acoustic_segments = []
                for spk_id, spk_data in raw_speaker_stats.items():
                    for inter in spk_data['interventions']:
                        acoustic_segments.append({
                            "speaker": spk_id,
                            "start": inter["start"],
                            "end": inter["end"]
                        })

                # Extraire les features sur ces segments (qui utilisent le format "SPEAKER_00")
                acoustic_features = feature_extractor.extract_speaker_features(tmp_wav, acoustic_segments)
                
                behavioral_results = {}
                
                for speaker_id, spk_stats in raw_speaker_stats.items():
                    # Map the raw pyannote ID (e.g. SPEAKER_00) back to the assigned name via the same logic used in _align
                    # Simple hack: find the assigned name by searching our final 'segments'
                    speaker_name = speaker_id 
                    for seg in segments:
                        if seg.get("_raw_speaker") == speaker_id:
                            speaker_name = seg["speaker"]
                            break
                            
                    speaker_interruptions = interruptions_data.get(speaker_id, {
                        'interruptions_made': 0,
                        'interruptions_received': 0
                    })
                    
                    spk_segments_list = spk_stats['interventions']
                    
                    analysis = behavioral_analyzer.analyze_speaker(
                        speaker_stats=spk_stats,
                        acoustic_features=acoustic_features.get(speaker_id, {}),
                        interruptions=speaker_interruptions,
                        total_duration=total_duration,
                        segments=spk_segments_list,
                        all_stats=raw_speaker_stats
                    )
                    
                    behavioral_results[speaker_name] = analysis['mesures']

                # Store behavioral analytics directly into the store
                store.store_analytics(meeting_id, behavioral_results)
                
            except Exception as e:
                print(f"[Meeting-AI] Behavioral analysis failed for {meeting_id}: {e}")
                error_trace = traceback.format_exc()
                print(error_trace)
                
                # Expose the error via JobStore so we can debug it!
                with store._lock:
                    job = store._jobs.get(meeting_id, {})
                    job["analytics_error"] = str(e) + "\n" + error_trace
                    store._jobs[meeting_id] = job
            
            if store.is_cancelled(meeting_id): return

            # ── Done ──────────────────────────────────────────────────────
            store.set_done(meeting_id, segments)

        except Exception as exc:
            traceback.print_exc()
            store.set_error(meeting_id, str(exc))
        finally:
            _cleanup(tmp_wav)
            self._free_vram()
            if lock_held:
                _GPU_LOCK.release()

    # ── Private: Memory Management ────────────────────────────────────────────

    def _free_vram(self) -> None:
        """Explicitly deletes the models and runs garbage collection to free VRAM for Ollama."""
        print("[Meeting-AI] Transcription finished. Releasing GPU VRAM...")
        
        # Unload LM Studio translation model if it was used during transcription
        if self._translation_svc is not None:
            try:
                self._translation_svc.unload_model()
            except Exception as e:
                print(f"[Meeting-AI] [WARN] Error unloading translation model: {e}")
            self._translation_svc = None
        
        # Delete references to large models
        self._pipeline = None
        self._model = None
        
        # Force Python garbage collector to clean up the objects
        import gc
        gc.collect()
        
        # Force PyTorch to release the allocated GPU memory back to the OS
        if self._device.type == "cuda":
            torch.cuda.empty_cache()
            print("[Meeting-AI] VRAM released.")

    # ── Private: model loading ────────────────────────────────────────────────

    @staticmethod
    def _configure_env(offline_mode: bool) -> None:
        if offline_mode:
            os.environ["HF_HUB_OFFLINE"]          = "1"
            os.environ["TRANSFORMERS_OFFLINE"]     = "1"
            os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
            os.environ["HF_DATASETS_OFFLINE"]      = "1"
        else:
            for var in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_HUB_DISABLE_TELEMETRY", "HF_DATASETS_OFFLINE"):
                os.environ.pop(var, None)
        
        # Explicit check for the user to confirm their RTX 4050 is active
        print("\n" + "="*40)
        if torch.cuda.is_available():
            print(f"[Meeting-AI] [OK] GPU DETECTED: {torch.cuda.get_device_name(0)}")
            print("[Meeting-AI] [INFO] AI Models will run on hardware acceleration.")
        else:
            print("[Meeting-AI] [WARN] WARNING: GPU NOT DETECTED (torch.cuda.is_available() is False)")
            print("[Meeting-AI] [WARN] Models will run on CPU and be extremely slow.")
            print("[Meeting-AI] [WARN] To fix: pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
        print("="*40 + "\n")

    @staticmethod
    def _configure_stdout() -> None:
        if sys.platform == "win32":
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")

    def _load_diarization_pipeline(self):
        token = os.environ.get("HF_TOKEN", "").strip()
        try:
            import torchvision  # Known workaround for Windows PyLightning circular import bug
            from pyannote.audio import Pipeline
            import torch

            print("[Meeting-AI] Loading Pyannote speaker diarization pipeline...")
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                token=token if token else None
            )
            if pipeline is None:
                print("[Meeting-AI] [WARN] Pipeline.from_pretrained returned None.")
                return None

            pipeline.to(self._device)

            # FORCE FP16: cast internal pyannote nn.Module models to float16 for ~2x faster GPU.
            if self._device.type == "cuda":
                import torch.nn as nn
                for attr_val in vars(pipeline).values():
                    if isinstance(attr_val, nn.Module):
                        try:
                            attr_val.half()
                        except Exception:
                            pass  # skip any module that can't operate in fp16

            print("[Meeting-AI] [OK] Pyannote diarization pipeline loaded successfully.")
            return pipeline
        except Exception as e:
            print(f"\n[Meeting-AI] [WARN] Pyannote diarization unavailable: {e}")
            print("[Meeting-AI] [INFO] To enable multi-speaker diarization:")
            print("  1. Create a Hugging Face account and get a token at https://hf.co/settings/tokens")
            print("  2. Accept model conditions at https://hf.co/pyannote/speaker-diarization-3.1 and https://hf.co/pyannote/segmentation-3.0")
            print("  3. Set HF_TOKEN=hf_... in AI/.env")
            print("[Meeting-AI] [INFO] Continuing with single-speaker transcription fallback.\n")
            return None

    def _load_whisper_model(self):
        from faster_whisper import WhisperModel
        compute_type = "float16" if self._device.type == "cuda" else "int8"

        # 1. Custom model from environment variable if specified
        custom_model = os.environ.get("WHISPER_MODEL", "").strip()
        if custom_model:
            try:
                print(f"[Meeting-AI] Loading Whisper model from WHISPER_MODEL='{custom_model}'...")
                return WhisperModel(custom_model, device=str(self._device), compute_type=compute_type, num_workers=4, cpu_threads=8)
            except Exception as e:
                print(f"[Meeting-AI] [WARN] Failed loading WHISPER_MODEL='{custom_model}': {e}")

        # 2. Local fine-tuned Darija CTranslate2 model if present
        local_ct2 = Path(__file__).resolve().parent.parent / "models" / "whisper-darija-ct2"
        if local_ct2.exists() and (local_ct2 / "model.bin").exists():
            try:
                print(f"[Meeting-AI] Loading local fine-tuned Whisper model from {local_ct2}...")
                return WhisperModel(str(local_ct2), device=str(self._device), compute_type=compute_type, num_workers=4, cpu_threads=8)
            except Exception as e:
                print(f"[Meeting-AI] [WARN] Failed loading local CT2 model: {e}")

        # 3. Fallback: try large-v3, then small, then base
        for model_name in ["large-v3", "small", "base"]:
            try:
                print(f"[Meeting-AI] Attempting to load Whisper model '{model_name}'...")
                return WhisperModel(
                    model_name,
                    device=str(self._device),
                    compute_type=compute_type,
                    num_workers=4,
                    cpu_threads=8,
                )
            except Exception as e:
                print(f"[Meeting-AI] [WARN] Could not load Whisper '{model_name}': {e}")

        raise RuntimeError("No Whisper model could be loaded locally or from HuggingFace.")

    # ── Private: pipeline steps ───────────────────────────────────────────────

    def _run_diarization(self, audio_dict: dict):
        """Return a pyannote Annotation object (speaker timeline) or None."""
        if self._pipeline is None:
            return None
        try:
            from pyannote.audio.pipelines.utils.hook import ProgressHook
            with ProgressHook() as hook:
                result = self._pipeline(audio_dict, hook=hook)
            return result.speaker_diarization if hasattr(result, "speaker_diarization") else result
        except Exception as e:
            print(f"[Meeting-AI] [WARN] Diarization failed during execution: {e}. Falling back to single-speaker.")
            return None

    def _run_transcription(
        self,
        wav_path: str,
        meeting_id,
        store: JobStore,
        target_language: str = "en",
    ) -> tuple[list, str]:
        """
        Run Whisper and return ``(segments, detected_language)``.

        Strategy
        --------
        - target_language == 'en'  → task='translate'  (Whisper native, best quality for → EN)
        - target_language != 'en'  → task='transcribe' (keep original language; translation is
                                                         handled afterwards by TranslationService)
        """
        import subprocess, glob, json

        # ── Whisper task selection ─────────────────────────────────────────
        # For Darja/Arabic: always transcribe first (in Arabic script), then
        # use LocalTranslationService (argostranslate) for local offline translation.
        # Whisper's built-in 'translate' task is poor on Darija/dialectal Arabic.
        if target_language == "en" and False:   # disabled: local translation preferred
            whisper_task   = "translate"
            initial_prompt = (
                "This is a conversation in Moroccan Darija, Tunisian Arabic, French, and English. "
                "Translate everything into standard English."
            )
        else:
            whisper_task   = "transcribe"
            initial_prompt = (
                "This is a multilingual meeting conversation that may include Moroccan Darija "
                "(دارجة), Tunisian Arabic, Modern Standard Arabic, French, and English. "
                "Transcribe the audio accurately in its original language and script. "
                "For Arabic dialects, use Arabic script (not Latin transliteration)."
            )

        chunk_dir = wav_path + "_chunks"
        os.makedirs(chunk_dir, exist_ok=True)
        chunk_pattern = os.path.join(chunk_dir, "chunk_%03d.wav")

        subprocess.run([
            "ffmpeg", "-i", wav_path,
            "-f", "segment", "-segment_time", "900",
            "-acodec", "pcm_s16le",
            chunk_pattern, "-y"
        ], check=True, capture_output=True)

        chunks = sorted(glob.glob(os.path.join(chunk_dir, "*.wav")))
        all_results: list = []
        detected_lang: str = target_language  # fallback if we can't detect
        time_offset = 0.0

        if not chunks:
            return [], detected_lang

        # Progress goes from ~25 to 75 during transcription
        start_progress = 25
        end_progress   = 75
        progress_per_chunk = (end_progress - start_progress) / len(chunks)

        for i, chunk_path in enumerate(chunks):
            if store.is_cancelled(meeting_id):
                return [], detected_lang
            
            current_progress = start_progress + int(i * progress_per_chunk)
            store.update(meeting_id, progress=current_progress,
                         step=f"Transcription ({i+1}/{len(chunks)})…")

            segments_gen, info = self._model.transcribe(
                chunk_path,
                beam_size=1,
                vad_filter=True,
                vad_parameters={"min_silence_duration_ms": 500},
                word_timestamps=True,
                task=whisper_task,
                condition_on_previous_text=False,
                no_speech_threshold=0.6,
                temperature=0.0,
                initial_prompt=initial_prompt,
            )

            # Capture Whisper's detected language from the first chunk
            if i == 0 and info and hasattr(info, 'language') and info.language:
                detected_lang = info.language
                print(f"[Meeting-AI] Whisper detected language: '{detected_lang}' (target: '{target_language}')")

            for segment in segments_gen:
                if store.is_cancelled(meeting_id):
                    print(f"[Meeting-AI] Transcription loop aborted cleanly for {meeting_id}.")
                    return [], detected_lang
                for word in segment.words:
                    word.start += time_offset
                    word.end   += time_offset
                segment.start += time_offset
                segment.end   += time_offset
                all_results.append(segment)

            if all_results:
                last = all_results[-1]
                if last.words:
                    print(f"[Chunk {chunk_path}] offset={time_offset:.1f}s | last word: '{last.words[-1].word}' @ {last.words[-1].end:.1f}s")

            time_offset += _get_wav_duration(chunk_path)
            _cleanup(chunk_path)

        try:
            os.rmdir(chunk_dir)
        except OSError:
            pass

        return all_results, detected_lang

    def _translate_segments(
        self,
        segments: list,
        source_lang: str,
        target_lang: str,
        store: JobStore,
        meeting_id,
    ) -> list:
        """
        Translate the ``text`` field of all aligned segments.

        Translation priority
        --------------------
        1. LocalTranslationService (argostranslate) — fully offline, no LM Studio needed.
           Handles Arabic/Darja → FR and Arabic/Darja → EN natively.
        2. TranslationService (LM Studio TowerInstruct / Ollama) — fallback for unsupported
           language pairs or when argostranslate returns empty output.
        """
        if store.is_cancelled(meeting_id):
            return segments

        # 1. Extract all texts
        original_texts = [seg.get("text", "") for seg in segments]

        # ── Attempt 1: Local offline translation (argostranslate) ──────────────
        # Normalize source lang: Whisper may return 'ar', 'arb', 'ary' for Darja/Arabic
        _src = "ar" if (source_lang.startswith("ar") or source_lang in {"arb", "ary", "aeb", "apc"}) else source_lang
        _tgt = target_lang.split("-")[0].lower()  # 'fr-FR' → 'fr'

        store.update(meeting_id, progress=83,
                     step=f"Translating transcript locally ({_src.upper()} → {_tgt.upper()})…")
        local_svc = LocalTranslationService()
        translated_texts = local_svc.translate_batch(original_texts, _src, _tgt)

        # Check if local translation actually produced output (non-empty results)
        local_success = any(
            translated_texts[i] != original_texts[i]
            for i in range(len(original_texts))
            if original_texts[i].strip()
        )

        # ── Attempt 2: Fallback to LM Studio / Ollama ──────────────────────────
        if not local_success:
            print(f"[Meeting-AI] [WARN] Local translation produced no changes. Falling back to LM Studio/Ollama…")
            if self._translation_svc is None:
                self._translation_svc = TranslationService()
            store.update(meeting_id, progress=85,
                         step=f"Translating transcript via LM (fallback)…")
            translated_texts = self._translation_svc.translate_batch(
                original_texts, target_lang
            )

        # 3. Map back to segments
        translated_segments = []
        for i, seg in enumerate(segments):
            new_seg = dict(seg)
            if i < len(translated_texts) and original_texts[i].strip():
                new_seg["text"] = translated_texts[i]
            translated_segments.append(new_seg)

        return translated_segments

    # ── Private: alignment ────────────────────────────────────────────────────

    def _align(self, transcript_segments: list, diarization) -> list:
        """
        Word-level speaker assignment + segment grouping.
        """
        if diarization is None:
            # Fallback when diarization is disabled or unavailable (single-speaker mode)
            all_words = []
            for seg in transcript_segments:
                words = getattr(seg, "words", None) or []
                for word in words:
                    all_words.append({
                        "word":    word.word.strip(),
                        "start":   word.start,
                        "end":     word.end,
                        "speaker": "SPEAKER_00",
                    })
            if not all_words:
                return [
                    {
                        "id":           idx + 1,
                        "speaker":      "Intervenant 1",
                        "speakerColor": "#3B82F6",
                        "timeStart":    _fmt_time(getattr(seg, 'start', 0.0)),
                        "timeEnd":      _fmt_time(getattr(seg, 'end', 0.0)),
                        "text":         getattr(seg, 'text', '').strip(),
                        "_raw_speaker": "SPEAKER_00"
                    }
                    for idx, seg in enumerate(transcript_segments)
                ]
            raw_segments = _group_words_smoothed(all_words)
            label_to_name   = _build_label_map(raw_segments)
            label_to_colour = _build_colour_map(raw_segments)
            return [
                {
                    "id":           idx + 1,
                    "speaker":      label_to_name.get(seg["speaker"], "Intervenant 1"),
                    "speakerColor": label_to_colour.get(seg["speaker"], "#3B82F6"),
                    "timeStart":    _fmt_time(seg["start"]),
                    "timeEnd":      _fmt_time(seg["end"]),
                    "text":         seg["text"],
                    "_raw_speaker": seg["speaker"]
                }
                for idx, seg in enumerate(raw_segments)
            ]

        from pyannote.core import Segment

        # ── Pass 1: Extract all words ────────────────────────────
        all_words = []
        for seg in transcript_segments:
            for word in seg.words:
                all_words.append({
                    "word":    word.word.strip(),
                    "start":   word.start,
                    "end":     word.end,
                    "speaker": "Unknown",
                })

        # ── Pass 2: Assign speaker by pyannote boundaries ───────────────────
        for w in all_words:
            # PyAnnote is accurate, Whisper timestamps bleed.
            # We check the exact middle of the word.
            mid = (float(w["start"]) + float(w["end"])) / 2.0
            
            # Crop a tiny window around the word's midpoint to see who was speaking
            matches = diarization.crop(Segment(mid - 0.01, mid + 0.01)).labels()
            
            if matches:
                # If multiple people speak at the exact same millisecond, pick the first
                w["speaker"] = matches[0]
            else:
                # If Whisper hallucinated a word in a "silent" zone, check a wider window (0.5s)
                # to snap the bleeding word back to the person who just stopped speaking.
                wider_matches = diarization.crop(Segment(mid - 0.5, mid + 0.5)).labels()
                if wider_matches:
                    w["speaker"] = wider_matches[0]

        # ── Pass 3: Fill completely isolated Unknowns ────────────────────────
        _fill_unknown_speakers(all_words)

        # --- Pass 3: Group words into segments ---
        raw_segments = _group_words_smoothed(all_words)

        # --- Pass 4: Map pyannote labels (SPEAKER_00) to UI-friendly names ---
        label_to_name  = _build_label_map(raw_segments)
        label_to_colour = _build_colour_map(raw_segments)

        return [
            {
                "id":           idx + 1,
                "speaker":      label_to_name[seg["speaker"]],
                "speakerColor": label_to_colour[seg["speaker"]],
                "timeStart":    _fmt_time(seg["start"]),
                "timeEnd":      _fmt_time(seg["end"]),
                "text":         seg["text"],
                "_raw_speaker": seg["speaker"]  # Added for behavioral analytics grouping
            }
            for idx, seg in enumerate(raw_segments)
        ]


    # ── Private: Behavioral Analytics Helpers ─────────────────────────────────

    @staticmethod
    def _get_speaker_statistics(diarization, total_duration: float) -> dict:
        """
        Extrait les statistiques de base du locuteur depuis la diarisation.
        """
        if diarization is None:
            return {
                'SPEAKER_00': {
                    'total_speaking_time': total_duration,
                    'num_interventions': 1,
                    'interventions': [{'start': 0.0, 'end': total_duration, 'duration': total_duration}],
                    'speaking_time_percentage': 100.0,
                    'avg_intervention_duration': total_duration,
                }
            }
        stats = {}
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            if speaker not in stats:
                stats[speaker] = {
                    'total_speaking_time': 0.0,
                    'num_interventions': 0,
                    'interventions': []
                }
            
            duration = turn.end - turn.start
            stats[speaker]['total_speaking_time'] += duration
            stats[speaker]['num_interventions'] += 1
            stats[speaker]['interventions'].append({'start': turn.start, 'end': turn.end, 'duration': duration})
            
        # Enrichir
        for speaker, s in stats.items():
            s['speaking_time_percentage'] = (s['total_speaking_time'] / total_duration) * 100 if total_duration > 0 else 0
            s['avg_intervention_duration'] = s['total_speaking_time'] / s['num_interventions'] if s['num_interventions'] > 0 else 0
            
        return stats

    @staticmethod
    def _detect_interruptions(diarization, tolerance: float = 2.0) -> dict:
        """
        Détecte les interruptions en analysant les chevauchements et changements rapides.
        """
        if diarization is None:
            return {}
        interruptions = {}
        # diarization est un objet pyannote.core.Annotation
        speaker_turns = list(diarization.itertracks(yield_label=True))
        
        for i in range(len(speaker_turns)):
            turn1, _, speaker1 = speaker_turns[i]
            
            if speaker1 not in interruptions:
                interruptions[speaker1] = {'interruptions_made': 0, 'interruptions_received': 0}
                
            for j in range(i + 1, min(i + 5, len(speaker_turns))):
                turn2, _, speaker2 = speaker_turns[j]
                
                if speaker1 == speaker2:
                    continue
                    
                # Détection d'interruption : speaker2 commence à parler alors que speaker1 parle encore
                # (chevauchement) ou juste après (coupure de parole)
                if (turn2.start > turn1.start) and (turn2.start < turn1.end + 0.5):
                    if turn2.end - turn2.start > tolerance:
                        # Vraie interruption (pas juste un "oui")
                        # Initialiser speaker2 s'il n'est pas encore dans le dict
                        if speaker2 not in interruptions:
                            interruptions[speaker2] = {'interruptions_made': 0, 'interruptions_received': 0}
                        interruptions[speaker2]['interruptions_made'] += 1
                        interruptions[speaker1]['interruptions_received'] += 1
                        
                # Optimization: break si on est trop loin dans le temps
                if turn2.start > turn1.end + 2.0:
                    break
                    
        return interruptions


# ── Local Translation Service (argostranslate — fully offline) ─────────────────

class LocalTranslationService:
    """
    Offline translation using argostranslate.

    Supported routes
    ----------------
    - ar → en  : direct package (available in argostranslate index)
    - ar → fr  : pivot via ar → en → fr  (no direct ar→fr package exists)
    - fr → en  : direct package
    - en → fr  : direct package

    Language packages are downloaded once and cached locally.
    First use requires internet; subsequent runs are fully offline.
    """

    # Direct pairs available in the argostranslate package index
    _DIRECT_PAIRS = {
        ("ar", "en"),
        ("en", "fr"),
        ("fr", "en"),
        ("en", "ar"),
    }

    # Pivot routes for pairs that have no direct package
    # format: (from, to) -> [intermediate_lang, ...]
    _PIVOT_ROUTES = {
        ("ar", "fr"): ["en"],   # ar → en → fr
        ("fr", "ar"): ["en"],   # fr → en → ar
    }

    def _ensure_package(self, from_code: str, to_code: str) -> bool:
        """
        Ensure the argostranslate package for (from_code → to_code) is installed.
        Downloads it if needed. Returns True if ready.
        """
        try:
            from argostranslate import package, translate

            # Check if already installed
            installed = translate.get_installed_languages()
            src_langs = [l for l in installed if l.code == from_code]
            if src_langs:
                if any(t.to_lang.code == to_code for t in src_langs[0].translations_to):
                    return True

            # Not found — attempt to download
            print(f"[Meeting-AI] [LocalTranslation] Downloading package: {from_code}→{to_code}…")
            package.update_package_index()
            available = package.get_available_packages()
            pkg = next(
                (p for p in available if p.from_code == from_code and p.to_code == to_code),
                None
            )
            if pkg is None:
                print(f"[Meeting-AI] [LocalTranslation] No package found for {from_code}→{to_code}.")
                return False

            pkg_path = pkg.download()
            package.install_from_path(pkg_path)
            print(f"[Meeting-AI] [LocalTranslation] Package {from_code}→{to_code} installed.")
            return True

        except Exception as e:
            print(f"[Meeting-AI] [LocalTranslation] Package setup failed ({from_code}→{to_code}): {e}")
            return False

    def _get_translator(self, from_code: str, to_code: str):
        """Return the argostranslate ITranslation object, or None if unavailable."""
        try:
            from argostranslate import translate
            if not self._ensure_package(from_code, to_code):
                return None
            installed = translate.get_installed_languages()
            src = next((l for l in installed if l.code == from_code), None)
            tgt = next((l for l in installed if l.code == to_code), None)
            if src is None or tgt is None:
                return None
            return src.get_translation(tgt)
        except Exception as e:
            print(f"[Meeting-AI] [LocalTranslation] get_translator({from_code}→{to_code}) error: {e}")
            return None

    def _translate_one(self, text: str, from_code: str, to_code: str) -> str:
        """
        Translate a single string. Handles pivot routes transparently.
        Returns original text on any failure.
        """
        if not text or not text.strip():
            return text

        # ── Direct translation ──────────────────────────────────────────────
        if (from_code, to_code) in self._DIRECT_PAIRS:
            t = self._get_translator(from_code, to_code)
            if t:
                try:
                    return t.translate(text)
                except Exception as e:
                    print(f"[Meeting-AI] [LocalTranslation] Direct translate error: {e}")
            return text

        # ── Pivot translation (e.g. ar→en→fr) ──────────────────────────────
        if (from_code, to_code) in self._PIVOT_ROUTES:
            pivots = self._PIVOT_ROUTES[(from_code, to_code)]
            intermediate = text
            current = from_code
            for pivot in pivots + [to_code]:
                t = self._get_translator(current, pivot)
                if t is None:
                    print(f"[Meeting-AI] [LocalTranslation] Pivot step {current}→{pivot} unavailable.")
                    return text   # fallback: return original
                try:
                    intermediate = t.translate(intermediate)
                    current = pivot
                except Exception as e:
                    print(f"[Meeting-AI] [LocalTranslation] Pivot translate error ({current}→{pivot}): {e}")
                    return text
            return intermediate

        print(f"[Meeting-AI] [LocalTranslation] No route for ({from_code}→{to_code}).")
        return text

    def translate_batch(self, texts: list, from_code: str, to_code: str) -> list:
        """
        Translate a list of strings from from_code to to_code.
        Handles direct pairs and pivot routes (e.g. ar→fr via ar→en→fr).
        Returns originals unchanged if translation is unavailable.
        """
        if from_code == to_code:
            return texts[:]

        supported = (from_code, to_code) in self._DIRECT_PAIRS \
                 or (from_code, to_code) in self._PIVOT_ROUTES

        if not supported:
            print(f"[Meeting-AI] [LocalTranslation] No route for ({from_code}→{to_code}) — skipping.")
            return texts[:]

        try:
            result = []
            for text in texts:
                result.append(self._translate_one(text, from_code, to_code))

            changed = sum(
                1 for i, t in enumerate(texts)
                if t.strip() and result[i] != t
            )
            route = f"{from_code}→{'→'.join(self._PIVOT_ROUTES.get((from_code, to_code), []))+'→' if (from_code, to_code) in self._PIVOT_ROUTES else ''}{to_code}"
            print(f"[Meeting-AI] [LocalTranslation] OK — {changed}/{len([t for t in texts if t.strip()])} segments translated ({route}).")
            return result

        except ImportError:
            print("[Meeting-AI] [LocalTranslation] argostranslate not installed.")
            return texts[:]
        except Exception as e:
            print(f"[Meeting-AI] [LocalTranslation] Batch error: {e}")
            return texts[:]


# ── LM Studio Translation Service ─────────────────────────────────────────────

# Full language names for the translation prompt (more natural for the LLM)
_LANG_NAMES = {
    "en": "English",
    "fr": "French",
    "ar": "Arabic",
    "es": "Spanish",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ja": "Japanese",
    "ru": "Russian",
}


class TranslationService:
    """
    Post-transcription translation via LM Studio (TowerInstruct-Mistral-7B-v0.2).

    Requires LM Studio to be running on localhost:1234 with the TowerInstruct model loaded.
    If LM Studio is unavailable, translation fails gracefully: the original text is
    returned unchanged and a warning is printed to stdout.

    Usage
    -----
    svc = TranslationService()
    translated = svc.translate("Bonjour le monde", source_lang="fr", target_lang="en")
    # → "Hello world"
    """

    BASE_URL = "http://localhost:1234/v1/chat/completions"
    MODEL    = "towerinstruct-mistral-7b-v0.2"   # must match LM Studio's loaded model name
    # Timeout increased for processing multiple segments at once
    TIMEOUT  = 180   

    def translate_batch(self, texts: list[str], target_lang: str, source_lang: str = "auto") -> list[str]:
        """
        Translate a list of texts to target_lang in a single LLM call.
        Uses [SEG_XXX] markers to keep segments aligned.
        Empty strings are preserved without sending to the LLM.

        Returns a list of the exact same length as the input.
        """
        import urllib.request, json as _json, re

        if not texts:
            return []

        tgt_name = _LANG_NAMES.get(target_lang.lower(), target_lang.upper())

        # Filter out empty strings — only translate non-empty texts
        non_empty = [(i, t) for i, t in enumerate(texts) if t and t.strip()]
        if not non_empty:
            return texts[:]

        # Build the batched prompt using compact index markers
        batched_input = ""
        for seq, (orig_idx, text) in enumerate(non_empty):
            batched_input += f"[SEG_{seq:03d}] {text.strip()}\n"

        system_prompt = (
            f"You are a strict professional translation engine specialized in Maghrebi Arabic dialects "
            f"(Moroccan Darija دارجة, Tunisian Arabic, Algerian Arabic) and Modern Standard Arabic.\n"
            f"Your ONLY job is to translate the user text into {tgt_name}.\n\n"
            f"RULES:\n"
            f"1. You MUST translate the text into {tgt_name}. Do NOT output in any other language.\n"
            f"2. You MUST maintain the EXACT SAME [SEG_XXX] markers in your translation.\n"
            f"3. For Darija/dialectal Arabic, translate the MEANING (not word-for-word). Use natural {tgt_name}.\n"
            f"4. Output ONLY the translated text with its markers, no explanations."
        )

        user_prompt = (
            f"The following text may be in Moroccan Darija, Tunisian Arabic, Modern Standard Arabic, "
            f"French, or English. Translate everything into {tgt_name}:\n\n{batched_input}"
        )

        payload = _json.dumps({
            "model":       self.MODEL,
            "messages":    [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens":  2048,
            "stream":      False,
        }).encode("utf-8")

        req = urllib.request.Request(
            self.BASE_URL,
            data=payload,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.TIMEOUT) as resp:
                data   = _json.loads(resp.read().decode("utf-8"))
                result = data["choices"][0]["message"]["content"].strip()

                print(f"[Meeting-AI] [DEBUG] RAW LLM OUTPUT:\n{result}\n" + "-"*40)

                # Parse the result back into a dict keyed by sequential index
                pattern = r"\[SEG_(\d+)\](.*?)(?=\[SEG_\d+\]|$)"
                matches = list(re.finditer(pattern, result, re.DOTALL))
                print(f"[Meeting-AI] [DEBUG] Found {len(matches)} segments via regex.")

                # Build translated map (seq_index → translated text)
                translated_map: dict[int, str] = {}
                if matches:
                    for match in matches:
                        try:
                            seq = int(match.group(1))
                            translated_map[seq] = match.group(2).strip()
                        except ValueError:
                            pass
                else:
                    # Fallback: newline split
                    lines = [l.strip() for l in result.split('\n') if l.strip()
                             and not l.lower().startswith("translate")
                             and not l.startswith("---")]
                    for seq in range(min(len(lines), len(non_empty))):
                        translated_map[seq] = lines[seq]

                # Rebuild the full output list preserving original positions
                output = list(texts)
                for seq, (orig_idx, _) in enumerate(non_empty):
                    if seq in translated_map:
                        output[orig_idx] = translated_map[seq]

                return output

        except Exception as exc:
            print(f"[Meeting-AI] [WARN] Batch translation via LM Studio failed ({exc}). Trying Ollama fallback...")
            try:
                # 1. Fetch available models from Ollama to pick one
                models_req = urllib.request.Request("http://localhost:11434/api/tags")
                ollama_model = "mistral:7b-instruct-q4_K_M"
                try:
                    with urllib.request.urlopen(models_req, timeout=5) as m_resp:
                        m_data = _json.loads(m_resp.read().decode("utf-8"))
                        if "models" in m_data and m_data["models"]:
                            models_list = [
                                m["name"] for m in m_data["models"]
                                if "embed" not in m["name"].lower() and "rerank" not in m["name"].lower()
                            ]
                            preferred = [m for m in models_list if "mistral" in m.lower() or "qwen" in m.lower()]
                            if preferred:
                                ollama_model = preferred[0]
                            elif models_list:
                                ollama_model = models_list[0]
                except Exception as tag_err:
                    print(f"[Meeting-AI] [WARN] Could not fetch Ollama tags: {tag_err}. Using fallback name '{ollama_model}'")

                # 2. Call Ollama Chat API
                ollama_payload = _json.dumps({
                    "model":       ollama_model,
                    "messages":    [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_prompt}
                    ],
                    "stream":      False,
                    "options": {
                        "temperature": 0.1
                    }
                }).encode("utf-8")

                ollama_req = urllib.request.Request(
                    "http://localhost:11434/api/chat",
                    data=ollama_payload,
                    headers={"Content-Type": "application/json", "Accept": "application/json"},
                    method="POST",
                )

                with urllib.request.urlopen(ollama_req, timeout=self.TIMEOUT) as resp:
                    data   = _json.loads(resp.read().decode("utf-8"))
                    result = data["message"]["content"].strip()

                    print(f"[Meeting-AI] [DEBUG] RAW OLLAMA TRANSLATION OUTPUT:\n{result}\n" + "-"*40)

                    # Parse the result back into a dict keyed by sequential index
                    pattern = r"\[SEG_(\d+)\](.*?)(?=\[SEG_\d+\]|$)"
                    matches = list(re.finditer(pattern, result, re.DOTALL))
                    
                    translated_map: dict[int, str] = {}
                    if matches:
                        for match in matches:
                            try:
                                seq = int(match.group(1))
                                translated_map[seq] = match.group(2).strip()
                            except ValueError:
                                pass
                    else:
                        lines = [l.strip() for l in result.split('\n') if l.strip()
                                 and not l.lower().startswith("translate")
                                 and not l.startswith("---")]
                        for seq in range(min(len(lines), len(non_empty))):
                            translated_map[seq] = lines[seq]

                    output = list(texts)
                    for seq, (orig_idx, _) in enumerate(non_empty):
                        if seq in translated_map:
                            output[orig_idx] = translated_map[seq]

                    return output

            except Exception as ollama_exc:
                print(f"[Meeting-AI] [ERROR] Both LM Studio and Ollama translation failed: {ollama_exc}")
                return texts[:]  # final graceful fallback: keep originals


    def unload_model(self) -> None:
        """
        Ask LM Studio to unload ALL loaded models from VRAM.
        This frees ~4 GB so that Ollama can load Mistral for PV generation.

        Strategy:
          1. GET  /api/v1/models          → retrieve the list of loaded instance_ids
          2. POST /api/v1/models/unload   → unload each instance by its instance_id
          3. VERIFY: poll /api/v1/models until the list is empty (up to 3 retries)
          4. FALLBACK: try `lms unload --all` CLI if API fails

        Fails silently if LM Studio is not running or endpoints not supported.
        """
        import urllib.request, json as _json, time, subprocess as _sp
        BASE = "http://localhost:1234"
        MAX_RETRIES = 3
        RETRY_DELAY = 2  # seconds between verification polls

        def _list_loaded() -> list:
            """Return the list of currently loaded model instances."""
            try:
                req = urllib.request.Request(
                    f"{BASE}/api/v1/models",
                    headers={"Accept": "application/json"},
                    method="GET",
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    body = _json.loads(resp.read().decode("utf-8"))
                    return body.get("data", [])
            except Exception:
                return []

        def _unload_via_api(instances: list) -> bool:
            """Attempt to unload all instances via the v1 API. Returns True if any call succeeded."""
            did_unload = False
            for inst in instances:
                iid = inst.get("instance_id") or inst.get("id", "")
                if not iid:
                    continue
                payload = _json.dumps({"instance_id": iid}).encode("utf-8")
                unload_req = urllib.request.Request(
                    f"{BASE}/api/v1/models/unload",
                    data=payload,
                    headers={"Content-Type": "application/json", "Accept": "application/json"},
                    method="POST",
                )
                try:
                    with urllib.request.urlopen(unload_req, timeout=10) as uresp:
                        print(f"[Meeting-AI] ✅ LM Studio model '{iid}' unload requested (status {uresp.status}).")
                        did_unload = True
                except Exception as e:
                    print(f"[Meeting-AI] ⚠️ Could not unload instance '{iid}': {e}")
            return did_unload

        def _unload_via_cli() -> bool:
            """Fallback: use the `lms` CLI to force-unload all models."""
            try:
                result = _sp.run(
                    ["lms", "unload", "--all"],
                    capture_output=True, text=True, timeout=15,
                )
                if result.returncode == 0:
                    print(f"[Meeting-AI] ✅ `lms unload --all` succeeded.")
                    return True
                else:
                    print(f"[Meeting-AI] ⚠️ `lms unload --all` returned code {result.returncode}: {result.stderr.strip()}")
            except FileNotFoundError:
                print("[Meeting-AI] ℹ️ `lms` CLI not found on PATH — skipping CLI fallback.")
            except Exception as e:
                print(f"[Meeting-AI] ⚠️ `lms` CLI fallback failed: {e}")
            return False

        # ── Main unload flow ──────────────────────────────────────────────────
        print("[Meeting-AI] 🔄 Starting LM Studio VRAM cleanup…")

        for attempt in range(1, MAX_RETRIES + 1):
            instances = _list_loaded()
            if not instances:
                print(f"[Meeting-AI] ✅ LM Studio VRAM confirmed free (attempt {attempt}).")
                return

            print(f"[Meeting-AI] ℹ️ {len(instances)} model(s) still loaded — unloading (attempt {attempt}/{MAX_RETRIES})…")
            _unload_via_api(instances)

            # Give LM Studio time to actually release the VRAM
            time.sleep(RETRY_DELAY)

        # ── Final check after all retries ─────────────────────────────────────
        remaining = _list_loaded()
        if remaining:
            print(f"[Meeting-AI] ⚠️ API unload failed after {MAX_RETRIES} attempts. Trying CLI fallback…")
            _unload_via_cli()
            time.sleep(RETRY_DELAY)

            # One last verification
            still_loaded = _list_loaded()
            if still_loaded:
                print(f"[Meeting-AI] ❌ LM Studio VRAM NOT freed ({len(still_loaded)} model(s) remain). Manual unload may be needed.")
            else:
                print("[Meeting-AI] ✅ LM Studio VRAM freed via CLI fallback.")
        else:
            print("[Meeting-AI] ✅ LM Studio VRAM confirmed free after retries.")


# ── Module-level helpers ───────────────────────────────────────────────────────

def _get_wav_duration(path: str) -> float:
    """Durée exacte via ffprobe — évite la dérive cumulée des offsets."""
    import subprocess, json
    result = subprocess.run([
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams", path
    ], capture_output=True, text=True)
    data = json.loads(result.stdout)
    return float(data["streams"][0]["duration"])


def _merge_same_speaker_segments(segments: list[Any]) -> list[Any]:
    """
    Merge consecutive segments from the same speaker into a single block.

    This is the last line of defence against the 'Same person, 2 blocks' bug:
      Speaker B: 00:11-00:51  "...part 1..."
      Speaker B: 00:54-01:24  "...part 2..."    ← gets merged into:
      Speaker B: 00:11-01:24  "...part 1... ...part 2..."

    This happens naturally when pyannote marks a 3s breath as silence and
    Whisper still assigns words to both sides of it.
    """
    if not segments:
        return []

    merged = [dict(segments[0])]   # start with a copy of the first segment
    for seg in segments[1:]:  # type: ignore[misc]
        last = merged[-1]
        if seg["speaker"] == last["speaker"]:
            # Same speaker → glue text and extend the end timestamp
            last["text"] = last["text"].rstrip() + " " + seg["text"].lstrip()
            last["end"] = seg["end"]
        else:
            merged.append(dict(seg))

    return merged

def _fill_unknown_speakers(words: list[Any]) -> None:
    """In-place bi-directional propagation to eliminate 'Unknown' labels."""
    # Forward pass
    prev_spk = "Unknown"
    for w in words:
        if w["speaker"] != "Unknown":
            prev_spk = w["speaker"]
        elif prev_spk != "Unknown":
            w["speaker"] = prev_spk
            
    # Backward pass (catches leading Unknowns)
    next_spk = "Unknown"
    for w in reversed(words):
        if w["speaker"] != "Unknown":
            next_spk = w["speaker"]
        elif next_spk != "Unknown":
            w["speaker"] = next_spk

def _group_words_smoothed(words: list[Any]) -> list[Any]:
    """
    Merge consecutive words into segments.
    Applies aggressive smoothing: Whisper often hallucinates a single word into 
    the other person's turn. We force single-word speaker flashes to be absorbed 
    by the surrounding context.
    """
    if not words:
        return []

    # Smoothing Pass 1: Eliminate 1-word interruptions
    # [A, B, A] -> [A, A, A]
    for i in range(1, len(words) - 1):
        prev_s = words[i-1]["speaker"]
        next_s = words[i+1]["speaker"]
        if prev_s == next_s and words[i]["speaker"] != prev_s:
            words[i]["speaker"] = prev_s

    # Smoothing Pass 2: Eliminate 2-word interruptions if they are very fast
    # [A, B, B, A] -> [A, A, A, A] if the B words took less than 1.5 seconds total
    for i in range(2, len(words) - 2):
        s0 = words[i-2]["speaker"]
        s1 = words[i-1]["speaker"]
        s2 = words[i]["speaker"]
        s3 = words[i+1]["speaker"]
        if s0 == s3 and s1 == s2 and s1 != s0:
            duration = words[i]["end"] - words[i-1]["start"]
            if duration < 1.5:
                words[i-1]["speaker"] = s0
                words[i]["speaker"] = s0

    # Grouping
    segments = []
    cur_spk = words[0]["speaker"]
    cur_words = [words[0]["word"]]
    cur_start = words[0]["start"]
    cur_end = words[0]["end"]

    for w in words[1:]:  # type: ignore[misc]
        # Split a segment if the speaker changes, OR if there's a > 3.0s pause from the same speaker
        pause_duration = w["start"] - cur_end
        
        # Split only if speaker changes OR there's a real long silence (> 8s).
        # 8s is the sweet spot: it keeps breathing/thinking pauses in the same
        # block while separating genuine topic changes or new turns.
        if w["speaker"] == cur_spk and pause_duration < 8.0:
            # Format punctuation properly (Whisper outputs trailing spaces, but let's be safe)
            if w["word"].startswith((".", ",", "?", "!")):
                cur_words.append(w["word"]) # e.g. "word" + "." -> "word ." (will render fine)
            else:
                cur_words.append(w["word"])
            cur_end = w["end"]
        else:
            # End current segment
            segments.append({
                "speaker": cur_spk, 
                "start": cur_start, 
                "end": cur_end, 
                # Clean up multiple spaces
                "text": " ".join(cur_words).replace("  ", " ").strip() 
            })
            # Start new segment
            cur_spk = w["speaker"]
            cur_words = [w["word"]]
            cur_start = w["start"]
            cur_end = w["end"]

    # Flush the last accumulating segment
    if cur_words:
        segments.append({
            "speaker": cur_spk, 
            "start": cur_start, 
            "end": cur_end, 
            "text": " ".join(cur_words).replace("  ", " ").strip()
        })
    
    # Final cleanup: drop empty segments or single-word noise < 0.3s
    return [s for s in segments if len(s["text"]) > 1 and (float(s["end"]) - float(s["start"])) > 0.3]


def _build_label_map(segments: list[Any]) -> dict:
    """Map pyannote labels (e.g. SPEAKER_00) to friendly names (Speaker A, B…)."""
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    seen, mapping = [], {}
    for seg in segments:
        lbl = seg["speaker"]
        if lbl not in mapping:
            mapping[lbl] = f"Speaker {letters[len(seen)]}" if len(seen) < 26 else lbl
            seen.append(lbl)
    return mapping


def _build_colour_map(segments: list[Any]) -> dict:
    """Assign a deterministic colour from the palette to each speaker label."""
    seen, mapping = [], {}
    for seg in segments:
        lbl = seg["speaker"]
        if lbl not in mapping:
            mapping[lbl] = _SPEAKER_COLOURS[len(seen) % len(_SPEAKER_COLOURS)]
            seen.append(lbl)
    return mapping


def _fmt_time(seconds: float) -> str:
    """Format seconds as MM:SS (matching the frontend timeStart/timeEnd format)."""
    td = datetime.timedelta(seconds=int(seconds))
    total_minutes, secs = divmod(td.seconds, 60)
    return f"{total_minutes:02d}:{secs:02d}"


def _cleanup(path: str) -> None:
    """Remove a temp file silently."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
