import sys
import logging
sys.path.append(r'c:\Users\lenovo\.gemini\antigravity\scratch\Meeting-IA\AI')

from transcription.transcription_service import TranslationService

def main():
    print("Testing Translation... LM Studio must be running.")
    svc = TranslationService()
    try:
        res = svc.translate_batch(['Hello, how are you?', 'This is a test.'], 'en', 'fr')
        print('Result:', res)
    except Exception as e:
        print("Error during translation:", e)

if __name__ == "__main__":
    main()
