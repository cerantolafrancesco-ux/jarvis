@echo off
REM run-voice.cmd — watchdog ingresso vocale (wake-word "JARVIS" + Whisper). Rilancia se esce.
cd /d "%~dp0"
REM hf-xet si pianta in silenzio su molte reti: forziamo il download HTTPS classico.
set "HF_HUB_DISABLE_XET=1"
REM default affidabile (CPU). Per la GPU, una volta validato cuDNN:
REM   set "JARVIS_STT_DEVICE=cuda" & set "JARVIS_STT_MODEL=small"
if not defined JARVIS_STT_DEVICE set "JARVIS_STT_DEVICE=cpu"
if not defined JARVIS_STT_MODEL  set "JARVIS_STT_MODEL=base"
:loop
python jarvis-voice.py
echo [watchdog] voce uscita, riavvio tra 3s...
timeout /t 3 /nobreak >nul
goto loop
