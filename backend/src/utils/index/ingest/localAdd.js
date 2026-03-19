// src/utils/localIngest.js
import { redis } from "../../../config/redis.js";
import { ingestUserInfo } from "./ingestRequest.js";

/**
 * Flujo de ingesta de información de locales
 * @param {Object} user - Usuario actual
 * @param {string} sessionId - ID de sesión
 * @param {string} message - Mensaje recibido del usuario
 * @param {Array<string>} categories - Categorías para clasificar el local
 * @returns {Promise<Object>} - Objeto con respuesta para el chat
 */
export async function flujoAgregarLocal(user, sessionId, message, categories) {
    const redisKey = `state:${user.user_id}:${sessionId}`;
    const stateRaw = await redis.get(redisKey);
    const state = stateRaw ? JSON.parse(stateRaw) : null;

    // Seguridad: si no hay estado o no es modo "agregar"
    if (!state || state.mode !== "agregar") {
        await redis.del(redisKey);
        return { reply: "Estado inválido, reiniciando flujo." };
    }

    // Cancelar flujo
    if (message.toLowerCase() === "cancelar") {
        await redis.del(redisKey);
        return { reply: "Operación cancelada ❌" };
    }

    switch (state.step) {

        case "nombre":
            state.data.nombre = message;
            state.step = "direccion";
            await redis.set(redisKey, JSON.stringify(state));
            return { reply: `¡Excelente! 😊 ahora cuéntame, ¿dónde está ubicado tu local? 📌` };

        case "direccion":
            state.data.direccion = message;
            state.step = "horarios";
            await redis.set(redisKey, JSON.stringify(state));
            return { reply: `¡Perfecto! 😊 Ahora dime, ¿cuáles son los horarios en los que atiende tu local? 🕜` };

        case "horarios":
            state.data.horarios = message;
            state.step = "telefono";
            await redis.set(redisKey, JSON.stringify(state));
            return { reply: `Anotado 🧐 ¿Tienes algún número de teléfono de contacto? (Si no tienes, envía "-")` };

        case "telefono":
            state.data.telefono = message;
            state.step = "web";
            await redis.set(redisKey, JSON.stringify(state));
            return { reply: `¡Bien! Ya queda poco... ¿Tienes algún sitio web? (Si no tienes, envía "-")` };

        case "web":
            state.data.web = message;
            state.step = "extra";
            await redis.set(redisKey, JSON.stringify(state));
            return { reply: `Por último... ¿Hay alguna información extra que desees añadir? 🤔 (Ej: vegano, pet friendly, etc.)` };

        case "extra":
            state.data.extra = message;
            state.step = "confirmacion";
            await redis.set(redisKey, JSON.stringify(state));
            return {
                reply: `
¿Confirmas que la información está correcta?

Nombre: ${state.data.nombre}
Dirección: ${state.data.direccion}
Horarios: ${state.data.horarios}
Teléfono: ${state.data.telefono}
Web: ${state.data.web}
Información extra: ${state.data.extra}

Responde "sí" para confirmar o "no" para cancelar.
                `
            };

        case "confirmacion": {
            const normalized = message.toLowerCase();

            if (normalized.includes("sí") || normalized.includes("si")) {
                await ingestUserInfo({
                    user_id: String(user.user_id),
                    content: `
Nombre: ${state.data.nombre}
Dirección: ${state.data.direccion}
Horarios: ${state.data.horarios}
Teléfono: ${state.data.telefono}
Web: ${state.data.web}
Información extra: ${state.data.extra}
                    `,
                    metadata: {
                        categoria: categories?.[0] ?? "local_usuario",
                        fuente: "usuario",
                        formato: "chat",
                        extra_metadata: {
                            origen: "chat_web"
                        }                    }
                });
                await redis.del(redisKey);
                return { reply: "Información agregada correctamente ✅" };
            }

            if (normalized.includes("no")) {
                await redis.del(redisKey);
                return { reply: "Perfecto, no se guardó la información 👍" };
            }

            return { reply: "Por favor responde 'sí' o 'no' para confirmar la operación." };
        }

        default:
            await redis.del(redisKey);
            return { reply: "Flujo desconocido. Reiniciando." };
    }
}
