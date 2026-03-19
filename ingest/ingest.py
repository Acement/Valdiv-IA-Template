from pathlib import Path
from langchain_core.documents import Document
from langchain_redis import RedisVectorStore
from langchain_openai import OpenAIEmbeddings
import redis

from service_txt import parse_service_txt

BASE_PATH = "/app/raw_files"

def load_txt_documents():
    docs = []
    for path in Path(BASE_PATH).rglob("*.txt"):
        text = path.read_text(encoding="utf-8")

        content_metadata = parse_service_txt(text)

        doc = Document(
            page_content=text,
            metadata={
                "categoria": path.parts[-2],
                "fuente": "local",
                "formato": "txt",
                "path": str(path),
                **content_metadata
            }
        )
        docs.append(doc)

    return docs


def main():
    redis_client = redis.Redis(
        host="redis",
        port=6379,
        decode_responses=True
    )

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    docs = load_txt_documents()

    RedisVectorStore.from_documents(
        documents=docs,
        embedding=embeddings,
        redis_client=redis_client,
        index_name="valdiv_ia"
    )

if __name__ == "__main__":
    main()
