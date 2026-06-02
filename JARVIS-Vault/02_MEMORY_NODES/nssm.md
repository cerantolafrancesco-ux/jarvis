---
interlocutore: Fra
tipo: concept-node
cluster: tecnico
created: 2026-06-01
---

# nssm

> Nodo-concetto: Non-Sucking Service Manager — esegue app come servizi Windows.

## Record che lo usano
- [[REC-20260601-infrastruttura-jarvis]]

## Concetti correlati
[[n8n]] · [[notifiche-telegram]]

## Pattern emersi
> Su Windows, per tenere processi Node sempre attivi SENZA finestre console e con autostart al boot: usare nssm, NON PM2 (che apre console e fallisce al boot). I servizi girano in sessione 0 (nessun desktop → nessuna finestra). Pinnare l'interprete a Node 22 assoluto per immunità da nvm. Impostare `AppDirectory` e, per n8n, `N8N_USER_FOLDER` così usa i dati esistenti.
