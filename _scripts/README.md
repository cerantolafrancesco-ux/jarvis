# _scripts — tooling JARVIS (FUORI dal Vault)

Cartella per script e segreti. **Non** è dentro il Vault Obsidian → non viene indicizzata da Smart Connections.

- `.env` — segreti (token Telegram, chat_id). **Mai** copiare nel Vault. Escludere da eventuali backup/sync pubblici.
- `telegram-send.js` — (in arrivo) primitiva di invio messaggi Telegram.
- `telegram-hook.js` — (in arrivo) wrapper per gli hook di Claude Code.
