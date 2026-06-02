@echo off
REM run-wiki.cmd — watchdog organizzatore RAW_SOURCE -> WIKI (modalita' watch). Rilancia se esce.
cd /d "%~dp0"
set "HF_HUB_DISABLE_XET=1"
:loop
node organize.mjs --watch
echo [watchdog] wiki organizer uscito, riavvio tra 5s...
timeout /t 5 /nobreak >nul
goto loop
