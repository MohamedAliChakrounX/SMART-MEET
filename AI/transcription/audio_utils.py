"""
audio_utils.py
==============
Utility functions for loading and pre-processing audio files.

Responsibilities
----------------
- Accept any common audio format (MP3, WAV, M4A, WEBM …).
- Resample to 16 kHz mono — required by both Whisper and Pyannote.
- Return an in-memory waveform dict so pyannote never reads from disk
  (avoids torchcodec / AudioDecoder issues on Windows).
- Save a converted WAV to disk so Whisper can read it via its own
  ffmpeg-based loader (faster_whisper doesn't accept raw tensors).

Symfony integration note
------------------------
The Symfony controller receives the uploaded file, saves it to a temp
path, then passes that path to `prepare_audio(input_path)`.
The returned dict is forwarded to the pipeline and transcription modules.
"""

import os
import torch
import torchaudio
import torchaudio.transforms as T
import soundfile as sf


# ── Constants ──────────────────────────────────────────────────────────────────
TARGET_SAMPLE_RATE = 16_000   # Hz required by Whisper & Pyannote
_MP3_TRIM_BYTES    = 8_192    # bytes trimmed when repairing corrupt MP3 tail


# ── Public API ─────────────────────────────────────────────────────────────────

def prepare_audio(input_path: str, output_wav_path: str) -> dict:
    """
    Load *input_path*, convert it to 16 kHz mono, persist as *output_wav_path*,
    and return a dict ready for Pyannote.

    Parameters
    ----------
    input_path : str
        Absolute path to the raw uploaded audio file.
    output_wav_path : str
        Absolute path where the converted 16 kHz WAV will be written.
        Pass this path to Whisper's `model.transcribe()`.

    Returns
    -------
    dict
        ``{"waveform": torch.Tensor, "sample_rate": int}``
        This dict is passed directly to the Pyannote pipeline, bypassing
        any disk-based audio decoder (important on Windows).

    Raises
    ------
    RuntimeError
        If the audio file cannot be loaded even after the repair attempt.
    """
    waveform, sample_rate = _load_audio(input_path)
    waveform, sample_rate = _normalize(waveform, sample_rate)
    torchaudio.save(output_wav_path, waveform, sample_rate)
    
    # Pyannote strictly expects a 'uri' or 'file' key even when passing a waveform
    return {
        "waveform": waveform,
        "sample_rate": sample_rate,
        "uri": "in_memory_audio"
    }


# ── Private helpers ─────────────────────────────────────────────────────────────

def _load_audio(path: str):
    """Try to load *path* with soundfile; attempt FFmpeg conversion on failure."""
    try:
        audio_array, sr = sf.read(path)
        # Convert to tensor. shape expected by torchaudio is (channels, frames)
        if len(audio_array.shape) == 1:
            waveform = torch.from_numpy(audio_array).unsqueeze(0).float()
        else:
            waveform = torch.from_numpy(audio_array).t().float()
        return waveform, sr
    except Exception as primary_err:
        try:
            return _convert_and_load_with_ffmpeg(path)
        except Exception as ffmpeg_err:
            raise RuntimeError(f"Cannot load audio '{path}': {primary_err}. FFmpeg fallback failed: {ffmpeg_err}") from ffmpeg_err

def _convert_and_load_with_ffmpeg(path: str):
    """Fallback: convert unsupported formats to WAV using FFmpeg."""
    import subprocess
    import tempfile
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        temp_wav = tmp.name
        
    try:
        subprocess.run([
            "ffmpeg", "-y", "-i", path, 
            "-acodec", "pcm_s16le", "-ar", str(TARGET_SAMPLE_RATE), "-ac", "1", 
            temp_wav
        ], check=True, capture_output=True)
        
        audio_array, sr = sf.read(temp_wav)
        waveform = torch.from_numpy(audio_array).unsqueeze(0).float()
        return waveform, sr
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.decode(errors="ignore") if e.stderr else str(e)
        raise RuntimeError(f"FFmpeg conversion failed: {err_msg}") from e
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except OSError:
                pass




def _normalize(waveform: torch.Tensor, sample_rate: int):
    """Resample to TARGET_SAMPLE_RATE and mix down to mono."""
    if sample_rate != TARGET_SAMPLE_RATE:
        resampler = T.Resample(sample_rate, TARGET_SAMPLE_RATE)
        waveform  = resampler(waveform)
        sample_rate = TARGET_SAMPLE_RATE

    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)

    return waveform, sample_rate
