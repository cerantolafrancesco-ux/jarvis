---
tipo: cartella-sistema
---

# RAW_SOURCE — dati grezzi (input)

Qui dentro va **tutto ciò che entra grezzo**: mail, PDF, articoli, pagine web salvate (.html), trascrizioni, audio/video, note buttate giù, dati. Caricati a mano da te, raccolti da una ricerca, o inseriti deliberatamente.

Niente regole di formato: metti il file e basta. L'organizzatore (`_scripts/raw-to-wiki/organize.mjs`) lo rileva, ne estrae il testo e scrive la versione ordinata in `[[WIKI]]`.

Formati estratti automaticamente:
- **Testo:** `.md` `.txt` `.csv` `.tsv` `.json` `.log`
- **Web:** `.html` `.htm` (tag rimossi)
- **PDF:** `.pdf` (richiede `pdftotext`/poppler nel PATH)
- **Audio/Video:** `.mp3 .wav .m4a .mp4 .mkv .mov .webm` … (trascritti con faster-whisper)

Se un tipo non è estraibile, in WIKI compare comunque una nota *stub* che rimanda al grezzo, da processare a mano o con Claude. I file che iniziano con `_` o `README` sono ignorati.
