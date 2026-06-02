#!/usr/bin/env python3
# jarvis-voice.py — INGRESSO VOCALE locale per JARVIS (wake-word + STT, tutto offline).
# Ascolta il microfono, riconosce "JARVIS" (openWakeWord), registra l'enunciato, lo trascrive
# (faster-whisper) e POSTa il testo al ponte (/voice) -> entra nel canale chat/interprete.
#
# Setup:  pip install openwakeword sounddevice faster-whisper numpy
#         (openWakeWord scarica i modelli pre-addestrati al primo avvio; include "hey_jarvis")
# Env:    JARVIS_BRIDGE_VOICE (def http://localhost:8787/voice), JARVIS_STT_MODEL (small),
#         JARVIS_STT_DEVICE (cuda|cpu), JARVIS_WAKE (hey_jarvis), JARVIS_WAKE_THRESHOLD (0.5)
import os, json, time, urllib.request
import numpy as np
import sounddevice as sd
import openwakeword
from openwakeword.model import Model
from faster_whisper import WhisperModel
try:
    import speaker_id as spkid   # riconoscimento del parlante (ECAPA); opzionale
except Exception as _e:
    spkid = None
    print("[VOCE] speaker_id non caricato (parlante = default):", _e)

CONTROL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "control")
VOICE_RESTART = os.path.join(CONTROL_DIR, "restart-voice")   # sentinella scritta dal ponte su restart-all
def restart_requested():
    try:
        if os.path.exists(VOICE_RESTART):
            os.remove(VOICE_RESTART)
            return True
    except Exception:
        pass
    return False

BRIDGE = os.environ.get("JARVIS_BRIDGE_VOICE", "http://localhost:8787/voice")
STATE_URL = os.environ.get("JARVIS_BRIDGE_STATE", BRIDGE.replace("/voice", "/voice-state"))
WAKE   = os.environ.get("JARVIS_WAKE", "hey_jarvis")
WTH    = float(os.environ.get("JARVIS_WAKE_THRESHOLD", "0.5"))
STT_M  = os.environ.get("JARVIS_STT_MODEL", "small")
DEV    = os.environ.get("JARVIS_STT_DEVICE", "cpu")   # default sicuro; la GPU (cuda) è opt-in e richiede le librerie CUDA
COMP   = os.environ.get("JARVIS_STT_COMPUTE", "float16" if DEV == "cuda" else "int8")
SR, FRAME = 16000, 1280     # 80 ms a 16 kHz (frame openWakeWord)
SIL_MS, MAX_S = 900, 12     # silenzio per chiudere l'enunciato / durata massima
SIL_RMS    = float(os.environ.get("JARVIS_SIL_RMS", "0.008"))            # sotto questa energia = silenzio
SPEECH_RMS = float(os.environ.get("JARVIS_SPEECH_RMS", "0.013"))         # sopra questa energia = inizio parlato
MIN_UTTER_MS = int(os.environ.get("JARVIS_MIN_UTTER_MS", "400"))         # scarta i frammenti piu' corti (es. "Sì." da rumore)
SESSION_TIMEOUT = float(os.environ.get("JARVIS_SESSION_TIMEOUT", "600"))  # silenzio max (s) prima di chiudere la sessione
END_PHRASES = [p.strip().lower() for p in os.environ.get("JARVIS_SESSION_END",
    "fine sessione,chiudi sessione,stop sessione,a dopo jarvis,grazie jarvis basta,basta jarvis").split(",") if p.strip()]

print("[VOCE] preparo i modelli wake-word...")
try: openwakeword.utils.download_models()
except Exception as e: print("[VOCE] download_models:", e)
try:
    oww = Model(wakeword_models=[WAKE])
except Exception as e:
    print("[VOCE] modello wake specifico non disponibile, carico tutti i pre-addestrati:", e)
    oww = Model()

print(f"[VOCE] carico Whisper '{STT_M}' su {DEV} ({COMP})...")
asr = WhisperModel(STT_M, device=DEV, compute_type=COMP)
print("[VOCE] pronto. Di' \"JARVIS\" per parlare.")

