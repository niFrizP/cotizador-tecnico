import { useState } from "react";
import { Btn, IB } from "../common/Atoms";
import { C, F, SC, SL } from "../../constants/ui";
import { fmtDate, fmtNum, pad, quoteLabel, today } from "../../utils/format";

export default function ListView({ quotePrefix = "", quotes, onNew, onEdit, onPreview, onDelete, onDup, onSettings, onClients, totals, responsive }) {
  const [flt, setFlt] = useState("all");
  const [srch, setSrch] = useState("");
  const { isCompact } = responsive;
  const shownNumber = (q) => (quotePrefix ? quoteLabel(q.number, quotePrefix) : `#${quoteLabel(q.number)}`);
  const term = srch.trim().toLowerCase().replace(/^#/, "");
  const rows = quotes.filter(q => {
    if (flt !== "all" && q.status !== flt) return false;
    if (!term) return true;
    const numberText = q.number != null ? `${q.number} ${pad(q.number)} ${quoteLabel(q.number, quotePrefix).toLowerCase()}` : "";
    return (q.client?.name ?? "").toLowerCase().includes(term)
      || (q.client?.contact ?? "").toLowerCase().includes(term)
      || numberText.includes(term);
  });
  const askDelete = (q) => {
    const label = q.number != null ? shownNumber(q) : "esta cotización";
    if (confirm(`¿Eliminar la cotización ${label}${q.client?.name ? ` de ${q.client.name}` : ""}? No se puede deshacer.`)) onDelete(q.id);
  };
  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: isCompact ? "24px 14px 90px" : "36px 20px" }} className="fd">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isCompact ? "stretch" : "flex-end", flexDirection: isCompact ? "column" : "row", gap: isCompact ? 16 : 0, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: isCompact ? 22 : 26, fontWeight: 700, color: C.black, letterSpacing: "-0.5px" }}>Cotizaciones</h1>
          <p style={{ color: C.gray, fontSize: 13, marginTop: 3 }}>{quotes.length} documento{quotes.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: isCompact ? "100%" : "auto" }}>
          <Btn g onClick={onSettings} style={{ flex: isCompact ? "1 1 140px" : "0 0 auto" }}>⚙ Ajustes</Btn>
          <Btn g onClick={onClients} style={{ flex: isCompact ? "1 1 140px" : "0 0 auto" }}>👥 Clientes</Btn>
          <Btn s onClick={onNew} style={{ flex: isCompact ? "1 1 100%" : "0 0 auto" }}>+ Nueva cotización</Btn>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {["all", "draft", "sent", "accepted", "rejected"].map(s => (
          <button key={s} type="button" className="ui-chip" aria-pressed={flt === s} onClick={() => setFlt(s)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: ".5px", border: `1.5px solid ${flt === s ? "#000" : "#ccc"}`, background: flt === s ? "#000" : "#fff", color: flt === s ? "#fff" : "#666", transition: "all .12s" }}>
            {s === "all" ? "TODAS" : SL[s].toUpperCase()}
          </button>
        ))}
        <input value={srch} onChange={e => setSrch(e.target.value)} type="search" aria-label="Buscar por cliente o número" placeholder="Buscar cliente o N°…" style={{ marginLeft: isCompact ? 0 : "auto", padding: "5px 13px", borderRadius: 20, border: "1.5px solid #ccc", fontSize: 13, width: isCompact ? "100%" : 180, background: "#fff" }} />
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 0", color: C.gray }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 15, fontWeight: 500 }}>{quotes.length === 0 ? "No hay cotizaciones aún." : "Ninguna cotización coincide con el filtro."}</p>
          {quotes.length === 0 && <button onClick={onNew} style={{ marginTop: 18, padding: "9px 22px", background: "#000", color: "#fff", border: "none", borderRadius: 5, fontSize: 13, fontWeight: 600 }}>Crear la primera</button>}
        </div>
      ) : isCompact ? (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map(q => {
            const total = q.summary?.total ?? totals(q.items).total;
            const sc = SC[q.status];
            const exp = q.status === "sent" && q.validUntil < today();
            return (
              <div key={q.id} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 14, padding: 14, boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.gray, fontWeight: 700, letterSpacing: ".6px" }}>{shownNumber(q)}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.black, marginTop: 4 }}>{q.client?.name || "Sin cliente"}</div>
                    {q.client?.contact && <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{q.client.contact}</div>}
                  </div>
                  <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: ".4px", background: sc.bg, color: sc.color, border: `1px solid ${sc.bd}` }}>{SL[q.status].toUpperCase()}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>Emisión</div>
                    <div style={{ fontSize: 13, color: C.black }}>{fmtDate(q.issueDate)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>Válida hasta</div>
                    <div style={{ fontSize: 13, color: exp ? "#dc2626" : C.black, fontWeight: exp ? 600 : 500 }}>{fmtDate(q.validUntil)}{exp ? " ⚠" : ""}</div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 2 }}>Total</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.black }}>{fmtNum(total, q.currency)}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Btn g onClick={() => onEdit(q)} style={{ flex: "1 1 120px" }}>Editar</Btn>
                  <Btn g onClick={() => onPreview(q)} style={{ flex: "1 1 120px" }}>Previsualizar</Btn>
                  <Btn g onClick={() => onDup(q)} style={{ flex: "1 1 120px" }}>Duplicar</Btn>
                  <button type="button" className="ui-btn" onClick={() => askDelete(q)} style={{ flex: "1 1 120px", padding: "8px 18px", borderRadius: 5, fontSize: 13, fontWeight: 600, border: "1.5px solid #dc2626", background: "#fff", color: "#dc2626", fontFamily: F }}>Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 4, border: "1px solid #ddd", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bgTop, borderBottom: "2px solid #ccc" }}>
                {["N°", "Cliente", "Emisión", "Válida hasta", "Total", "Estado", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, color: C.gray, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((q, i) => {
                const total = q.summary?.total ?? totals(q.items).total;
                const sc = SC[q.status];
                const exp = q.status === "sent" && q.validUntil < today();
                return (
                  <tr key={q.id} className="ui-row" style={{ borderBottom: i < rows.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: C.black }}>{shownNumber(q)}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.black }}>{q.client?.name || <span style={{ color: "#bbb", fontStyle: "italic", fontWeight: 400 }}>Sin cliente</span>}</div>
                      {q.client?.contact && <div style={{ fontSize: 12, color: C.gray, marginTop: 1 }}>{q.client.contact}</div>}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: C.gray }}>{fmtDate(q.issueDate)}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: exp ? "#dc2626" : C.gray, fontWeight: exp ? 600 : 400 }}>{fmtDate(q.validUntil)}{exp ? " ⚠" : ""}</td>
                    <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 700, color: C.black }}>{fmtNum(total, q.currency)}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ padding: "3px 11px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: ".4px", background: sc.bg, color: sc.color, border: `1px solid ${sc.bd}` }}>{SL[q.status].toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <IB title="Editar" onClick={() => onEdit(q)}>✏️</IB>
                        <IB title="Previsualizar" onClick={() => onPreview(q)}>👁</IB>
                        <IB title="Duplicar" onClick={() => onDup(q)}>⧉</IB>
                        <IB title="Eliminar" d onClick={() => askDelete(q)}>🗑</IB>
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
