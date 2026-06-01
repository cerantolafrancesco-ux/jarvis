# JARVIS — Setup Base (Fase 1) · Checklist di installazione

> **Macchina:** HP OMEN, Intel i9-9900K, 64 GB RAM, Windows 11 Home
> **Data:** 31 maggio 2026
> **Principio:** percorso più semplice che regge. Niente Docker in Fase 1 (lo aggiungiamo come hardening dopo, §B).
> **Nota Node:** si installa **Node 22 LTS** e non la 24, perché n8n al 2026 supporta Node fino alla 22.x. Una sola versione di Node serve sia a n8n sia a Claude Code.

---

## A. Ordine di installazione (percorso principale)

Installare **in questo ordine** — le dipendenze prima.

### 1. Node.js — DUE versioni con `nvm-windows` (decisione confermata)
- **Cosa:** runtime JavaScript. Prerequisito trasversale (n8n, Claude Code CLI, tooling).
- **Situazione:** sul PC è installata la **Node 24**, usata dal **progetto gestionale Probrand**. JARVIS richiede la **22** (n8n supporta Node fino alla 22.x). → Servono **entrambe**, gestite da nvm-windows. Niente downgrade.
- **⚠️ Prima di toccare nulla — fotografare lo stato attuale** (per non rompere Probrand):
  1. `node -v` → annotare la versione esatta della 24.
  2. `where node` → annotare il percorso attuale.
  3. `npm ls -g --depth=0` → **annotare i pacchetti globali** (es. CLI installate con `-g`). Questi NON migrano automaticamente in nvm e andranno reinstallati.