def rms(x):
    return float(np.sqrt(np.mean((x.astype(np.float32) / 32768.0) ** 2))) if len(x) else 0.0

def transcribe(audio_i16):
    audio = audio_i16.astype(np.float32) / 32768.0
    segs, _ = asr.transcribe(audio, language="it", vad_filter=True)
    return " ".join(s.text.strip() for s in segs).strip()

def post(text, speaker=""):
    try:
        req = urllib.request.Request(BRIDGE, data=json.dumps({"text": text, "speaker": speaker}).encode("utf-8"),
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5).read()
    except Exception as e:
        print("[VOCE] POST errore:", e)

def post_state(state):
    try:
        req = urllib.request.Request(STATE_URL, data=json.dumps({"state": state}).encode("utf-8"),
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=3).read()
    except Exception as e:
        print("[VOCE] stato POST errore:", e)

stream = sd.InputStream(samplerate=SR, channels=1, dtype="int16", blocksize=FRAME)
stream.start()

def drain(frames=4):
    """Scarta ~frames*80ms di audio (per lasciar sfumare la coda del wake-word prima di ascoltare il comando)."""
    for _ in range(frames):
        try: stream.read(FRAME)
        except Exception: pass

def capture(max_wait_s):
    """Attende l'inizio del parlato (fino a max_wait_s), poi registra fino al silenzio.
    Scarta i frammenti < MIN_UTTER_MS (rumore). Ritorna l'audio, o None se nessuno parla entro l'attesa."""
    t_wait = time.time()
    while time.time() - t_wait < max_wait_s:
        b, _ = stream.read(FRAME); f = b[:, 0]
        if rms(f) >= SPEECH_RMS:
            buf, silent, t0, peak = [f], 0.0, time.time(), rms(f)
            while time.time() - t0 < MAX_S:
                b, _ = stream.read(FRAME); f = b[:, 0]; buf.append(f); peak = max(peak, rms(f))
                silent = silent + FRAME / SR * 1000 if rms(f) < SIL_RMS else 0.0
                if silent >= SIL_MS: break
            dur_ms = len(buf) * FRAME / SR * 1000
            if dur_ms < MIN_UTTER_MS:
                continue   # frammento troppo breve: ignora e continua ad ascoltare (non chiude la sessione)
            print(f"[VOCE] catturato {dur_ms:.0f}ms, picco RMS {peak:.3f}")
            return np.concatenate(buf)
    return None

def handle(utter):
    """Trascrive, riconosce il parlante, invia al ponte. Ritorna il testo (minuscolo) per il controllo di fine sessione."""
    text = transcribe(utter)
    spk = ""
    if spkid is not None:
        try: spk = spkid.identify(utter)
        except Exception as e: print("[VOCE] riconoscimento parlante:", e)
    print("[VOCE] ->", text, ("["+spk+"]" if spk else ""))
    if text: post(text, spk)
    return (text or "").lower()

post_state("idle")
print('[VOCE] in ascolto. Di\' "Hey JARVIS" per iniziare.')
try:
    while True:
        if restart_requested():
            print("[VOCE] restart richiesto dal ponte -> esco, il watchdog mi rilancia.")
            break
        block, _ = stream.read(FRAME)
        frame = block[:, 0]
        scores = oww.predict(frame)
        if scores and max(scores.values()) >= WTH:
            print(f'[VOCE] wake! ({max(scores.values()):.2f}) — sessione attiva (di\' "fine sessione" per chiudere).')
            try: oww.reset()
            except Exception: pass
            drain()   # lascia sfumare la coda del wake-word, poi ascolta il comando
            post_state("active")
            # sessione continua: enunciati a raffica senza ripetere il wake-word
            while True:
                utter = capture(SESSION_TIMEOUT)
                if utter is None:
                    print(f"[VOCE] nessuna voce per {SESSION_TIMEOUT:.0f}s: sessione chiusa.")
                    break
                low = handle(utter)
                if any(p in low for p in END_PHRASES):
                    print("[VOCE] sessione chiusa su comando.")
                    break
            post_state("idle")
            try: oww.reset()
            except Exception: pass
            time.sleep(0.3)
finally:
    stream.stop(); stream.close()
