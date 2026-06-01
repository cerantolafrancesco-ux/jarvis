# JARVIS — Memoria Multi-Modello + Layer Arbitro

> **Stato:** Design / Fase 0
> **Ultimo aggiornamento:** 31 maggio 2026
> **Owner:** Fra (cerantolafrancesco@gmail.com)
> **Decisione di partenza:** architettura multi-modello con arbitro (scelta dall'owner)
> **Correlati:** `00_JARVIS_Architettura.md`, `01_JARVIS_Roadmap.md`

---

## 0. Nota critica preliminare (registrata, non rimossa)

Questa architettura è stata richiesta esplicitamente. Per onestà tecnica resta agli atti che, al volume attuale del vault (Fase 0, zero record), il multi-modello aggiunge complessità, costo e rischio di inconsistenza che non sono ancora ripagati da un beneficio. Il valore di Gemini (visione globale del vault) si manifesta **solo** quando il vault eccede ciò che il retrieval per embedding recupera in modo mirato.

Mitigazione adottata nel design: l'architettura è **modulare e attivabile a stadi**. Si costruisce il layer Claude + embedding per primo (vale da subito); Gemini e l'arbitro si innestano dopo, senza riscrivere nulla. Così la decisione viene rispettata ma il rischio è incapsulato.

---

## 1. Fatti tecnici verificati (31 mag 2026)

| Affermazione | Verità | Fonte |
|---|---|---|
| API di embedding Anthropic/Claude | **Non esiste.** Claude genera testo, non vettori. | docs.claude.com |
| Provider embedding raccomandato da Anthropic | **Voyage AI** (`voyage-3-large`, in testa su MTEB ~65%) | claude-cookbooks |
| Alternative embedding valide | OpenAI `text-embedding-3`, Google `text-embedding-005` (più economico, ~$0.006/M), Cohere `embed-v4` | StackSpend |
| Context window Gemini 2.5 Pro | **1.048.576 token** (1M), output max 65.536; 2M "in arrivo" | ai.google.dev |

Conseguenza progettuale: **gli embedding non li produce Claude**. Serve un terzo servizio (Voyage consigliato). Questo non era opzionale nella proposta precedente — era un endpoint inesistente. Ora è corretto.

---

## 2. I quattro attori del sistema

| Attore | Ruolo | Può scrivere sul vault? |
|---|---|---|
| **Claude (API)** | Cervello primario: genera RECORD + SYNTHESIS, gestisce IDENTITY, ragiona, conversa, decide routing JARVIS. **Unica source-of-truth in scrittura.** | ✅ Sì |
| **Gemini 2.5 Pro (API)** | Occhio globale: scansiona l'intero vault (fino a 1M token) per scoprire connessioni cross-nodo non ovvie e fare audit di consistenza. **Solo consultivo.** | ❌ No (propone, non scrive) |
| **Voyage AI (`voyage-3-large`)** | Motore di embedding: trasforma i SYNTH in vettori per il retrieval semantico attivo. | ❌ No (scrive solo nel vector store) |
| **Arbitro (n8n + regole)** | Router deterministico: decide quale attore interpellare per ogni query. **Non è un LLM.** | ❌ No |

**Principio cardine #1 — Single Writer.** Solo Claude scrive note nel vault. Gemini e Voyage non toccano mai i `.md`. Questo elimina alla radice il rischio di "due modelli che scrivono interpretazioni divergenti" che Lei stesso aveva identificato.

**Principio cardine #2 — Arbitro deterministico.** L'arbitro è codice a regole, non un modello che "decide". Un LLM-arbitro sarebbe un punto di fragilità in più (costo, latenza, non-determinismo). Le regole sono ispezionabili e gratuite.

---

## 3. Il Layer Arbitro — tabella di routing

L'arbitro classifica ogni richiesta su due assi: **tipo di operazione** e **ampiezza di contesto necessaria**. Poi instrada.

| Tipo di query | Ampiezza contesto | → Instrada a | Perché |
|---|---|---|---|
| Genera/aggiorna RECORD o SYNTHESIS | Locale (1 sessione) | **Claude** | Qualità analitica, coerenza di stile |
| Gestione IDENTITY / personalità | Locale | **Claude** | Continuità di voce |
| Conversazione, ragionamento, decisione | Variabile | **Claude** (+ retrieval) | È il cervello |
| "Trovami ciò che è rilevante per X" | Mirata (top-k nodi) | **Voyage → Claude** | Embedding recupera i 5 nodi giusti, Claude li usa. Niente Gemini. |
| "Trova pattern/contraddizioni in TUTTO il vault" | Globale (intero grafo) | **Gemini** | Solo lui regge 1M token in una chiamata |
| Audit di consistenza periodico | Globale | **Gemini** (read) → flag → **Claude** (fix) | Gemini segnala, Claude corregge |
| Proposta di connessioni nuove tra nodi | Globale | **Gemini** (propone) → owner approva | Vede tutto il grafo insieme |

**Regola di soglia (la più importante):** una query va a Gemini **solo se** il retrieval per embedding restituisce troppi nodi rilevanti (es. > 30) *oppure* la richiesta è esplicitamente globale ("in tutto il vault", "ovunque", "contraddizioni"). In tutti gli altri casi vince l'embedding: più economico, più veloce, più preciso.

```
Query in ingresso
   │
   ▼
[Arbitro] classifica tipo + ampiezza
   │
   ├─ scrittura/identity/conversazione ──────────────► CLAUDE
   │
   ├─ "trovami il rilevante" ──► VOYAGE (top-k)
   │        │
   │        ├─ pochi nodi (≤30) ──────────────────────► CLAUDE + nodi
   │        └─ troppi nodi (>30) / query globale ──────► GEMINI (sintesi globale)
   │
   └─ audit / pattern globali ─────────────────────────► GEMINI (read) ──► flag ──► CLAUDE (fix)
```

---

## 4. Retrieval attivo per embedding (il pezzo a maggior valore)

Questo layer è ciò che trasforma l'archivio in **memoria utilizzabile**, indipendentemente da Gemini.

> **DECISIONE OWNER (31 mag 2026): Smart Connections con modello di embedding LOCALE INTEGRATO.** Il vector store custom Voyage + SQLite descritto sotto **è superato** dal plugin **Smart Connections**, che fa embeddings + cosine similarity + Smart Chat RAG dentro Obsidian. Si usa il **modello locale nativo del plugin** (incluso, "just works"): niente Ollama, niente chiave API, niente 2 GB, zero costi, dati 100% in locale. Le integrazioni cloud (OpenAI/Gemini) sono nella versione Pro a pagamento — non servono. Upgrade futuro possibile (Pro+chiave o Ollama con modello più grande) solo se la qualità del retrieval risultasse insufficiente.
>
> **NB billing — verificato 31 mag 2026:** l'abbonamento consumer Gemini (Google AI Pro) **NON include accesso API**. Quando arriveremo al layer di *routing semantico* (orchestratore n8n → Gemini per classificare), servirà una **chiave Google AI Studio** (tier gratuito disponibile), separata dall'abbonamento. Vale anche per Anthropic. Da mettere in conto in quella fase, NON ora (gli embedding sono locali).

### 4.1 Vector store (riferimento concettuale — NON da implementare, sostituito da Smart Connections)
- Ogni `SYNTH_*.md` viene embeddato con `voyage-3-large` alla creazione/modifica.
- Vettori salvati in **SQLite locale** (`vault/.neural/embeddings.db`) — tabella `(record_id, synth_path, vector BLOB, updated_at)`.
- SQLite e non JSON: scala a migliaia di record, supporta query incrementali, niente riscrittura dell'intero file a ogni update.

### 4.2 Flusso di recall
```
Contesto attuale (testo della richiesta o sessione in corso)
   → embed con voyage-3-large
   → cosine similarity contro i vettori in SQLite
   → top-k SYNTH più simili (k=5 default)
   → l'arbitro decide: pochi → a Claude; troppi/globale → a Gemini
```

### 4.3 Costo embedding (ordine di grandezza)
A ~$0.18/M token, un vault con 1.000 SYNTH da ~500 token = 500k token = **~$0.09 una tantum** per indicizzazione. Re-embed solo sui file modificati. Trascurabile. (Se il budget conta più della qualità: Google `text-embedding-005` a ~$0.006/M.)

---

## 5. Gestione della consistenza (il rischio che Lei aveva colto)

Il pericolo dichiarato: due modelli interpretano lo stesso vault in modo divergente → inconsistenze nel tempo. Mitigazioni progettuali, in ordine di forza:

1. **Single Writer (§2).** Gemini non scrive. Fine del rischio di scrittura divergente.
2. **Gemini è advisory.** Le sue proposte di connessione/audit producono un file `04_SYNTHESIS/_GEMINI_PROPOSALS.md` che Claude (o l'owner) revisiona prima di applicare. Mai auto-merge.
3. **Claude è source-of-truth per stile e IDENTITY.** Qualsiasi conflitto di tono/personalità si risolve a favore di Claude.
4. **Conflitti → flag, non risoluzione automatica.** Se Gemini segnala una contraddizione tra due record, il sistema **non sceglie**: crea un task (Todoist/Obsidian) per decisione umana. Coerente con la regola "verificare prima di affermare".

---

## 6. Coscienza / Personalità — chiarimento onesto

`00_CORE/IDENTITY.md` **non è coscienza.** È un *system prompt versionato* + un changelog comportamentale. Funziona ed è sufficiente, ma chiamarlo "coscienza" porta a sovrastimarne le capacità e a progettare per un fantasma. Trattarlo come **memoria strutturata** è ciò che lo rende affidabile.

Struttura operativa:
- `IDENTITY.md` — valori stabili, pattern comportamentali appresi, tabella evoluzioni. Caricato come system prompt a ogni chiamata Claude.
- `AUTOLEARNING_LOG.md` — append-only: ogni modifica all'identità con data e sessione d'origine. Mai sovrascritto.
- L'auto-apprendimento è **proposto da Claude, approvato dall'owner.** Nessuna auto-modifica silenziosa dell'identità. (Un'identità che si riscrive da sola senza supervisione diverge in modo imprevedibile.)

---

## 7. Integrazione con lo stack JARVIS esistente

L'arbitro **è un workflow n8n** (Layer 3 dell'architettura principale), non un componente nuovo:

