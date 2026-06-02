#!/usr/bin/env python3
# enroll.py — registra la voce di una persona per il riconoscimento del parlante (ECAPA).
# Uso:
#   python enroll.py "<nome>"                      registra dal microfono (JARVIS_ENROLL_SECONDS, def 10s)
#   python enroll.py "<nome>" file1.wav [file2...]  usa file audio gia' pronti
# Rilancialo piu' volte per la stessa persona: aggiunge campioni e rende il riconoscimento piu' robusto.
import os, sys
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
import numpy as np
import speaker_id as S

def from_mic(seconds):
    import sounddevice as sd
    sr = 16000
    print(f"[ENROLL] parla ora per {seconds}s...")
    audio = sd.rec(int(seconds * sr), samplerate=sr, channels=1, dtype="int16")
    sd.wait()
    print("[ENROLL] registrazione completata.")
    return audio[:, 0]

def from_file(path):
    import soundfile as sf
    data, sr = sf.read(path, dtype="int16", always_2d=False)
    if getattr(data, "ndim", 1) > 1:
        data = data[:, 0]
    if sr != 16000:
        print(f"[ENROLL] attenzione: {path} a {sr}Hz (consigliato 16000).")
    return np.asarray(data)

def main():
    if len(sys.argv) < 2:
        print('uso: python enroll.py "<nome>" [file.wav ...]'); sys.exit(2)
    name  = sys.argv[1]
    files = sys.argv[2:]
    embs = []
    if files:
        for fpath in files:
            v = S.embed(from_file(fpath))
            if v is not None: embs.append(v.tolist())
    else:
        seconds = int(os.environ.get("JARVIS_ENROLL_SECONDS", "10"))
        v = S.embed(from_mic(seconds))
        if v is not None: embs.append(v.tolist())
    if not embs:
        print("[ENROLL] nessun embedding prodotto (ECAPA non disponibile? installa torch + speechbrain)"); sys.exit(1)
    enroll = S.load_enroll()
    enroll.setdefault(name, [])
    enroll[name].extend(embs)
    S.save_enroll(enroll)
    print(f"[ENROLL] '{name}': +{len(embs)} campione/i (totale {len(enroll[name])}). Soglia attuale: {S.THRESH}.")

if __name__ == "__main__":
    main()
