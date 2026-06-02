@echo off
REM run-bridge.cmd — watchdog del ponte JARVIS: rilancia node se esce (riavvio robusto).
cd /d "%~dp0"
REM --- modelli Ollama per ruolo (modificabili) ---
REM chat = risposta fulminea (corsia leggera); worker = distillazione/interprete; local = modalita' offline
set "JARVIS_CHAT_MODEL=qwen3:1.7b"
set "JARVIS_WORKER_MODEL=qwen3:8b"
set "JARVIS_LOCAL_MODEL=qwen3:14b"
:loop
node server.mjs
echo [watchdog] ponte uscito, riavvio tra 2s...
timeout /t 2 /nobreak >nul
goto loop
