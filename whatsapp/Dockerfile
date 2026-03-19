FROM node:20-slim

WORKDIR /app

# Instalar Chromium + dependencias mínimas
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libnss3 \
    libxss1 \
    libxtst6 \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Copiar dependencias
COPY package*.json ./
RUN npm install --omit=dev
RUN npm install

# Copiar código
COPY . .

RUN useradd -m botuser
RUN mkdir -p /app/.wwebjs_auth && chown -R botuser:botuser /app
USER botuser

# Variables de entorno para Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["npm", "start"]