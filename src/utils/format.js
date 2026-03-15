export const pad = (n) =>
    n != null ? String(n).padStart(3, "0") : "---";

export const fmtQuoteNumber = (n) => (n != null ? pad(n) : "Se asigna al guardar");

export const today = () => new Date().toISOString().split("T")[0];

export const addDays = (d, n) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().split("T")[0];
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
    return `$${v.toLocaleString("es-CL")}`;
};

export const calcTotals = (items) => {
    const sub = items.reduce(
        (s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseFloat(i.qty) || 0),
        0,
    );
    const shp = items.reduce((s, i) => s + (parseFloat(i.shipping) || 0), 0);
    return { sub, shp, total: sub + shp };
};
