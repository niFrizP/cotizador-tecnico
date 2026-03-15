import { useState } from "react";
import { C, IS, SL } from "../../constants/ui";
import { fmtNum, pad } from "../../utils/format";
import { mkItem } from "../../utils/quoteFactory";
import { Btn, F2, Sec, TR } from "../common/Atoms";

export default function EditorView({
    quote: init,
    onSave,
    onCancel,
    onPreview,
    totals,
    clients,
    issuer,
}) {
    const [q, setQ] = useState(init);
    const [cs, setCs] = useState(init.client?.name || "");
    const [dd, setDd] = useState(false);

    const sc = (f, v) => setQ((p) => ({ ...p, client: { ...p.client, [f]: v } }));
    const se = (f, v) => setQ((p) => ({ ...p, equipment: { ...p.equipment, [f]: v } }));
    const si = (f, v) => setQ((p) => ({ ...p, issuer: { ...p.issuer, [f]: v } }));
    const itm = (id, f, v) =>
        setQ((p) => ({
            ...p,
            items: p.items.map((i) => (i.id === id ? { ...i, [f]: v } : i)),
        }));
    const addI = () => setQ((p) => ({ ...p, items: [...p.items, mkItem()] }));
    const rmI = (id) => setQ((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

    const { sub, shp, total } = totals(q.items);
    const fltC = clients.filter((c) => c.name.toLowerCase().includes(cs.toLowerCase()));
    const iss = { ...issuer, ...q.issuer };

    const handleLogo = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => si("logoDataUrl", ev.target.result);
        r.readAsDataURL(f);
    };

    const go = () => {
        if (!q.items.some((i) => i.description.trim())) {
            alert("Agrega al menos un ítem.");
            return;
        }
        onSave(q);
    };

    return (
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "32px 20px" }} className="fd">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <div>
                    <button
                        onClick={onCancel}
                        style={{
                            background: "none",
                            border: "none",
                            color: C.gray,
                            fontSize: 13,
                            padding: 0,
                            fontWeight: 500,
                        }}
                    >
                        ← Volver
                    </button>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.black, marginTop: 4 }}>
                        {q.number != null ? `Cotización #${pad(q.number)}` : "Nueva cotización"}
                    </h2>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={() => onPreview(q)}>👁 Previsualizar</Btn>
                    <Btn s onClick={go}>
                        Guardar
                    </Btn>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <Sec t="Estado y fechas">
                    <F2 l="Estado">
                        <select
                            value={q.status}
                            onChange={(e) => setQ((p) => ({ ...p, status: e.target.value }))}
                            style={IS}
                        >
                            {Object.entries(SL).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </F2>
                    <F2 l="Fecha de emisión">
                        <input
                            type="date"
                            value={q.issueDate}
                            onChange={(e) => setQ((p) => ({ ...p, issueDate: e.target.value }))}
                            style={IS}
                        />
                    </F2>
                    <F2 l="Válida hasta">
                        <input
                            type="date"
                            value={q.validUntil}
                            onChange={(e) => setQ((p) => ({ ...p, validUntil: e.target.value }))}
                            style={IS}
                        />
                    </F2>
                    <F2 l="Moneda">
                        <select
                            value={q.currency}
                            onChange={(e) => setQ((p) => ({ ...p, currency: e.target.value }))}
                            style={IS}
                        >
                            <option value="CLP">CLP – Peso Chileno</option>
                            <option value="USD">USD – Dólar</option>
                            <option value="UF">UF</option>
                        </select>
                    </F2>
                </Sec>

                <Sec t="Datos del cliente">
                    <F2 l="Nombre / Empresa">
                        <div style={{ position: "relative" }}>
                            <input
                                value={cs}
                                onChange={(e) => {
                                    setCs(e.target.value);
                                    sc("name", e.target.value);
                                    setDd(true);
                                }}
                                onFocus={() => setDd(true)}
                                onBlur={() => setTimeout(() => setDd(false), 180)}
                                placeholder="Buscar o escribir…"
                                style={IS}
                            />
                            {dd && fltC.length > 0 && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        background: "#fff",
                                        border: "1px solid #ddd",
                                        borderRadius: 6,
                                        zIndex: 200,
                                        boxShadow: "0 4px 16px rgba(0,0,0,.1)",
                                        maxHeight: 150,
                                        overflowY: "auto",
                                    }}
                                >
                                    {fltC.map((c) => (
                                        <div
                                            key={c.id}
                                            onMouseDown={() => {
                                                setQ((p) => ({
                                                    ...p,
                                                    client: {
                                                        name: c.name,
                                                        contact: c.contact || "",
                                                        website: c.website || "",
                                                        rut: c.rut || "",
                                                        phone: c.client_phone || "",
                                                    },
                                                }));
                                                setCs(c.name);
                                                setDd(false);
                                            }}
                                            style={{
                                                padding: "8px 12px",
                                                fontSize: 13,
                                                cursor: "pointer",
                                                borderBottom: "1px solid #f4f4f4",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#f8f8f8";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "#fff";
                                            }}
                                        >
                                            <strong>{c.name}</strong>
                                            {c.contact && (
                                                <span style={{ color: C.gray, marginLeft: 6, fontWeight: 400 }}>{c.contact}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </F2>
                    <F2 l="Contacto">
                        <input
                            value={q.client.contact}
                            onChange={(e) => sc("contact", e.target.value)}
                            placeholder="Nombre del contacto"
                            style={IS}
                        />
                    </F2>
                    <F2 l="RUT">
                        <input
                            value={q.client.rut}
                            onChange={(e) => sc("rut", e.target.value)}
                            placeholder="12.345.678-9"
                            style={IS}
                        />
                    </F2>
                    <F2 l="Teléfono">
                        <input
                            value={q.client.phone || ""}
                            onChange={(e) => sc("phone", e.target.value)}
                            placeholder="+56 9 1234 5678"
                            style={IS}
                        />
                    </F2>
                    <F2 l="Sitio web">
                        <input
                            value={q.client.website}
                            onChange={(e) => sc("website", e.target.value)}
                            placeholder="https://…"
                            style={IS}
                        />
                    </F2>
                </Sec>

                <Sec t="Detalle del equipo">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: q.equipment?.enabled ? 14 : 0 }}>
                        <button
                            onClick={() => se("enabled", !q.equipment?.enabled)}
                            style={{
                                width: 38,
                                height: 22,
                                borderRadius: 11,
                                border: "none",
                                background: q.equipment?.enabled ? "#000" : "#ccc",
                                position: "relative",
                                transition: "background .2s",
                                flexShrink: 0,
                            }}
                        >
                            <span
                                style={{
                                    position: "absolute",
                                    top: 3,
                                    left: q.equipment?.enabled ? 18 : 3,
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    background: "#fff",
                                    transition: "left .2s",
                                    display: "block",
                                }}
                            />
                        </button>
                        <span
                            style={{
                                fontSize: 12,
                                color: q.equipment?.enabled ? C.black : C.gray,
                                fontWeight: q.equipment?.enabled ? 600 : 400,
                            }}
                        >
                            {q.equipment?.enabled ? "Incluido en cotización" : "No incluir (desarrollo web…)"}
                        </span>
                    </div>
                    {q.equipment?.enabled && (
                        <>
                            <F2 l="Marca">
                                <input
                                    value={q.equipment?.brand || ""}
                                    onChange={(e) => se("brand", e.target.value)}
                                    placeholder="Ej: Dell, HP, Lenovo…"
                                    style={IS}
                                />
                            </F2>
                            <F2 l="Modelo">
                                <input
                                    value={q.equipment?.model || ""}
                                    onChange={(e) => se("model", e.target.value)}
                                    placeholder="Ej: Latitude 5520…"
                                    style={IS}
                                />
                            </F2>
                            <F2 l="N° de Serie (SN)">
                                <input
                                    value={q.equipment?.serial || ""}
                                    onChange={(e) => se("serial", e.target.value)}
                                    placeholder="Número de serie"
                                    style={IS}
                                />
                            </F2>
                            <F2 l="Año">
                                <input
                                    value={q.equipment?.year || ""}
                                    onChange={(e) => se("year", e.target.value)}
                                    placeholder="Ej: 2022"
                                    style={IS}
                                />
                            </F2>
                            <F2 l="Observaciones">
                                <input
                                    value={q.equipment?.extra || ""}
                                    onChange={(e) => se("extra", e.target.value)}
                                    placeholder="Color, estado, etc."
                                    style={IS}
                                />
                            </F2>
                        </>
                    )}
                </Sec>
            </div>

            <Sec t="Datos del emisor" style={{ marginBottom: 16 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 16,
                        paddingBottom: 16,
                        borderBottom: "1px solid #f0f0f0",
                    }}
                >
                    <div
                        style={{
                            width: 60,
                            height: 60,
                            borderRadius: "50%",
                            background: "#000",
                            flexShrink: 0,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {iss.logoDataUrl ? (
                            <img src={iss.logoDataUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <span style={{ color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: "-1px" }}>
                                {(iss.name || "")
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                    .slice(0, 2) || "N!"}
                            </span>
                        )}
                    </div>
                    <div>
                        <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, marginBottom: 6, letterSpacing: ".5px" }}>
                            LOGOTIPO
                        </p>
                        <label
                            style={{
                                cursor: "pointer",
                                padding: "6px 14px",
                                background: C.bgTop,
                                border: "1.5px solid #ccc",
                                borderRadius: 5,
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.gray,
                            }}
                        >
                            {iss.logoDataUrl ? "Cambiar imagen" : "Subir imagen (PNG/JPG)"}
                            <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
                        </label>
                        {iss.logoDataUrl && (
                            <button
                                onClick={() => si("logoDataUrl", null)}
                                style={{
                                    marginLeft: 8,
                                    background: "none",
                                    border: "none",
                                    color: "#dc2626",
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                Quitar
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[
                        ["name", "Nombre completo"],
                        ["title", "Título / Profesión"],
                        ["email", "Email"],
                        ["phone", "Teléfono"],
                        ["website", "Sitio web"],
                        ["bank", "Banco"],
                        ["accountName", "Nombre de cuenta"],
                        ["accountNumber", "N° de cuenta"],
                        ["accountType", "Tipo de cuenta"],
                    ].map(([k, lbl]) => (
                        <F2 key={k} l={lbl}>
                            <input value={q.issuer?.[k] ?? issuer[k] ?? ""} onChange={(e) => si(k, e.target.value)} style={IS} />
                        </F2>
                    ))}
                </div>
            </Sec>

            <Sec t="Ítems" style={{ marginBottom: 16 }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: C.bgTop, borderBottom: "1.5px solid #ccc" }}>
                                {[
                                    "Descripción",
                                    "Link",
                                    "Cant.",
                                    "Precio unit.",
                                    "Envío",
                                    "Subtotal",
                                    "",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "9px 8px",
                                            textAlign: "left",
                                            fontSize: 10,
                                            color: C.gray,
                                            fontWeight: 700,
                                            letterSpacing: ".5px",
                                            textTransform: "uppercase",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {q.items.map((item) => {
                                const sv = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0);
                                return (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                        <td style={{ padding: "7px 6px" }}>
                                            <input
                                                value={item.description}
                                                onChange={(e) => itm(item.id, "description", e.target.value)}
                                                placeholder="Producto o servicio…"
                                                style={{ ...IS, minWidth: 170 }}
                                            />
                                        </td>
                                        <td style={{ padding: "7px 6px" }}>
                                            <input
                                                value={item.link}
                                                onChange={(e) => itm(item.id, "link", e.target.value)}
                                                placeholder="https://…"
                                                style={{ ...IS, minWidth: 120 }}
                                            />
                                        </td>
                                        <td style={{ padding: "7px 6px" }}>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.qty}
                                                onChange={(e) => itm(item.id, "qty", e.target.value)}
                                                style={{ ...IS, width: 58 }}
                                            />
                                        </td>
                                        <td style={{ padding: "7px 6px" }}>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.unitPrice}
                                                onChange={(e) => itm(item.id, "unitPrice", e.target.value)}
                                                placeholder="0"
                                                style={{ ...IS, width: 120 }}
                                            />
                                        </td>
                                        <td style={{ padding: "7px 6px" }}>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.shipping}
                                                onChange={(e) => itm(item.id, "shipping", e.target.value)}
                                                placeholder="0"
                                                style={{ ...IS, width: 95 }}
                                            />
                                        </td>
                                        <td style={{ padding: "7px 6px", fontWeight: 700, color: C.black, whiteSpace: "nowrap" }}>
                                            {fmtNum(sv, q.currency)}
                                        </td>
                                        <td style={{ padding: "7px 6px" }}>
                                            {q.items.length > 1 && (
                                                <button
                                                    onClick={() => rmI(item.id)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#dc2626",
                                                        fontSize: 18,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <button
                    onClick={addI}
                    style={{
                        marginTop: 10,
                        width: "100%",
                        background: "none",
                        border: "1.5px dashed #ccc",
                        color: C.gray,
                        padding: "7px",
                        borderRadius: 5,
                        fontSize: 13,
                        fontWeight: 500,
                        transition: "all .12s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#000";
                        e.currentTarget.style.color = "#000";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#ccc";
                        e.currentTarget.style.color = C.gray;
                    }}
                >
                    + Agregar ítem
                </button>
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ minWidth: 280 }}>
                        <TR l="Subtotal" v={fmtNum(sub, q.currency)} />
                        {shp > 0 && <TR l="Envío total" v={fmtNum(shp, q.currency)} />}
                        <div style={{ height: 1, background: C.black, margin: "8px 0" }} />
                        <TR l="Total" v={fmtNum(total, q.currency)} b />
                    </div>
                </div>
            </Sec>

            <Sec t="Notas / Condiciones">
                <textarea
                    value={q.notes}
                    onChange={(e) => setQ((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Consideraciones, condiciones al pie…"
                    rows={4}
                    style={{ ...IS, width: "100%", resize: "vertical" }}
                />
            </Sec>
        </div>
    );
}
