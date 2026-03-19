FROM python:3.11-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos
COPY backend/src/utils/index/ingest/ingest_user.py /app/ingest_user.py

# Instalar dependencias de Python
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    redis \
    langchain \
    langchain-openai \
    langchain-redis \
    langchain-text-splitters \
    openai \
    tiktoken \
    python-dotenv

# Exponer puerto
EXPOSE 8010

# Comando para iniciar FastAPI
CMD ["uvicorn", "ingest_user:app", "--host", "0.0.0.0", "--port", "8010"]
