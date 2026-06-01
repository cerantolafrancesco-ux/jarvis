---
tipo: core-aliases
aggiornato: 2026-06-01
estendibile: true
auto_apprendimento: true
---

# RECALL_ALIASES — Frasi che attivano la ricerca nella memoria

> **Come si usa:** queste NON sono stringhe da matchare alla lettera. Sono **esempi-seme** dell'intento "cerca nella memoria/Vault". L'orchestratore (Claude) riconosce l'intento e **generalizza** a qualsiasi forma coerente, anche non elencata. Quando riconosce l'intento → esegue il comando di recall (vedi [[META_RULES]] → *Riconoscimento comandi & recall*). In dubbio → chiede; se confermato e la forma è nuova, la aggiunge in fondo (sezione *Auto-appresi*).

> **Estrazione dell'oggetto:** dalla frase si estrae l'oggetto della ricerca `X` (ciò che segue "su / di / per / riguardo a / come…") e lo si passa a `semantic-query.mjs "X"`.

## 🛠️ Soluzioni tecniche / workaround già affrontati
- "Come avevamo risolto l'errore su…"
- "Qual era il workaround per…"
- "Cerca nei log come abbiamo sistemato…"
- "Abbiamo già affrontato un problema simile con…"
- "Recupera la procedura per sbloccare…"
- "Quali erano i passaggi per configurare…"
- "Come abbiamo già risolto…"
- "Avevamo già trovato una soluzione per…"
- "C'è già una procedura per…"
- "Era già successo? come l'avevamo gestito…"

## 🧠 Richiamo di decisioni e strategie
- "Cosa avevamo deciso riguardo a…"
- "Qual è lo storico delle discussioni su…"
- "Perché avevamo scelto di strutturare in questo modo…"
- "Recupera le motivazioni dietro la scelta di…"
- "Fammi un riassunto di quello che sappiamo su…"
- "Quali erano gli obiettivi del progetto…"
- "Che decisione avevamo preso su…"
- "Riprendiamo da dove eravamo su…"

## 🔍 Esplorazione diretta del Vault
- "Verifica nell'archivio se c'è traccia di…"
- "Estrai tutti gli appunti relativi a…"
- "Fammi un recap delle note che contengono…"
- "Cosa dice il nostro database locale a proposito di…"
- "Incrocia i dati che abbiamo su…"
- "Cerca riferimenti passati a…"
- "C'è già un record su…"
- "Fammi vedere i precedenti su…"
- "Cosa c'è in memoria su…"

## 💬 Conversazionali naturali (anche vocale)
- "Trova ricordi su…"
- "Ti ricordi che abbiamo già parlato di…"
- "Ti ricordi di…"
- "Se non sbaglio avevamo già visto che…"
- "Rinfrescami la memoria su…"
- "Controlla se abbiamo già documentato qualcosa su…"
- "Mi serve riprendere il filo del discorso su…"
- "Vammi a ripescare le informazioni su…"
- "Ripesca dal vault…"
- "Hai memoria di…"
- "Dimmi cosa sappiamo già di…"
- "Ne avevamo già parlato? cosa avevamo concluso su…"

## ➕ Auto-appresi (aggiunti dall'orchestratore dopo conferma dell'utente)
<!-- L'orchestratore aggiunge qui le nuove forme confermate, una per riga, con data. -->
