---
tipo: progetto-design
aggiornato: 2026-06-02
stato: piano (da implementare quando i modelli sono scaricati)
---

# JARVIS — Gestione dei modelli Ollama (ruoli → modelli)

JARVIS usa più modelli locali, uno per ruolo. Oggi la scelta è già parametrizzata via variabili d'ambiente lette dal ponte/worker; "gestione dei modelli" = mappare ruolo→modello e poterlo cambiare comodamente.

## Ruoli e modelli (mappa)
| Ruolo | A cosa serve | Variabile | Default | Consiglio |
|------|--------------|-----------|---------|-----------|
| **worker** | distillazione inbox, ingestion, classificazione topic, verificatore stadio 1 | `JARVIS_WORKER_MODEL` | `qwen3:8b` | `qwen3:8b` |
| **chat** | chiacchiera spiccia (barra in fondo) | `JARVIS_CHAT_MODEL` | = worker | piccolo e veloce: `qwen3:1.7b` |
| **local** | cervello dei terminali in modalità offline | `JARVIS_LOCAL_MODEL` | = worker | più capace: `qwen3:14b` (entra negli 11 GB) |
| **embeddings** | recall semantico (Vault + indice caldo) | — (bge-micro-v2 locale) | bge-micro-v2 | invariato |
| **agent (Fase 2)** | agente locale con strumenti (vedi OpenClaw) | da definire | — | modello con buon tool-calling (qwen3:14b o coder) |

Tutti su Ollama (`localhost:11434`), tranne gli embeddings (transformers.js locale).

## Da implementare (quando i modelli sono scaricati)
- Decidere e scaricare i modelli per ruolo (`ollama pull ...`).
- Impostare le variabili nel lancio del ponte (run-bridge.cmd) o un piccolo `_scripts/models.json` letto dal ponte.
- (Opzionale) selettore nella UI per riassegnare il modello per ruolo a runtime, come il selettore di voce.

## OpenClaw come motore agentico locale (Fase 2 — da valutare)
Ipotesi: usare **OpenClaw** in locale per dare agli agenti tool-use su modelli Ollama → la modalità locale smette di essere "solo conversazione" e diventa esecutiva (file, codice, ecc.) senza Claude/Internet.
- **Da verificare prima di adottare:** è realmente locale? fa tool-calling affidabile? backend Ollama o dipendenze esterne? qualità su un 8-14B?
- **Inquadramento:** sarebbe *plumbing* interno (come n8n), non il prodotto — non intacca il racconto "JARVIS è un mondo locale".
- In alternativa, orchestratore locale su misura con il tool-calling nativo di Qwen3.

### Analisi OpenClaw (2026-06-02, fonti incrociate, confidenza medio-alta)
- **Cos'è:** assistente personale OSS 100% locale, agenti autonomi "a battito", esecuzione reale (shell, file, web/browser), multi-agente (workspace isolati, personalità `SOUL.md`), molti canali (Telegram, Slack, iMessage…). ~302k stelle GitHub (apr 2026), maturo.
- **Ollama:** endpoint nativo `/api/chat` con streaming + tool-calling; auto-discovery dei modelli tool-capaci. ⚠️ usare `/api/chat`, NON `/v1` (perde le tool-call in streaming).
- **Requisiti:** tool-calling affidabile → 14B–32B (32B+ meglio), contesto ≥64k. Sulla 2080 Ti (11 GB): un 14B Q4 ci sta, ma 64k di contesto satura la VRAM → stretto/lento; 32B no. Esito: agente locale "discreto" per automazioni di routine, meno affidabile di Claude sui task complessi.
- **Rischi:** sovrapposizione (OpenClaw è una piattaforma completa: usarne SOLO il motore agentico come servizio locale, tenendo Vault/UI/voce/persona di JARVIS); identità/pitch (plumbing interno come n8n, non skin).
- **Decisione:** candidato forte per la Fase 2 con aspettative tarate. Prossimo passo: **spike** — installare, puntare a Ollama `/api/chat`, far eseguire un task reale con un modello tool-capace ≤11 GB, misurare affidabilità/velocità; poi scegliere fra OpenClaw e orchestratore su misura (Qwen3 tool-calling).

Vedi [[10_JARVIS_Orchestratore]], [[13_JARVIS_Backup_Restore]].
