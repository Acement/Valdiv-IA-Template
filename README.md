# 🧠 Valdiv-IA — DevOps README

## 1. Visión general

**Valdiv-IA** es una plataforma de inteligencia artificial conversacional orientada a la ciudad de **Valdivia, Chile**, desplegada como un **sistema distribuido basado en Docker Compose**.

El proyecto integra frontend web, backend API, servicios de contexto (RAG), detección semántica, persistencia de datos, cache vectorial, ejecución de LLMs locales y un bot de WhatsApp como canal conversacional.

Arquitectura **modular, reproducible y orientada a microservicios**.

---

## 2. Arquitectura y servicios

| Servicio | Tecnología | Puerto | Rol |
|--------|------------|--------|-----|
| Frontend | React + Vite | 3005 | Cliente web |
| Backend | Node.js + Express | 4005 | API principal |
| Context Server | FastAPI + LangChain | 8001 | RAG / embeddings |
| CRUD Detector API | FastAPI | 8089 | Detección semántica |
| Ingest User | FastAPI | 8010 | Indexación de datos |
| MongoDB | Mongo 4.4 | 27017 | Datos no estructurados |
| PostgreSQL | Postgres 15 | 5432 | Persistencia relacional |
| Redis Stack | Redis + UI | 6379 / 8002 | Cache + vectores |
| Ollama | LLM Runtime | 11434 | Modelos locales |
| WhatsApp Bot | Node.js + wwebjs | — | Canal conversacional |

---

## 3. Requisitos del sistema

| Herramienta | Versión mínima |
|------------|----------------|
| Docker Engine | Latest |
| Docker Compose (v2) | Latest |
| Git | ≥ 2.x |
| CPU | x86_64 |
| RAM | ≥ 16 GB |
| Disco | ≥ 15 GB libres |

> ⚠️ **Nota:** El uso de Ollama y modelos LLM locales requiere recursos reales. Con menos RAM el sistema puede arrancar, pero el rendimiento se degrada.

---

## 4. Clonación del repositorio

```bash
git clone https://github.com/Valdiv-IA-UACH/Valdiv-IA
cd Valdiv-IA
```
## 5. Levantamiento del stack principal
Antes de levantar cualquier contenedor, **es obligatorio configurar los archivos de entorno**.  
Todos los archivos `.env.example` deben ser **renombrados a `.env`** y sus variables ajustadas según el entorno local.

> ⚠️ **Crítico:** Es indispensable definir una clave válida de OpenAI en la variable `OPENAI_API_KEY`.  
> Sin esta variable, los servicios de embeddings, RAG e ingestión **no funcionarán**.

### 5.0 Archivos a configurar

Renombrar los siguientes archivos:

```bash
mv ./backend/.env.example ./backend/.env
mv ./databases/historial/.env.example ./databases/historial/.env
mv ./frontend/client/.env.example ./frontend/client/.env
mv ./whatsapp/.env.example ./whatsapp/.env
mv ./crud-detector/.env.example ./crud-detector/.env
mv ./ingest/.env.example ./ingest/.env
mv ./.env.example ./.env
mv ./ingest/.env.example ./backend/src/utils/index/ingest/.env
```

Ejemplo general:

```bash
mv .env.example .env
```

En particular, verificar que exista y esté definida la variable:

OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

### 5.1 Build y ejecución inicial

```bash
docker network create red_taller_software
docker compose up -d --build
```

Este comando:

- Construye todas las imágenes propias
- Descarga imágenes oficiales
- Crea volúmenes persistentes
- Levanta todos los servicios core

### 5.2 Verificación de contenedores
```bash
docker ps
```
Salida esperada (resumen):

| valdiv-ia-frontend | Up | 0.0.0.0:3005->3005 |
| valdiv-ia-backend | Up | 0.0.0.0:4005->4005 |
| valdiv-ia-context-server | Up | 0.0.0.0:8001->8001 |
| valdiv-ia-ingest_user | Up | 0.0.0.0:8010->8010 |
| valdiv-ia-crud-detector-api | Up | 0.0.0.0:8089->8089 |
| mongo | Up | 27017 |
| postgres | Up | 5432 |
| redis-stack | Up | 6379 / 8002 |
| ollama | Up | 11434 |

## 6. Inicialización manual obligatoria (one-time setup)
### 6.1 Ingesta de datos y embeddings

Este paso es obligatorio para habilitar RAG y búsquedas semánticas.

```bash
docker compose --profile manual up -d ingest_redis
docker exec -it grupo5_valdiv-ia_ingest /bin/bash
```

Dentro del contenedor:

```bash
python3 ingest.py
```

Salida esperada:

HTTP/1.1 200 OK
Index already exists, not overwriting.

### 6.2 Descarga del modelo LLM (Ollama)
```bash
docker exec -it grupo5_valdiv-ia_crud_detector /bin/bash
ollama pull llama3.2
exit
```

## 8. Bot de WhatsApp
### 8.1 Levantar el servicio
```bash
cd whatsapp
docker compose up -d --build
```

### 8.2 Autenticación vía QR
```bash
docker logs grupo5_valdiv-ia_whatsapp
```

Se mostrará un QR en consola

Escanear con la app móvil de WhatsApp

Una vez autenticado, el bot queda operativo de forma continua.

## 9. Apagado del sistema

Desde cada stack:

```bash
docker compose down -v
```

Este comando:

- Detiene todos los contenedores
- Elimina volúmenes temporales
- Mantiene las imágenes construidas

## 10. Optimización de prueba

Se dejo de lado los siguientes contenedores para probar el despliegue más rápido

```bash
  crud-detector:
    image: ollama/ollama:latest
    container_name: ${GROUP}_${PROJECT}_crud_detector
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama
    networks:
      - red_taller_software
    restart: always
    labels:
      - "org.uach.group=${GROUP}"
      - "org.uach.project=${PROJECT}"
      - "org.uach.service=crud-detector"
      - "logging=promtail"

  crud-detector-api:
    build: ./crud-detector
    container_name: ${GROUP}_${PROJECT}_crud_detector_api
    ports:
      - "8089:8089"
    env_file:
      - ./crud-detector/.env
    depends_on:
      - crud-detector
    networks:
      - red_taller_software
    restart: always
    labels:
      - "org.uach.group=${GROUP}"
      - "org.uach.project=${PROJECT}"
      - "org.uach.service=crud-detector-api"
      - "logging=promtail"
```