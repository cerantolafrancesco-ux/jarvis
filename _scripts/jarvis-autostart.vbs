' JARVIS - autostart al login (sessione utente)
' 1) avvia il ponte (server.mjs) con finestra NASCOSTA
' 2) attende che il porto sia in ascolto, poi apre la UI a schermo intero (kiosk)
Option Explicit
Dim sh, bridgeDir
Set sh = CreateObject("WScript.Shell")
Dim fso : Set fso = CreateObject("Scripting.FileSystemObject")
' auto-localizzato: la cartella del ponte e' accanto a questo script
bridgeDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\jarvis-bridge"

' --- 1) Ponte: avvio nascosto (parametro 0 = finestra invisibile, niente console) ---
sh.Run "cmd /c cd /d """ & bridgeDir & """ && node server.mjs", 0, False

' --- 2) Attesa che il ponte risponda, poi UI a tutto schermo ---
WScript.Sleep 5000
sh.Run "cmd /c start """" chrome --kiosk --new-window http://localhost:8787/", 0, False
