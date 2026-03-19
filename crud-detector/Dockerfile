FROM python:3.11-slim

WORKDIR /app

# Variable de entorno
ENV MODEL=llama3.2

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8089

# Script de arranque
CMD bash -c "uvicorn app:app --host 0.0.0.0 --port 8089"
