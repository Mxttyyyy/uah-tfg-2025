/**
 * Funciones de acceso a la API.
 * Aquí encapsulamos:
 * - llamada a POST /analyze
 * - cálculo del timeout del cliente (fetch)
 * - conversión de errores a un formato estable
 */

import { postJson } from "./http";
import { normalizeAnalyzeResponse, makeClientErrorResponse } from "../utils/normalizeResponse";

/**
 * Llama a POST /analyze con:
 * { language, code, options }
 *
 * Devuelve siempre un objeto normalizado para la UI.
 */
export async function analyzeCode(payload) {

    // Validaciones de datos
    const code = typeof payload?.code === "string" ? payload.code : "";
    if (!code.trim()) {
        return makeClientErrorResponse("El código está vacío. Pega código antes de analizar.");
    }

    const timeout_language = payload?.language === "python" ? 10 : 25;
    // Timeout del cliente: debe ser un poco mayor que el timeout del backend
    const backendTimeoutSeconds = typeof payload?.options?.timeout_seconds === "number" ? payload.options.timeout_seconds : timeout_language;

    // Convertimos a ms y agregamos margen de 30 seg
    const timeoutMs = (backendTimeoutSeconds + 30) * 1000;

    try {
        const data = await postJson("/api/analyze", payload, { timeoutMs });

        // Aseguramos un formato estable para la UI
        return normalizeAnalyzeResponse(data);
    } catch (err) {
        // Error de red, timeout, backend caído o HTTP != 2xx
        const status = typeof err?.status === "number" ? err.status : 0;

        let message = "No se pudo conectar con el servidor.";
        if (typeof err?.message === "string" && err.message.trim()) {
            message = err.message;
        }

        // Si hay status HTTP real, lo agregamos al mensaje
        if (status && status !== 0) {
            message = `${message} (HTTP ${status})`;
        }

        // Si el backend devolvió JSON (incluso con error), lo normalizamos y lo devolvemos
        if (err?.data) {
            return normalizeAnalyzeResponse(err.data);
        }
        // Si no hay respuesta del backend, devolvemos error de cliente
        return makeClientErrorResponse(message);
    }
}