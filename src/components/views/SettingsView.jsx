import { useState } from "react";
import { Btn, F2, Sec } from "../common/Atoms";
import { C, IS } from "../../constants/ui";

export default function SettingsView({ issuer: init, clients, onSave, onDelClient, onBack }) {
    const [f, setF] = useState(init);
    const s = (k, v) => setF((p) => ({ ...p, [k]: v }));

    const handleLogo = (e) => {
        const fl = e.target.files[0];
        if (!fl) return;
        const r = new FileReader();
        r.onload = (ev) => s("logoDataUrl", ev.target.result);
        r.readAsDataURL(fl);
    };

    return (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 20px" }} className="fd">
            <button
                onClick={onBack}
                style={{
                    background: "none",
                    border: "none",
                    color: C.gray,
                    fontSize: 13,
                    marginBottom: 16,
                    cursor: "pointer",
                    fontWeight: 500,
                }}
            >
                ← Volver
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.black, marginBottom: 24 }}>Ajustes del emisor</h2>

            <Sec t="Logotipo" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <div
                        style={{
                            width: 68,
                            height: 68,
                            borderRadius: "50%",
                            background: "#000",
                            flexShrink: 0,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {f.logoDataUrl ? (
                            <img src={f.logoDataUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{(f.name || "N").charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <label
                            style={{
                                cursor: "pointer",
                                display: "inline-block",
                                padding: "8px 18px",
                                background: C.bgTop,
                                border: "1.5px solid #ccc",
                                borderRadius: 5,
                                fontSize: 13,
                                fontWeight: 600,
                                color: C.gray,
                            }}
                        >
                            {f.logoDataUrl ? "Cambiar logotipo" : "Subir logotipo"} (PNG/JPG)
                            <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
                        </label>
                        {f.logoDataUrl && (
                            <button
                                onClick={() => s("logoDataUrl", null)}
                                style={{
                                    marginLeft: 10,
                                    background: "none",
                                    border: "none",
                                    color: "#dc2626",
                                    fontSize: 13,
                                    fontWeight: 600,
                                }}
                            >
                                Quitar
                            </button>
                        )}
                        <p style={{ fontSize: 11, color: C.gray, marginTop: 6 }}>
                            Aparece en el encabezado. Recomendado: imagen cuadrada.
                        </p>
                    </div>
                </div>
            </Sec>

            <Sec t="Datos personales" style={{ marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {[
                        ["name", "Nombre completo"],
                        ["title", "Título / Profesión"],
                        ["email", "Email"],
                        ["phone", "Teléfono"],
                        ["website", "Sitio web"],
                    ].map(([k, l]) => (
                        <F2 key={k} l={l}>
                            <input value={f[k] || ""} onChange={(e) => s(k, e.target.value)} style={IS} />
                        </F2>
                    ))}
                </div>
            </Sec>

            <Sec t="Información de pago" style={{ marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {[
                        ["bank", "Banco"],
                        ["accountName", "Nombre de cuenta"],
                        ["accountNumber", "N° de cuenta"],
                        ["accountType", "Tipo de cuenta"],
                    ].map(([k, l]) => (
                        <F2 key={k} l={l}>
                            <input value={f[k] || ""} onChange={(e) => s(k, e.target.value)} style={IS} />
                        </F2>
                    ))}
                </div>
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <Btn s onClick={() => onSave(f)}>
                        Guardar ajustes
                    </Btn>
                </div>
            </Sec>

            {clients.length > 0 && (
                <Sec t={`Historial de clientes (${clients.length})`}>
                    {clients.map((c) => (
                        <div
                            key={c.id}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 0",
                                borderBottom: "1px solid #f0f0f0",
                            }}
                        >
                            <div>
                                <strong style={{ fontSize: 14 }}>{c.name}</strong>
                                {c.contact && <span style={{ color: C.gray, fontSize: 12, marginLeft: 8 }}>{c.contact}</span>}
                                {c.rut && <span style={{ color: C.gray, fontSize: 12, marginLeft: 8 }}>RUT: {c.rut}</span>}
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm("¿Eliminar cliente?")) onDelClient(c.id);
                                }}
                                style={{ background: "none", border: "none", color: "#dc2626", fontSize: 20, cursor: "pointer" }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </Sec>
            )}
        </div>
    );
}
