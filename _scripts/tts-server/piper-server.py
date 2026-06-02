#!/usr/bin/env python3
# piper-server.py — TTS LOCALE per JARVIS (Piper, PERSISTENTE).
# Carica il modello UNA volta all'avvio e sintetizza in memoria a ogni richiesta -> veloce, niente subprocess.
# POST /speak {"text":"..."} -> audio/wav. La UI lo preferisce; se assente ripiega sulla voce di sistema.
#
# Setup (Windows, via pip):
#   pip install piper-tts
#   python -m piper.download_voices it_IT-paola-medium --data-dir "<questa cartella>\voices"
# Avvio:
#   set JARVIS_PIPER_MODEL=<questa cartella>\voices\it_IT-paola-medium.onnx
#   python piper-server.py
import os, io, json, wave, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from piper import PiperVoice

MODEL = os.environ.get("JARVIS_PIPER_MODEL", "")
PORT  = int(os.environ.get("JARVIS_TTS_PORT", "5002"))
if not MODEL:
    raise SystemExit("[TTS] ERRORE: imposta JARVIS_PIPER_MODEL al percorso del modello .onnx italiano.")

print(f"[TTS] carico Piper (residente): {MODEL} ...")
voice = PiperVoice.load(MODEL)
lock = threading.Lock()   # PiperVoice non e' garantito thread-safe: serializza le sintesi
print("[TTS] modello caricato. Pronto.")

PAD_S = float(os.environ.get("JARVIS_TTS_PAD", "0.4"))  # silenzio iniziale (secondi) anti-taglio

def synth(text):
    raw = io.BytesIO()
    with lock:
        with wave.open(raw, "wb") as wf:
            voice.synthesize_wav(text, wf)
    raw.seek(0)
    with wave.open(raw, "rb") as r:
        params = r.getparams()
        frames = r.readframes(r.getnframes())
    silence = b"\x00" * (int(params.framerate * PAD_S) * params.nchannels * params.sampwidth)
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setparams(params)
        w.writeframes(silence + frames)
    return out.getvalue()

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_GET(self):
        if self.path == "/quit":   # il ponte chiama questo per il restart-all; il watchdog rilancia Piper
            self.send_response(200); self._cors(); self.end_headers()
            threading.Thread(target=lambda: (time.sleep(0.2), os._exit(0)), daemon=True).start(); return
        self.send_response(404); self._cors(); self.end_headers()
    def do_POST(self):
        if self.path != "/speak":
            self.send_response(404); self._cors(); self.end_headers(); return
        n = int(self.headers.get("Content-Length", 0))
        try:
            text = json.loads(self.rfile.read(n) or b"{}").get("text", "")
        except Exception:
            text = ""
        if not text:
            self.send_response(400); self._cors(); self.end_headers(); return
        try:
            wav = synth(text)
        except Exception as e:
            print("[TTS] errore:", e)
            self.send_response(500); self._cors(); self.end_headers(); return
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "audio/wav"); self.send_header("Content-Length", str(len(wav))); self.end_headers()
        self.wfile.write(wav)
    def log_message(self, *a): pass

print(f"[TTS] Piper in ascolto su http://localhost:{PORT}/speak")
ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
