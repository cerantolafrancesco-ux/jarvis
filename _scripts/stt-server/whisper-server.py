#!/usr/bin/env python3
# whisper-server.py — servizio STT LOCALE per JARVIS (faster-whisper, GPU).
# L'audio NON lascia la macchina. POST /transcribe (corpo: audio binario, es. audio/webm) -> {"text": "..."}
#
# Setup:  pip install faster-whisper
# Avvio:  python whisper-server.py
# Env:    JARVIS_STT_MODEL (small|medium|large-v3, def. small) JARVIS_STT_DEVICE (cuda|cpu)
#         JARVIS_STT_COMPUTE (float16|int8) JARVIS_STT_PORT (9000) JARVIS_STT_LANG (it)
import os, json, tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from faster_whisper import WhisperModel

MODEL   = os.environ.get("JARVIS_STT_MODEL", "small")
DEVICE  = os.environ.get("JARVIS_STT_DEVICE", "cuda")      # "cpu" se la GPU da' problemi
COMPUTE = os.environ.get("JARVIS_STT_COMPUTE", "float16")  # usa "int8" con device cpu
PORT    = int(os.environ.get("JARVIS_STT_PORT", "9000"))
LANG    = os.environ.get("JARVIS_STT_LANG", "it")

print(f"[STT] carico Whisper '{MODEL}' su {DEVICE} ({COMPUTE})...")
model = WhisperModel(MODEL, device=DEVICE, compute_type=COMPUTE)
print("[STT] modello pronto.")

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        if self.path != "/transcribe":
            self.send_response(404); self._cors(); self.end_headers(); return
        n = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(n)
        text, path = "", None
        try:
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                f.write(data); path = f.name
            segments, _info = model.transcribe(path, language=LANG, vad_filter=True)
            text = " ".join(s.text.strip() for s in segments).strip()
        except Exception as e:
            print("[STT] errore:", e)
        finally:
            if path:
                try: os.remove(path)
                except OSError: pass
        body = json.dumps({"text": text}).encode("utf-8")
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(body)
    def log_message(self, *a): pass

print(f"[STT] in ascolto su http://localhost:{PORT}/transcribe")
ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
