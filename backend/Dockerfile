FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y ffmpeg python3 python3-venv python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev
COPY . .

RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir faster-whisper

ENV PATH="/opt/venv/bin:$PATH"

EXPOSE 4005
CMD ["npm", "run", "start"]
