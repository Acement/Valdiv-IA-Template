import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ---------- Helpers de logging ----------
const MAX_LOG_CHARS = 1500;
const clip = (s) => (s || '').toString().slice(0, MAX_LOG_CHARS);
const nowMs = () => Date.now();
const mkReqId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const L = (reqId, ...args) => console.log(`[audio ${reqId}]`, ...args);

// 1) Garantizar directorio temporal
const TMP_DIR = path.join(tmpdir(), 'uploads');
fs.mkdirSync(TMP_DIR, { recursive: true });

// 2) Multer a disco con límites y nombres seguros
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file?.originalname || '') || '.webm'; // default típico MediaRecorder
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// 3) Utilidad: spawn promisificado con captura de stdout/stderr
function spawnP(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('error', err => reject(Object.assign(err, { stdout, stderr })));

    child.on('close', code => {
      if (code === 0) resolve({ code, stdout, stderr });
      else reject(Object.assign(new Error(`Command failed: ${cmd} ${args.join(' ')}`), { code, stdout, stderr }));
    });
  });
}

// 4) Conversión a WAV 16 kHz mono con ffmpeg absoluto
const FFMPEG = process.env.FFMPEG_BIN || '/usr/bin/ffmpeg';
async function toWav16kMono(inputPath, reqId) {
  const t0 = nowMs();
  const out = `${inputPath}.wav`;
  const args = ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 'wav', out];

  L(reqId, 'FFMPEG path:', FFMPEG);
  L(reqId, 'FFMPEG args:', args.join(' '));

  const { stderr } = await spawnP(FFMPEG, args, { env: process.env });
  L(reqId, `FFMPEG done in ${nowMs() - t0}ms`);
  if (stderr) L(reqId, 'FFMPEG stderr (clipped):', clip(stderr));

  return out;
}

// 5) Ruta principal
router.post(
  '/',
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'file', maxCount: 1 }]),
  async (req, res) => {
    const reqId = mkReqId();
    const tStart = nowMs();
    L(reqId, '--- Nueva solicitud /audio ---');
    L(reqId, 'Headers:', { 'content-type': req.headers['content-type'] });
    L(reqId, 'Query:', req.query);
    L(reqId, 'Body keys:', Object.keys(req.body || {}));

    try {
      const audioFiles = req.files?.audio || [];
      console.log(audioFiles)
      const fileFiles  = req.files?.file  || [];
      console.log(fileFiles)
      const f = audioFiles[0] || fileFiles[0];
      const tmp = f?.path;
      console.log(tmp)

      L(reqId, 'Archivos recibidos:', {
        audioCount: audioFiles.length,
        fileCount: fileFiles.length,
        chosenField: audioFiles[0] ? 'audio' : (fileFiles[0] ? 'file' : 'none'),
      });

      if (!tmp) {
        L(reqId, 'ERROR: No se encontró archivo en campos "audio" o "file"');
        return res.status(400).json({ error: 'file_missing', detail: "Campo 'audio' o 'file' requerido" });
      }

      try {
        const st = await fs.promises.stat(tmp);
        L(reqId, 'Archivo temporal:', { path: tmp, size: st.size });
      } catch {
        L(reqId, 'Advertencia: No fue posible leer stat del archivo temporal:', tmp);
      }

      // Timer de seguridad (evita colgues infinitos)
      const killAfterMs = Number(process.env.AUDIO_TIMEOUT_MS || 240000); // 4 min
      const timer = setTimeout(() => {
        L(reqId, 'TIMEOUT de seguridad alcanzado (no cancela la respuesta):', { tmp });
      }, killAfterMs);

      let wavPath;
      const tConv0 = nowMs();
      try {
        // 1) Convertir a WAV
        L(reqId, 'Iniciando conversión a WAV 16k mono...');
        wavPath = await toWav16kMono(tmp, reqId);
        L(reqId, `Conversión completada en ${nowMs() - tConv0}ms`, { wavPath });
        try {
          const stW = await fs.promises.stat(wavPath);
          L(reqId, 'WAV generado:', { path: wavPath, size: stW.size });
        } catch {
          L(reqId, 'Advertencia: No fue posible leer stat del WAV:', wavPath);
        }

        // 2) Ejecutar transcripción (Python)
        const PY = process.env.PYTHON_BIN || 'python3';
        const script = path.join(__dirname, 'transcribe.py');
        const lang = process.env.TR_LANG || 'es';
        const args = [script, wavPath, lang];

        L(reqId, 'Ejecutando Python transcriptor...', { PY, script, args });

        const tPy0 = nowMs();
        const { stdout, stderr } = await spawnP(PY, args, { env: process.env });
        L(reqId, `Transcriptor Python OK en ${nowMs() - tPy0}ms`);
        if (stderr) L(reqId, 'Python stderr (clipped):', clip(stderr));
        if (stdout) L(reqId, 'Python stdout (clipped):', clip(stdout));

        // 3) Intentar parsear JSON de salida
        let payload;
        try {
          payload = JSON.parse(stdout);
        } catch (e) {
          L(reqId, 'ERROR: Salida no JSON desde transcriptor. stdout/stderr clipped arriba.');
          clearTimeout(timer);
          return res.status(500).json({ error: 'invalid_transcriber_output' });
        }

        clearTimeout(timer);
        L(reqId, 'Respuesta OK. Tiempo total:', `${nowMs() - tStart}ms`);
        return res.json(payload); // { text, segments, lang, ... }
      } catch (err) {
        clearTimeout(timer);
        L(reqId, 'AUDIO ERROR (catch principal):', {
          message: err?.message,
          code: err?.code,
          stdout: clip(err?.stdout),
          stderr: clip(err?.stderr),
        });
        return res.status(500).json({ error: 'audio_processing_failed', detail: err?.message });
      } finally {
        // Limpieza en background
        Promise.allSettled([
          (f?.path) && fs.promises.rm(f.path, { force: true }).then(() => L(reqId, 'Archivo temporal eliminado:', f.path))
            .catch(e => L(reqId, 'No se pudo eliminar temp:', f.path, e?.message)),
          (wavPath) && fs.promises.rm(wavPath, { force: true }).then(() => L(reqId, 'WAV eliminado:', wavPath))
            .catch(e => L(reqId, 'No se pudo eliminar WAV:', wavPath, e?.message)),
        ]).catch(() => {});
      }
    } catch (outerErr) {
      L('fatal', 'FALLO NO CONTROLADO EN /audio:', {
        message: outerErr?.message,
        stack: outerErr?.stack,
      });
      return res.status(500).json({ error: 'audio_route_crash', detail: outerErr?.message });
    }
  }
);

export default router;
