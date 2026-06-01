---
tipo: progetto-design
aggiornato: 2026-06-01
---

# Notifiche Telegram per JARVIS

> Obiettivo: ricevere su Telegram 4 tipi di notifica. 2 sono report di automazioni schedulate, 2 sono eventi del ciclo di vita dell'agente.

## Le 4 notifiche richieste
1. Report orario dell'automazione **`hourly-email-triage`**.
2. Report dell'automazione **`productivity-update`** (7/12/18).
3. **Intervento richiesto**: quando un task/chat ha bisogno di un input dell'utente.
4. **Task finito / in attesa**: quando l'agente completa e resta in attesa di input.

## Primitiva comune
Uno script unico **`telegram-send`** (Node.js — più veloce e portabile di PowerShell per gli hook) che fa una POST a `https://api.telegram.org/bot<TOKEN>/sendMessage`.
- Token bot e `chat_id` → in un **`.env`** (o nelle impostazioni), **MAI nel Vault**. Sono segreti.
- Riutilizzato da skill (chat/Cowork), hook (Claude Code) e automazioni schedulate.

## Mappa notifica → meccanismo

| # | Notifica | Meccanismo | Funziona in |
|---|---|---|---|
| 1 | Report email-triage | Il prompt schedulato chiama `telegram-send` a fine run | Schedulato ✅ |
| 2 | Report productivity | Idem | Schedulato ✅ |
| 3 | Intervento richiesto | Hook **Notification / PermissionRequest** → `telegram-hook.js` | Claude Code CLI/headless/scheduled ✅ · Cowork ❌ (vedi sotto) |
| 4 | Task finito / attesa | Hook **Stop** → `telegram-hook.js` | Claude Code CLI/headless/scheduled ✅ · Cowork ❌ |

## ⚠️ Limite Cowork (bug noto #40495)
Le sessioni **Cowork ignorano gli hook** e le settings standard di Claude Code. Quindi 3 e 4 via hook valgono solo per Claude Code. Per coprire anche Cowork: **convenzione comportamentale** — regola in [[META_RULES]] che istruisce l'agente a invocare `telegram-send` quando (a) chiede un input o (b) conclude un task. Meno garantito di un hook, ma funzionale.

## Configurazione hook (Claude Code)
File: `C:\Users\ceran\.claude\settings.json`
```json
{
  "hooks": {
    "Notification": [{ "hooks": [{ "type": "command", "command": "node C:\\Users\\ceran\\.claude\\scripts\\telegram-hook.js", "async": true }] }],
    "Stop":         [{ "hooks": [{ "type": "command", "command": "node C:\\Users\\ceran\\.claude\\scripts\\telegram-hook.js", "async": true }] }]
  }
}
```
Lo script riceve su **stdin** un JSON con `hook_event_name`, `message`, `tool_name`, `session_id` → da cui costruisce il testo del messaggio Telegram.
> Nota: i nomi esatti degli eventi hook (Notification vs PermissionRequest, ecc.) vanno **confermati empiricamente** in fase di build — la denominazione varia tra versioni.

## Report schedulati (1 e 2)
Modificare i `SKILL.md` delle due automazioni: in coda al loro lavoro, aggiungere "invia il riepilogo a Telegram via `telegram-send`".
- `C:\Users\ceran\Claude\Scheduled\hourly-email-triage\SKILL.md`
- `C:\Users\ceran\Claude\Scheduled\productivity-update\SKILL.md`

## Prerequisiti (da fare l'utente)
1. **Claude Code installato** (in corso) e loggato.
2. Creare un bot via **@BotFather** → ottenere il **token**.
3. Ricavare il proprio **chat_id** (es. scrivendo al bot e leggendo `getUpdates`, o via @userinfobot).
4. Salvare token + chat_id in `.env` / config — **mai nel Vault**.

## Sicurezza
- Token = segreto: fuori dal Vault, fuori dalla memoria.
- Le notifiche 1/2 (schedulate) e gli hook inviano **in autonomia**: autorizzati una volta dall'utente.
