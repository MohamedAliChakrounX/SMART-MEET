import os
import sys
import numpy as np
import soundfile as sf
sys.path.append(r"c:\Users\lenovo\.gemini\antigravity\scratch\Meeting-IA\AI")

from transcription.acoustic_features import AcousticFeatureExtractor

def run_test():
    tmp_wav = r"c:\Users\lenovo\.gemini\antigravity\scratch\Meeting-IA\AI\test_audio.wav"
    sr = 16000
    t = np.linspace(0, 2.0, int(sr * 2.0))
    audio_data = 0.5 * np.sin(2 * np.pi * 440 * t)
    
    sf.write(tmp_wav, audio_data, sr)
    print("Wrote test audio to", tmp_wav)
    
    try:
        extractor = AcousticFeatureExtractor()
        segments = [{"speaker": "Speaker_00", "start": 0.0, "end": 2.0}]
        features = extractor.extract_speaker_features(tmp_wav, segments)
        print("Extracted features:", features)
    except Exception as e:
        print("ERROR IN OPENSMILE:", e)

if __name__ == "__main__":
    run_test()
