---
tipo: progetto-config
aggiornato: 2026-05-31
---

# Configurazione Claudian (Claude Code in Obsidian)

> Claudian incastra Claude Code come agente nella sidebar di Obsidian. Desktop-only (niente mobile). Vedi ruolo in [[03_Memoria_Conversazione_Gemini_Orchestrator]].

## 0. Prerequisiti da verificare PRIMA
1. **Obsidian ≥ 1.8.9** (Impostazioni → Info).
2. **Claude Code installato (NATIVO) e LOGGATO.** Il metodo npm è deprecato da gen 2026 → usare l'**installer nativo** (`claude.exe`): risolve PATH, nvm e wrapper PowerShell in un colpo. In **PowerShell**:
   ```
   irm https://claude.ai/install.ps1 | iex
   ```
   Poi chiudere/riaprire il terminale e:
   ```
   claude --version      ← deve rispondere una versione
   claude                ← login con account Max
   ```
   *(Se `irm | iex` viene bloccato dalla policy, segnalarlo: c'è un'alternativa con download manuale.)*

## 1. Installazione — via BRAT (consigliata)
Claudian **NON è ancora nello store ufficiale** (in attesa di approvazione, apr 2026). Si installa con BRAT:
1. Community plugins → Browse → installa **BRAT** → abilita.
2. Impostazioni BRAT → **Add beta plugin** → URL: `https://github.com/YishenTu/claudian` → Add.
3. Community plugins → abilita **Claudian**.

*(Alternativa manuale: scaricare `main.js`, `manifest.json`, `styles.css` dall'ultima release in `.obsidian/plugins/claudian/`.)*

## 2. Configurazione CLI (semplice, grazie all'installer nativo)
Claudian usa l'autenticazione **già esistente di Claude Code** (niente chiave API se si usa il login CLI col piano Max).
- **Prima prova:** lasciare "Claude CLI path" **vuoto** → auto-detect (con l'installer nativo dovrebbe trovare `claude.exe` da solo).
- **Se serve impostarlo a mano:** puntare a **`claude.exe`** (installer nativo). Trovarlo in cmd con `where claude`.
- L'installer nativo evita i wrapper `.ps1`/`.cmd` → niente blocco PowerShell.

## 3. Nota nvm — RISOLTA dall'installer nativo
Con l'installer nativo, `claude.exe` è **indipendente da nvm**: funziona anche quando si fa `nvm use 24` per Probrand. Nessuna trappola PATH. (Era un problema solo con l'installazione npm sotto nvm.)

## 4. ⚠️ Nota billing
Claudian sfrutta l'auth di Claude Code (piano Max). **Prima del 15/06/2026** l'uso interattivo resta sul piano. **Dopo**, l'uso headless/SDK potrebbe spostarsi su billing API a consumo. Da monitorare.

## 5. Dati
Claudian salva impostazioni/sessioni in `vault/.claudian/`; file provider Claude in `vault/.claude/`.

---
**Verifica finale:** apri la sidebar di Claudian, fai una domanda tipo "elenca i file in 00_CORE" → se legge il Vault e risponde, l'agente è operativo.
