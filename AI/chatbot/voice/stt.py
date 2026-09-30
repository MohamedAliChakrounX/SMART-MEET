import os
import sys
from faster_whisper import WhisperModel
from config import STT_MODEL_SIZE, STT_DEVICE, STT_COMPUTE_TYPE

_stt_model = None

def get_stt_model():
    """Lazily initializes and caches the WhisperModel instance with CPU fallback."""
    global _stt_model
    if _stt_model is not None:
        return _stt_model
        
    model_size = STT_MODEL_SIZE
    device = STT_DEVICE
    compute_type = STT_COMPUTE_TYPE
    
    print(f"[STT] Loading Whisper model '{model_size}' on '{device}' ({compute_type})...")
    try:
        # Attempt to load model with primary configuration
        _stt_model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("[STT] Whisper model loaded successfully.")
    except Exception as e:
        print(f"[STT] Failed loading on primary device '{device}' with error: {e}. Falling back to CPU with int8...")
        try:
            # Fall back to CPU
            _stt_model = WhisperModel(model_size, device="cpu", compute_type="int8")
            print("[STT] Whisper model loaded on CPU fallback.")
        except Exception as cpu_err:
            print(f"[STT] Critical: Failed to load Whisper on CPU fallback: {cpu_err}")
            raise cpu_err
            
    return _stt_model

def transcribe_audio(audio_path: str, target_language: str = None) -> tuple:
    """
    Transcribes the input audio file using faster-whisper.
    Detects language automatically if target_language is not provided.
    Returns (transcription_text, detected_language).
    """
    if not audio_path or not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file '{audio_path}' not found.")
        
    model = get_stt_model()
    
    # Transcribe audio file
    # beam_size=5 is standard for good accuracy
    # If target_language is provided, restrict to it (e.g. 'fr')
    segments, info = model.transcribe(
        audio_path, 
        beam_size=5, 
        language=target_language
    )
    
    # segments is a generator, we must join the text of all segments
    text_segments = []
    for segment in segments:
        text_segments.append(segment.text)
        
    transcription = "".join(text_segments).strip()
    detected_lang = info.language
    
    return transcription, detected_lang
