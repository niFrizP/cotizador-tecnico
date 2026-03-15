import { useState, useRef, useEffect } from "react";
import { Btn, F2, IB, Sec } from "../common/Atoms";
import { C, IS } from "../../constants/ui";

const EMPTY = { name: "", contact: "", rut: "", website: "", client_phone: "" };

export default function ClientsView({ clients, onSave, onDelete, onBack }) {
    const [list, setList] = useState(clients);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);   // id del cliente que se está editando
    const [saving, setSaving] = useState(false);
    const [dd, setDd] = useState(false);           // dropdown de sugerencias visible
    const nameRef = useRef(null);

    // Mantener la lista local sincronizada con la prop cuando viene del padre
    useEffect(() => { setList(clients); }, [clients]);

    const sf = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    // Sugerencias en el campo nombre al crear (no al editar — ya son distintos)
    const suggestions = editId === null
        ? list.filter(
            (c) =>
                form.name.trim().length > 0 &&
                c.name.toLowerCase().includes(form.name.toLowerCase())
        )
        : [];

    const startEdit = (c) => {
        setEditId(c.id);
        setForm({ name: c.name, contact: c.contact, rut: c.rut, website: c.website, client_phone: c.client_phone || "" });
        setDd(false);
    };

    const cancelEdit = () => {
        setEditId(null);
        setForm(EMPTY);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        try {
            setSaving(true);
            const payload = editId ? { id: editId, ...form } : { ...form };
            const savedId = await onSave(payload);
            const updated = { id: editId ?? savedId, ...form };
            setList((prev) => {
                if (editId) return prev.map((c) => (c.id === editId ? updated : c));
                return [updated, ...prev];
            });
            setEditId(null);
            setForm(EMPTY);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
        await onDelete(id);
        setList((prev) => prev.filter((c) => c.id !== id));
        if (editId === id) cancelEdit();
    };

    const pickSuggestion = (c) => {
        startEdit(c);
        setDd(false);
    };

    return (
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 20px" }} className="fd">
            {/* Cabecera */}
            <button
                onClick={onBack}
                style={{ background: "none", border: "none", color: C.gray, fontSize: 13, marginBottom: 16, cursor: "pointer", fontWeight: 500, padding: 0 }}
            >
                ← Volver
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.black }}>Clientes</h2>
                    <p style={{ color: C.gray, fontSize: 13, marginTop: 3 }}>
                        {list.length} cliente{list.length !== 1 ? "s" : ""} registrado{list.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            {/* Formulario crear / editar */}
            <Sec t={editId ? "Editar cliente" : "Nuevo cliente"} style={{ marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {/* Nombre con autocompletado al crear */}
                    <F2 l="Nombre / Empresa *">
                        <div style={{ position: "relative" }}>
                            <input
                                ref={nameRef}
                                value={form.name}
                                onChange={(e) => { sf("name", e.target.value); setDd(true); }}
                                onFocus={() => setDd(true)}
                                onBlur={() => setTimeout(() => setDd(false), 160)}
                                placeholder="Nombre o razón social"
                                style={IS}
                                autoComplete="off"
                            />
                            {dd && suggestions.length > 0 && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        background: "#fff",
                                        border: "1px solid #ddd",
                                        borderRadius: 6,
                                        zIndex: 300,
                                        boxShadow: "0 4px 16px rgba(0,0,0,.12)",
                                        maxHeight: 180,
                                        overflowY: "auto",
                                    }}
                                >
                                    <div style={{ padding: "6px 12px 4px", fontSize: 10, color: C.gray, fontWeight: 700, letterSpacing: ".6px", textTransform: "uppercase", borderBottom: "1px solid #f0f0f0" }}>
                                        Clientes existentes
                                    </div>
                                    {suggestions.map((c) => (
                                        <div
                                            key={c.id}
                                            onMouseDown={() => pickSuggestion(c)}
                                            style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f8f8f8" }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                                        >
                                            <strong>{c.name}</strong>
                                            {c.contact && <span style={{ color: C.gray, marginLeft: 7, fontWeight: 400, fontSize: 12 }}>{c.contact}</span>}
                                            {c.rut && <span style={{ color: C.gray, marginLeft: 7, fontSize: 12 }}>RUT: {c.rut}</span>}
                                            <span style={{ float: "right", fontSize: 10, color: "#2563eb", fontWeight: 600 }}>Editar →</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </F2>

                    <F2 l="Contacto">
                        <input value={form.contact} onChange={(e) => sf("contact", e.target.value)} placeholder="Nombre del contacto" style={IS} />
                    </F2>
                    <F2 l="RUT">
                        <input value={form.rut} onChange={(e) => sf("rut", e.target.value)} placeholder="12.345.678-9" style={IS} />
                    </F2>
                    <F2 l="Teléfono">
                        <input value={form.client_phone} onChange={(e) => sf("client_phone", e.target.value)} placeholder="+56 9 1234 5678" style={IS} />
                    </F2>
                    <F2 l="Sitio web">
                        <input value={form.website} onChange={(e) => sf("website", e.target.value)} placeholder="https://…" style={IS} />
                    </F2>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                    {editId && (
                        <Btn onClick={cancelEdit}>Cancelar</Btn>
                    )}
                    <Btn s onClick={handleSave} disabled={saving || !form.name.trim()}>
                        {saving ? "Guardando…" : editId ? "Actualizar cliente" : "Crear cliente"}
                    </Btn>
                </div>
            </Sec>

            {/* Listado */}
            {list.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.gray }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
                    <p style={{ fontSize: 15, fontWeight: 500 }}>Sin clientes aún. Crea el primero arriba.</p>
                </div>
            ) : (
                <div style={{ background: "#fff", borderRadius: 4, border: "1px solid #ddd", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: C.bgTop, borderBottom: "2px solid #ccc" }}>
                                {["Nombre / Empresa", "Contacto", "RUT", "Teléfono", "Sitio web", ""].map((h) => (
                                    <th
                                        key={h}
                                        style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, color: C.gray, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase" }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((c, i) => (
                                <tr
                                    key={c.id}
                                    style={{
                                        borderBottom: i < list.length - 1 ? "1px solid #f0f0f0" : "none",
                                        background: editId === c.id ? "#fffbeb" : "#fff",
                                        transition: "background .1s",
                                    }}
                                    onMouseEnter={(e) => { if (editId !== c.id) e.currentTarget.style.background = "#fafafa"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = editId === c.id ? "#fffbeb" : "#fff"; }}
                                >
                                    <td style={{ padding: "13px 14px", fontSize: 14, fontWeight: 600, color: C.black }}>{c.name}</td>
                                    <td style={{ padding: "13px 14px", fontSize: 13, color: C.gray }}>{c.contact || <span style={{ color: "#bbb" }}>—</span>}</td>
                                    <td style={{ padding: "13px 14px", fontSize: 13, color: C.gray }}>{c.rut || <span style={{ color: "#bbb" }}>—</span>}</td>
                                    <td style={{ padding: "13px 14px", fontSize: 13, color: C.gray }}>{c.client_phone || <span style={{ color: "#bbb" }}>—</span>}</td>
                                    <td style={{ padding: "13px 14px", fontSize: 13, color: C.gray }}>
                                        {c.website
                                            ? <a href={c.website} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>{c.website}</a>
                                            : <span style={{ color: "#bbb" }}>—</span>
                                        }
                                    </td>
                                    <td style={{ padding: "13px 14px" }}>
                                        <div style={{ display: "flex", gap: 5 }}>
                                            <IB title="Editar" onClick={() => startEdit(c)}>✏️</IB>
                                            <IB title="Eliminar" d onClick={() => handleDelete(c.id)}>🗑</IB>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
