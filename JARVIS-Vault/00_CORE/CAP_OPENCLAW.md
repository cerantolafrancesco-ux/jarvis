---
tipo: guida-capacita
interfaccia: OpenClaw
confidence: medio-alta
aggiornato: 2026-06-03
fonti: docs.openclaw.ai
---

# Guida di capacità — OpenClaw (motore agentico locale, Fase 2)

Guida di referenza creata PRIMA dell'uso (regola JARVIS: ogni interfaccia nuova ha la sua guida). Spike deciso: usare OpenClaw con **Claude** come backend, sfruttando che è già pronto e maturo.

## Cos'è
Piattaforma di assistente AI open source, **local-first**, con agenti autonomi che eseguono davvero (shell, file, web/browser), multi-agente (workspace isolati), multi-canale (Telegram, Slack, iMessage…). Matura (~302k★ GitHub, apr 2026). Per JARVIS se ne usa **solo il motore agentico** come servizio locale; Vault/UI/voce/persona restano i nostri.

## Modelli (backend) — agnostico
Supporta Anthropic (Claude), OpenAI/Codex, Gemini, Bedrock, **Ollama**, LM Studio, OpenRouter, proxy custom. Per noi contano due:
- **Claude (cloud, a consumo)** — per i task difficili. Due vie:
  - **Claude CLI backend (preferito):** OpenClaw lancia il `claude.exe` già installato e autenticato in modalità print non interattiva → **riusa il login esistente, nessuna API key**. Richiede che OpenClaw giri sullo **stesso host** del login Claude CLI (`~/.claude`). NB: installazioni in container (Podman) NON montano `~/.claude` → lì servirebbe l'API key.
  - **API key Anthropic:** chiave in `~/.config/openclaw/.env` (auto-caricato all'avvio). Da usare solo se il backend CLI non è praticabile.
- **Ollama (locale, gratis/offline):** endpoint nativo `/api/chat` rilevato su `127.0.0.1:11434` (opt-in con `OLLAMA_API_KEY`). Modalità: cloud+local / cloud-only (ollama.com) / local-only.

Config modello: ref canonico `anthropic/claude-...` + variante runtime `claude-cli` (`agents.defaults.models`).

## Installazione (Windows)
- **Nativo (PowerShell)** — il `curl -fsSL … | bash` è solo Unix e in PowerShell fallisce (`curl` = alias di Invoke-WebRequest). Comando corretto: `iwr -useb https://openclaw.ai/install.ps1 | iex` (controlla Node 22+, lo installa via winget/Choco/Scoop se manca, poi `npm install -g openclaw@latest` e wizard). Poi `openclaw onboard --install-daemon`.
  - ⚠️ Bug noto (#24784): l'Execution Policy può bloccare `npm.ps1` → prima `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, poi rilanciare nella stessa finestra.
  - ⚠️ Il team dichiara il nativo Windows "non testato" e consiglia WSL2 in produzione. MA il backend **Claude CLI** richiede il nativo (stesso host del login `claude.exe`); in WSL2 il `~/.claude` di Windows non è visibile → servirebbe l'API key.
- Il daemon parte via Scheduled Tasks o cartella Esecuzione automatica.

## Cosa permette di fare (per l'interprete/uso)
Eseguire task reali: creare/leggere/modificare file, lanciare comandi shell, navigare il web; agenti multipli con workspace isolati e personalità (`SOUL.md`); operare su più canali. È *plumbing* interno (come n8n), non il prodotto.

## Limiti noti (hardware Fra: RTX 2080 Ti 11 GB)
In **locale** il tool-calling affidabile chiede 14B–32B con contesto ampio: un 14B Q4 ci sta ma 64k di contesto satura la VRAM → agente "discreto" per routine, meno affidabile di Claude sui task complessi. Con backend **Claude** questo limite non si pone (gira in cloud), al costo del consumo a consumo.

## Spike — ESITO (2026-06-03): SUPERATO
Installato nativo Windows (PowerShell `iwr ... install.ps1 | iex`), Gateway su `127.0.0.1:18789`, modello `anthropic/claude-sonnet-4-6`, backend Claude (auth pre-warmed OK). Task di prova ("crea cartella, scrivi script Python che ordina una lista, eseguilo, riporta output") completato da solo, tool-calling shell+file affidabile. Da chiudere prima dell'adozione: `gateway.controlUi.allowInsecureAuth=true` (lanciare `openclaw security audit`), `plugins.allow` vuoto + plugin whatsapp non voluto (rimuovere/non fidare). Non ancora provati: path Ollama locale e task multi-step complessi.

## Spike — criteri di successo (originali)
Installare → puntare al backend **claude-cli** → far eseguire un task reale (es. "crea una cartella, scrivici uno script che ordina una lista, eseguilo e riporta l'output") → misurare: affidabilità del tool-calling, tempo, attriti d'integrazione. Poi decidere se promuoverlo a motore agentico di JARVIS o ripiegare su orchestratore su misura (Qwen3 tool-calling).

Vedi [[14_JARVIS_Modelli_Ollama]], [[CAPABILITIES]], [[IDENTITY]].
