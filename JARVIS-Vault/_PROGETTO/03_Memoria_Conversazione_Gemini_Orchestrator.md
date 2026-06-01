---
id: MEM-20260531-GEMINI-ORCHESTRATOR
tipo: memoria-conversazione
fonte: Gemini (chat condivisa f13c5daa6631)
data_archiviazione: 2026-05-31
modelli_coinvolti: [gemini, claude]
progetto: JARVIS
topic: Local Agentic Orchestrator + Obsidian Knowledge Graph
tags: [orchestrator, obsidian, smart-connections, mcp, tool-calling, nodejs, rag, embedding, neural-vault]
correlati: ["[[00_JARVIS_Architettura]]", "[[02_JARVIS_Memoria_MultiModello]]"]
stato: archiviato + revisionato (correzioni tecniche applicate)
---

# Memoria — Conversazione Gemini: "Local Agentic Orchestrator & Obsidian Knowledge Graph"

> Conversazione archiviata su richiesta dell'owner. Il link condiviso non era recuperabile via fetch/browser (`gemini.google.com` bloccato da policy d'organizzazione); il contenuto è stato fornito manualmente dall'owner e qui sintetizzato + revisionato da Claude. Le **correzioni tecniche** (§5) prevalgono sul testo originale Gemini dove in conflitto.

---

## 1. Sintesi in una riga

Gemini (in ruolo di Architetto di Sistema) e l'owner hanno progettato un **Orchestratore di Agenti AI locale (edge)**: una Web App/PWA unica che fa da router semantico verso più LLM, esegue task agentici sul PC, e logga ogni interazione come nota Markdown in un Vault Obsidian alimentato da Smart Connections (RAG vettoriale locale). Questo progetto **è** JARVIS, visto dall'angolo dell'ingestion + knowledge graph.

---

## 2. Mappa concettuale (decisioni consolidate)

| Dominio | Decisione presa | Stato |
|---|---|---|
| Architettura | 100% locale / edge sul PC dell'owner | ✅ Consolidata |
| Hardware host | HP OMEN, Intel i9-9900K, 64 GB RAM, Windows 11 Home | ✅ Adeguato |
| Ruolo NAS Synology DS218j | **Solo storage/sync** del Vault (no calcolo: ARM, 512 MB RAM, no Docker) | ✅ Consolidata |
| Backend / "motore" | Custom in **Node.js/TypeScript** (Express o Fastify); no middleware commerciale | ✅ Consolidata |
| Middleware esterni (Make/n8n) | **Esclusi** — latenza, costi, dipendenze | ⚠️ Diverge da 00_Architettura (vedi §6) |
| Frontend / UI | Web App / PWA (icona su telefono, niente app store) | ✅ |
| Accesso remoto | Tailscale o Cloudflare Tunnel (VPN mesh, niente porte aperte) | ✅ |
| Routing semantico | Gemini fa la classifica veloce → restituisce `model_routing` + `tags` | ✅ (da rivedere, §5) |
| Esecuzione task agentici | **Claude Code headless** (`claude -p`) via `child_process`, non la GUI di Cowork | ✅ (impatto billing, §5) |
| Pilotare GUI di Cowork (RPA) | **Scartato** — fragile (pywinauto/pyautogui) | ✅ Corretta scelta |
| Computer Use API | Solo fallback per software legacy senza API (costoso/lento) | ✅ |
| Protocollo MCP | Backend come MCP Host/Client per riusare connettori esistenti | ✅ |
| Memoria semantica | Plugin **Smart Connections** (embeddings + cosine similarity + Smart Chat RAG) | ✅ |
| Motore embedding | Locale via **Ollama** (`nomic-embed-text`, costo zero) o API cloud (costo trascurabile) | ✅ |

---

## 3. Architettura del flusso (come definita nella conversazione)

```
[ Web App / PWA (anche da telefono via Tailscale) ]
            │  REST / WebSocket
            ▼
[ Backend locale Node.js  —  Router + MCP Host ]
   ├─ Step A: Gemini → analisi semantica → { model_routing, tags }
   ├─ Step B: esecuzione su modello scelto (Claude per codice, ecc.)
   ├─ Task agentici → claude -p (headless) + MCP → file system / git / IDE
   └─ Step C: save_to_obsidian_vault(prompt, risposta, tags) via fs
            ▼
[ Vault Obsidian locale ]  → sync su NAS DS218j
            ▼
[ Smart Connections ]  → embeddings → Smart View + Smart Chat (RAG)
```

---

## 4. Asset riutilizzabili prodotti nella conversazione

