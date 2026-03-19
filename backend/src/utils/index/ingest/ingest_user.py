import os
import redis
import uuid
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_core.documents import Document
from langchain_redis import RedisVectorStore
from langchain_openai import OpenAIEmbeddings

# -----------------------------
# Configuración
# -----------------------------
load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
API_KEY = os.getenv("OPENAI_API_KEY")
INDEX_NAME = "valdiv_ia"

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

vectorstore = None
vectorstore_error = None

if API_KEY:
    try:
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=API_KEY)

        # 🛠️ IMPORTANTE: Asegúrate que el esquema sea consistente
        vectorstore = RedisVectorStore(
            embeddings=embeddings,
            redis_client=redis_client,
            index_name=INDEX_NAME
        )
    except Exception as exc:
        vectorstore_error = str(exc)
else:
    vectorstore_error = "OPENAI_API_KEY is not set"

app = FastAPI(title="Ingest User Service")

class UserIngestRequest(BaseModel):
    content: str
    categoria: str | None = "local_usuario"
    user_id: str | None = None
    fuente: str | None = "colaborador"
    formato: str | None = "chat"
    extra_metadata: dict | None = None

def ingest_user_info(
    content: str,
    categoria: str = "local_usuario",
    user_id: str | None = None,
    fuente: str = "usuario",
    formato: str = "chat",
    extra_metadata: dict | None = None,
):
    if vectorstore is None:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Embeddings backend unavailable",
                "error": vectorstore_error,
            },
        )

    if not content.strip():
        raise HTTPException(status_code=400, detail="Contenido vacío")

    # 1. Generamos un ID único NOSOTROS (no dejamos que LangChain invente uno)
    doc_id = str(uuid.uuid4())
    
    timestamp = datetime.now(timezone.utc).isoformat()
    clean_user_id = str(user_id).strip() if user_id else ""

    info_data = {
        "id": doc_id,
        "content": content.strip(),
        "category": categoria, 
        "fuente": fuente,
        "formato": formato,
        "user_id": clean_user_id,
        "created_at": timestamp,
        "updated_at": timestamp,
    }

    if extra_metadata:
        for k, v in extra_metadata.items():
            info_data[k] = json.dumps(v) if isinstance(v, (dict, list)) else str(v)

    # 2. Guardamos la "Ficha de Lectura" para Node.js (Listado visual)
    # Llave: info:user:{UUID}
    info_key = f"info:user:{doc_id}"
    redis_client.hset(info_key, mapping=info_data)

    # 3. Guardamos el "Vector" para el RAG
    doc = Document(page_content=content.strip(), metadata=info_data)
    
    # 🔥 EL CAMBIO MÁGICO 🔥
    # Le decimos a LangChain: "Usa este ID, no inventes otro".
    # LangChain por defecto le agregará un prefijo (usualmente "doc:")
    # Resultado final en Redis: "doc:{UUID}"
    vectorstore.add_documents([doc], ids=[doc_id])

    return doc_id

@app.post("/ingest/user")
def ingest_user(req: UserIngestRequest):
    doc_id = ingest_user_info(
        content=req.content,
        categoria=req.categoria or "local_usuario",
        user_id=req.user_id,
        fuente=req.fuente,
        formato=req.formato or "chat",
        extra_metadata=req.extra_metadata
    )
    return {"status": "ok", "doc_id": doc_id}