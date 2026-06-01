# JARVIS — Roadmap di Implementazione

> **Ultimo aggiornamento:** 31 maggio 2026
> Vedi `00_JARVIS_Architettura.md` per il quadro tecnico.

---

## Fasi

| Fase | Cosa si fa | Difficoltà | Stato |
|---|---|---|---|
| 1 | Setup Obsidian + plugin Local REST API | ⭐ Facile | ⬜ Da fare |
| 2 | Installazione n8n locale (servizio su Windows) | ⭐ Facile | ⬜ Da fare |
| 3 | Primo flusso: chat testuale → Claude → salva su Obsidian | ⭐⭐ Medio | ⬜ Da fare |
| 4 | Voce bidirezionale (Whisper STT + TTS) | ⭐⭐ Medio | ⬜ Da fare |
| 5 | Logica di routing autonomo (Chat / CoWork / Code) | ⭐⭐⭐ Avanzato | ⬜ Da fare |
| 6 | Interfaccia web unificata (localhost:3000) | ⭐⭐ Medio | ⬜ Da fare |

Legenda stato: ⬜ Da fare · 🟡 In corso · ✅ Completata

---

## Dettaglio fasi

### Fase 1 — Fondamenta del database
Installare Obsidian, creare il vault con la struttura cartelle, installare e configurare i plugin Dataview, Templater e Local REST API. Verificare che il vault risponda via HTTP su localhost.

**Output atteso:** vault funzionante e interrogabile via REST.

### Fase 2 — Orchestratore
Installare n8n in locale, avviarlo come servizio raggiungibile da browser. Nessun flusso ancora, solo l'ambiente pronto.

**Output atteso:** n8n raggiungibile su localhost.

### Fase 3 — Primo collegamento intelligente
Costruire in n8n il flusso minimo: input testuale → chiamata Claude API → salvataggio della conversazione in `/Conversazioni` su Obsidian.

**Output atteso:** prima conversazione end-to-end registrata nel vault.

### Fase 4 — Voce
Aggiungere Whisper per la trascrizione vocale in ingresso e un motore TTS (Piper/Coqui locale o ElevenLabs cloud) per la risposta parlata.

**Output atteso:** ciclo voce → testo → Claude → voce.

### Fase 5 — Autonomia decisionale
Implementare la logica con cui Claude sceglie Chat / CoWork / Code in base alla richiesta, con regola di conferma per le azioni Code.

**Output atteso:** routing automatico funzionante.

### Fase 6 — Interfaccia unificata
Web app locale su `localhost:3000` con chat testuale e pulsante microfono.

**Output atteso:** interfaccia unica di accesso a JARVIS.

---

## Prossimo passo da decidere
- [ ] Partire dalla **Fase 1** (guida passo-passo Obsidian + REST API), **oppure**
- [ ] Vedere prima il **diagramma visivo** completo dell'architettura.