- **Procedura nvm-windows:**
  1. **Disinstallare** la Node 24 standalone (Pannello di controllo → App). nvm-windows deve gestire lui il PATH.
  2. Installare **nvm-windows** (https://github.com/coreybutler/nvm-windows → `nvm-setup.exe`).
  3. `nvm install 24.x.x` (la versione annotata) e `nvm install 22`.
  4. `nvm use 24` → reinstallare i pacchetti globali annotati al punto 3 → verificare che **Probrand parta ancora**.
  5. `nvm use 22` quando si lavora su JARVIS/n8n.
- **Verifica:** `nvm list` mostra 22 e 24; `node -v` cambia con `nvm use`.
- **Nota di sicurezza:** le dipendenze locali dei progetti (`node_modules` nelle cartelle) **non** sono toccate dal cambio versione — il rischio è solo sui pacchetti **globali**, ed è per questo che li annotiamo prima. Verificare Probrand prima di considerare chiusa la migrazione.

### 2. Git for Windows
- **Cosa:** versionamento + base per integrazione GitHub (MCP).
- **Fonte:** https://git-scm.com/download/win.
- **Metodo:** installer `.exe`, opzioni di default; editor → a scelta.
- **Verifica:** `git --version`.
- **Nota:** in Fase 1 è opzionale ma consigliato installarlo subito; serve appena si tocca GitHub.

### 3. Ollama (+ modello di embedding)
- **Cosa:** motore di embedding locale per Smart Connections. Costo zero, dati che non escono dal PC.
- **Fonte:** https://ollama.com/download/windows.
- **Metodo:** installer `.exe`. Poi da terminale: `ollama pull nomic-embed-text`.
- **Requisiti:** trascurabili per gli embedding su questo hardware (il modello è leggero).
- **Verifica:** `ollama list` mostra `nomic-embed-text`.
- **Nota:** gira come servizio in background su `localhost:11434`. È a questa porta che punterà Smart Connections.

### 4. Obsidian (+ plugin) — il database
- **Cosa:** il Vault, cuore della rete neurale.
- **Fonte:** https://obsidian.md.
- **DECISIONE (31 mag 2026): il Vault coincide con la cartella progetti di Cowork** → `C:\Users\ceran\Documents\Claude\Projects\JARVIS`. Così Cowork e l'orchestratore n8n leggono/scrivono le note direttamente, unica fonte di verità. I doc 00–04 diventano note del grafo.
- **Metodo:** installer `.exe`. In Obsidian → "Open folder as vault" → selezionare `C:\Users\ceran\Documents\Claude\Projects\JARVIS` (NON creare un vault separato).
- **Nota:** Smart Connections creerà l'indice vettoriale dentro `.obsidian`; il backup futuro su NAS dovrà puntare a questa cartella.
- **Plugin (Impostazioni → Community plugins → Browse), in quest'ordine:**
  1. **Smart Connections** — RAG vettoriale; in config puntare l'embedding a Ollama (`nomic-embed-text`).
  2. **Dataview** — query stile SQL sulle note (dashboard).
  3. **Templater** — template automatici per le note-record.
  4. *(opzionale)* **Local REST API** — espone il Vault su `localhost` via HTTP; utile se l'orchestratore dovrà scrivere note via POST invece che via file system.
- **Nota:** attivare prima "Community plugins" (richiede di disattivare la Restricted Mode).

### 5. Claude Desktop / Cowork — verifica, non installazione
- **Cosa:** già presente sul PC. Qui solo verifiche.
- **Stato:** piano **Max** confermato dall'owner → Dispatch e Remote Control disponibili. ✅
- **Da verificare:**
  - App aggiornata all'ultima versione.
  - Dispatch attivo (research preview).
- **Nota:** Dispatch (trigger programmatico delle sessioni Cowork locali) e Remote Control sono research preview e richiedono l'approvazione manuale delle azioni. Sono il ponte tra orchestratore e Cowork.

### 6. Claude Code CLI
- **Cosa:** stesso motore di Cowork da riga di comando; abilita Agent SDK, Remote Control, Dispatch.
- **Metodo:** `npm install -g @anthropic-ai/claude-code`.
- **Verifica:** `claude --version`; primo avvio `claude` per il login.
- **Nota billing (importante):** dal **15/06/2026** l'uso headless `claude -p`/Agent SDK **non conta più sul piano** e va su API a consumo. Preferire il flusso **interattivo via Dispatch/Cowork** per restare sul piano.

### 7. n8n — l'orchestratore (via npm)
- **Cosa:** automazione a workflow visuali. Riceve la richiesta, smista agli LLM, scrive in Obsidian.
- **Metodo (Fase 1, semplice):** `npm install -g n8n` → avvio con `n8n`.
- **Accesso:** browser su `http://localhost:5678`.
- **Requisiti:** gira su Node 22 (vedi §1). Su questo hardware nessun problema.
- **Persistenza in background:** per non tenere un terminale aperto, installare PM2 (`npm install -g pm2`) e lanciare `pm2 start n8n`. PM2 può avviarlo allo startup di Windows.
- **Nota:** se in futuro servirà robustezza/produzione, migrare a Docker (§B).

### 8. Tailscale — accesso remoto sicuro
- **Cosa:** VPN mesh per usare la Web App dal telefono in 4G senza aprire porte del router.
- **Fonte:** https://tailscale.com/download/windows. Installare anche l'app sul telefono.
- **Metodo:** login con lo stesso account su PC e telefono → stessa rete privata.
- **Nota:** costo zero per uso personale. L'alternativa è Cloudflare Tunnel.

### 9. Synology Drive Client — RINVIATO (solo backup, più avanti)
- **Decisione owner:** in Fase 1 il Vault resta **solo in locale**. Il NAS DS218j verrà aggiunto **in seguito, esclusivamente come backup**.
- **Quando si farà:** Centro pacchetti del NAS (lato server) + Synology Drive Client (lato PC), sync della cartella `JARVIS-Vault`.
- **Nota:** il NAS farà **solo** backup/storage. Tutto il calcolo resta sull'i9.

---

## B. Opzionali / hardening (NON in Fase 1)

| Componente | A cosa serve | Quando |
|---|---|---|
| **VS Code** | IDE per configurare MCP e leggere il codice | quando si sviluppa l'orchestratore |
| **Docker Desktop + WSL2** | isolare n8n in container (robustezza/produzione) | quando il sistema è stabile e va in "produzione" |
| **WSL2** (da solo) | risolve problemi di path/permessi Windows | se npm dà grane su Windows |

---

## C. Note trasversali

- **API key:** serviranno chiavi per Anthropic e Google (Gemini). Conservarle in un file `.env` dell'orchestratore — **mai** dentro le note del Vault, mai in chiaro nei workflow condivisi.
- **Sequenza logica del sistema una volta installato:** Web App (telefono via Tailscale) → n8n (routing) → Claude/Gemini/Dispatch-Cowork → scrittura nota `.md` in Obsidian → Smart Connections indicizza via Ollama.
- **Privacy:** con Ollama gli embedding restano locali; verso il cloud escono solo i prompt di inferenza agli LLM.
- **Verifica finale Fase 1:** Obsidian apre il Vault, Smart Connections indicizza una nota di prova, n8n risponde su `:5678`, Ollama risponde su `:11434`, Tailscale collega telefono↔PC.

---

## D. Riepilogo a colpo d'occhio

| # | App | Metodo | Verifica |
|---|---|---|---|
| 1 | Node.js 22 LTS | installer .msi | `node -v` |
| 2 | Git for Windows | installer .exe | `git --version` |
| 3 | Ollama + nomic-embed-text | installer + `ollama pull` | `ollama list` |
| 4 | Obsidian + plugin | installer + Community plugins | Vault apre, Smart Connections ON |
| 5 | Claude Desktop/Cowork | verifica piano Pro/Max | Dispatch disponibile |
| 6 | Claude Code CLI | `npm i -g @anthropic-ai/claude-code` | `claude --version` |
| 7 | n8n (+ PM2) | `npm i -g n8n pm2` | `localhost:5678` |
| 8 | Tailscale (PC+telefono) | installer + login | telefono vede il PC |
| 9 | ~~Synology Drive~~ | RINVIATO (solo backup, più avanti) | — |
