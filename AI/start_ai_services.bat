@echo off
:: ============================================================
:: start_ai_services.bat
:: Lance Ollama + le serveur Flask AI sur le GPU RTX 4050
:: À placer dans le dossier AI\ du projet
:: ============================================================

echo [Meeting-AI] Configuration GPU pour Ollama...
setx CUDA_VISIBLE_DEVICES "0" >NUL 2>&1
setx OLLAMA_NUM_GPU "1" >NUL 2>&1

:: Variables pour la session courante (setx ne s'applique qu'aux futures sessions)
set CUDA_VISIBLE_DEVICES=0
set OLLAMA_NUM_GPU=1

echo [Meeting-AI] Arret de l'ancienne instance Ollama...
taskkill /F /IM ollama.exe >NUL 2>&1
timeout /t 2 /nobreak >NUL

echo [Meeting-AI] Demarrage d'Ollama sur le GPU (RTX 4050)...
start "" /B "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve

timeout /t 3 /nobreak >NUL
echo [Meeting-AI] Verification GPU Ollama...
ollama ps

echo.
echo [Meeting-AI] Demarrage du serveur Flask AI (port 5001)...
cd /d "%~dp0"
python api_server.py
