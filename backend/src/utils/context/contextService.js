import axios from 'axios';

const CONTEXT_URL = process.env.CONTEXT_URL || 'http://context-server:8001/context';
const TIMEOUT_MS = parseInt(process.env.CONTEXT_TIMEOUT_MS || '30000', 10);

export async function fetchContext(query, opts = {}) {
  const payload = {
    query,
    k_per_index: opts.k_per_index ?? 5,
    max_total: opts.max_total ?? 10,
    per_doc_limit: opts.per_doc_limit ?? 1200,
    max_chars: opts.max_chars ?? 6000,
  };
  const res = await axios.post(CONTEXT_URL, payload, { timeout: TIMEOUT_MS });
  console.log("✅ Respuesta de Context API:", res.data);
  return res.data; // { context, chunks, indexes_used, total_chars }
}