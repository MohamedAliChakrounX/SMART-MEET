import io
import wave
import numpy as np
from config import TTS_VOICE, TTS_LANG

_tts_pipeline = None
_initialization_error = None

def get_tts_pipeline():
    """Lazily initializes the Kokoro pipeline with French support."""
    global _tts_pipeline, _initialization_error
    if _tts_pipeline is not None:
        return _tts_pipeline
        
    if _initialization_error is not None:
        # Don't keep retrying if it failed once, to avoid latency
        return None
        
    try:
        from kokoro import KPipeline
        # Lang code 'f' represents French
        print("[TTS] Initializing Kokoro KPipeline for French ('f')...")
        _tts_pipeline = KPipeline(lang_code='f')
        print("[TTS] Kokoro pipeline initialized successfully.")
    except Exception as e:
        _initialization_error = str(e)
        print(f"[TTS] Warning: Failed to initialize Kokoro pipeline: {e}")
        _tts_pipeline = None
        
    return _tts_pipeline

def numpy_to_wav_bytes(audio_np: np.ndarray, sample_rate: int = 24000) -> bytes:
    """Converts Kokoro audio float numpy array to 16-bit PCM WAV bytes."""
    # Clip and scale float values in [-1.0, 1.0] to 16-bit integer range
    audio_clipped = np.clip(audio_np, -1.0, 1.0)
    audio_int16 = (audio_clipped * 32767).astype(np.int16)
    
    byte_io = io.BytesIO()
    with wave.open(byte_io, "wb") as wav_file:
        wav_file.setnchannels(1)       # Mono channel
        wav_file.setsampwidth(2)       # 2 bytes per sample (16-bit)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_int16.tobytes())
        
    return byte_io.getvalue()

def synthesize_text_to_audio(text: str, voice_name: str = None) -> tuple:
    """
    Synthesizes text into WAV audio bytes using Kokoro-82M.
    Returns (audio_bytes, warning_message).
    If synthesis fails, returns (None, warning_message) for UX resilience.
    """
    if not text or not text.strip():
        return None, "Empty text provided for TTS."
        
    voice = voice_name or TTS_VOICE
    
    try:
        pipeline = get_tts_pipeline()
        if pipeline is None:
            err_msg = _initialization_error or "Kokoro library is not available or failed to load."
            return None, f"TTS service is offline: {err_msg}"
            
        print(f"[TTS] Synthesizing text: '{text[:50]}...' using voice '{voice}'")
        # Run Kokoro pipeline generator
        generator = pipeline(
            text, 
            voice=voice, 
            speed=1.0, 
            split_pattern=r'\n+'
        )
        
        audio_segments = []
        for gs, ps, audio in generator:
            if audio is not None and len(audio) > 0:
                audio_segments.append(audio)
                
        if not audio_segments:
            return None, "Kokoro generated no audio frames."
            
        # Concatenate all generated audio segments
        full_audio_np = np.concatenate(audio_segments)
        
        # Convert to WAV bytes (Kokoro outputs at 24000Hz sampling rate)
        wav_bytes = numpy_to_wav_bytes(full_audio_np, sample_rate=24000)
        return wav_bytes, None
        
    except Exception as e:
        # UX resilience fallback: log and return warning
        warn_msg = f"TTS generation failed: {str(e)}"
        print(f"[TTS] Resilient fallback triggered. {warn_msg}")
        return None, warn_msg
