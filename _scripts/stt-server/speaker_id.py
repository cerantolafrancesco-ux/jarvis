#!/usr/bin/env python3
# speaker_id.py — riconoscimento del parlante via ECAPA-TDNN (speechbrain). Importato da jarvis-voice.py.
# Enrollment in voices/enroll.json: { "<nome>": [ [vettore], ... ] } (uno o piu' campioni per persona).
# Caricamento lazy e difensivo: se speechbrain/torch mancano, identify() ritorna il default (degrada con grazia).
import os, json
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")   # evita il blocco silenzioso di hf-xet sul download del modello
import numpy as np

HERE    = os.path.dirname(os.path.abspath(__file__))
ENROLL  = os.path.join(HERE, "voices", "enroll.json")
DEVICE  = os.environ.get("JARVIS_SPK_DEVICE", "cpu")          # ECAPA su CPU va bene per enunciati brevi
THRESH  = float(os.environ.get("JARVIS_SPK_THRESHOLD", "0.35"))
DEFAULT = os.environ.get("JARVIS_SPK_DEFAULT", os.environ.get("JARVIS_OWNER", "Fra"))
UNKNOWN = os.environ.get("JARVIS_SPK_UNKNOWN", "ospite")

_model = None
def _load():
    global _model
    if _model is not None:
        return _model
    try:
        import torch  # noqa
        from speechbrain.inference.speaker import EncoderClassifier
        _model = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir=os.path.join(HERE, "voices", "_ecapa"),
            run_opts={"device": DEVICE})
        return _model
    except Exception as e:
        print("[VOCE] ECAPA non disponibile (riconoscimento parlante disattivo):", e)
        _model = False
        return False

def embed(audio_i16, sr=16000):
    m = _load()
    if not m:
        return None
    import torch
    audio = audio_i16.astype(np.float32) / 32768.0
    with torch.no_grad():
        t = torch.from_numpy(audio).unsqueeze(0)
        v = m.encode_batch(t).squeeze().detach().cpu().numpy().astype(np.float64)
    n = np.linalg.norm(v) or 1.0
    return v / n

def load_enroll():
    try:
        with open(ENROLL, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_enroll(d):
    os.makedirs(os.path.dirname(ENROLL), exist_ok=True)
    with open(ENROLL, "w", encoding="utf-8") as f:
        json.dump(d, f)

def _cos(a, b):
    return float(np.dot(np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)))  # vettori gia' normalizzati

def identify(audio_i16, sr=16000):
    enroll = load_enroll()
    if not enroll:
        return DEFAULT          # fase mono-utente: nessuna voce registrata -> proprietario
    v = embed(audio_i16, sr)
    if v is None:
        return DEFAULT
    best, best_s = None, -1.0
    for name, samples in enroll.items():
        for s in samples:
            sc = _cos(v, s)
            if sc > best_s:
                best, best_s = name, sc
    ok = best_s >= THRESH
    print(f"[VOCE] parlante: {best} ({best_s:.2f})" + ("" if ok else f" -> sotto soglia, {UNKNOWN}"))
    return best if ok else UNKNOWN
