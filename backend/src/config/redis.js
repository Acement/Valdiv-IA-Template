import Redis from "ioredis";

// Configuración centralizada. Si falla, falla aquí, no en medio de un request.
export const redis = new Redis({
  host: process.env.REDIS_HOST || "redis" 
});

redis.on('error', (err) => console.error('[Redis Error]', err));