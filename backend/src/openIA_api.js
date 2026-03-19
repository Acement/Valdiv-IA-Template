import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';
import { HttpError } from "../shared/http_errors.js";
import { ErrorCode } from "../shared/errors.js";

dotenv.config({ path: path.resolve('../.env') });
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-5-nano'; // cambia aqui si usas otro
const TIMEOUT_MS = process.env.TIMEOUT_MS; // 20s

export async function askChatGPT(messages, { temperature = 1 } = {}) {
    // modo mock para desarrollo sin gastar tokens
  if (process.env.MOCK === 'true') {
    const last = messages.at(-1)?.content || '';
    return `Recibí: "${last}". Ok en modo prueba.`;
  }
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try{
  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: MODEL, messages, temperature })
  });
    if (!resp.ok) {
      // 429/503 → indisponible/limitado; 5xx → upstream error
      const status = resp.status;
      if (status === 429 || status === 503) {
        throw new HttpError(status, ErrorCode.OPENAI_UNAVAILABLE, `OpenAI no disponible (HTTP ${status})`);
      }
      throw new HttpError(status, ErrorCode.UPSTREAM_ERROR, `Fallo al consultar OpenAI (HTTP ${status})`);
    }

    const data = await resp.json().catch(() => null);
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      throw new HttpError(502, ErrorCode.OPENAI_BAD_RESPONSE, "OpenAI devolvió una respuesta inválida");
    }
    return reply;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new HttpError(504, ErrorCode.OPENAI_TIMEOUT, "Timeout al consultar el modelo");
    }
    // Errores de red (ECONNREFUSED, ENOTFOUND, etc.)
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.type === "system") {
      throw new HttpError(503, ErrorCode.NETWORK_ERROR, "No se pudo conectar con el servicio");
    }
    if (err instanceof HttpError) throw err;
    // Cualquier otro
    throw new HttpError(502, ErrorCode.UPSTREAM_ERROR, err.message);
  } finally {
    clearTimeout(timer);
  }
}
