import os
import requests
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST")
MODEL = os.getenv("MODEL")
PORT = int(os.getenv("PORT", 8089))

app = FastAPI(title="Classifier API")

class Prompt(BaseModel):
    text: str

# -------------------------------------------------------------
#   PROMPTS ESPECIALIZADOS
# -------------------------------------------------------------

SYSTEM_CRUD = """
Eres un clasificador binario.
Determina si el texto del usuario intenta realizar operaciones CRUD
(CREATE, READ, UPDATE, DELETE) sobre información ingresada por un colaborador.

Responde únicamente:
true
false
"""

SYSTEM_INTENT = """
Eres un clasificador de intención.  
Clasifica el mensaje del usuario exclusivamente en una de estas categorías:

- consulta
- agregar
- editar
- eliminar
- otro

Responde con la palabra exacta, sin explicaciones, sin caracreres y sin texto adicional.
"""


# -------------------------------------------------------------
#  ENDPOINT CRUD
# -------------------------------------------------------------
@app.post("/detect")
def detect(prompt: Prompt):
    payload = {
        "model": MODEL,
        "prompt": f"{SYSTEM_CRUD}\n\nUsuario: {prompt.text}\nRespuesta:",
        "stream": False
    }
    r = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload)
    r.raise_for_status()
    out = r.json().get("response", "").strip().lower()
    return {"is_crud": "true" in out}


# -------------------------------------------------------------
#  ENDPOINT CLASIFICACIÓN DE INTENCIÓN
# -------------------------------------------------------------
@app.post("/classify")
def classify(prompt: Prompt):
    payload = {
        "model": MODEL,
        "prompt": f"{SYSTEM_INTENT}\n\nUsuario: {prompt.text}\nRespuesta:",
        "stream": False
    }
    r = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload)
    r.raise_for_status()
    out = r.json().get("response", "").strip().lower()
    return {"intent": out}
