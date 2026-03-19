import { redis } from "../../../config/redis.js";

/**
 * Flujo para eliminar locales sincronizados (info:user:ID <-> doc:ID)
 */
export async function flujoEliminarLocal(user, sessionId, message) {
    const redisKey = `state:${user.user_id}:${sessionId}`;
    const INDEX_NAME = "valdiv_ia"; // Debe coincidir con Python

    const stateRaw = await redis.get(redisKey);
    let state = stateRaw ? JSON.parse(stateRaw) : {}; 

    if (!state.step) {
        state.step = "awaiting_list_display";
    }

    // ------------------------------------------------------------------
    // 🔹 PASO 1: Listar lo que ve el usuario (info:user:*)
    // ------------------------------------------------------------------
    if (state.step === "awaiting_list_display") {
        const userIdStr = String(user.user_id).trim();
        const keys = await redis.keys("info:user:*");
        
        const items = [];

        for (const key of keys) {
            const data = await redis.hgetall(key);
            
            if (data.user_id && String(data.user_id).trim() === userIdStr) {
                let name = "Local sin nombre";
                if (data.content) {
                    const match = data.content.match(/Nombre:\s*(.+)/i);
                    name = match ? match[1].trim().replace(/["]/g, '') : data.content.substring(0, 30);
                }
                
                // key viene como: "info:user:aaaaaaaa-bbbb-cccc-dddd"
                // Extraemos solo el UUID
                const parts = key.split(':');
                const uuid = parts.length >= 3 ? parts[2] : null;

                // LangChain (langchain-redis) usa por defecto el prefijo "doc:"
                const calculatedRagKey = uuid ? `doc:${uuid}` : null;

                items.push({ 
                    manualKey: key,         // La llave de Node
                    ragKey: calculatedRagKey, // La llave calculada del RAG
                    name: name 
                });
            }
        }

        if (items.length === 0) {
            await redis.del(redisKey);
            return { reply: "No encontré locales registrados en tu cuenta." };
        }

        state.step = "confirm_name";
        state.items = items;
        await redis.set(redisKey, JSON.stringify(state));

        let text = "⚠️ **MODO ELIMINAR** ⚠️\nAquí están tus locales:\n\n";
        items.forEach((it, idx) => {
            text += `${idx + 1}. ${it.name}\n`;
        });
        text += `\nEscribe el **NÚMERO** o el **NOMBRE** a eliminar.\n(O escribe "cancelar")`;

        return { reply: text };
    }

    // ------------------------------------------------------------------
    // 🔹 PASO 2: Borrado Quirúrgico
    // ------------------------------------------------------------------
    if (state.step === "confirm_name") {
        const input = message.trim().toLowerCase();
        
        if (input === "cancelar" || input === "salir") {
            await redis.del(redisKey);
            return { reply: "Operación cancelada." };
        }
        
        let selected = null;
        const index = parseInt(input, 10);
        if (!isNaN(index) && index >= 1 && index <= state.items.length) {
            selected = state.items[index - 1];
        } else {
            selected = state.items.find(it => it.name.toLowerCase().includes(input));
        }

        if (!selected) {
            return { reply: `No encontré ese local. Indica el número.` };
        }

        try {
            console.log(`Eliminando local: ${selected.name}`);
            console.log(`keys: [${selected.manualKey}] y [${selected.ragKey}]`);

            // 1. Borrar la llave del RAG (Vector)
            if (selected.ragKey) {
                // Borrado del índice (DD = Delete Document)
                try {
                    await redis.call("FT.DEL", INDEX_NAME, selected.ragKey, "DD");
                } catch (e) {
                    console.log("FT.DEL aviso (quizás no indexado):", e.message);
                }
                // Borrado físico
                await redis.del(selected.ragKey);
            }

            // 2. Borrar la llave de Node (Visual)
            await redis.del(selected.manualKey);
            
            await redis.del(redisKey); 

            return {
                reply: `🗑️ **Eliminado:** El local **"${selected.name}"** ha sido borrado correctamente. Ya no aparecerá en las búsquedas.`
            };

        } catch (e) {
            console.error("Error al eliminar:", e);
            return { reply: "Error técnico al borrar. Intenta de nuevo." };
        }
    }

    await redis.del(redisKey);
    return { reply: "Estado inválido." };
}