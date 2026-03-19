import { redis } from "../../config/redis.js";
import { flujoAgregarLocal } from "./ingest/localAdd.js";
import { flujoEditarLocal } from "./edit/localEdit.js";
import { flujoEliminarLocal } from "./delete/localDelete.js";

/**
 * Flujo principal del chat para colaboradores
 * @param {Object} user - Usuario actual
 * @param {string} sessionId - ID de sesión
 * @param {string} message - Mensaje recibido del usuario
 * @param {Array<string>} categories - Categorías del mensaje
 * @returns {Promise<Object>} - Respuesta para el chat
 */
export async function flujoColaborador(user, sessionId, message, categories) {
    const redisKey = `state:${user.user_id}:${sessionId}`;

    if (!user.colaborador) {
        //Si no es colaborador, se deniega la entrada
        await redis.del(redisKey);
        return { 
            reply: "⛔ Acceso denegado. Esta función es exclusiva para colaboradores verificados. Si crees que esto es un error, contacta a la administración." 
        };
    }

    const stateRaw = await redis.get(redisKey);
    const state = stateRaw ? JSON.parse(stateRaw) : null;

    
    // Si no hay flujo activo
    if (!state) {
        return { reply: "No hay un flujo activo. Por favor inicia uno nuevo." };
    }

    // Cancelar operación
    if (message.toLowerCase() === "cancelar") {
        await redis.del(redisKey);
        return { reply: "Operación cancelada ❌" };
    }

    // Enrutamiento según el flujo activo
    switch (state.mode) {
        case "agregar":
            return await flujoAgregarLocal(user, sessionId, message, categories);

        case "editar":
            return await flujoEditarLocal(user, sessionId, message, categories);

        case "eliminar":
            return await flujoEliminarLocal(user, sessionId, message, categories);
        default:
            await redis.del(redisKey);
            return { reply: "Estado desconocido, reiniciando flujo." };
    }
}
