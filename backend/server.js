import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './src/routes.js';
import { errorHandler } from './src/error_handler.js';

const app = express();

// Middlewares básicos
app.use(cors({ origin: true }));
app.use(express.json());

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? 'development' });
});

app.use('/api', router);

// 404 para rutas no existentes (middleware normal: 3 args)
app.use((req, res, _next) => {
  res.status(404).json({ status: 'error', error: `No encontrado: ${req.method} ${req.originalUrl}` });
});

// Manejador de errores CENTRAL (SIEMPRE al final y único)
app.use(errorHandler);

const PORT = process.env.PORT_BACKEND;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

export default app;
