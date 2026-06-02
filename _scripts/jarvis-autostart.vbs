' JARVIS - autostart al login (sessione utente)
' 1) avvia il ponte (server.mjs) con finestra NASCOSTA
' 2) attende che il porto sia in ascolto, poi apre la UI a schermo intero (kiosk)
Option Explicit
Dim sh, bridgeDir
Set sh = CreateObject("WScript.Shell")
Dim fso : Set fso = CreateObject("Scripting.FileSystemObject")
' auto-localizzato: la cartella del ponte e' accanto a questo script
bridgeDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\jarvis-bridge"

' --- TTS Piper locale (server persistente, nascosto) ---
Dim ttsDir : ttsDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\tts-server"
sh.Run Chr(34) & ttsDir & "\run-piper.cmd" & Chr(34), 0, False

' --- STT ingresso vocale (wake-word "Hey JARVIS" + Whisper, nascosto) ---
Dim sttDir : sttDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\stt-server"
sh.Run Chr(34) & sttDir & "\run-voice.cmd" & Chr(34), 0, False

' --- Sintetizzatore di profilo (controllo giornaliero, agisce ~settimanale, nascosto) ---
Dim profDir : profDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\profile"
sh.Run Chr(34) & profDir & "\run-profile.cmd" & Chr(34), 0, False

' --- 1) Ponte: avvio nascosto via watchdog (rilancia node se esce; 0 = finestra invisibile) ---
sh.Run Chr(34) & bridgeDir & "\run-bridge.cmd" & Chr(34), 0, False

' --- 2) Attesa che il ponte risponda, poi UI a tutto schermo ---
WScript.Sleep 5000
sh.Run "cmd /c start """" chrome --kiosk --new-window http://localhost:8787/", 0, False
