---
tipo: progetto-design
aggiornato: 2026-06-01
stato: spec + prototipo v0.1
---

# JARVIS — Specifica UI ("scrivania di terminali")

> Input dell'owner. È l'interfaccia unica di JARVIS (la Web App/PWA front-end della visione iniziale).

## Concetto
Una **pagina bianca** (canvas) su cui vivono **popup-terminale**, uno per ogni interazione/sessione. Look "desktop fluido": finestre che galleggiano, si sovrappongono, si organizzano.

## Requisiti
1. **Bottone `+` tondo al centro** → apre una nuova interazione/terminale.
2. **Finestre-terminale**:
   - **Spostabili** (drag) e **ridimensionabili**.
   - **Trasparenti (~80%)**, così sovrapponendole si vede attraverso (effetto vetro).
   - **Sovrapponibili** (z-order: l'ultima toccata va sopra).
3. **Contenitori**: si possono creare contenitori e trascinarci dentro le finestre (raggruppamento). *(v0.2)*
4. **Collapse in tab**: una finestra si chiude in una **tab**; le tab si **impilano ai bordi** dello schermo. Click sulla tab → ripristina.
5. **Stati visivi del terminale**:
   - **Lampeggia** quando è **in attesa di input**.
   - Diventa **grigiastro** quando è **fermo/inattivo**.
   - (Normale/attivo quando sta lavorando.)

## Scelte del prototipo v0.1 (da validare)
- Single-file HTML/JS vanilla (nessuna dipendenza) → potrà diventare la base della PWA.
- Tema scuro sci-fi (coerente con JARVIS); il "canvas bianco" richiesto è interpretabile — nel prototipo parto scuro per far risaltare il vetro trasparente, ma è una scelta da confermare (bianco vs scuro).
- Finestre: drag dalla title-bar, resize dall'angolo, vetro semitrasparente con blur, z-order al focus.
- Stati: indicatore + bordo (attivo / **lampeggio** in attesa / **grigio** fermo); nel prototipo si simulano con un comando, poi li piloteremo dagli eventi reali (hook/Dispatch).
- Tab impilate in basso; click per ripristinare.

## Da decidere / v0.2
- **Bianco o scuro?** (il prototipo è scuro; pronto a invertirlo).
- **Contenitori** (drag-drop di finestre in gruppi).
- Aggancio agli **eventi reali**: lampeggio = hook `Notification`/attesa input; grigio = sessione idle/terminata; collegamento a Dispatch/Claude Code per i terminali veri.
- Persistenza del layout (posizioni/finestre) tra sessioni.

## v0.2 — estetica "acqua/Aqua" (input owner 2026-06-01)
- **Sfondo bianco** + sheen azzurra tenue, stile Mac OS Aqua anni 2000, superficie "bagnata".
- **Onde/vibrazioni che si propagano** (canvas: ripple concentrici su clic/apertura + sheen ambientale ondeggiante).
- **Suoni di sistema** sintetizzati (WebAudio): "bubble" all'apertura, "droplet" su stato/minimizza. Toggle 🔊 (audio parte dopo il primo clic, policy browser).
- **Trasparenza dinamica:** quando una finestra ne copre un'altra, la finestra sopra diventa più trasparente → si intravede/legge quella sotto.
- **Tab = bolle trascinabili** ovunque sullo schermo (non barra fissa); clic secco riapre, drag sposta.
- **Titoli che evolvono** col contenuto (come un titolo d'articolo che cambia nel tempo); in attesa → "⏳ In attesa di input", fermo → "Sessione in pausa". *(Nel sistema reale: riassunto LLM della sessione.)*
- Ambiente "rilassante ma dinamico".

## v8 — terminale "Commodore" (input owner, nel bridge)
- **Font CRT/Commodore** (VT323) nel corpo dei terminali.
- **Macchina da scrivere:** le risposte di JARVIS si compongono **un carattere alla volta** (con tick sonoro discreto).
- **Cursore lampeggiante** (`█`) mentre il sistema lavora.
- **Attesa lunga:** se la risposta tarda **>10 secondi**, il cursore inizia a **scarabocchiare** (linee, parentesi, trattini: `─ │ ┌ ┘ ( ) — ~ …`), poi sparisce all'arrivo della risposta.
- File: `_scripts/jarvis-bridge/public/index.html` (UI servita dal ponte).

## Cosa mostra il terminale (regola display — input owner)
- **Mostra SOLO i prompt di risposta** (l'output finale di JARVIS). **NON** mostrare il processo logico/ragionamento intermedio né i log delle chiamate agli strumenti.
- **Richieste di permesso:** DEVONO essere mostrate e l'utente deve poterle **accettare/rifiutare** dal terminale. (Collegamento: permessi tool di Claude Code + hook `Notification` + regola "conferma prima di azioni irreversibili" dell'orchestratore.)
- In pratica, quando colleghiamo il backend: filtriamo lo stream → si visualizzano i messaggi finali dell'assistente e i prompt di permesso (interattivi), si nasconde il resto.

## Ancora da fare (v0.3)
- **Contenitori** (drag-drop di finestre in gruppi).
- **Aggancio agli eventi reali**: stato/lampeggio dagli hook (attesa input), grigio = sessione idle/finita; titoli = riassunto LLM vero; terminali = sessioni Dispatch/Claude Code reali.
- **Persistenza layout** tra sessioni.

## v0.3 — vetro/Matrix + dock (input owner 2026-06-01)
- Finestre **quasi del tutto trasparenti** (lastre di vetro con sopra il testo).
- **Font tecno** stile Matrix (Share Tech Mono + Orbitron per il brand).
- **Intestazione a bolla 3D** (gradiente radiale lucido, riflessi, profondità).
- **Dock "menu finestre" stile macOS** in basso: ogni terminale è un **foglio** che si **ingrandisce al passaggio**, lista **scorrevole**; clic = porta in primo piano / riapre.

## File
- Prototipo v0.1: `JARVIS-UI-prototype.html`
- Prototipo v0.2 (Aqua): `JARVIS-UI-prototype-v2.html`
- Prototipo v0.3 (vetro/Matrix + dock): `JARVIS-UI-prototype-v3.html`
- Prototipo v0.4: `JARVIS-UI-prototype-v4.html` — dock RIMOSSO, tab-bolle trascinabili; vetro con spessore; intestazione a tutta larghezza; `+` centrale che scala col n° finestre.
- Prototipo v0.5: `JARVIS-UI-prototype-v5.html` — finestra completamente trasparente; doppio clic intestazione = comprimi/espandi in posizione.
- Prototipo v0.6: `JARVIS-UI-prototype-v6.html` — **sfondo specchio d'acqua su marmo** (venature procedurali + onde concentriche dal centro in continuo); **intestazione 3D bombata OPACA** (non più trasparente). Rif. immagine fornita dall'owner. Nota: lo sfondo è procedurale (per avere onde animate); per un look fotorealistico servirebbe generare un'immagine di base statica.
