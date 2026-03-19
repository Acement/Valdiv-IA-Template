import { detectCrud, classifyIntent } from "../services/ollamaClassifier.js";
import { askChatGPT } from '../openIA_api.js';
import { fetchContext } from '../utils/context/contextService.js';
import { flujoColaborador } from '../utils/index/chatFlow.js';
import { redis } from '../config/redis.js';
import { PROMPTS } from '../config/prompts.js';

export class ChatService {

  async handleWebChat(user, sessionId, message, history, categories) {
    const redisKey = `state:${user.user_id}:${sessionId}`;

    console.log("Sesion id", sessionId, "user: ", user);
    
    // -----------------------------------------------------------
    // 1. VERIFICAR FLUJO ACTIVO (Si ya estaba agregando/editando)
    // -----------------------------------------------------------
    const stateRaw = await redis.get(redisKey);
    if (stateRaw) {
      const messageclean = message.trim();
      return await flujoColaborador(user, sessionId, messageclean, categories);
    }

    // -----------------------------------------------------------
    // 2. CLASIFICACIÓN HÍBRIDA (Palabras Clave + IA)
    // -----------------------------------------------------------
    let classification = "";
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes("agregar") || lowerMsg.includes("subir info") || lowerMsg.includes("nueva información")) {
        classification = "agregar";
    } 
    else if (lowerMsg.includes("editar") || lowerMsg.includes("modificar") || lowerMsg.includes("cambiar")) {
        classification = "editar";
    }
    else if (lowerMsg.includes("eliminar") || lowerMsg.includes("borrar") || lowerMsg.includes("quitar")) {
        classification = "eliminar";
    } 
    else {
        console.log("No se detectó comando directo, consultando a Ollama...");
        classification = await classifyIntent(message);
    }

    console.log("Mensaje del usuario:", message);
    console.log("Intención final clasificada:", classification);

    // -----------------------------------------------------------
    // 3. ENRUTADOR DE ACCIONES
    // -----------------------------------------------------------
    switch (classification) {

      case "consulta":
        return await this._handleRAGQuery(message, history, categories);

      case "agregar":
        await redis.set(redisKey, JSON.stringify({
          mode: "agregar",
          step: "nombre",
          data: {}
        }));
        return { reply: PROMPTS.AGREGAR_INFO || "¡Claro! ¿Cuál es el nombre del lugar que quieres agregar?" };

      case "editar":
        // Mantenemos la lógica anterior para editar por ahora
        return await this._listarLocalesParaAccion(user, redisKey, "editar", "Perfecto, vamos a editar información. Aquí está la lista de tus locales registrados:");

      case "eliminar":
        // 🛠️ CORRECCIÓN AQUÍ:
        // En lugar de listar aquí, configuramos el estado y llamamos al flujoColaborador.
        // Esto hace que se ejecute inmediatamente el flujoEliminarLocal con FT.SEARCH.
        await redis.set(redisKey, JSON.stringify({
            mode: "eliminar",
            step: "awaiting_list_display", // Apuntamos al paso de listado
            data: {}
        }));
        
        // Pasamos un mensaje "dummy" para detonar el flujo inmediatamente
        return await flujoColaborador(user, sessionId, "INIT_DELETE", categories);

      default:
        return await this._handleRAGQuery(message, categories);
    }
  }

  // -----------------------------------------------------------
  // MÉTODO AUXILIAR (Solo usado para EDITAR ahora)
  // -----------------------------------------------------------
  async _listarLocalesParaAccion(user, redisKey, modo, mensajeTitulo) {
    console.log(`Buscando locales para user_id: ${user.user_id}...`);
    
    const keys = await redis.keys("info:user:*");
    const userLocales = [];
    const userIdStr = String(user.user_id).trim();

    for (const key of keys) {
        const data = await redis.hgetall(key);
        if (String(data.user_id).trim() === userIdStr) {
            const match = data.content.match(/Nombre:\s*(.*)/i); 
            let nombre = match ? match[1].trim() : null;
            if (!nombre) nombre = `(Sin nombre) ${data.content.substring(0, 30)}...`;
            userLocales.push(nombre);
        }
    }

    if (userLocales.length === 0) {
        return { reply: `No tienes locales registrados para ${modo} todavía.` };
    }

    let replyMessage = `${mensajeTitulo}\n\n`;
    userLocales.forEach((local, idx) => {
        replyMessage += `${idx + 1}. ${local}\n`;
    });
    replyMessage += `\n(O escribe "cancelar" para salir)`;

    await redis.set(redisKey, JSON.stringify({
        mode: modo, 
        step: "seleccionar_local",
        data: {}
    }));

    return { reply: replyMessage };
  }

  // -----------------------------------------------------------
  // OTROS MÉTODOS
  // -----------------------------------------------------------

  async handleWhatsappChat(message) {
    return await this._handleRAGQuery(message, ["Todo"], true);
  }

  async _handleRAGQuery(message, history, categories, isWsp = false) {
    
    // --- CORRECCIÓN 3: Asegurar que buscamos en los datos del usuario ---
    // Clonamos el array o creamos uno nuevo para no mutar el original
    const searchCategories = Array.isArray(categories) ? [...categories] : [];
    if (!searchCategories.includes("local_usuario")) {
      searchCategories.push("local_usuario");
    }

    const ctx = await fetchContext(message, {
      categories: searchCategories,
      k_per_index: 5,
      max_total: 10,
      per_doc_limit: 1200,
      max_chars: 6000,
    });

    if (!ctx?.context?.trim()) {
      return {
        reply: "No encontré información suficiente sobre eso en Valdivia. ¿Puedes ser más específico?",
        sources: [],
        chunks: [],
        indexes_used: ctx?.indexes_used ?? [],
        total_chars: ctx?.total_chars ?? 0,
      };
    }

    const systemPrompt = PROMPTS.RAG_SYSTEM_VALDIVIA(ctx.context, JSON.stringify(history));
    const reply = await askChatGPT([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    // 🔥 Armar fuentes robusto: usa ctx.sources si viene,
    // si no, las arma desde chunks (fuente/source)
    const sourcesFromChunks = (ctx.chunks ?? [])
      .map((ch) => ch.fuente ?? ch.source)
      .filter(Boolean);

    const sources = Array.from(
      new Set([...(ctx.sources ?? []), ...sourcesFromChunks])
    );

    return {
      reply,
      sources,                       // ✅ fuentes reales
      chunks: ctx.chunks ?? [],       // opcional (debug)
      indexes_used: ctx.indexes_used ?? [],
      total_chars: ctx.total_chars ?? 0,
    };
  }
}