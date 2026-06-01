---
tipo: concept-node
cluster: tecnico
created: 2026-06-01
---

# notifiche-telegram

> Nodo-concetto: sistema di notifiche multi-canale verso Telegram (file-drop + watcher + hook).

## Record che lo usano
- [[REC-20260601-infrastruttura-jarvis]]

## Concetti correlati
[[nssm]] · [[n8n]] · [[neural-vault]]

## Pattern emersi
> Il sandbox degli agenti blocca `api.telegram.org` (403 proxy). Soluzione file-drop: i produttori (Cowork/chat/schedulati) scrivono un JSON nella `outbox`; il `telegram-watcher` su Windows recapita. Claude Code/Claudian usano invece gli hook diretti. Token e chat_id in `_scripts/.env`, mai nel Vault.
