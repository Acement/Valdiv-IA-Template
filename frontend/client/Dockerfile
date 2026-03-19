# Build + serve en un solo stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Construcción del proyecto
RUN npm run build

EXPOSE 3005

# Vite preview server
CMD ["npm", "run", "preview", "--", "--host", "--port", "3005"]