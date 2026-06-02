---
interlocutore: Fra
id: SYNTH-20260601-infrastruttura-jarvis
tipo: synthesis
topic: Costruzione infrastruttura JARVIS
tags: [infrastruttura, decisioni, windows, sandbox, servizi]
created: 2026-06-01
linked_record: "[[REC-20260601-infrastruttura-jarvis]]"
---

# Decisione chiave
Infrastruttura JARVIS **100% locale** su Windows. Memoria su Obsidian con embedding locale (Smart Connections, no costi/no cloud). Notifiche Telegram via **file-drop** (outbox + watcher) perché il sandbox degli agenti blocca `api.telegram.org`. Servizi gestiti con **nssm**, non PM2.

# Ragionamento
- **Embedding locale** invece di Voyage/Gemini API: l'abbonamento Gemini non dà accesso API, e Smart Connections ha un modello locale integrato → zero costi, dati in locale.
- **File-drop per le notifiche**: il sandbox (Cowork bash + task schedulati) risponde `403 from proxy` su Telegram; ma scrive sul filesystem e il `NO_PROXY` esenta gli IP privati. Quindi chi non raggiunge Telegram lascia un file nella outbox; un watcher su Windows (rete di casa) recapita.
- **nssm invece di PM2**: PM2 su Windows apre finestre console per i processi gestiti e non è affidabile al boot. nssm li fa girare come servizi (sessione 0): nessuna finestra, autostart, autorestart.
- **n8n su Node 22 LTS pinnato**: scelta per stabilità/compatibilità (n8n supporta Node >=20.19 <25, quindi anche la 24 andrebbe bene); con nvm globale si pinna l'interprete del servizio.

# Applicabilità futura
Qualsiasi automazione locale che deve (a) notificare l'utente da un ambiente con egress ristretto → usare il pattern file-drop; (b) restare sempre attiva su Windows → usare nssm, non PM2; (c) fare retrieval semantico → Smart Connections locale.

# Limiti noti
- Le notifiche 3/4 via hook valgono per Claude Code/Claudian, non per le sessioni Cowork (hook ignorati, bug #40495) → in Cowork si usa il file-drop per convenzione.
- nvm-windows è globale: tenere la 22 attiva o pinnare gli interpreti dei servizi.
- Disabilitare i task runner di n8n è deprecato (ma come servizio nssm in sessione 0 non aprono finestre, quindi si può tenere il default).
