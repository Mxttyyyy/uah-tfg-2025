// Centraliza peticiones HTTP (JSON) con timeout y manejo de errores.

/**
 * Prepara un timeout: permite abortar una operación si tarda más de x ms.
 */
function withTimeout(ms) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { controller, cancel: () => clearTimeout(id) };
}

/**
 * Envía un POST con JSON y devuelve la respuesta como objeto JS.
 * path: endpoint (ej. "/analyze")
 * body: objeto que se enviará como JSON ({language, code, options})
 * options: configuración del cliente HTTP (ej. timeoutMs)
 */
export async function postJson(path, body, options) {

    let timeoutMs = 30000; // Valor por defecto
    if (options && typeof options.timeoutMs === "number") {
        timeoutMs = options.timeoutMs;
    }

    const { controller, cancel } = withTimeout(timeoutMs);

    try {
        // Enviamos la petición al backend
        const res = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" }, // Enviamos y recibimos JSON
            body: JSON.stringify(body), // Convierte el objeto JS que envía el usuario a texto JSON
            signal: controller.signal, // Permite abortar la petición
        });

        // Data contiene el cuerpo de la respuesta del backend
        const data = await res.json().catch(() => null); // Leemos el cuerpo y lo convertimos de JSON a objeto JS (si falla -> null)

        // Si el backend responde con un status distinto de 2xx, lo tratamos como error
        if (!res.ok) {
            const msg = data?.error?.message || `HTTP ${res.status}`;
            const err = new Error(msg);

            // Adjuntamos información útil para la UI
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;

    } catch (e) {
        // Timeout/aborto explícito del fetch
        if (e?.name === "AbortError") {
            const err = new Error(`Tiempo de espera agotado: ${timeoutMs} ms.`);
            err.status = 0; // 0 --> "sin respuesta HTTP"
            err.data = null;
            throw err;
        }
        throw e; // Re-lanzamos el error original para que lo gestione el caller
    } finally {
        cancel(); // Paramos/limpiamos el temporizador
    }
} 