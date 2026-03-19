// src/utils/index/ingest/ingestRequest.js
import axios from 'axios';
import { getCollaboratorOrgName } from './get_org.js';
// CORRECCIÓN: Nombre del servicio "ingest_user" y puerto "8010"
const INGEST_API_URL = process.env.INGEST_API_URL || "http://ingest_user:8010/ingest/user"; 

/**
 * Función corregida para aceptar el payload directo que envía localAdd.js
 * @param {Object} payload - Objeto con { user_id, content, categoria, ... }
 * 
 */
export async function ingestUserInfo(payload) {
    try {
        // Validación de seguridad
        if (!payload.user_id) {
            if (payload.user && payload.user.user_id) {
                payload.user_id = String(payload.user.user_id);
            } else {
                throw new Error("El campo 'user_id' es obligatorio y no se recibió.");
            }
        }
        const orgNombre = await getCollaboratorOrgName(payload.user_id);

        const body = {
        user_id: String(payload.user_id),
        content: payload.content,
        categoria: payload?.metadata?.categoria ?? "local_usuario",
        fuente: orgNombre ?? "colaborador",
        formato: payload?.metadata?.formato ?? "chat",
        extra_metadata: payload?.metadata?.extra_metadata ?? null,
        };

        console.log("📤 Enviando payload a Python:", body);
        const response = await axios.post(INGEST_API_URL, body);
        
        console.log("✅ Respuesta de Python:", response.data);
        return response.data;

    } catch (error) {
        console.error("❌ Error al ingestar información:", error.message);
        if (error.response) {
            console.error("Detalle del error del servidor Python:", error.response.data);
        }
        throw error;
    }
}