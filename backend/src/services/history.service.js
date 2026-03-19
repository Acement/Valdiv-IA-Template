import chats_db from '../infraestructure/databases/db_chats.js'; // Tu conexión a Mongo
import { ObjectId } from 'mongodb';

export class HistoryService {
  
  async addMessage(userId, { session_id, role, content, metadata }) {
    if (!session_id || !role || !content) {
      throw { status: 400, message: 'Datos incompletos para guardar mensaje' };
    }

    const timestamp = new Date();
    const messageDoc = { session_id, role, content, timestamp };

    // 1. Guardar Mensaje
    await chats_db.collection('messages').insertOne(messageDoc);

    // 2. Actualizar Sesión (Upsert)
    await chats_db.collection('sessions').updateOne(
      { session_id, user_id: userId },
      {
        $setOnInsert: {
          user_id: userId,
          session_id,
          status: 'active',
          metadata: metadata || {},
          created_at: timestamp,
        },
        $set: { updated_at: timestamp },
      },
      { upsert: true }
    );

    return messageDoc;
  }

  async getUserSessions(userId, limit = 50, skip = 0) {
    // Traer sesiones ordenadas
    const sessions = await chats_db.collection('sessions')
      .find({ user_id: userId })
      .sort({ updated_at: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    // Poblar con últimos mensajes (esto es costoso, considera optimizarlo si escala mucho)
    const conversations = await Promise.all(
      sessions.map(async session => {
        const messages = await chats_db.collection('messages')
          .find({ session_id: session.session_id })
          .sort({ timestamp: 1 })
          .limit(50) 
          .toArray();
        return { ...session, messages };
      })
    );

    return conversations;
  }

  async getSessionDetails(userId, sessionId, limit = 50, skip = 0) {
    const session = await chats_db.collection('sessions').findOne({ user_id: userId, session_id: sessionId });
    
    if (!session) throw { status: 404, message: 'Sesión no encontrada' };

    const messages = await chats_db.collection('messages')
      .find({ session_id: sessionId })
      .sort({ timestamp: 1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    return { session: { ...session, messages } };
  }


  async addFeedback(messageId, rating, details = {}) {
    // 1. Validaciones
    if (!messageId) throw { status: 400, message: 'ID del mensaje es requerido' };
    
    // 2. Construir el objeto de feedback
    const feedbackData = {
      rating: rating,
      timestamp: new Date()
    };

    // Si es dislike y trae detalles, los mezclamos en el objeto
    if (rating === 'dislike' && details) {
      feedbackData.reason = details.reason || 'other'; // Ej: 'slow_response'
      feedbackData.comment = details.comment || '';    // Texto opcional
    }

    // 3. Persistencia Atómica
    const result = await chats_db.collection('messages').updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { feedback: feedbackData } }
    );

    if (result.matchedCount === 0) throw { status: 404, message: 'Mensaje no encontrado' };

    return { status: 'success', messageId, ...feedbackData };
  }
}