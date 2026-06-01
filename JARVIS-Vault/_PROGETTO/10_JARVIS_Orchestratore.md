---
tipo: progetto-design
aggiornato: 2026-06-01
stato: architettura + regole (fase 1)
---

# JARVIS — Orchestratore (il "vigile urbano")

> Il pezzo che trasforma i componenti in un assistente: riceve una richiesta, decide come gestirla, esegue, risponde, e salva nel Vault.

## Principio cardine
**Claude È l'orchestratore.** Il routing è **riconoscimento d'intento fatto dall'LLM** (come per gli alias di [[RECALL_ALIASES]]), non un classificatore separato o un albero di regole rigido. Più affidabile, generalizza, e in dubbio **chiede**.

## Componenti
- **Cervello (routing+ragionamento):** Claude (Agent SDK / Claude Code), con system prompt = regole sotto + [[IDENTITY]] + [[META_RULES]].
- **Esecutori:**
  - *Conversazione / ragionamento / decisione* → Claude stesso.
  - *Azioni sul PC* (file, git, app, automazioni) → **Cowork via Dispatch** (interattivo, on-plan) o Claude Code headless.
  - *Recall memoria* → MCP `smart-connections` / `semantic-query.mjs`.
  - *Contesto enorme / scansione globale del Vault* → **Gemini API** (chiave Google AI Studio, tier free).
- **Plumbing / automazione:** **n8n** — riceve le richieste dalla UI (webhook), gestisce i flussi schedulati (triage, productivity), scrive nel Vault, invia Telegram. **Non decide** (non è il cervello).
- **Memoria:** Vault (record/synthesis/nodi) + recall MCP. Ogni interazione → record (ingestion).

## DECISIONE: n8n vs backend custom → **IBRIDO**
- **n8n** per la *plumbing* (webhook dalla UI, cron, integrazioni, scrittura Vault, notifiche): no-code, già attivo come servizio nssm, ottimo per questo.
- **Claude (Agent SDK / Dispatch)** per il *cervello* (intent + esecuzione agentica).
- **Niente backend custom pesante** da mantenere. Se un domani servirà logica che n8n non regge, si aggiunge un micro-servizio mirato — non prima.

## Regole di routing (system prompt del cervello)
Data una richiesta dell'utente, Claude sceglie l'esecutore **per intento**:
1. **Recall memoria** — se chiede di ripescare/ricordare dal passato/Vault (vedi [[RECALL_ALIASES]]) → `semantic-query`/MCP, poi risponde con le fonti.
2. **Azione sul PC / agentica** — se chiede di creare/modificare file, usare git/IDE, eseguire automazioni → Cowork via Dispatch (o Claude Code). Conferma prima di azioni irreversibili.
3. **Contesto globale enorme** — se serve "vedere tutto il Vault insieme" o >~30 note → Gemini (occhio globale).
4. **Conversazione / ragionamento / pianificazione** → Claude stesso, con recall di contesto se utile.
5. **Ambiguo** → **CHIEDE** all'utente di chiarire (memoria? azione? chat?), e se emerge un nuovo pattern lo registra (auto-apprendimento).
> Mantenere lo **storico della sessione** come contesto a ogni passo, così il passaggio tra esecutori non perde memoria.

## Flusso interattivo
```
UI (terminale) → webhook n8n → invoca il CERVELLO (Claude + contesto + tool)
   → Claude riconosce l'intento e instrada (recall / chat / Dispatch / Gemini)
   → esegue → risultato → risposta alla UI → RECORD nel Vault (ingestion)
```

## Comportamento: curiosità + verifica (nota architetturale owner)
- **Inquisitivo:** JARVIS può e deve (specie all'inizio) **fare domande** per contestualizzare, conoscere l'utente e **costruire memoria** dalle risposte.
- **Recall debole → chiedi:** se le relazioni trovate sono poche/deboli (similarità bassa), chiede delucidazioni invece di inventare; può proporre una ricerca web.
- **Ricerca web verificata:** sempre col permesso dell'utente; **incrocio di più fonti indipendenti** (target 4-5, "almeno 5" come standard alto), fonti citate + `confidence`; nel Vault solo l'esito verificato.
- **Info dal prompt:** usabili ma segnalate come non verificate quando è il caso.

## Verifica in background (componente FUTURO)
Un **verificatore asincrono** (agente schedulato / n8n) che: rilegge i record recenti, controlla le affermazioni contro fonti, assegna un `confidence`, marca i dubbi per revisione umana — senza rallentare la conversazione. Abilitato dal campo `confidence`/`fonti` nei record. Stile "deep-research" adversariale. Da progettare quando il volume lo giustifica.

## Fasi di costruzione
1. **Regole di routing** (questo doc) — il cuore decisionale. ✅ definite.
2. **Webhook n8n di ingresso** + primo flusso end-to-end minimale (richiesta → cervello → risposta).
3. **Collegare gli esecutori** uno a uno: recall → Dispatch → Gemini.
4. **Salvataggio record automatico** + risposta strutturata alla UI.
5. **Collegare la UI reale** (i terminali = sessioni vere).
