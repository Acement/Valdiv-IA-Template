import os
import json
import re
import unicodedata
import numpy as np
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from redis import Redis
from redis.commands.search.query import Query
from langchain_openai import OpenAIEmbeddings

# ----------------------- CONFIGURACIÓN -----------------------
load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-large")
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "*").split(",")

# Campos en el índice de RediSearch (Ajustar según tu esquema real)
VECTOR_FIELD = "content_vector" # O el nombre que tenga tu campo vectorial
TEXT_FIELD = "content"          # O "text", según como guardaste los datos
SOURCE_FIELD = "fuente"
CATEGORIES_FIELD = "categories"

if not API_KEY:
    raise ValueError("FATAL: OPENAI_API_KEY no está configurada.")

# ----------------------- CLIENTES GLOBALES -----------------------
# Instanciamos una sola vez para reutilizar conexiones (Connection Pool)
redis_client = Redis.from_url(REDIS_URL, decode_responses=False) # False para manejar el BLOB del vector
embeddings_model = OpenAIEmbeddings(model=EMBED_MODEL, api_key=API_KEY)

app = FastAPI(title="Valdiv-IA Context Service", version="2.0 (Optimized)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------- MODELOS -----------------------
class ContextReq(BaseModel):
    query: str
    k_per_index: int = 5
    max_total: int = 10
    per_doc_limit: int = 1200
    max_chars: int = 6000
    categories: List[str] = []

class ContextChunk(BaseModel):
    index: str
    score: float
    source: str
    preview: str

class ContextResp(BaseModel):
    context: str
    chunks: List[ContextChunk]
    indexes_used: List[str]
    total_chars: int
    sources: List[str] = []

# ----------------------- UTILIDADES -----------------------
def clean_text(s: str) -> str:
    if not s: return ""
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"\s+", " ", s).strip()

def slugify(s: str) -> str:
    """Normaliza categorías para coincidir con lo guardado en Redis (TAG field)"""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()

def get_redis_indexes() -> List[str]:
    """Obtiene lista de índices disponibles en Redis."""
    try:
        # FT._LIST devuelve bytes, decodificamos
        raw_idxs = redis_client.execute_command("FT._LIST")
        return [idx.decode('utf-8') for idx in raw_idxs]
    except Exception as e:
        print(f"[Redis Error] Listar índices: {e}")
        return []

# ----------------------- ENDPOINT PRINCIPAL -----------------------

@app.get("/health")
def health():
    try:
        redis_client.ping()
        indexes = get_redis_indexes()
        return {"status": "ok", "redis": "connected", "indexes": indexes}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

@app.post("/context", response_model=ContextResp)
async def get_context(req: ContextReq):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query vacío")

    # 1. Generar Embedding (Una sola vez)
    try:
        query_vector = embeddings_model.embed_query(req.query)
        # Convertir a bytes para Redis
        query_blob = np.array(query_vector, dtype=np.float32).tobytes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando embeddings: {e}")

    # 2. Preparar Filtro de Categorías
    filter_expression = "*" # Default: todo
    if req.categories and "Todo" not in req.categories:
        slugs = [slugify(c) for c in req.categories if c.strip()]
        if slugs:
            # Sintaxis RediSearch TAG: @campo:{tag1|tag2}
            filter_expression = f"@{CATEGORIES_FIELD}:{{{'|'.join(slugs)}}}"

    # 3. Preparar Query RediSearch (KNN)
    # Sintaxis: <Filtro>=>[KNN <k> @vector $blob AS score]
    # Retornamos campos específicos para ahorrar ancho de banda
    base_query = (
        f"({filter_expression})=>[KNN {req.k_per_index} @{VECTOR_FIELD} $blob AS vector_score]"
    )
    
    indexes = get_redis_indexes()
    if not indexes:
        return ContextResp(context="", chunks=[], indexes_used=[], total_chars=0)

    raw_results = []

    # 4. Ejecutar búsqueda en todos los índices
    # NOTA: Idealmente deberías saber en qué índice buscar, pero mantenemos tu lógica de "buscar en todos"
    for idx_name in indexes:
        try:
            q = Query(base_query)\
                .sort_by("vector_score")\
                .paging(0, req.k_per_index)\
                .return_fields(TEXT_FIELD, SOURCE_FIELD, "vector_score")\
                .dialect(2)

            res = redis_client.ft(idx_name).search(q, query_params={"blob": query_blob})

            for doc in res.docs:
                # Redis devuelve strings o bytes. ft().search suele decodificar si el cliente tiene decode_responses=True,
                # pero como lo pusimos en False (para el vector), decodificamos manual.
                
                text_val = doc.content if hasattr(doc, 'content') else doc.json
                # Ajuste: el nombre del campo en .return_fields define la propiedad en doc
                # Si pedimos TEXT_FIELD ("text" o "content"), vendrá en esa propiedad.
                # Como fallback usamos getattr dinámico.
                
                body_text = getattr(doc, TEXT_FIELD, "") or getattr(doc, "text", "") or ""
                source_val = getattr(doc, SOURCE_FIELD, "desconocido")
                score_val = getattr(doc, "vector_score", "1") # 1 es mala score

                # Decodificar si vienen en bytes
                if isinstance(body_text, bytes): body_text = body_text.decode('utf-8', errors='ignore')
                if isinstance(source_val, bytes): source_val = source_val.decode('utf-8', errors='ignore')

                raw_results.append({
                    "index": idx_name,
                    "score": float(score_val),
                    "text": body_text,
                    "source": source_val
                })

        except Exception as e:
            # Ignoramos errores de índices individuales (ej. índice sin vector field)
            # print(f"Skip index {idx_name}: {e}")
            continue

    # 5. Procesar y Formatear Resultados
    if not raw_results:
        return ContextResp(context="", chunks=[], indexes_used=indexes, total_chars=0)

    # Ordenar globalmente por score (menor distancia = mayor similitud)
    raw_results.sort(key=lambda x: x["score"])

    final_chunks = []
    context_parts = []
    current_chars = 0

    for item in raw_results[:req.max_total]:
        text_clean = clean_text(item["text"])[:req.per_doc_limit]
        if not text_clean: continue

        formatted_block = f"[FUENTE: {item['source']}]\n{text_clean}\n"
        
        if current_chars + len(formatted_block) > req.max_chars:
            break

        context_parts.append(formatted_block)
        current_chars += len(formatted_block)
        
        final_chunks.append(ContextChunk(
            index=item["index"],
            score=item["score"],
            source=item["source"],
            preview=text_clean[:100] + "..." # Preview corto para debug
        ))

    full_context = "\n---\n".join(context_parts)
    
    sources = []

    for ch in final_chunks:
        if ch.source not in sources:
            sources.append(ch.source)

    return ContextResp(
        context=full_context,
        chunks=final_chunks,
        indexes_used=indexes,
        total_chars=current_chars,
        sources=sources,
    )
