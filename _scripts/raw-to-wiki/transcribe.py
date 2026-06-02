#!/usr/bin/env python3
# transcribe.py <file> -> stampa la trascrizione (faster-whisper). Usato da organize.mjs per audio/video.
# Rispetta gli stessi env del servizio voce: JARVIS_STT_MODEL/DEVICE/COMPUTE.
import os, sys
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")   # evita il blocco silenzioso di hf-xet
from faster_whisper import WhisperModel

if len(sys.argv) < 2:
    sys.stderr.write("uso: transcribe.py <file>\n"); sys.exit(2)

path  = sys.argv[1]
model = os.environ.get("JARVIS_STT_MODEL", "base")
dev   = os.environ.get("JARVIS_STT_DEVICE", "cpu")
comp  = os.environ.get("JARVIS_STT_COMPUTE", "int8" if dev == "cpu" else "float16")

m = WhisperModel(model, device=dev, compute_type=comp)
segs, _ = m.transcribe(path, language="it", vad_filter=True)
print(" ".join(s.text.strip() for s in segs).strip())
