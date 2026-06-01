---
tipo: progetto-ops
aggiornato: 2026-06-01
---

# JARVIS — Backup, sicurezza e restore

## Strategia (3 pilastri)
1. **Git** nel progetto `C:\Users\ceran\Documents\Claude\Projects\JARVIS` → storia versionata, si torna indietro.
2. **Copia fuori dalla macchina**: **GitHub privato** (push) + **NAS DS218j** (seconda copia).
3. **Segreti FUORI dal backup**: `.env`, chiavi e token non entrano MAI nel repo (`.gitignore`).

## Cosa è NEL repo (versionato)
- Tutto il Vault (`JARVIS-Vault/`): note, `00_CORE`, record, synthesis, nodi, template, `_PROGETTO`.
- `CLAUDE.md` (orchestratore), i prototipi UI (v1–v6), `_scripts/` (telegram-*, watcher, drop, jarvis-bridge, `semantic-query.mjs`).
- `.gitignore`.

## Cosa è ESCLUSO (e perché)
- `**/.env` → **segreti** (API key Anthropic, token/chat_id Telegram). Mai nel repo.
- `**/node_modules/`, `dist/`, `.smart-env/`, plugin Obsidian → **rigenerabili**.
- `outbox/`, `logs/` → transitori.

## Cosa vive FUORI dalla cartella progetto (back up a parte / ricreabile da doc)
- **Task schedulati** `C:\Users\ceran\Claude\Scheduled\` (email-triage, productivity, vault-verifier) — ⚠️ i loro `SKILL.md` contengono segreti (chiave Missive, token Telegram): backup **sicuro**, non pubblico.
- **`~/.claude/settings.json`** (hook Stop/Notification → telegram-hook).
- **Servizi nssm** (jarvis-telegram, n8n) — ricreabili da [[08_JARVIS_Avvio_e_Config]].
- **`claude.exe` nativo**, **nvm/Node**, **n8n data `~/.n8n`** (account+chiave cifratura) — reinstallabili / da copiare se serve.
- **Segreti** (Anthropic, Telegram, Missive) → in un **password manager**, mai nel repo.

## Restore (da zero)
1. `git clone` del repo.
2. Ricreare `_scripts/.env` con i segreti (dal password manager).
3. `npm install` in `jarvis-bridge` e in `smart-connections-mcp` (+ `npm run build`); riclonare smart-connections-mcp se serve.
4. Installare `claude.exe` nativo + skill (prompt-master/humanizer); `claude mcp add smart-connections`.
5. Ricreare i servizi nssm e i task schedulati (doc 08 + 11).
6. Aprire il Vault in Obsidian → Smart Connections rigenera gli embeddings.

## ⚠️ Sicurezza immediata
- **Rigenerare la chiave API Anthropic**: è transitata in chat → da revocare/rigenerare su console.anthropic.com.
- Prima del primo commit, verificare con `git status` che `_scripts/.env` **non** sia tracciato.
