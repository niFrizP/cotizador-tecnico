import { useState } from "react";
import { Btn, IB } from "../common/Atoms";
import { C, SC, SL } from "../../constants/ui";
import { fmtDate, fmtNum, pad, today } from "../../utils/format";

export default function ListView({
    quotes,
    onNew,
    onEdit,
    onPreview,
    onDelete,
    onDup,
    onSettings,
    totals,
}) {
    const [flt, setFlt] = useState("all");
    const [srch, setSrch] = useState("");

    const rows = quotes.filter(
        (q) =>
            (flt === "all" || q.status === flt) &&
            (q.client?.name?.toLowerCase().includes(srch.toLowerCase()) ||
                String(q.number).includes(srch)),
    );

    return (
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "36px 20px" }} className="fd">
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 28,
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: C.black,
                            letterSpacing: "-0.5px",
                        }}
                    >
                        Cotizaciones
                    </h1>
                    <p style={{ color: C.gray, fontSize: 13, marginTop: 3 }}>
                        {quotes.length} documento{quotes.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <Btn onClick={onSettings}>⚙ Ajustes</Btn>
                    <Btn s onClick={onNew}>
                        + Nueva cotización
                    </Btn>
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    flexWrap: "wrap",
                    alignItems: "center",
                }}
            >
                {["all", "draft", "sent", "accepted", "rejected"].map((s) => (
                    <button
                        key={s}
                        onClick={() => setFlt(s)}
                        style={{
                            padding: "5px 14px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: ".5px",
                            border: `1.5px solid ${flt === s ? "#000" : "#ccc"}`,
                            background: flt === s ? "#000" : "#fff",
                            color: flt === s ? "#fff" : "#666",
                            transition: "all .12s",
                        }}
                    >
                        {s === "all" ? "TODAS" : SL[s].toUpperCase()}
                    </button>
                ))}
                <input
                    value={srch}
                    onChange={(e) => setSrch(e.target.value)}
                    placeholder="Buscar…"
                    style={{
                        marginLeft: "auto",
                        padding: "5px 13px",
                        borderRadius: 20,
                        border: "1.5px solid #ccc",
                        fontSize: 13,
                        width: 180,
                        background: "#fff",
                    }}
                />
            </div>

            {rows.length === 0 ? (
                <div style={{ textAlign: "center", padding: "70px 0", color: C.gray }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>📄</div>
                    <p style={{ fontSize: 15, fontWeight: 500 }}>No hay cotizaciones aún.</p>
                    <button
                        onClick={onNew}
                        style={{
                            marginTop: 18,
                            padding: "9px 22px",
                            background: "#000",
                            color: "#fff",
                            border: "none",
                            borderRadius: 5,
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        Crear la primera
                    </button>
                </div>
            ) : (
                <div
                    style={{
                        background: "#fff",
                        borderRadius: 4,
                        border: "1px solid #ddd",
                        overflow: "hidden",
                        boxShadow: "0 2px 12px rgba(0,0,0,.06)",
                    }}
                >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: C.bgTop, borderBottom: "2px solid #ccc" }}>
                                {["N°", "Cliente", "Emisión", "Válida hasta", "Total", "Estado", ""].map(
                                    (h) => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: "11px 16px",
                                                textAlign: "left",
                                                fontSize: 10,
                                                color: C.gray,
                                                fontWeight: 700,
                                                letterSpacing: ".8px",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ),
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((q, i) => {
                                const total = q.summary?.total ?? totals(q.items).total;
                                const sc = SC[q.status];
                                const exp = q.status === "sent" && q.validUntil < today();
                                return (
                                    <tr
                                        key={q.id}
                                        style={{
                                            borderBottom: i < rows.length - 1 ? "1px solid #f0f0f0" : "none",
                                            transition: "background .1s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#fafafa";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "#fff";
                                        }}
                                    >
                                        <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: C.black }}>
                                            #{pad(q.number)}
                                        </td>
                                        <td style={{ padding: "13px 16px" }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: C.black }}>
                                                {q.client?.name || (
                                                    <span style={{ color: "#bbb", fontStyle: "italic", fontWeight: 400 }}>
                                                        Sin cliente
                                                    </span>
                                                )}
                                            </div>
                                            {q.client?.contact && (
                                                <div style={{ fontSize: 12, color: C.gray, marginTop: 1 }}>{q.client.contact}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: "13px 16px", fontSize: 13, color: C.gray }}>
                                            {fmtDate(q.issueDate)}
                                        </td>
                                        <td
                                            style={{
                                                padding: "13px 16px",
                                                fontSize: 13,
                                                color: exp ? "#dc2626" : C.gray,
                                                fontWeight: exp ? 600 : 400,
                                            }}
                                        >
                                            {fmtDate(q.validUntil)}
                                            {exp ? " ⚠" : ""}
                                        </td>
                                        <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 700, color: C.black }}>
                                            {fmtNum(total, q.currency)}
                                        </td>
                                        <td style={{ padding: "13px 16px" }}>
                                            <span
                                                style={{
                                                    padding: "3px 11px",
                                                    borderRadius: 20,
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    letterSpacing: ".4px",
                                                    background: sc.bg,
                                                    color: sc.color,
                                                    border: `1px solid ${sc.bd}`,
                                                }}
                                            >
                                                {SL[q.status].toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "13px 16px" }}>
                                            <div style={{ display: "flex", gap: 5 }}>
                                                <IB title="Editar" onClick={() => onEdit(q)}>
                                                    ✏️
                                                </IB>
                                                <IB title="Previsualizar" onClick={() => onPreview(q)}>
                                                    👁
                                                </IB>
                                                <IB title="Duplicar" onClick={() => onDup(q)}>
                                                    ⧉
                                                </IB>
                                                <IB
                                                    title="Eliminar"
                                                    d
                                                    onClick={() => {
                                                        if (confirm("¿Eliminar?")) onDelete(q.id);
                                                    }}
                                                >
                                                    🗑
                                                </IB>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
