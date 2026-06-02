---
tipo: progetto-design
aggiornato: 2026-06-02
---

# JARVIS — Debug log + Verificatore in background

## 1. Debug log + routine notturna (ATTIVARE AL GO-LIVE)
**Obiettivo:** in fase di debug, registrare **tutti i prompt + il ragionamento logico** in un **file giornaliero** (NON salvato nel Vault/memoria). Una routine notturna lo revisiona, corregge ciò che può, e invia un **report via mail**.

- **Sorgente:** i transcript delle sessioni Claude Code/JARVIS (già su disco) → consolidati in `_debug/YYYY-MM-DD.log` (cartella `_debug/`, **fuori dal Vault**, non indicizzata, non in memoria).
- **Routine:** task schedulato **ogni giorno alle 03:00** → legge il log del giorno, cerca errori/migliorie.
- **⚠️ GUARDRAIL (autonomia):** auto-applica SOLO ritocchi a **basso rischio** (es. aggiungere un alias di recall confermato, correggere formulazioni delle regole di routing, refusi nei doc). Per modifiche **strutturali / a codice / config / cancellazioni** → NON applica: **propone e segnala** nel report per approvazione umana.
- **Report via mail** (Gmail MCP) con: cosa ha sistemato, cosa propone, anomalie ricorrenti. Poi può cancellare/archiviare il log del giorno.
- Stato: **documentato, da attivare quando JARVIS è live** (serve il logging continuo del ragionamento).

## 2. Verificatore in background — A DUE STADI (ATTIVO)
**Obiettivo:** distillare l'inbox in record e verificare la `confidence`, senza rallentare la conversazione e a costo quasi nullo. Tocca metadati e promozione/potatura, mai codice.

**Stadio 1 — Ollama (locale, gratuito).** Script `_scripts/vault-verifier.mjs`:
- Legge le note grezze in `01_INBOX/` (catturate dal canale d'ingestione) e i record `verificato: false`.
- Per ciascuna, qwen3 decide: **promote** (fatto utile e stabile → record in `03_RECORDS/`, indicizzato subito nell'indice caldo), **flag** (utile ma incerto/da verificare), **drop** (rumore → archiviato in `01_INBOX/_processed/`).
- Le voci `flag`/da-verificare finiscono in `_scripts/logs/verifier-flagged.json` per lo Stadio 2. Non cancella nulla: le note lavorate vanno in `_processed/`.

**Stadio 2 — Claude (mirato, SOLO sui flag).** Prompt notturno:
> Leggi `_scripts/logs/verifier-flagged.json`. Per ogni voce: valuta la coerenza interna col resto del Vault e, se il `claim` è un fatto esterno verificabile e c'è accesso web, incrocia 3-5 fonti indipendenti. Aggiorna il record indicato: `confidence` (0-1), `fonti`, `verificato: true` se confermato; **pota** il record se falso; nel dubbio lascia `verificato: false` e abbassa la confidence. Poi re-indicizza i record toccati (`node "_scripts/smart-connections-mcp/vault-embed.mjs" "<record>"`) e lascia un riepilogo Telegram via outbox (promossi, verificati, potati, da rivedere). Infine svuota `verifier-flagged.json`.

**Orchestrazione (03:30):** il task schedulato esegue prima `node "_scripts/vault-verifier.mjs"` (stadio 1) e poi la passata Claude dello stadio 2 sul file flagged. Motivo dei due stadi: un 8B locale come unico verificatore rischia di confermare errori o potare fatti veri; Claude (con web) resta dove serve il giudizio, ma tocca solo una manciata di voci → costo vicino a zero.

- **Caveat:** la verifica *esterna* dipende dall'accesso web dell'ambiente schedulato; la coerenza *interna* e lo stadio 1 funzionano comunque. Ollama dev'essere attivo alle 03:30.
