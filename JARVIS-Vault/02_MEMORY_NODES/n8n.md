---
interlocutore: Fra
tipo: concept-node
cluster: tecnico
created: 2026-06-01
---

# n8n

> Nodo-concetto: orchestratore di automazioni a workflow (locale, su `localhost:5678`).

## Record che lo usano
- [[REC-20260601-infrastruttura-jarvis]]

## Concetti correlati
[[nssm]] · [[notifiche-telegram]] · [[neural-vault]]

## Pattern emersi
> Scelto come orchestratore al posto di un backend custom (Dispatch + Smart Connections coprono il resto). Gira su **Node 22 LTS** (scelta per stabilità/compatibilità native modules; n8n supporta comunque Node >=20.19 <25, quindi anche la 24). Avvio sotto nssm puntando all'entry JS `node_modules\n8n\bin\n8n start` — MAI al wrapper `N8N.CMD` (Node lo legge come JS → SyntaxError). I task runner aprono finestre se lanciati con desktop; come servizio nssm (sessione 0) non è un problema.
