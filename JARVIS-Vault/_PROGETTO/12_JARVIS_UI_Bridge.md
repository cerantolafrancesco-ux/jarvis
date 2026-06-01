---
tipo: progetto-design
aggiornato: 2026-06-01
stato: architettura (pre-build)
---

# JARVIS — Ponte UI ↔ Cervello

> Trasformare i terminali del prototipo in **sessioni reali** di JARVIS: input → cervello → risposta in streaming, con permessi interattivi.

## Architettura
```
Browser (UI canvas/terminali)
   │  WebSocket (locale)
   ▼
Backend-ponte (Node, servizio nssm) — un servizio leggero che:
   • serve la UI e apre una WS per ogni terminale
   • avvia/gestisce una sessione JARVIS per terminale (Claude Agent SDK)
   • FILTRA lo stream: invia alla UI SOLO le risposte dell'assistente + le richieste di permesso
   • gestisce i permessi: callback canUseTool → evento "permesso" alla UI → attende Accetta/Rifiuta → risolve
   • mappa lo stato sessione → stato UI (attesa input = lampeggia; idle/fine = grigio)
   ▼
Claude (cervello) — system prompt = CLAUDE.md (routing+persona) + MCP smart-connections + strumenti
```
- Un **terminale UI = una sessione**. Più terminali = più sessioni in parallelo.
- La UI resta quella del prototipo (v0.6) evoluta: input, risposte, prompt di permesso con Accetta/Rifiuta.

## ⚠️ Decisione chiave: come gira il cervello dietro la UI
Per pilotare programmaticamente Claude con **streaming + callback dei permessi**, lo strumento giusto è il **Claude Agent SDK**. Ma (cambio billing 15/06/2026) l'uso Agent SDK/headless **va su API a consumo**, NON sul piano Max.
- **Opzione A — Agent SDK (consigliata):** è il modo nativo per costruire UI custom su Claude (streaming, permessi, tool). Pulito e robusto. **Costo:** token API (serve una chiave Anthropic; spesa proporzionale all'uso).
- **Opzione B — restare on-plan:** pilotare sessioni interattive via Dispatch/Remote Control. Niente costo extra, ma sono preview pensate per i client Anthropic, non per una UI custom → bridging incerto/fragile.

→ Per una UI vera e affidabile, **A** è la strada. La spesa API per uso personale è contenuta e prevedibile.

## Fasi
- **A.** ✅ Backend skeleton: Node + Agent SDK + WebSocket; risposta in streaming. (claude.exe nativo via `pathToClaudeCodeExecutable`.)
- **B.** ✅ (da validare) Permessi: `canUseTool` → la UI mostra strumento+input con Accetta/Rifiuta → risolve. + memoria di sessione (`resume`).
- **C.** ✅ Filtro: solo risposte (nascosti system/user/tool), niente doppione.
- **D.** ✅ UI reale = **v7** (`jarvis-bridge/public/index.html`): water-desktop, ogni terminale = una sessione (WebSocket propria), input + risposte + permessi, stati (busy/lampeggio/grigio), titolo = ultimo prompt.
- **E.** ⏳ Backend come servizio nssm; rifinitura.
> Da validare al primo avvio: firme `canUseTool`/`resume` dell'SDK (scritte best-effort, ricerca web ferma fino alle 20).

## Note
- Coerente con la spec UI: terminale mostra **solo risposte + permessi** ([[09_JARVIS_UI_Spec]]).
- Il backend-ponte è il primo (e unico) "micro-servizio custom" previsto dall'architettura ibrida ([[10_JARVIS_Orchestratore]]); n8n resta per gli automatismi.
