import { redis } from "../../../config/redis.js";
import { ingestUserInfo } from "../ingest/ingestRequest.js";

export async function flujoEditarLocal(user, sessionId, message, categories) {
    const redisKey = `state:${user.user_id}:${sessionId}`;
    
    const stateRaw = await redis.get(redisKey);
    let state = stateRaw ? JSON.parse(stateRaw) : null;

    if (!state || state.mode !== "editar") {
        await redis.del(redisKey);
        return { reply: "Estado inválido. Reiniciando." };
    }

    if (message.toLowerCase() === "cancelar") {
        await redis.del(redisKey);
        return { reply: "Edición cancelada. Tus locales siguen igual. 👍" };
    }

    switch (state.step) {
        
        case "seleccionar_local":
            const keys = await redis.keys("info:user:*");
            const userLocales = []; // Array para almacenar los locales del usuario
            
            // 1. Recorrer Redis y filtrar solo los locales del usuario, almacenándolos
            for (const key of keys) {
                const data = await redis.hgetall(key);
                // Asegúrate de que el user_id coincida
                if (String(data.user_id).trim() === String(user.user_id).trim()) {
                    userLocales.push({ data, key });
                }
            }

            let localEncontrado = null;
            let keyEncontrada = null;
            
            // 2. Intentar buscar por ÍNDICE NUMÉRICO (el 1, 2, 3 de la lista)
            const inputNumber = parseInt(message.trim());
            
            if (!isNaN(inputNumber) && inputNumber >= 1 && inputNumber <= userLocales.length) {
                // Si es un número válido dentro del rango
                const index = inputNumber - 1; // Ajuste de índice (1 -> 0, 2 -> 1, etc.)
                localEncontrado = userLocales[index].data;
                keyEncontrada = userLocales[index].key;
            } 
            
            // 3. Si no se encontró por número, intentar buscar por NOMBRE
            if (!localEncontrado) {
                for (const local of userLocales) {
                    // Extraer el nombre del contenido del hash de Redis
                    const matchNombre = local.data.content.match(/Nombre:\s*(.*)/i);
                    const nombreLocal = matchNombre ? matchNombre[1].trim() : "";
                    
                    // Búsqueda por coincidencia de nombre
                    if (nombreLocal.toLowerCase().includes(message.toLowerCase())) {
                        localEncontrado = local.data;
                        keyEncontrada = local.key;
                        break; 
                    }
                }
            }

            if (!localEncontrado) {
                return { reply: `No encontré ningún local con el nombre o número "${message}". Por favor escríbelo tal cual aparece en la lista o escribe "cancelar".` };
            }

            // Continuar con la edición si se encontró el local
            const currentData = {
                nombre: (localEncontrado.content.match(/Nombre:\s*(.*)/i) || [])[1] || "",
                direccion: (localEncontrado.content.match(/Dirección:\s*(.*)/i) || [])[1] || "",
                horarios: (localEncontrado.content.match(/Horarios:\s*(.*)/i) || [])[1] || "",
                telefono: (localEncontrado.content.match(/Teléfono:\s*(.*)/i) || [])[1] || "",
                web: (localEncontrado.content.match(/Web:\s*(.*)/i) || [])[1] || "",
                extra: (localEncontrado.content.match(/Información extra:\s*(.*)/i) || [])[1] || "",
                redisId: keyEncontrada,
                categoria: localEncontrado.categoria || "local_usuario"
            };

            state.data = currentData;
            state.step = "seleccionar_campo";
            await redis.set(redisKey, JSON.stringify(state));

            return { 
                reply: `Entendido. Vas a editar "${currentData.nombre}".\n¿Qué quieres cambiar?\n\n- Nombre\n- Dirección\n- Horarios\n- Teléfono\n- Web\n- Extra` 
            };

        case "seleccionar_campo":
            const campo = message.toLowerCase().trim();
            let campoInterno = "";

            if (campo.includes("nombre")) campoInterno = "nombre";
            else if (campo.includes("direc")) campoInterno = "direccion";
            else if (campo.includes("horario")) campoInterno = "horarios";
            else if (campo.includes("tel")) campoInterno = "telefono";
            else if (campo.includes("web") || campo.includes("sitio")) campoInterno = "web";
            else if (campo.includes("extra") || campo.includes("info")) campoInterno = "extra";
            else return { reply: "No entendí qué campo quieres editar. Por favor elige uno de la lista (ej: 'Dirección')." };

            state.data.campoAEditar = campoInterno;
            state.step = "ingresar_valor";
            await redis.set(redisKey, JSON.stringify(state));

            const valorActual = state.data[campoInterno] || "(vacio)";
            return { reply: `El valor actual es: "${valorActual}".\n\nPor favor escribe el NUEVO valor:` };

        case "ingresar_valor":
            const nuevoValor = message;
            const campoEditado = state.data.campoAEditar;
            
            state.data[campoEditado] = nuevoValor;
            state.step = "confirmacion";
            await redis.set(redisKey, JSON.stringify(state));

            return {
                reply: `Perfecto. El cambio quedaría así:\n\n${campoEditado.toUpperCase()}: ${nuevoValor}\n\n¿Guardar cambios? (Responde 'sí' o 'no')`
            };

        case "confirmacion":
            if (message.toLowerCase().includes("sí") || message.toLowerCase().includes("si")) {
                
                // 1. Eliminar el Hash y el Vector original
                if (state.data.redisId) {
                    await redis.del(state.data.redisId);
                    // ⚠️ Nota: Para eliminar el vector asociado (en otro key),
                    // necesitarías la lógica específica de LangChain o el índice de Redis.
                    // Aquí solo se elimina el Hash de metadatos.
                }

                // 2. Crear el nuevo contenido
                const nuevoContenido = `
Nombre: ${state.data.nombre}
Dirección: ${state.data.direccion}
Horarios: ${state.data.horarios}
Teléfono: ${state.data.telefono}
Web: ${state.data.web}
Información extra: ${state.data.extra}
                `;

                // 3. Re-ingestar la información (crea un nuevo Hash y un nuevo Vector)
                await ingestUserInfo({
                    user_id: String(user.user_id),
                    content: nuevoContenido,
                    categoria: state.data.categoria,
                    fuente: "usuario",
                    formato: "chat",
                    extra_metadata: { origen: "chat_web_editado" }
                });

                await redis.del(redisKey);
                return { reply: "¡Cambios guardados con éxito! 🎉 Tu local ha sido actualizado." };
            } 
            else {
                await redis.del(redisKey);
                return { reply: "Operación cancelada. No se hicieron cambios." };
            }

        default:
            await redis.del(redisKey);
            return { reply: "Error en el flujo. Reiniciando." };
    }
}