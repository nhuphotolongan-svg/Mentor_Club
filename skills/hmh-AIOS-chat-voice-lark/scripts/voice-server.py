#!/usr/bin/env python3
# voice-server.py — máy chủ thoại thường trú cho TÔM (macOS)
# ---------------------------------------------------------------------------
#   /stt  : nhận {path, language} -> faster-whisper -> {text}
#   /tts  : nhận {text, engine, voice} -> tạo file audio -> {path}
#   /health: {ok, model}
# Nạp model Whisper 1 lần (giữ trong RAM), mỗi câu chỉ ~1-2s.
# TTS: gTTS (mặc định, miễn phí, cần internet) | vbee (cần key) | say (offline mac)
# Không cần Flask — dùng http.server thuần.
# Cấu hình qua env (start-mac.sh nạp từ .env):
#   WHISPER_MODEL=small  WHISPER_PORT=8765  WHISPER_DEVICE=cpu  WHISPER_COMPUTE=int8
#   VBEE_API=<token>  VBEE_APP_ID=<uuid>  VOICE_CODE=<giọng vbee>
# ---------------------------------------------------------------------------
import json, os, sys, tempfile, subprocess, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
PORT       = int(os.environ.get("WHISPER_PORT", "8765"))
DEVICE     = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE    = os.environ.get("WHISPER_COMPUTE", "int8")

print(f"[voice-server] Đang nạp Whisper '{MODEL_SIZE}' ({DEVICE}/{COMPUTE})… lần đầu sẽ tải model.", flush=True)
from faster_whisper import WhisperModel
_model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE)
_lock = threading.Lock()
print("✅ whisper STT sẵn sàng.", flush=True)


def transcribe(path, language="vi"):
    with _lock:
        segments, _info = _model.transcribe(path, language=language, beam_size=1, vad_filter=True)
        return "".join(seg.text for seg in segments).strip()


def tts_gtts(text, outfile):
    from gtts import gTTS
    gTTS(text=text, lang="vi").save(outfile)
    return outfile


def tts_say(text, outfile):
    # macOS 'say' -> aiff (bridge sẽ chuyển sang opus bằng ffmpeg)
    aiff = outfile.rsplit(".", 1)[0] + ".aiff"
    voice = os.environ.get("MAC_SAY_VOICE", "")  # vd "Linh" nếu đã cài giọng tiếng Việt
    cmd = ["say"]
    if voice:
        cmd += ["-v", voice]
    cmd += ["-o", aiff, text]
    subprocess.run(cmd, check=True)
    return aiff


def tts_vbee(text, outfile, voice=""):
    import requests
    token   = os.environ.get("VBEE_API", "")
    app_id  = os.environ.get("VBEE_APP_ID", "")
    voice   = voice or os.environ.get("VOICE_CODE", "hn_female_ngochuyen_news_48k-thg")
    if not token:
        raise RuntimeError("Thiếu VBEE_API")
    # Vbee API v1 (async): tạo yêu cầu rồi poll kết quả
    r = requests.post(
        "https://vbee.vn/api/v1/tts",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"app_id": app_id, "input_text": text, "voice_code": voice,
              "audio_type": "mp3", "response_type": "direct"},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    # response_type=direct trả thẳng link audio trong result.audio_link
    link = (data.get("result") or {}).get("audio_link") or data.get("audio_link")
    if not link:
        raise RuntimeError(f"Vbee không trả link: {json.dumps(data)[:200]}")
    audio = requests.get(link, timeout=60)
    audio.raise_for_status()
    with open(outfile, "wb") as f:
        f.write(audio.content)
    return outfile


def synth(text, engine="auto", voice=""):
    engine = (engine or "auto").lower()
    out = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False).name
    if engine == "auto":
        engine = "vbee" if os.environ.get("VBEE_API") else "gtts"
    if engine == "vbee":
        return tts_vbee(text, out, voice)
    if engine == "say":
        return tts_say(text, out)
    return tts_gtts(text, out)   # gtts mặc định


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass  # im lặng

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"ok": True, "model": MODEL_SIZE})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        try:
            req = json.loads(self.rfile.read(n) or b"{}")
        except Exception as e:
            return self._send(400, {"error": f"bad json: {e}"})
        try:
            if self.path == "/stt":
                text = transcribe(req["path"], req.get("language", "vi"))
                return self._send(200, {"text": text})
            if self.path == "/tts":
                path = synth(req.get("text", ""), req.get("engine", "auto"), req.get("voice", ""))
                return self._send(200, {"path": path})
            return self._send(404, {"error": "not found"})
        except Exception as e:
            return self._send(500, {"error": str(e)})


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"✅ voice-server nghe tại http://127.0.0.1:{PORT}", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹ Tắt voice-server.")