```
Voce/Testo → n8n
   → [ARBITRO n8n] classifica query
      ├─ Claude API   (genera/ragiona/scrive vault via Local REST API)
      ├─ Voyage API   (embed + similarity su SQLite locale)
      └─ Gemini API   (scansione globale, solo read)
   → risposta → salva su Obsidian (Claude) → output Voce/Testo
```

Nessuna riscrittura dei layer 1/4/5. L'arbitro vive dentro n8n come set di nodi condizionali.

---

## 8. Rischi residui e note aperte

- **Tre API a pagamento** (Claude + Voyage + Gemini) → tre fatture, tre rate limit, tre possibili down. Monitorare costi per query.
- **Gemini a 1M token costa.** Una scansione globale dell'intero vault non è gratis: va invocata con parsimonia (vedi soglia §3), non a ogni richiesta.
- **Drift dell'arbitro a regole.** Le regole vanno riviste man mano che emergono tipi di query non previsti. Tenere un log delle decisioni di routing per affinarle.
- **Privacy.** Voyage e Gemini sono cloud: i SYNTH ci passano. Se il vault contiene dati sensibili, valutare embedding locale (es. modello open su Ollama) al posto di Voyage.

---

## 9. Sequenza di costruzione consigliata

Anche con la scelta multi-modello, si costruisce a stadi per incapsulare il rischio:

1. **Struttura base vault** (RECORD/SYNTHESIS/nodi/timeline) — fondamenta.
2. **Pipeline ingestion Claude** — da transcript a RECORD + SYNTHESIS.
3. **Layer embedding Voyage + SQLite** — retrieval attivo. *Da qui il sistema è già utile.*
4. **Arbitro n8n a regole** — routing Claude vs embedding.
5. **Innesto Gemini** — scansione globale + proposte, solo quando il vault cresce abbastanza da giustificarlo.

Gli stadi 1–4 valgono indipendentemente da Gemini. Lo stadio 5 si aggiunge senza riscrivere nulla.

---

## 10. Fonti
- [Embeddings — Claude Docs](https://docs.claude.com/en/docs/build-with-claude/embeddings)
- [Voyage AI — how to create embeddings (claude-cookbooks)](https://github.com/anthropics/claude-cookbooks/blob/main/third_party/VoyageAI/how_to_create_embeddings.md)
- [Embedding Models in 2026 — StackSpend](https://www.stackspend.app/resources/blog/embedding-models-2026-options-pros-cons)
- [Long context — Gemini API, Google AI for Developers](https://ai.google.dev/gemini-api/docs/long-context)
