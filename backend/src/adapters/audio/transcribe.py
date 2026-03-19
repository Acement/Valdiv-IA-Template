import sys, json
from faster_whisper import WhisperModel

# Uso: python transcribe.py /ruta/audio.wav es
if len(sys.argv) < 2:
    print(json.dumps({"error": "Missing audio path"}))
    sys.exit(1)

audio_path = sys.argv[1]
lang = sys.argv[2] if len(sys.argv) > 2 else None

# Modelos: tiny, base, small, medium, large-v3 (más grande = más preciso, más lento).
# Para CPU común: "small" o "base" va bien. Para GPU, "medium" o "large-v3".
model_name = "base"

# Si esta GPU (CUDA) instalada y wheels compatibles, device="cuda".
# model = WhisperModel(model_name, device="cuda", compute_type="float16")
model = WhisperModel(model_name, device="cpu", compute_type="int8")

segments, info = model.transcribe(
    audio_path,
    language=lang,        # 'es' fuerza español; si None, detecta idioma
    beam_size=5,
    vad_filter=True,      # ayuda a reducir silencios
)

out_text = []
out_segments = []
for seg in segments:
    out_text.append(seg.text)
    out_segments.append({
        "start": seg.start,
        "end": seg.end,
        "text": seg.text
    })

payload = {
    "text": " ".join(out_text).strip(),
    "segments": out_segments,
    "lang": info.language
}
print(json.dumps(payload, ensure_ascii=False))
