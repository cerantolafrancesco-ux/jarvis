---
tipo: progetto-config
aggiornato: 2026-05-31
---

# Configurazione Obsidian per JARVIS

> Impostazioni ordinate per come servono al Neural Vault. Aprire Impostazioni (⚙️ in basso a sinistra).

## 1. File e collegamenti  ← la più importante
- **Usa [[Wikilink]]**: ON
- **Formato del nuovo link interno**: *Percorso più breve possibile*
- **Aggiorna automaticamente i link interni**: ON (così spostando le note i link non si rompono)
- **Cartella predefinita per nuove note**: `03_RECORDS` (è lì che nasce la maggior parte delle note)
- **Cartella predefinita per nuovi allegati**: il campo per il percorso **compare solo dopo** aver scelto dal menu a tendina l'opzione *"Nella cartella specificata sotto"* (o *"In subfolder under current folder"*). Prima di selezionarla, il campo è nascosto. Poi scrivere `_attachments`.

## 2. Editor
- **Modalità predefinita**: *Live Preview*
- **Lunghezza riga leggibile**: OFF (le tabelle larghe dei record si vedono meglio)
- **Mostra le proprietà nel documento**: *Visibili* (vede il frontmatter in modo leggibile)

## 3. Plugin principali (core)
Impostazioni → "Plugin principali" (Core plugins). **Backlink e Link in uscita sono già attivi di default** nelle versioni recenti — se non vede i toggle è perché sono integrati. **Non serve fare nulla qui per partire.** Eventualmente attivare solo se spenti: Riquadro tag, Vista proprietà, Vista grafico, Struttura.
- **Modelli (Templates core)**: lasciare OFF — usiamo Templater.

## 4. Templater  ← automazione dei record
Impostazioni del plugin Templater:
- **Template folder location**: `05_TEMPLATES`
- **Trigger Templater on new file creation**: ON
- **Folder Templates** (associa cartella → template, così il template si applica da solo):
  - `03_RECORDS` → `TEMPLATE_RECORD`
  - `04_SYNTHESIS` → `TEMPLATE_SYNTHESIS`
  - `02_MEMORY_NODES` → `TEMPLATE_NODE`

## 5. Dataview
- **Enable JavaScript Queries**: ON
- **Enable Inline Queries**: ON
- (Servono per le dashboard: "tutti i record con version > 1", timeline di un topic, ecc.)

## 6. Smart Connections + Smart Lookup
- **Embedding model**: modello **locale** integrato (default, *no API key*).
- **Excluded folders**: l'esclusione cartelle richiede Smart Connections **Pro** → **NON la facciamo.** Sono solo 3 template: il rumore semantico è trascurabile, non vale un abbonamento. Si ignora.
- Lasciare `_PROGETTO` **indicizzato** (i doc di design devono essere ricercabili).
- Attendere il completamento dell'indicizzazione iniziale prima di giudicare i risultati.

## 7. Aspetto
- Tema e colori: preferenza personale, nessun impatto funzionale.

## 8. Hotkey utili (opzionale)
- Templater → "Open insert template modal": assegnare una scorciatoia.
- Smart Lookup → comando di ricerca semantica: assegnare una scorciatoia.

---
**Verifica finale:** crea una nota dentro `03_RECORDS` → Templater applica `TEMPLATE_RECORD` da solo → compili → Smart Connections la indicizza → compare nei correlati. Se questo ciclo gira, la configurazione è completa.
