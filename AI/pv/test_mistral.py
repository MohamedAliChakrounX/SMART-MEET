import json
from AI.pv.pv_service import PvService
from AI.pv.pv_parser import extract_json

svc = PvService()
transcript = [
    {"speaker": "A", "timeStart": "00:00", "text": "Bonjour tout le monde. L'objectif aujourd'hui est de valider le budget Q4. Il est fixé à 50K€."},
    {"speaker": "B", "timeStart": "00:10", "text": "C'est validé. Je m'occupe d'envoyer les contrats demain."}
]

print("1. Generaing transcript text...")
text = svc._format_transcript(transcript)

print("2. Building prompt...")
prompt = svc._build_prompt_full(text, "FR")

print("3. Calling Ollama Mistral 7B...")
res_full = svc._call_ollama(prompt, "mistral:7b-instruct-q4_K_M", 0.2)

with open("debug.txt", "w", encoding="utf-8") as f:
    f.write("--- RAW OLLAMA RESPONSE ---\n")
    f.write(repr(res_full))  # Use repr() to see hidden escape characters
    f.write("\n\n--- PARSING ERROR ---\n")
    try:
        json.loads(res_full.strip())
        f.write("Direct parse successful!\n")
    except Exception as e:
        f.write(f"Direct parse failed! Reason: {e}\n")

print("Wrote debug data to debug.txt. Parsing via extract_json...")
parsed = extract_json(res_full)
with open("debug.txt", "a", encoding="utf-8") as f:
    f.write("\n--- EXTRACT_JSON RESULT ---\n")
    f.write(json.dumps(parsed, indent=2, ensure_ascii=False))
