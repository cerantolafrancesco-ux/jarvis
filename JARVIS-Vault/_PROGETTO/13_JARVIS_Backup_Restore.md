---
tipo: progetto-ops
aggiornato: 2026-06-02
---

# JARVIS — Backup, sicurezza, restore e trasloco

## Strategia (3 pilastri)
1. **Git** nella radice del progetto → storia versionata, si torna indietro. (I percorsi negli script sono **auto-localizzati**: il repo funziona ovunque lo si metta.)
2. **Copia fuori dalla macchina**: **GitHub privato** (push) + **NAS DS218j** (seconda copia).
3. **Segreti FUORI dal backup**: `.env`, chiavi e token non entrano MAI nel repo (`.gitignore`).

## Cosa è NEL repo (versionato, viaggia da solo)
- Tutto il Vault (`JARVIS-Vault/`): note, `00_CORE`, record, synthesis, nodi, template, `_PROGETTO`.
- `CLAUDE.md` (orchestratore) e le **skill di progetto** in `.claude/skills/` (`prompt-master`, `humanizer`).
- `_scripts/`: `jarvis-bridge/` (ponte: modello a livelli + log costi + recall), `telegram-*`, `jarvis-autostart.vbs`, `smart-connections-mcp/` (`semantic-query.mjs`, `embedder.mjs`, `vault-embed.mjs`).
- I prototipi UI, il pitch (`JARVIS-Pitch.pptx`), `.gitignore`.

## Cosa è ESCLUSO (rigenerabile / segreto)
- `**/.env` → **segreti** (API key Anthropic, token/chat_id Telegram). Mai nel repo.
- `**/node_modules/`, `dist/`, `JARVIS-Vault/.smart-env/`, plugin Obsidian → rigenerabili.
- `_scripts/outbox/`, `_scripts/logs/` (incl. `jarvis-cost.log`), `_scripts/smart-connections-mcp/hot-index.json` → transitori/rigenerabili.

## Cosa vive FUORI dalla cartella progetto (a parte / ricreabile)
- **Ollama** + modello `qwen3:8b` (~5 GB) → reinstallare e `ollama pull`.
- **`claude.exe` nativo** → reinstallare + login; su un altro percorso, imposta `JARVIS_CLAUDE_EXE`.
- **`~/.claude/settings.json`** (hook Stop/Notification → telegram-hook) e MCP (`claude mcp add smart-connections`).
- **Servizi nssm** (jarvis-telegram, n8n) e **task schedulati** `~/Claude/Scheduled/` (email-triage, productivity, vault-verifier) — ⚠️ alcuni `SKILL.md` contengono segreti (chiave Missive, token Telegram): backup **sicuro**, non pubblico.
- **nvm/Node**, **n8n data `~/.n8n`** (account+chiave cifratura).
- **Segreti** (Anthropic, Telegram, Missive) → in un **password manager**.
- ⚠️ `_scripts/ecosystem.config.js` è **obsoleto** (vecchio PM2, sostituito da nssm): contiene percorsi cablati ma non è più usato — ignorabile o eliminabile.

## Portabilità (percorsi)
Gli script si orientano dalla propria posizione nel repo, niente più percorsi assoluti:
- `server.mjs` → `JARVIS_DIR = path.resolve(__dirname, '..', '..')` (override `JARVIS_HOME`).
- `embedder.mjs` / `vault-embed.mjs` / `semantic-query.mjs` → Vault via `path.resolve` (override `SMART_VAULT_PATH`).
- `jarvis-autostart.vbs` → trova `jarvis-bridge` accanto a sé.
- Comandi nel `CLAUDE.md` → relativi alla radice (il ponte gira con cwd = progetto).
- Unico residuo: il **default** di `CLAUDE_EXE` in `server.mjs` (aggirabile con `JARVIS_CLAUDE_EXE`).

## Restore / Spostare su un altro PC — checklist
Difficoltà: **media** (~un pomeriggio). Il "cervello" (Vault + codice) arriva col clone; il resto è ambiente.
1. `git clone` del repo nella nuova posizione.
2. Ricreare `_scripts/.env` con i segreti (dal password manager).
3. Installare nvm + Node 22; `npm install` in `jarvis-bridge` e `smart-connections-mcp` (+ `npm run build` per il loader se serve).
4. Installare `claude.exe` + login; se il percorso differisce, imposta `JARVIS_CLAUDE_EXE`. `claude mcp add smart-connections`. Ricreare gli hook in `~/.claude/settings.json`.
5. Installare Ollama + `ollama pull qwen3:8b` (serve una GPU paragonabile alla RTX 2080 Ti per buone prestazioni; con GPU più debole JARVIS funziona ma il worker locale è più lento).
6. Aprire il Vault in Obsidian → Smart Connections rigenera `.smart-env`. (L'indice caldo `hot-index.json` si ripopola all'uso.)
7. Ricreare i servizi nssm e i task schedulati (doc 08 + 11) e ri-registrare l'autostart (`schtasks ... ONLOGON` sul `.vbs`).
8. Se cartella/utente differiscono e qualcosa sfugge, imposta `JARVIS_HOME` e `SMART_VAULT_PATH` come rete di sicurezza.

## ⚠️ Sicurezza immediata
- **Rigenerare la chiave API Anthropic**: è transitata in chat → revocare/rigenerare su console.anthropic.com.
- Prima di ogni push, verificare con `git status` / `git ls-files` che `_scripts/.env` **non** sia tracciato.
