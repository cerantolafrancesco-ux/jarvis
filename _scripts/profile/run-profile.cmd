@echo off
REM run-profile.cmd — sintetizzatore di profilo. Controlla ogni giorno; lo script agisce solo
REM se sono passati >= JARVIS_PROFILE_EVERY_DAYS (default 7) dall'ultima versione di ogni utente.
cd /d "%~dp0"
:loop
node synthesize-profile.mjs
echo [profilo] giro completato, prossimo controllo tra 24h...
timeout /t 86400 /nobreak >nul
goto loop
