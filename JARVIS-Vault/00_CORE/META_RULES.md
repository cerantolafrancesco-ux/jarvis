---
tipo: core-rules
aggiornato: 2026-05-31
---

# META_RULES — Regole operative del sistema

## Scrittura sul Vault
1. **Scrittore unico:** solo Claude scrive le note. Gemini e altri modelli **propongono** (in `04_SYNTHESIS/_PROPOSALS.md`), non scrivono mai direttamente.
2. **Mai auto-merge dei conflitti:** se emerge una contraddizione tra record, si crea un task per decisione umana, non si sceglie da soli.

## Routing dei modelli
- Classificazione/routing veloce → **Haiku 4.5** (o Gemini via API quando disponibile).
- Esecuzione standard → **Sonnet 4.6**.
- Task complessi/agentici → **Opus 4.7/4.8**.
- Esecuzione sul PC → **Cowork via Dispatch** (interattivo) o Claude Code.

## Memoria e recall
- Embedding: **modello locale di Smart Connections** (zero costi, locale).
- Recall **ciclico**: interrogare la memoria durante il task, non solo all'inizio (via ponte MCP, da costruire).
- Ogni interazione rilevante genera un RECORD → SYNTHESIS → aggiorna i NODI.

## Versionamento dei concetti
- Un topic che evolve usa `supersedes:` nel frontmatter del nuovo record (catena ricostruibile via Dataview).
- Niente campi manuali fragili (`weight`, `reuse_count` derivati automaticamente, non scritti a mano).

## Notifiche Telegram (regola generale)
Quando l'agente — in Cowork, in chat o in un task schedulato — (a) **ha bisogno di un input dell'utente** oppure (b) **completa un task e resta in attesa**, deve lasciare una notifica nella outbox, perché quegli ambienti non raggiungono Telegram direttamente.
- **Come:** scrivere un file JSON in `C:\Users\ceran\Documents\Claude\Projects\JARVIS\_scripts\outbox\` con `{ "text": "<messaggio>", "source": "Cowork|chat|<task>" }` (in modo atomico: `.tmp` → `.json`), oppure eseguire `node _scripts\telegram-drop.js "<source>" "<testo>"`.
- Il `telegram-watcher.js` su Windows (PM2) recapita il messaggio.
- **Eccezione:** Claude Code / Claudian usano gli **hook** (`Notification`, `Stop`) che inviano già in diretta — lì non serve il file-drop.
- Mantenere i messaggi brevi e identificare sempre la fonte.

## Ingestion — auto-registrazione a fine sessione (regola generale)
Al termine di una sessione di lavoro significativa (decisioni prese, qualcosa costruito o risolto), l'agente **registra da sé** la memoria nel Vault, senza aspettare uno scraper:
1. **RECORD** in `03_RECORDS/` (da `TEMPLATE_RECORD`): nome `REC-YYYYMMDD-<slug>.md`. Frontmatter completo (fonte, modello, topic, tags, timeline). Sintesi di prompt/contesto e di cosa è stato fatto. Link ai nodi e alla synthesis.
2. **SYNTHESIS** in `04_SYNTHESIS/` (da `TEMPLATE_SYNTHESIS`): nome `SYNTH-YYYYMMDD-<slug>.md`. Decisione chiave, ragionamento, applicabilità futura, limiti.
3. **NODI** in `02_MEMORY_NODES/`: per ogni concetto chiave, creare o aggiornare il nodo (`[[wikilink]]` al record). I nodi contengono solo connessioni, non dati.
4. Aggiungere i `[[link]]` incrociati così il grafo si popola.
**Versionamento:** se il topic evolve un record precedente, usare `supersedes:` nel frontmatter. **Qualità > quantità:** un record per sessione/argomento reale, non per ogni micro-passo.
> Lo scraper dei transcript (backfill automatico) è un layer opzionale futuro; la fonte primaria e più affidabile è questa auto-registrazione.

## Riconoscimento comandi & recall della memoria
- **Il riconoscimento dell'intento è dell'orchestratore (Claude), non di un matcher di stringhe.** Per qualsiasi comando testuale, accetta **tutte le forme coerenti**: non pretendere la sintassi esatta, interpreta l'intento.
- **Recall memoria:** se il messaggio chiede di ripescare qualcosa dal passato/Vault (vedi esempi-seme in [[RECALL_ALIASES]], che vanno generalizzati), estrai l'oggetto `X` dalla frase ed esegui:
  ```
  node "C:\Users\ceran\Documents\Claude\Projects\JARVIS\_scripts\smart-connections-mcp\semantic-query.mjs" "X"
  ```
  In alternativa, in Claude Code, usa i tool MCP `smart-connections` (`search_notes`, `get_similar_notes`).
- **In dubbio → CHIEDI:** "È una ricerca nella memoria, o un altro comando?". Se l'utente conferma "memoria" **e** la frase usa una forma nuova non presente in [[RECALL_ALIASES]], **aggiungila** nella sezione *Auto-appresi* di quel file (con la data). Questo è l'auto-apprendimento degli alias.
- Lo stesso principio (intento + esempi-seme estendibili + auto-apprendimento alla conferma) vale come **modello generale** per i futuri comandi, non solo per il recall.

## Identità
- Le modifiche a [[IDENTITY]] sono proposte da Claude e **approvate dall'utente**; ogni cambiamento va loggato in [[AUTOLEARNING_LOG]].
