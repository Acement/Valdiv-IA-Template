// mongo-init/init.js

// Crear usuario administrativo en la base de datos admin de forma idempotente
db = db.getSiblingDB("admin");
if (!db.getUser("postgresadminusers")) {
  db.createUser({
    user: "postgresadminusers",
    pwd: "p0stgr3s4dm1nus3rs.POBLADO",
    roles: [
      { role: "readWrite", db: "chatdb" },
      { role: "dbAdmin", db: "chatdb" }
    ]
  });
}

db = db.getSiblingDB("chatdb");

// ---------------------------------------------------------
// 1. SESSION MANAGEMENT
// ---------------------------------------------------------
db.createCollection("sessions");
// Indexación para recuperación rápida de sesiones por usuario
db.sessions.createIndex({ user_id: 1, updated_at: -1 });

db.sessions.insertOne({
  session_id: "session_12345",
  user_id: "matiasbernoulli@ejemplo.com",
  status: "active",
  metadata: {
    device: "web",
    ip: "192.168.1.1",
    user_agent: "Mozilla/5.0..." // Recomendado para análisis de entorno
  },
  created_at: new Date(),
  updated_at: new Date()
});

// ---------------------------------------------------------
// 2. MESSAGE ARCHITECTURE WITH FEEDBACK LOOP
// ---------------------------------------------------------
db.createCollection("messages");

// INDEXACIÓN ESTRATÉGICA:
// 1. Recuperación del historial del chat (lo que ya tenías).
db.messages.createIndex({ session_id: 1, timestamp: 1 });

// 2. NUEVO: Índice compuesto para análisis de calidad.
// Permite consultar rápidamente: "Dame todas las respuestas 'assistant' con 'like' en el último mes".
db.messages.createIndex({ 
    "role": 1, 
    "feedback.rating": 1, 
    "timestamp": -1 
}, { partialFilterExpression: { "feedback.rating": { $exists: true } } }); 
// El partialFilter reduce el tamaño del índice ignorando mensajes sin feedback.

db.messages.insertMany([
  {
    session_id: "session_12345",
    role: "user",
    content: "Hola, necesito optimizar un algoritmo de grafos.",
    message_id: 1,
    timestamp: new Date("2025-12-15T10:00:00Z")
    // Los mensajes de usuario generalmente no llevan feedback de auto-evaluación
  },
  {
    session_id: "session_12345",
    role: "assistant",
    content: "Para optimizar grafos densos, considera el algoritmo de Floyd-Warshall...",
    message_id: 2,
    timestamp: new Date("2025-12-15T10:00:05Z"),
    // ESTRUCTURA DE FEEDBACK INCORPORADA
    feedback: {
      rating: "like", // ENUM: 'like', 'dislike'
      tags: ["accuracy", "speed"], // Metadatos opcionales para categorización
      timestamp: new Date("2025-12-15T10:05:00Z") // Cuándo dio el feedback
    }
  },
  {
    session_id: "session_12345",
    role: "assistant",
    content: "O podrías usar Dijkstra sin optimización...",
    message_id: 3,
    timestamp: new Date("2025-12-15T10:06:00Z"),
    feedback: {
      rating: "dislike",
      reason: "inefficient_suggestion", // Causa raíz del fallo
      timestamp: new Date("2025-12-15T10:07:00Z")
    }
  }
]);