import { useState } from "react";
import { Btn, F2, Sec, TR } from "../common/Atoms";
import { C, IS, SL } from "../../constants/ui";
import { fmtNum, pad } from "../../utils/format";
import { mkItem } from "../../utils/quoteFactory";
import { logoFileToDataUrl } from "../../utils/image";

export default function EditorView({ quote: init, onSave, onCancel, onPreview, onDraftChange, totals, clients, issuer, responsive }) {
  const [q, setQ] = useState(init);
  const [cs, setCs] = useState(init.client?.name || "");
  const [dd, setDd] = useState(false);
  const { isCompact, isNarrow } = responsive;

  const commitQ = (updater) => setQ((prev) => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    onDraftChange?.(next);
    return next;
  });

  const sc = (f, v) => commitQ(p => ({ ...p, client: { ...p.client, [f]: v } }));
  const se = (f, v) => commitQ(p => ({ ...p, equipment: { ...p.equipment, [f]: v } }));
  const si = (f, v) => commitQ(p => ({ ...p, issuer: { ...p.issuer, [f]: v } }));
  const itm = (id, f, v) => commitQ(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [f]: v } : i) }));
  const addI = () => commitQ(p => ({ ...p, items: [...p.items, mkItem()] }));
  const rmI = (id) => commitQ(p => ({ ...p, items: p.items.filter(i => i.id !== id) }));

  const { sub, shp, total } = totals(q.items);
  const fltC = clients.filter(c => c.name.toLowerCase().includes(cs.toLowerCase()));
  const iss = { ...issuer, ...q.issuer };

  const handleLogo = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      si("logoDataUrl", await logoFileToDataUrl(f));
    } catch (err) {
      alert(err.message);
    }
  };

  const validate = () => {
    const filled = q.items.filter(i => i.description.trim());
    if (filled.length === 0) return "Agrega al menos un ítem con descripción.";
    const badQty = filled.find(i => !(parseFloat(i.qty) > 0));
    if (badQty) return `La cantidad de "${badQty.description.trim()}" debe ser mayor que 0.`;
    const badPrice = filled.find(i => parseFloat(i.unitPrice) < 0 || parseFloat(i.shipping) < 0);
    if (badPrice) return `"${badPrice.description.trim()}" tiene un precio o envío negativo.`;
    if (q.issueDate && q.validUntil && q.validUntil < q.issueDate) return "La fecha \"Válida hasta\" no puede ser anterior a la fecha de emisión.";
    return null;
  };

  const go = () => {
    const problem = validate();
    if (problem) { alert(problem); return }
    onSave(q);
  };

  const topGridColumns = isCompact ? "1fr" : isNarrow ? "1fr 1fr" : "1fr 1fr 1fr";
  const issuerGridColumns = isCompact ? "1fr" : isNarrow ? "1fr 1fr" : "1fr 1fr 1fr";

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: isCompact ? "20px 14px 110px" : "32px 20px" }} className="fd">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isCompact ? "stretch" : "center", flexDirection: isCompact ? "column" : "row", gap: isCompact ? 14 : 0, marginBottom: 22 }}>
        <div>
          <button type="button" onClick={onCancel} style={{ background: "none", border: "none", color: C.gray, fontSize: 13, padding: "6px 0", fontWeight: 500 }}>← Volver</button>
          <h2 style={{ fontSize: isCompact ? 20 : 22, fontWeight: 700, color: C.black, marginTop: 4 }}>
            {q.number != null ? `Cotización #${pad(q.number)}` : "Nueva cotización"}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: isCompact ? "100%" : "auto" }}>
          <Btn g onClick={() => onPreview(q)} style={{ flex: isCompact ? "1 1 100%" : "0 0 auto" }}>👁 Previsualizar</Btn>
          <Btn s onClick={go} style={{ flex: isCompact ? "1 1 100%" : "0 0 auto" }}>Guardar</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: topGridColumns, gap: 16, marginBottom: 16 }}>
        <Sec t="Estado y fechas">
          <F2 l="Estado"><select value={q.status} onChange={e => commitQ(p => ({ ...p, status: e.target.value }))} style={IS}>{Object.entries(SL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F2>
          <F2 l="Fecha de emisión"><input type="date" value={q.issueDate} onChange={e => commitQ(p => ({ ...p, issueDate: e.target.value }))} style={IS} /></F2>
          <F2 l="Válida hasta"><input type="date" value={q.validUntil} onChange={e => commitQ(p => ({ ...p, validUntil: e.target.value }))} style={IS} /></F2>
          <F2 l="Moneda"><select value={q.currency} onChange={e => commitQ(p => ({ ...p, currency: e.target.value }))} style={IS}><option value="CLP">CLP – Peso Chileno</option><option value="USD">USD – Dólar</option><option value="UF">UF</option></select></F2>
        </Sec>

        <Sec t="Datos del cliente">
          <F2 l="Nombre / Empresa">
            <div style={{ position: "relative" }}>
              <input value={cs} onChange={e => { const nextName = e.target.value; setCs(nextName); sc("name", nextName); setDd(true) }} onFocus={() => setDd(true)} onBlur={() => setTimeout(() => setDd(false), 180)} placeholder="Buscar o escribir…" style={IS} />
              {dd && fltC.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 6, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,.1)", maxHeight: 150, overflowY: "auto" }}>
                  {fltC.map(c => (
                    <div key={c.id} role="option" aria-selected="false" className="ui-dd-option" onMouseDown={(e) => { e.preventDefault(); commitQ(p => ({ ...p, client: { name: c.name, contact: c.contact || "", website: c.website || "", rut: c.rut || "", phone: c.client_phone || "" } })); setCs(c.name); setDd(false) }}>
                      <strong>{c.name}</strong>{c.contact && <span style={{ color: C.gray, marginLeft: 6, fontWeight: 400 }}>{c.contact}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </F2>
          <F2 l="Contacto"><input value={q.client.contact} onChange={e => sc("contact", e.target.value)} placeholder="Nombre del contacto" style={IS} /></F2>
          <F2 l="RUT"><input value={q.client.rut} onChange={e => sc("rut", e.target.value)} placeholder="12.345.678-9" style={IS} /></F2>
          <F2 l="Teléfono"><input type="tel" inputMode="tel" value={q.client.phone || ""} onChange={e => sc("phone", e.target.value)} placeholder="+56 9 1234 5678" style={IS} /></F2>
          <F2 l="Sitio web"><input value={q.client.website} onChange={e => sc("website", e.target.value)} placeholder="https://…" style={IS} /></F2>
        </Sec>

        <Sec t="Detalle del equipo">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: q.equipment?.enabled ? 14 : 0 }}>
            <button type="button" role="switch" aria-checked={!!q.equipment?.enabled} aria-label="Incluir detalle del equipo" onClick={() => se("enabled", !q.equipment?.enabled)} style={{ width: 38, height: 22, borderRadius: 11, border: "none", background: q.equipment?.enabled ? "#000" : "#ccc", position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: q.equipment?.enabled ? 18 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", display: "block" }} />
            </button>
            <span style={{ fontSize: 12, color: q.equipment?.enabled ? C.black : C.gray, fontWeight: q.equipment?.enabled ? 600 : 400 }}>
              {q.equipment?.enabled ? "Incluido en cotización" : "No incluir (desarrollo web…)"}
            </span>
          </div>
          {q.equipment?.enabled && (
            <>
              <F2 l="Marca"><input value={q.equipment?.brand || ""} onChange={e => se("brand", e.target.value)} placeholder="Ej: Dell, HP, Lenovo…" style={IS} /></F2>
              <F2 l="Modelo"><input value={q.equipment?.model || ""} onChange={e => se("model", e.target.value)} placeholder="Ej: Latitude 5520…" style={IS} /></F2>
              <F2 l="N° de Serie (SN)"><input value={q.equipment?.serial || ""} onChange={e => se("serial", e.target.value)} placeholder="Número de serie" style={IS} /></F2>
              <F2 l="Año"><input value={q.equipment?.year || ""} onChange={e => se("year", e.target.value)} placeholder="Ej: 2022" style={IS} /></F2>
              <F2 l="Observaciones"><input value={q.equipment?.extra || ""} onChange={e => se("extra", e.target.value)} placeholder="Color, estado, etc." style={IS} /></F2>
            </>
          )}
        </Sec>
      </div>

      <Sec t="Datos del emisor" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: isCompact ? "flex-start" : "center", flexDirection: isCompact ? "column" : "row", gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#000", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {iss.logoDataUrl ? <img src={iss.logoDataUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: "-1px" }}>{(iss.name || "").split(" ").map(w => w[0]).join("").slice(0, 2) || "N!"}</span>}
          </div>
          <div>
            <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, marginBottom: 6, letterSpacing: ".5px" }}>LOGOTIPO</p>
            <label style={{ cursor: "pointer", padding: "6px 14px", background: C.bgTop, border: "1.5px solid #ccc", borderRadius: 5, fontSize: 12, fontWeight: 600, color: C.gray }}>
              {iss.logoDataUrl ? "Cambiar imagen" : "Subir imagen (PNG/JPG)"}
              <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
            </label>
            {iss.logoDataUrl && <button onClick={() => si("logoDataUrl", null)} style={{ marginLeft: 8, background: "none", border: "none", color: "#dc2626", fontSize: 12, fontWeight: 600 }}>Quitar</button>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: issuerGridColumns, gap: 12 }}>
          {[["name", "Nombre completo"], ["title", "Título / Profesión"], ["email", "Email"], ["phone", "Teléfono"], ["website", "Sitio web"], ["bank", "Banco"], ["accountName", "Nombre de cuenta"], ["accountNumber", "N° de cuenta"], ["accountType", "Tipo de cuenta"]].map(([k, lbl]) => (
            <F2 key={k} l={lbl}><input value={q.issuer?.[k] ?? issuer[k] ?? ""} onChange={e => si(k, e.target.value)} style={IS} /></F2>
          ))}
        </div>
      </Sec>

      <Sec t="Ítems" style={{ marginBottom: 16 }}>
        {isCompact ? (
          <div style={{ display: "grid", gap: 12 }}>
            {q.items.map((item, index) => {
              const sv = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0);
              return (
                <div key={item.id} style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 12, background: "#fafafa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Ítem {index + 1}</div>
                    {q.items.length > 1 && <button type="button" aria-label={`Quitar ítem ${index + 1}`} onClick={() => rmI(item.id)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 24, lineHeight: 1, minWidth: 44, minHeight: 44 }}>×</button>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    <F2 l="Descripción"><input value={item.description} onChange={e => itm(item.id, "description", e.target.value)} placeholder="Producto o servicio…" style={IS} /></F2>
                    <F2 l="Link"><input value={item.link} onChange={e => itm(item.id, "link", e.target.value)} placeholder="https://…" style={IS} /></F2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                      <F2 l="Cant."><input type="number" inputMode="decimal" min="0" step="any" value={item.qty} onChange={e => itm(item.id, "qty", e.target.value)} style={IS} /></F2>
                      <F2 l="Envío"><input type="number" inputMode="decimal" min="0" step="any" value={item.shipping} onChange={e => itm(item.id, "shipping", e.target.value)} placeholder="0" style={IS} /></F2>
                    </div>
                    <F2 l="Precio unit. (líquido)"><input type="number" inputMode="decimal" min="0" step="any" value={item.unitPrice} onChange={e => itm(item.id, "unitPrice", e.target.value)} placeholder="0" style={IS} /></F2>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e6e6e6", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: C.gray, fontWeight: 600 }}>Subtotal</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{fmtNum(sv, q.currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bgTop, borderBottom: "1.5px solid #ccc" }}>
                  {["Descripción", "Link", "Cant.", "Precio unit. (líquido)", "Envío", "Subtotal", ""].map(h => (
                    <th key={h} style={{ padding: "9px 8px", textAlign: "left", fontSize: 10, color: C.gray, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.items.map(item => {
                  const sv = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0);
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "7px 6px" }}><input aria-label="Descripción" value={item.description} onChange={e => itm(item.id, "description", e.target.value)} placeholder="Producto o servicio…" style={{ ...IS, minWidth: 170 }} /></td>
                      <td style={{ padding: "7px 6px" }}><input aria-label="Link" type="url" value={item.link} onChange={e => itm(item.id, "link", e.target.value)} placeholder="https://…" style={{ ...IS, minWidth: 120 }} /></td>
                      <td style={{ padding: "7px 6px" }}><input aria-label="Cantidad" type="number" inputMode="decimal" min="0" step="any" value={item.qty} onChange={e => itm(item.id, "qty", e.target.value)} style={{ ...IS, width: 64 }} /></td>
                      <td style={{ padding: "7px 6px" }}><input aria-label="Precio unitario" type="number" inputMode="decimal" min="0" step="any" value={item.unitPrice} onChange={e => itm(item.id, "unitPrice", e.target.value)} placeholder="0" style={{ ...IS, width: 120 }} /></td>
                      <td style={{ padding: "7px 6px" }}><input aria-label="Envío" type="number" inputMode="decimal" min="0" step="any" value={item.shipping} onChange={e => itm(item.id, "shipping", e.target.value)} placeholder="0" style={{ ...IS, width: 95 }} /></td>
                      <td style={{ padding: "7px 6px", fontWeight: 700, color: C.black, whiteSpace: "nowrap" }}>{fmtNum(sv, q.currency)}</td>
                      <td style={{ padding: "7px 6px" }}>{q.items.length > 1 && <button type="button" aria-label="Quitar ítem" onClick={() => rmI(item.id)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 18, lineHeight: 1 }}>×</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <button onClick={addI} style={{ marginTop: 10, width: "100%", background: "none", border: "1.5px dashed #ccc", color: C.gray, padding: "7px", borderRadius: 5, fontSize: 13, fontWeight: 500, transition: "all .12s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#000"; e.currentTarget.style.color = "#000" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#ccc"; e.currentTarget.style.color = C.gray }}>
          + Agregar ítem
        </button>
        <div style={{ marginTop: 16, display: "flex", justifyContent: isCompact ? "stretch" : "flex-end" }}>
          <div style={{ minWidth: isCompact ? "100%" : 280, width: isCompact ? "100%" : "auto" }}>
            <TR l="Subtotal" v={fmtNum(sub, q.currency)} />
            {shp > 0 && <TR l="Envío total" v={fmtNum(shp, q.currency)} />}
            <div style={{ height: 1, background: C.black, margin: "8px 0" }} />
            <TR l="Total" v={fmtNum(total, q.currency)} b />
          </div>
        </div>
      </Sec>

      <Sec t="Notas / Condiciones">
        <textarea value={q.notes} onChange={e => commitQ(p => ({ ...p, notes: e.target.value }))} placeholder="Consideraciones, condiciones al pie…" rows={4} style={{ ...IS, width: "100%", resize: "vertical" }} />
      </Sec>
      {isCompact && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9000, background: "rgba(255,255,255,.97)", borderTop: "1px solid #ddd", boxShadow: "0 -6px 20px rgba(0,0,0,.08)", padding: "10px 14px calc(10px + env(safe-area-inset-bottom))", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Total</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.black, whiteSpace: "nowrap" }}>{fmtNum(total, q.currency)}</div>
          </div>
          <Btn s onClick={go} style={{ flex: "0 0 auto", minWidth: 140 }}>Guardar</Btn>
        </div>
      )}
    </div>
  );
}
