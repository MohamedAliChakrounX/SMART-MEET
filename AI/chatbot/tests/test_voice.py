import pytest
import os
import numpy as np
from unittest.mock import patch, MagicMock

# Import the voice functions to test
from voice.stt import transcribe_audio
from voice.tts import synthesize_text_to_audio, numpy_to_wav_bytes

def test_transcribe_audio_file_not_found():
    """Verify transcribe_audio raises FileNotFoundError if file does not exist."""
    with pytest.raises(FileNotFoundError):
        transcribe_audio("nonexistent_file_path_12345.wav")

@patch("voice.stt.os.path.exists")
@patch("voice.stt.get_stt_model")
def test_transcribe_audio_success(mock_get_model, mock_exists):
    """Verify transcribe_audio correctly transcribes and returns text and detected language."""
    # 1. Setup mocks
    mock_exists.return_value = True
    
    mock_segment_1 = MagicMock()
    mock_segment_1.text = "Bonjour tout le monde. "
    mock_segment_2 = MagicMock()
    mock_segment_2.text = "Bienvenue à la réunion."
    
    mock_info = MagicMock()
    mock_info.language = "fr"
    
    mock_model = MagicMock()
    mock_model.transcribe.return_value = ([mock_segment_1, mock_segment_2], mock_info)
    mock_get_model.return_value = mock_model
    
    # 2. Call function
    transcription, lang = transcribe_audio("fake_audio_path.wav", target_language="fr")
    
    # 3. Assertions
    assert transcription == "Bonjour tout le monde. Bienvenue à la réunion."
    assert lang == "fr"
    mock_model.transcribe.assert_called_once_with("fake_audio_path.wav", beam_size=5, language="fr")

def test_numpy_to_wav_bytes():
    """Verify conversion of float numpy array to 16-bit PCM WAV bytes."""
    # Create simple dummy audio data
    dummy_audio = np.array([0.5, -0.5, 0.0], dtype=np.float32)
    wav_bytes = numpy_to_wav_bytes(dummy_audio, sample_rate=24000)
    
    # Check that it returns valid WAV bytes (starts with RIFF header)
    assert isinstance(wav_bytes, bytes)
    assert wav_bytes.startswith(b"RIFF")
    assert b"WAVE" in wav_bytes

def test_synthesize_text_to_audio_empty_text():
    """Verify synthesize_text_to_audio handles empty or blank inputs gracefully."""
    audio_bytes, warning = synthesize_text_to_audio("")
    assert audio_bytes is None
    assert "Empty text" in warning
    
    audio_bytes, warning = synthesize_text_to_audio("   ")
    assert audio_bytes is None
    assert "Empty text" in warning

@patch("voice.tts.get_tts_pipeline")
def test_synthesize_text_to_audio_success(mock_get_pipeline):
    """Verify successful speech synthesis using KPipeline mock."""
    # 1. Setup mock pipeline generator
    mock_pipeline = MagicMock()
    
    # Generator yields (gs, ps, audio_np)
    dummy_audio = np.array([0.1, -0.1], dtype=np.float32)
    mock_pipeline.return_value = [("gs", "ps", dummy_audio)]
    mock_get_pipeline.return_value = mock_pipeline
    
    # 2. Call synthesis
    audio_bytes, warning = synthesize_text_to_audio("Bonjour", voice_name="fr-test")
    
    # 3. Assertions
    assert audio_bytes is not None
    assert audio_bytes.startswith(b"RIFF")
    assert warning is None
    mock_pipeline.assert_called_once_with(
        "Bonjour", 
        voice="fr-test", 
        speed=1.0, 
        split_pattern=r'\n+'
    )

@patch("voice.tts.get_tts_pipeline")
def test_synthesize_text_to_audio_resilience_fallback(mock_get_pipeline):
    """Verify that synthesize_text_to_audio gracefully returns error as warning on failure."""
    # 1. Setup mock pipeline to raise exception
    mock_get_pipeline.side_effect = Exception("Kokoro engine error!")
    
    # 2. Call synthesis
    audio_bytes, warning = synthesize_text_to_audio("Bonjour resilient fallback")
    
    # 3. Assertions
    assert audio_bytes is None
    assert warning is not None
    assert "TTS generation failed" in warning
