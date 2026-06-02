---
interlocutore: Fra
id: REC-20260601-ui-prototype
tipo: record
fonte: cowork
modello: claude-opus
topic: UI di JARVIS — visione e prototipo
tags: [ui, frontend, prototipo, aqua, terminali, ux]
created: 2026-06-01
version: 2
supersedes:
evolution_stage: prototipo
linked_nodes: ["[[jarvis-ui]]", "[[neural-vault]]"]
verificato: true
confidence: 0.85
fonti: []
---

# 🧠 Contesto
L'owner ha definito la UI di JARVIS: una "scrivania" di terminali galleggianti, uno per interazione.

# 🤖 Cosa è stato fatto
- Spec in [[09_JARVIS_UI_Spec]].
- **Prototipo v0.1**: canvas, FAB `+`, finestre draggabili/ridimensionabili/trasparenti, overlap, stati (attivo/lampeggio-attesa/grigio-fermo), collapse in tab.
- **Prototipo v0.2 "Aqua"** (input owner): sfondo bianco + sheen azzurra, **onde che si propagano** (canvas), **suoni bubble/acqua** (WebAudio), **trasparenza dinamica** all'overlap (si legge la finestra sotto), **tab = bolle trascinabili**, **titoli che evolvono** col contenuto. Approvato dall'owner ("mi piace molto"), con aggiustamenti rinviati.

# 🔗 Connessioni
[[jarvis-ui]] · [[09_JARVIS_UI_Spec]] · [[neural-vault]]

# Δ Aperto (v0.3)
Contenitori (drag-drop in gruppi), aggancio agli eventi reali (hook/Dispatch, titoli = riassunto LLM), persistenza layout. Aggiustamenti estetici minori da fare più avanti.
