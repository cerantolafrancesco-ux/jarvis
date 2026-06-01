---
tipo: core-autolearning
formato: append-only
---

# AUTOLEARNING_LOG — Evoluzione di JARVIS nel tempo

> Append-only. Ogni voce: data, cosa è cambiato/appreso, origine. **Mai sovrascrivere.**

---

## 2026-05-31 — Fondazione
- Creato il Neural Vault con struttura `00_CORE` … `05_TEMPLATES`.
- **Decisione:** memoria multi-modello con arbitro (Claude scrittore unico, Gemini occhio globale, embedding locale Smart Connections).
- **Decisione:** orchestratore in valutazione (n8n vs backend custom); Dispatch come ponte verso Cowork interattivo.
- **Decisione:** Vault dedicato in `JARVIS-Vault`; l'intelligenza cross-progetto arriva dall'ingestion (record), non dall'annidare il codice.
- **Decisione:** embedding locale integrato di Smart Connections (no Ollama, no API, no costi).
- **Appreso:** l'abbonamento Gemini ≠ accesso API (serve chiave AI Studio per il routing futuro).
- **Appreso:** i blocchi "organization policy" su Claude per Chrome sono la whitelist voluta da Fra, non un firewall.
- Stack confermato: Node 22 (via nvm, accanto a Node 24 di Probrand), n8n attivo su `localhost:5678`.

## 2026-06-01 — Notifiche Telegram
- **Primitiva `telegram-send.js` operativa** (in `JARVIS/_scripts/`, fuori dal Vault). Collaudata: messaggio di test ricevuto. Segreti in `_scripts/.env` (token+chat_id), mai nel Vault.
- Progetto notifiche: vedi [[07_JARVIS_Notifiche_Telegram]]. 4 notifiche: 2 report schedulati (email-triage, productivity) + 2 eventi agente (intervento richiesto, task finito).
- **Limite noto:** Cowork ignora gli hook (bug #40495) → 3 e 4 affidabili solo da Claude Code; in Cowork via convenzione comportamentale.
- **Verificato:** l'ambiente delle automazioni schedulate RAGGIUNGE Telegram (test `telegram-connectivity-test` → messaggio ricevuto). NB: è un ambiente diverso dal sandbox di Cowork bash, che invece blocca sia Telegram sia Missive (403 proxy).
- **Report 1 e 2 cablati:** `hourly-email-triage` (ogni ora, anche "nessuna email") e `productivity-update` (7/12/18) inviano il recap su Telegram via curl (STEP obbligatorio). Token nelle config dei task (fuori dal Vault).
- **Claude Code installato nativo:** `C:\Users\ceran\.local\bin\claude.exe` v2.1.159. Aggiunto al PATH utente. Hook `Stop`+`Notification` attivi in `~/.claude/settings.json` → notifiche 3/4 funzionanti via Claude Code/Claudian (NB: il campo `async` rompeva la config, rimosso).
- **Architettura notifiche FINALE = file-drop universale.** Il sandbox (Cowork bash + task schedulati) blocca `api.telegram.org` (403 proxy); il NO_PROXY però esenta loopback/IP privati. Soluzione: i produttori (Cowork, chat, schedulati) lasciano un JSON in `_scripts/outbox/`; `telegram-watcher.js` su Windows (PM2) lo recapita. Hook di Claude Code/Claudian restano diretti. Regola generale in [[META_RULES]]. Helper: `telegram-drop.js`. **VERIFICATO E COMPLETO (01/06):** il sandbox schedulato scrive nella outbox; watcher `jarvis-telegram` (PM2) ha recapitato sia il drop-helper (msg 7) sia il file del task schedulato (msg 8). Tutte e 4 le notifiche operative. **Unico residuo:** PM2 non riparte da solo al riavvio di Windows — serve configurare la persistenza al boot (pm2 startup / Task Scheduler), altrimenti dopo un riavvio il watcher resta spento.
- **01/06 — Sistema notifiche CHIUSO.** Avvio automatico al boot configurato: n8n + jarvis-telegram sotto PM2, `pm2-windows-startup` installato (`pm2-startup.cmd install` + `pm2 save`). Prompt per config generale Claude e procedura di avvio in [[08_JARVIS_Avvio_e_Config]]. Da verificare al primo riavvio reale: `pm2 list` → entrambi `online`. Promemoria nvm: tenere la versione attiva su 22 per i servizi.

## ▶️ RIPARTENZA (prossima sessione) — la RETE NEURALE
Infrastruttura pronta. Mancano i due pezzi che rendono la memoria "viva":
1. **Pipeline di ingestion** — trasformare automaticamente le chat (Cowork/Claude/Code/Gemini) in RECORD + SYNTHESIS nel Vault.
2. **Ponte MCP** — esporre il retrieval di Smart Connections all'agente, per il recall ciclico durante i task.
Vedi disegno in [[02_JARVIS_Memoria_MultiModello]] e [[03_Memoria_Conversazione_Gemini_Orchestrator]].

## ⚠️ 01/06 fine giornata — notifiche Telegram ferme
L'utente segnala che le notifiche Telegram non arrivano più. Probabile: watcher PM2 `jarvis-telegram` non in esecuzione (riavvio + pm2-startup non risorto, o nvm passato a 24). Task P1 nel progetto JARVIS Todoist con diagnosi. Da riprendere: `pm2 resurrect` / verificare persistenza al boot / pinnare interprete Node 22. I messaggi non vanno persi (restano in `outbox/` finché il watcher riparte). Creato anche progetto Todoist "JARVIS" (prima i task erano nell'Inbox per limite progetti, ora risolto).
- **Risolto stesso giorno:** `pm2 resurrect` ha rimesso online il watcher (notifiche ok). n8n era invece in **crash-loop**: PM2 puntava al wrapper `N8N.CMD` e Node lo leggeva come JS (`SyntaxError: @ECHO off`). **Lezione: su Windows, in PM2 mai puntare ai `.cmd`/`.ps1`** — usare il vero entry JS. Fix: `pm2 start "...\nvm\v22.22.3\node_modules\n8n\bin\n8n" --name n8n -- start` + `pm2 save`. Entrambi i servizi online. **Aperto:** verificare che risalgano DA SOLI al prossimo riavvio (stavolta resurrect manuale → la persistenza pm2-windows-startup è dubbia). Task P2 nel progetto JARVIS.
- **Fine sessione 01/06:** scoperto che le finestre Node che si riaprono in continuazione sono causate da **PM2 su Windows** (`pm2 stop all` le ferma). **Decisione: migrare a nssm** (servizi Windows, sessione 0, nessuna finestra) la prossima sessione — task P1 "Migrare servizi da PM2 a nssm". Stato: servizi PM2 fermati per la notte (niente notifiche fino alla migrazione). Se l'utente riavvia, eventualmente `pm2-startup.cmd uninstall` per non far ripartire PM2 al boot. **RIPARTENZA prossima volta:** (1) migrazione PM2→nssm per watcher+n8n, poi (2) la rete neurale (ingestion + ponte MCP).

