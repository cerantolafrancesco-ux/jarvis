---
tipo: progetto-config
aggiornato: 2026-06-01
---

# JARVIS — Prompt di config + avvio automatico al boot

## 1. Prompt per la configurazione generale di Claude (notifiche Telegram)

Da incollare nelle **istruzioni personalizzate di Cowork** e/o in `C:\Users\ceran\.claude\CLAUDE.md` (config globale di Claude Code):

```
## Notifiche Telegram (JARVIS)
Quando hai bisogno di un mio input (stai per farmi una domanda e attendere una risposta)
oppure quando completi un task e resti in attesa di una mia decisione, avvisami su Telegram
lasciando una nota nella outbox di JARVIS:

  node "C:\Users\ceran\Documents\Claude\Projects\JARVIS\_scripts\telegram-drop.js" "<fonte>" "<messaggio breve>"

(<fonte> = "Cowork", "chat", o il contesto). In alternativa scrivi un file JSON in
C:\Users\ceran\Documents\Claude\Projects\JARVIS\_scripts\outbox\ con
{"text":"<messaggio>","source":"<fonte>"} (scrittura atomica .tmp -> .json).

Regole:
- Solo per momenti reali: "mi serve il tuo input" o "task finito, in attesa". Niente
  notifiche per passi intermedi o banali.
- Messaggi brevi, in italiano, e identifica sempre la fonte.
- ECCEZIONE: in Claude Code / Claudian NON inviare nulla a mano — gli hook (Stop e
  Notification) inviano già da soli. Evita doppioni.
```

> Perché funziona: Cowork/chat non raggiungono Telegram, ma sanno scrivere nella outbox; il watcher su Windows recapita. Claude Code/Claudian usano invece gli hook diretti.

---

## 2. Avvio automatico di tutto al boot del PC

Obiettivo: nessun terminale da tenere aperto a mano. I due servizi sempre attivi sono **n8n** e **telegram-watcher**. Li mettiamo entrambi sotto **PM2**, e PM2 li ripristina al boot.

### Passi (PowerShell)
```
# 0. Assicurarsi che nvm sia su Node 22 (n8n NON supporta la 24)
nvm use 22.22.3

# 1. Fermare l'n8n avviato a mano (Ctrl+C nel suo terminale), poi metterlo sotto PM2
pm2.cmd start n8n --name n8n
#   (se 'pm2 start n8n' non parte, usare il percorso del bin n8n in node_modules)

# 2. Il watcher è già sotto PM2 come 'jarvis-telegram'. Salvare la lista processi:
pm2.cmd save

# 3. Abilitare l'avvio al boot di Windows:
npm.cmd install -g pm2-windows-startup
pm2-startup install

# 4. Salvare di nuovo dopo aver avviato tutto:
pm2.cmd save
```

Dopo un riavvio del PC, `pm2.cmd list` deve mostrare **n8n** e **jarvis-telegram** entrambi `online`.

### ⚠️ Caveat nvm (importante)
`nvm-windows` è **globale**: la versione attiva vale per tutti i processi. I servizi JARVIS girano con la versione attiva al boot — **tenerla su 22**. Se serve spesso la 24 per Probrand, NON basta `nvm use 24` (cambierebbe anche i servizi): in quel caso si **pinnano** i servizi a un percorso Node 22 assoluto:
```
pm2.cmd delete jarvis-telegram
pm2.cmd start "C:\Users\ceran\Documents\Claude\Projects\JARVIS\_scripts\telegram-watcher.js" --name jarvis-telegram --interpreter "C:\Users\ceran\AppData\Local\nvm\v22.22.3\node.exe"
pm2.cmd save
```
Così il watcher resta su Node 22 qualunque cosa faccia nvm.

### Verifica finale
1. Riavvia il PC.
2. `pm2.cmd list` → n8n e jarvis-telegram `online`.
3. `node ..\telegram-drop.js "Boot" "Test post-riavvio"` → arriva su Telegram.
4. `http://localhost:5678` → n8n risponde.
