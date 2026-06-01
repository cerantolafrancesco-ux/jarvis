# JARVIS — Architettura del Sistema

> **Stato progetto:** Pianificazione / Fase 0
> **Ultimo aggiornamento:** 31 maggio 2026
> **OS di riferimento:** Windows (locale)
> **Owner:** Fra (cerantolafrancesco@gmail.com)

---

## 1. Visione

Costruire **JARVIS**: un assistente AI personale con:

1. **Database centralizzato in locale** (Obsidian) che raccoglie *tutte* le conversazioni, task, progetti e progetti CoWork, consultabile dall'AI in ogni momento.
2. **Interfaccia AI unificata** capace di comunicare **testualmente e vocalmente** (bidirezionale).
3. **Routing autonomo**: l'AI sceglie da sé lo strumento migliore per ogni richiesta — Chat, CoWork o Code.

Tutto **in locale** (PC Windows), con dipendenze cloud ridotte al minimo (solo API Claude e, opzionalmente, voce cloud).

---

## 2. Decisioni già prese

| Domanda | Risposta |
|---|---|
| Dove gira Obsidian / interfaccia AI? | Tutto in locale (PC) |
| Direzione comunicazione vocale | Bidirezionale (input + output) |
| Familiarità con gli strumenti | Nessuna → priorità a soluzioni low/no-code |
| Sistema operativo | Windows |

---

## 3. Stack tecnologico

Scelto per **zero esperienza richiesta** e **massima potenza**.

### Layer 1 — Database centralizzato: Obsidian
Vault unico, struttura a cartelle:

```
/JARVIS-Vault
  /Conversazioni    ← log di ogni chat (Claude, CoWork, Code)
  /Task             ← specchio dei task Todoist + note
  /Progetti         ← schede progetto
  /CoWork           ← progetti e output di CoWork
  /Memoria          ← fatti persistenti, preferenze, decisioni
```

Plugin chiave:
- **Dataview** — query e viste dinamiche sui file (es. "tutti i task P1 aperti").
- **Templater** — strutture automatiche per nuove note.
- **Local REST API** — espone il vault via HTTP su localhost (*fondamentale*: è il ponte tra Obsidian e l'orchestratore).

### Layer 2 — Cervello AI: Claude via API
- Ogni richiesta riceve in input i file Obsidian rilevanti come contesto.
- Claude decide autonomamente lo strumento: **Chat / CoWork / Code**.

### Layer 3 — Orchestratore: n8n locale
- Gira su `localhost` come servizio.
- Gestisce i flussi: voce → testo → Claude → risposta → voce.
- Interfaccia visuale, nessuna riga di codice manuale necessaria.

### Layer 4 — Voce bidirezionale
- **Input (Speech-to-Text):** Whisper (locale, offline).
- **Output (Text-to-Speech):** Piper o Coqui (locale) oppure ElevenLabs (API cloud, qualità superiore).

### Layer 5 — Interfaccia: web app locale
- `localhost:3000` — chat testuale + pulsante microfono.
- Si apre dal browser, nessuna installazione extra.

---

## 4. Flusso operativo

```
Voce/Testo
   → n8n
      → legge Obsidian (contesto rilevante)
         → Claude API
            → Claude sceglie: Chat / CoWork / Code
               → Risposta
                  → salva su Obsidian (log + memoria)
                     → output Voce/Testo
```

---

## 5. Logica di routing autonomo (Layer cervello)

Criterio di selezione strumento da parte di Claude:

- **Chat** → domande, ragionamento, decisioni, conversazione.
- **CoWork** → creazione/gestione file, documenti, task, automazioni desktop.
- **Code** → sviluppo software, script, debug, modifiche a codebase.

Regola di default: in caso di ambiguità, Claude chiede conferma prima di scegliere Code (azione più invasiva).

---

## 6. Rischi e note aperte

- **n8n**: curva iniziale di setup come servizio Windows — gestibile con guida passo-passo.
- **Voce locale vs cloud**: Whisper+Piper = privacy totale ma qualità/latency inferiori; ElevenLabs = qualità alta ma dipendenza cloud + costo.
- **Costi API Claude**: da monitorare in base al volume di contesto inviato.
- **Sicurezza Local REST API**: token e bind solo su `localhost`.

---

## 7. File correlati
- `01_JARVIS_Roadmap.md` — piano di implementazione in fasi.
