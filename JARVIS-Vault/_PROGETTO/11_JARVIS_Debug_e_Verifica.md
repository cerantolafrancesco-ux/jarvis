---
tipo: progetto-design
aggiornato: 2026-06-01
---

# JARVIS — Debug log + Verificatore in background

## 1. Debug log + routine notturna (ATTIVARE AL GO-LIVE)
**Obiettivo:** in fase di debug, registrare **tutti i prompt + il ragionamento logico** in un **file giornaliero** (NON salvato nel Vault/memoria). Una routine notturna lo revisiona, corregge ciò che può, e invia un **report via mail**.

- **Sorgente:** i transcript delle sessioni Claude Code/JARVIS (già su disco) → consolidati in `_debug/YYYY-MM-DD.log` (cartella `_debug/`, **fuori dal Vault**, non indicizzata, non in memoria).
- **Routine:** task schedulato **ogni giorno alle 03:00** → legge il log del giorno, cerca errori/migliorie.
- **⚠️ GUARDRAIL (autonomia):** auto-applica SOLO ritocchi a **basso rischio** (es. aggiungere un alias di recall confermato, correggere formulazioni delle regole di routing, refusi nei doc). Per modifiche **strutturali / a codice / config / cancellazioni** → NON applica: **propone e segnala** nel report per approvazione umana.
- **Report via mail** (Gmail MCP) con: cosa ha sistemato, cosa propone, anomalie ricorrenti. Poi può cancellare/archiviare il log del giorno.
- Stato: **documentato, da attivare quando JARVIS è live** (serve il logging continuo del ragionamento).

## 2. Verificatore in background (ATTIVO ORA)
**Obiettivo:** rivedere i record recenti e assegnare/verificare la `confidence`, senza rallentare la conversazione. Tocca **solo i metadati di verifica**, mai contenuto sostanziale o codice.

- **Task schedulato** `vault-verifier` (giornaliero, 03:30).
- Trova in `03_RECORDS/` i record con `verificato: false` (o modificati nelle ultime 24h).
- Per ciascuno: **coerenza interna** (contraddizioni con altri record/SYNTHESIS) + se un'affermazione è un fatto esterno verificabile **e c'è accesso web**, **incrocia più fonti indipendenti** (mira a 4-5) e cita le fonti.
- Aggiorna frontmatter: `confidence` (0-1), `fonti`, `verificato: true/false`. Conservativo: nel dubbio NON marca verificato, **flagga** per revisione.
- **Report**: lascia un riepilogo Telegram via outbox (n° verificati, quali a bassa confidenza da rivedere).
- **Caveat:** la verifica *esterna* dipende dall'accesso web dell'ambiente schedulato (da confermare); la coerenza *interna* funziona comunque.
