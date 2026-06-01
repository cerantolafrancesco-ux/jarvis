# 🧠 JARVIS Neural Vault

Vault-memoria dell'assistente JARVIS. Non è un archivio di testo: è una **rete neurale navigabile** costruita dalle interazioni con Gemini, Claude, Claude Code e Cowork.

## Struttura

| Cartella | Contenuto |
|---|---|
| `00_CORE/` | Identità, regole, log di auto-apprendimento. Il "sistema operativo" dell'assistente. |
| `01_SESSIONS/` | Log grezzi delle chat, divisi per fonte (`cowork`, `claude-code`, `claude-ai`, `gemini`). |
| `02_MEMORY_NODES/` | Nodi-concetto: non contengono dati, solo connessioni. Creano la rete nel Graph View. |
| `03_RECORDS/` | Record indicizzati di ogni interazione (frontmatter + timeline + link). |
| `04_SYNTHESIS/` | Sintesi analitiche: decisioni distillate, riusabili come referenze. |
| `05_TEMPLATES/` | Template Templater per generare record, sintesi e nodi in modo coerente. |
| `_PROGETTO/` | Documenti di design dell'architettura JARVIS (00–04). |

## Il ciclo (come "pensa" il Vault)

```
nuova interazione → RECORD (01/03) → SYNTHESIS (04) → aggiorna NODI (02)
       ↑                                                      │
       └──────── recall semantico (Smart Connections) ←───────┘
```

## Principi
- **Scrittore unico:** solo Claude scrive le note. Gli altri modelli propongono, non scrivono.
- **Embedding locale:** Smart Connections con modello locale integrato (zero costi, dati in locale).
- **Recall ciclico:** la memoria si interroga durante il lavoro, non solo all'inizio.

## Indice note
**Nucleo:** [[IDENTITY]] · [[META_RULES]] · [[AUTOLEARNING_LOG]]
**Design (`_PROGETTO/`):** [[00_JARVIS_Architettura]] · [[01_JARVIS_Roadmap]] · [[02_JARVIS_Memoria_MultiModello]] · [[03_Memoria_Conversazione_Gemini_Orchestrator]] · [[04_JARVIS_Setup_Base]]
**Template:** [[TEMPLATE_RECORD]] · [[TEMPLATE_SYNTHESIS]] · [[TEMPLATE_NODE]]

> Questo README è l'hub: da qui ogni nota è raggiungibile in un clic, e nel Graph View diventa il centro della rete.
