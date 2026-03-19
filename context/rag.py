from fastapi import FastAPI
from pydantic import BaseModel
from langchain_redis import RedisVectorStore
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from dotenv import load_dotenv
import redis
import os

# -------------------------------------------------
# Bootstrap
# -------------------------------------------------
load_dotenv()

REDIS_URL = "redis://redis:6379"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI(title="Context Server")

# -------------------------------------------------
# Models
# -------------------------------------------------
class ContextRequest(BaseModel):
    query: str
    k_per_index: int = 5
    per_doc_limit: int = 1200
    max_chars: int = 6000
    categories: list[str] = []

# -------------------------------------------------
# Shared resources (singleton)
# -------------------------------------------------
redis_client = redis.Redis(
    host="redis",
    port=6379,
    decode_responses=True
)

vectorstore = None
vectorstore_error = None

if OPENAI_API_KEY:
    try:
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=OPENAI_API_KEY
        )

        vectorstore = RedisVectorStore(
            embeddings=embeddings,
            redis_url=REDIS_URL,
            index_name="valdiv_ia"
        )

        llm = ChatOpenAI(
            model="gpt-5-nano",
            api_key=OPENAI_API_KEY
        )
    except Exception as exc:
        vectorstore_error = str(exc)
else:
    vectorstore_error = "OPENAI_API_KEY is not set"

# -------------------------------------------------
# Helpers
# -------------------------------------------------
def build_filter(categories: list[str]):
    if not categories:
        return None
    return {"category": {"$in": categories}}

def build_context(docs, per_doc_limit, max_chars):
    context_parts = []
    chunks = []
    total = 0

    for doc in docs:
        text = doc.page_content[:per_doc_limit]
        if total + len(text) > max_chars:
            break
        context_parts.append(text)
        chunks.append(doc.metadata)
        total += len(text)

    return "\n\n".join(context_parts), chunks

# -------------------------------------------------
# API Endpoint
# -------------------------------------------------
@app.post("/context")
def get_context(req: ContextRequest):
    if vectorstore is None:
        return {
            "context": "",
            "chunks": [],
            "indexes_used": ["valdiv_ia"],
            "total_chars": 0,
            "warning": "Embeddings backend unavailable",
            "details": vectorstore_error,
        }

    retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": req.k_per_index,
            "filter": build_filter(req.categories)
        }
    )

    docs = retriever.invoke(req.query)

    context, chunks = build_context(
        docs,
        req.per_doc_limit,
        req.max_chars
    )

    return {
        "context": context,
        "chunks": chunks,
        "indexes_used": ["valdiv_ia"],
        "total_chars": len(context)
    }
