export const pad = (n) =>
    n != null ? String(n).padStart(3, "0") : "---";

export const fmtQuoteNumber = (n) => (n != null ? pad(n) : "Se asigna al guardar");

/* Fechas en formato YYYY-MM-DD usando la hora LOCAL del dispositivo.
   (toISOString() usa UTC: en Chile, después de las 21:00 devolvía el día siguiente). */
const toYMD = (dt) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const fromYMD = (s) => {
    const [y, m, d] = String(s).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

export const today = () => toYMD(new Date());

export const addDays = (d, n) => {
    const dt = fromYMD(d);
    dt.setDate(dt.getDate() + n);
    return toYMD(dt);
};

export const fmtDate = (d) => {
    if (!d) return "—";
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
};

export const fmtNum = (n, cur = "CLP") => {
    const v = Number(n || 0);
    if (cur === "USD") {
        return `$${v.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }
    if (cur === "UF") {
        return `UF ${v.toLocaleString("es-CL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }
    return `$${Math.round(v).toLocaleString("es-CL")}`;
};

export const calcTotals = (items = []) => {
    const sub = items.reduce(
        (s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseFloat(i.qty) || 0),
        0,
    );
    const shp = items.reduce((s, i) => s + (parseFloat(i.shipping) || 0), 0);
    return { sub, shp, total: sub + shp };
};

/* ─── Seguridad ─────────────────────────────────────────────────────── */

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapa cualquier valor antes de insertarlo en HTML generado como texto. */
export const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

/** Devuelve la URL solo si es http(s); bloquea javascript:, data:, etc. */
export const safeUrl = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(withScheme);
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
};

/** Solo imágenes embebidas (data:image/...) o URLs http(s) para el logo. */
export const safeImageSrc = (value) => {
    const raw = String(value ?? "").trim();
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(raw)) return raw;
    return safeUrl(raw);
};