### 4.1 Template nota "neurone" (YAML frontmatter per Smart Connections)
```yaml
---
id: {{timestamp_univoco}}
modello: {{nome_modello_usato}}
strumento_attivato: {{tool_name_se_applicabile}}
data_ora: {{datetime_iso8601}}
tags: [{{array_di_tag_generati_semanticamente}}]
---

# 🧠 Prompt Utente
{{testo_prompt}}

---
# 🤖 Risposta / Log Esecuzione
{{output_dell_agente}}
```

### 4.2 Blueprint per lo sviluppo del Core Router Backend (da passare a Claude/Cowork)
> **Ruolo:** Senior Software Engineer esperto in Node.js, AI Agents e protocollo MCP.
> **Obiettivo:** "Agentic Orchestrator" locale su Windows 11. Backend (Express/Fastify) come router e MCP Client per una Web App custom.
> **Task:** server di bootstrap con: endpoint `POST /api/chat`; Tool Registry via SDK ufficiale Anthropic; tool `save_to_obsidian_vault(prompt, response, tags)` che scrive `.md` con frontmatter via `fs`; loop di Tool Calling; ES Modules/TypeScript; gestione errori permessi Windows; `.env` per API key e `OBSIDIAN_VAULT_PATH`.

---

## 5. ⚠️ Correzioni tecniche di Claude (verificate il 31 mag 2026)

La conversazione Gemini contiene riferimenti **datati**. Vanno corretti prima di costruire:

1. **Modelli citati obsoleti.** Gemini parla di "Claude 3.5 Sonnet" e "claude-3-opus". Al 31 mag 2026 i modelli correnti sono **Opus 4.8** (uscito il 28 mag 2026), **Opus 4.7** (flagship precedente), **Sonnet 4.6**, **Haiku 4.5**. Computer Use gira su Opus/Sonnet 4.6+ (OSWorld >72%). Le vecchie sigle vanno sostituite negli schemi di routing.

2. **🔴 Cambio di billing del 15 giugno 2026 — impatta direttamente il piano.** Dal 15/06/2026 l'uso di **Claude Agent SDK e `claude -p` (headless) NON conta più sui limiti del piano Claude**: il piano resta riservato all'uso *interattivo* (Claude Code, Cowork, Claude). Conseguenza: l'idea-cardine "uso Claude Code headless per azzerare i costi" **non regge più dopo quella data** — l'esecuzione headless andrà su billing API a consumo. Va rifatto il conto economico: o si accetta il costo token API, o si usa Cowork/Claude Code in modo interattivo (ma allora non è orchestrabile da backend).

3. **Nome SDK.** Il "Claude Code SDK" è stato rinominato **Claude Agent SDK** (fine 2025). Disponibile come CLI, e pacchetti Python/TypeScript. Funzioni utili: modalità headless (`claude -p`), **Remote Control** (pilotare una sessione da fuori dal terminale), **Dispatch** (trigger programmatico tipo job-queue). Questi rendono l'orchestrazione più pulita della pura `child_process`.

---

## 6. ⚠️ Divergenza architetturale da risolvere (n8n vs backend custom)

- `00_JARVIS_Architettura.md` sceglie **n8n locale** come orchestratore (no-code, scelto per "zero esperienza richiesta").
- La conversazione Gemini **scarta n8n** in favore di un **backend Node.js custom** (meno latenza/dipendenze, ma richiede saper programmare — delegato a Claude/Cowork).

Sono due filosofie opposte. **Decisione dell'owner necessaria** prima di scrivere codice. Trade-off: n8n = veloce da mettere in piedi, visuale, manutenibile senza codice; backend custom = più controllo e performance, ma è software da mantenere.

---

## 7. Punti aperti (per i prossimi giri)

- Scelta orchestratore: n8n vs backend Node.js custom (§6).
- Conto economico post-15/06/2026 per l'esecuzione agentica (§5.2).
- Embedding: locale (Ollama `nomic-embed-text`) vs cloud — incrocia la scelta provider già fatta in `02_JARVIS_Memoria_MultiModello.md` (Voyage AI).
- **State management cross-tool**: mantenere il contesto quando il router passa da un modello all'altro (array JSON di storico iniettato nel system prompt di ogni chiamata).
- Gestione tag: generati dal router (pre-categorizzazione) vs delegati a Smart Connections (vettoriale). La conversazione propende per entrambi: tag dal router + connessioni semantiche da Smart Connections.

---

## 8. Stato e prossimo passo dichiarato nella conversazione
Fase di **bootstrap del backend**. Ultima risposta dell'owner a Gemini: "Sì" alla generazione del codice del Core Router Backend in Node.js. → Da rivedere alla luce di §5 e §6 prima di procedere.
