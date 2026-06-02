@echo off
REM run-piper.cmd — watchdog del server TTS Piper (modello residente). Rilancia se esce.
cd /d "%~dp0"
set "JARVIS_PIPER_MODEL=%~dp0voices\it_IT-paola-medium.onnx"
REM per voce maschile: scarica it_IT-riccardo-x_low e cambia la riga sopra
:loop
python piper-server.py
echo [watchdog] Piper uscito, riavvio tra 3s...
timeout /t 3 /nobreak >nul
goto loop