## ✅ Sessione successiva — migrazione a nssm COMPLETATA
PM2 dismesso (delete all + kill + pm2-startup uninstall). `jarvis-telegram` e `n8n` ora sono **servizi Windows via nssm** (Node 22 pinnato, AppDirectory impostate, n8n con `N8N_USER_FOLDER=C:\Users\ceran` per usare i dati esistenti, log in `_scripts\logs\`). Girano in sessione 0 → **nessuna finestra console**, **autostart al boot**, **autorestart** su crash. Verificato operativo: status RUNNING, notifiche Telegram OK, niente finestre. `ecosystem.config.js` (PM2) ora OBSOLETO. Infrastruttura stabile. **Prossimo: la RETE NEURALE** — pipeline di ingestion + ponte MCP per il recall.

## ✅ Rete neurale — ingestion (Layer A) avviata
Scelto: auto-registrazione a fine sessione (regola in [[META_RULES]]), non scraper di transcript (più affidabile + qualità superiore; backfill via transcript = Layer B opzionale futuro). Creati i primi record REALI: [[REC-20260601-infrastruttura-jarvis]] + [[SYNTH-20260601-infrastruttura-jarvis]] + nodi [[neural-vault]] [[notifiche-telegram]] [[nssm]] [[n8n]], interconnessi. Il Graph View ora mostra il primo cluster vero. **Prossimo:** ponte MCP per il recall (e, se serve, Layer B backfill).

## ✅ Ponte MCP per il recall — ATTIVO
Installato `smart-connections-mcp` (msdanyg) in `_scripts/smart-connections-mcp`, agganciato a Claude Code: `claude mcp add smart-connections -s user -e SMART_VAULT_PATH=...JARVIS-Vault -- node ...dist/index.js`. Legge gli embedding `.smart-env` (bge-micro-v2, 384-dim) senza Obsidian aperto. Testato: get_stats = 28 note/532 blocchi; get_similar_notes sul record → synthesis a 0.892, cluster coerente. **Recall semantico operativo.** Limite: niente query a testo libero → upgrade `obsidian-mcp-tools` (in corso). NB: latenza sessione ~2 min nel test (startup `claude` + inferenza modello, non la ricerca che è <50ms) → fare un giro di ottimizzazione performance a feature complete. Pulizia: rimuovere note di test sparse in 03_RECORDS (Wikilink.md, "nota di prova...").

## ✅ Option B — recall a testo libero COMPLETO (rete neurale chiusa)
`obsidian-mcp-tools` scartato (archiviato mag 2026). Costruito invece `_scripts/smart-connections-mcp/semantic-query.mjs`: embedda la query con `@huggingface/transformers` (bge-micro-v2, mean+normalize, stesso modello di Smart Connections) e riusa loader+SearchEngine.getEmbeddingNeighbors. Testato: query "decisioni notifiche telegram" → in cima notifiche-telegram (0.738) e 07_Notifiche (0.731). **Recall a testo libero accurato.** Aggiunto sistema **alias + riconoscimento intento + auto-apprendimento**: [[RECALL_ALIASES]] (esempi-seme, l'agente generalizza; in dubbio chiede e aggiunge la nuova forma) + regola in [[META_RULES]]. **La RETE NEURALE è funzionalmente completa: ingestion (auto-registrazione) + recall (note-to-note, keyword, free-text semantico) + vocabolario naturale.** Polish residuo: pulire note di test (Wikilink.md, "nota di prova"), giro ottimizzazione latenza.

## ✅ ORCHESTRATORE — cervello vivo (Claude Code on-plan)
Decisione: ibrido (n8n=plumbing, Claude=cervello); cervello = sessione **Claude Code locale on-plan** (no costi extra), n8n solo per automazioni. Regole di routing (per intento), persona, recall, ingestion, **curiosità+verifica** (fai domande, recall debole→chiedi, web col permesso multi-fonte) scritte in `CLAUDE.md` del progetto + [[10_JARVIS_Orchestratore]]. **Testato live:** "ti ricordi le notifiche Telegram?" → JARVIS ha riconosciuto l'intento, cercato negli archivi, risposto citando le note. Routing funzionante. Affinato: per recall a testo libero preferire `semantic-query.mjs` (il MCP non embedda query libere). Template record esteso con `confidence/fonti/verificato`. **Prossimo:** test routing azione/ambiguo, esecutore Gemini (chiave AI Studio), collegamento UI reale.

## ✅ Verificatore in background + debug routine (design)
Creato task schedulato `vault-verifier` (giornaliero 03:33): rivede record `verificato:false`, coerenza interna + verifica esterna multi-fonte (se web disponibile), aggiorna SOLO metadati `confidence/fonti/verificato`, flagga i dubbi, riepilogo Telegram via outbox. Guardrail: niente modifiche a contenuto/codice. **Debug log + routine notturna 03:00** (log giornaliero dei prompt+ragionamento fuori dal Vault, auto-fix SOLO basso rischio, altrimenti propone, report via mail) → documentato in [[11_JARVIS_Debug_e_Verifica]], **da attivare al go-live** di JARVIS. Caveat verifica esterna: dipende dall'accesso web dell'ambiente schedulato (da confermare con Run now).

## ✅ Verificatore VALIDATO — ha colto un errore reale (2026-06-01)
Run now del `vault-verifier`: **ha raggiunto il web** (citato docs n8n) → caveat sciolto, l'ambiente schedulato verifica esternamente. E ha **trovato un mio errore**: "n8n non supporta Node 24" era FALSO (n8n supporta >=20.19 <25). Correzione applicata a [[REC-20260601-infrastruttura-jarvis]], [[n8n]], [[SYNTH-20260601-infrastruttura-jarvis]]: Node 22 LTS resta per stabilità/compatibilità, non per incompatibilità. **Il sistema di memoria si auto-corregge.** Inoltre, lato orchestratore, JARVIS ha già dimostrato live anche il routing **azione** (ha letto file ed eseguito comandi shell) e l'uso dei connettori Calendar/Todoist → validazione del cervello di fatto completa.

## ✅ Ponte UI ↔ cervello — Fasi A+C LIVE (2026-06-01)
Decisione: Agent SDK + chiave API (la UI custom richiede streaming/permessi → Agent SDK; costo API a consumo, accettato). Costruito `_scripts/jarvis-bridge/` (server.mjs Node: HTTP statico + WebSocket + `@anthropic-ai/claude-agent-sdk`, `query()` con `cwd`=progetto JARVIS e `pathToClaudeCodeExecutable`=`C:\Users\ceran\.local\bin\claude.exe` — risolto l'errore "native CLI binary not found" riusando il claude.exe nativo). **Testato: JARVIS risponde dentro la UI**, ripescando dai nodi, persona intatta. Filtro: mostra solo le risposte (nascosti system/user/tool), eliminato il doppione (non re-inviare il `result`). Vedi [[12_JARVIS_UI_Bridge]]. **Resta:** Fase B permessi (`canUseTool` — verificare firma SDK), Fase D innesto nel water-UI v6, Fase E servizio nssm. NB sicurezza: la chiave API è transitata in chat → rigenerarla a fine lavori.

## 2026-06-01 — Pipeline skill + voce JARVIS
- **Integrate due skill (Claude Code) nell'orchestratore:** `prompt-master` per l'analisi dell'input e `humanizer` per la finitura dell'output.
- **Trigger:** `humanizer` SEMPRE (ultimo passaggio sull'output finale); `prompt-master` solo sui task NON banali (no su conversazione breve / comandi secchi / recall immediati).
- **Voce:** creato [[VOICE_JARVIS]] in `00_CORE/` — timbro JARVIS di Iron Man, intensità **marcato**, distillato da battute canoniche (Paul Bettany/MCU). Contiene un blocco *VOICE SAMPLE* che si passa a `/humanizer` per il voice matching.
- **Regola:** il contenuto tecnico letterale (codice, comandi, percorsi, JSON, output tool, citazioni note) NON viene umanizzato; `humanizer` rifinisce solo la prosa attorno.
- Pipeline documentata in `CLAUDE.md` (sezione "Pipeline skill"); tono aggiornato in [[IDENTITY]].

## 2026-06-01 — Skill verificate dai sorgenti GitHub (correzione)
- **`prompt-master` = `nidhinjs/prompt-master` v1.5/1.6** (MIT, ~7.9k★). Non è un generico analizzatore: è un **generatore di prompt** per qualsiasi AI tool. Pipeline: estrae 9 dimensioni d'intento → max 3 domande → routing silenzioso al framework giusto (RTF/CO-STAR/RISEN/CRISPE/CoT/Few-shot…) → audit token → un blocco prompt pronto. Invocazione `/prompt-master` o naturale. Per l'orchestratore lo usiamo come layer di raffinamento dell'input sui task non banali.
- **`humanizer` = `blader/humanizer` v2.2.0** (NON esiste `nidhinjs/humanizer`). Non applica un "timbro": **rimuove le tracce di scrittura-IA** (guida Wikipedia "Signs of AI writing": trattini lunghi, regola del tre, parole-spia, tono servile, grassetti/emoji, frasi-chatbot) e **abbina la voce a un campione fornito**.
- **Conflitto noto:** humanizer di default vira a tono informale/prima persona con "anima" → in tensione con la formalità di JARVIS. **Mitigazione:** passare il campione VOICE SAMPLE formale + istruzione esplicita "Tono target: formale, arguto, conciso (NON casual)". Aggiornati `CLAUDE.md` e [[VOICE_JARVIS]].
- **Da confermare con l'utente:** che la skill installata sia davvero `blader/humanizer` (esistono varianti: Aboudjem/humanizer-skill con "voci" nominate, jpeggdev/humanize-writing). Il comando fornito dall'utente combacia con blader.
