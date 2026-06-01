---
id: REC-20260601-infrastruttura-jarvis
tipo: record
fonte: cowork
modello: claude-opus
topic: Costruzione infrastruttura JARVIS
tags: [infrastruttura, setup, notifiche, telegram, nssm, n8n, obsidian, nvm, claude-code]
created: 2026-06-01
version: 1
supersedes:
superseded_by:
evolution_stage: consolidato
linked_synthesis: "[[SYNTH-20260601-infrastruttura-jarvis]]"
linked_nodes: ["[[neural-vault]]", "[[notifiche-telegram]]", "[[nssm]]", "[[n8n]]"]
reuse_count: 0
last_recalled:
verificato: true
confidence: 0.9
fonti:
  - https://docs.n8n.io/hosting/installation/npm/
  - https://nssm.cc/
---

# 🧠 Contesto / Obiettivo
Posare l'intera infrastruttura locale di JARVIS su Windows 11 (HP OMEN i9, 64 GB): ambiente di runtime, database della conoscenza, agente desktop, orchestratore e un sistema di notifiche multi-canale su Telegram. Punto di partenza: solo un disegno su carta della "rete neurale".

# 🤖 Cosa è stato fatto
- **Node via nvm-windows**: convivenza Node 22 (servizi JARVIS) e Node 24 (gestionale Probrand). n8n gira anche su Node 24 (supporta >=20.19 <25); si tiene comunque Node 22 LTS per i servizi per stabilità e compatibilità dei native modules.
- **[[neural-vault]]**: Obsidian aperto sulla cartella progetti come Vault (`JARVIS-Vault`), struttura `00_CORE`…`05_TEMPLATES`, plugin Dataview/Templater/Smart Connections + Smart Lookup (embedding **locale**, zero costi).
- **Claude Code nativo** (`claude.exe` v2.1.159, installer ufficiale) + **Claudian** in Obsidian come agente desktop sul Vault.
- **[[n8n]]** come orchestratore (deciso al posto di un backend custom, vista la disponibilità di Dispatch e Smart Connections).
- **[[notifiche-telegram]]**: bot + watcher con architettura **file-drop** (outbox sorvegliata) + **hook** di Claude Code. Tutte e 4 le notifiche operative.
- **[[nssm]]**: watcher e n8n migrati da PM2 a servizi Windows (niente finestre, autostart, autorestart).

# 🔗 Connessioni
[[neural-vault]] · [[notifiche-telegram]] · [[nssm]] · [[n8n]] · [[SYNTH-20260601-infrastruttura-jarvis]]
Doc di progetto: [[00_JARVIS_Architettura]], [[04_JARVIS_Setup_Base]], [[07_JARVIS_Notifiche_Telegram]], [[08_JARVIS_Avvio_e_Config]]

# Δ Note
Prossima fase: la rete neurale vera — pipeline di ingestion (questo record ne è il primo esempio) e ponte MCP per il recall.

> ✅ Corretto (2026-06-01): la motivazione "n8n non supporta Node 24" era **errata** — n8n supporta Node >=20.19 <25, quindi la 24 è compatibile. Node 22 LTS resta la scelta giusta per **stabilità e compatibilità native modules**, non per incompatibilità. Aggiornati [[n8n]] e [[SYNTH-20260601-infrastruttura-jarvis]]. (Errore colto da vault-verifier — il loop di auto-correzione funziona.)
