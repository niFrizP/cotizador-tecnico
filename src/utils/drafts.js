/* Borradores locales (localStorage) de formularios.
   Se guardan por usuario y se borran al cerrar sesión, para que en un equipo
   compartido otra cuenta no vea lo que escribió la anterior. */

const PREFIX = "cotizador-tecnico.";

export const draftKey = (name, userId) => `${PREFIX}${name}.v2.${userId ?? "anon"}`;

export function readDraft(key) {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        removeDraft(key);
        return null;
    }
}

export function writeDraft(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Si el navegador bloquea storage, el formulario sigue funcionando en memoria.
    }
}

export function removeDraft(key) {
    try {
        window.localStorage.removeItem(key);
    } catch {
        // Ignorar errores de storage.
    }
}

/** Borra todos los borradores de la app (incluidos los formatos antiguos v1). */
export function clearLocalDrafts() {
    try {
        Object.keys(window.localStorage)
            .filter((key) => key.startsWith(PREFIX))
            .forEach((key) => window.localStorage.removeItem(key));
    } catch {
        // Ignorar errores de storage.
    }
}
