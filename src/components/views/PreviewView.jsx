import { Btn } from "../common/Atoms";
import { C, F, SC, SL, TDS, THS } from "../../constants/ui";
import { fmtDate, fmtNum, fmtQuoteNumber, safeImageSrc, safeUrl, today } from "../../utils/format";

export default function PreviewView({ quote: q, onBack, onList, totals, issuer: gIss, onExport, responsive }) {
  const iss = { ...gIss, ...q.issuer };
  const { sub, shp, total } = totals(q.items);
  const sc = SC[q.status];
  const exp = q.status === "sent" && q.validUntil < today();
  const hasShp = q.items.some(i => parseFloat(i.shipping) > 0);
  const logo = safeImageSrc(iss.logoDataUrl);
  const quoteNumberLabel = fmtQuoteNumber(q.number, gIss.quotePrefix);
  const initials = (iss.name || "").split(" ").map(w => w[0]).join("").slice(0, 2) || "N!";
  const { isCompact } = responsive;

  return (
    <div style={{ minHeight: "100vh", background: "#c8c8c8", padding: isCompact ? "20px 12px 90px" : "28px 16px", fontFamily: F }}>
      <div style={{ maxWidth: 680, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", alignItems: isCompact ? "stretch" : "center", flexDirection: isCompact ? "column" : "row", gap: isCompact ? 10 : 0 }}>
        <div style={{ display: "flex", gap: 8, width: isCompact ? "100%" : "auto", flexWrap: "wrap" }}>
          <Btn g onClick={onBack} style={{ flex: isCompact ? "1 1 100%" : "0 0 auto" }}>← Editar</Btn>
          <Btn g onClick={onList} style={{ flex: isCompact ? "1 1 100%" : "0 0 auto" }}>Ir a la lista</Btn>
        </div>
        <Btn s onClick={() => onExport(q, iss)} style={{ width: isCompact ? "100%" : "auto" }}>⬇ Exportar PDF</Btn>
      </div>

      <div id="QUOTE_DOC" style={{ maxWidth: 680, margin: "0 auto", background: "#fff", boxShadow: "0 6px 40px rgba(0,0,0,.22)", fontFamily: F, fontSize: 10, overflow: "hidden" }}>
        <div style={{ background: C.bgTop, padding: isCompact ? "20px 18px" : "24px 36px 22px", display: "flex", justifyContent: "space-between", alignItems: isCompact ? "stretch" : "flex-start", flexDirection: isCompact ? "column" : "row", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#000", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: "-1px" }}>{initials}</span>}
            </div>
            <div style={{ lineHeight: 1.6 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.black, lineHeight: 1.2 }}>{iss.name}</p>
              {iss.title && <p style={{ fontSize: 10, color: C.black, fontWeight: 400 }}>{iss.title}</p>}
              {iss.website && <p style={{ fontSize: 10, color: C.black, fontWeight: 400 }}>{iss.website}</p>}
              {iss.phone && <p style={{ fontSize: 10, color: C.black, fontWeight: 400 }}>{iss.phone}</p>}
              {iss.email && <p style={{ fontSize: 10, color: C.black, fontWeight: 400 }}>{iss.email}</p>}
            </div>
          </div>
          <div style={{ textAlign: isCompact ? "left" : "right", flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.black }}>Cotización Nro: <strong style={{ fontWeight: 700 }}>{quoteNumberLabel}</strong></p>
            <p style={{ fontSize: 9, color: C.gray, marginTop: 6, fontWeight: 500 }}>Emisión: {fmtDate(q.issueDate)}</p>
            <p style={{ fontSize: 9, color: exp ? "#dc2626" : C.gray, fontWeight: 500 }}>Válida hasta: {fmtDate(q.validUntil)}{exp ? " ⚠" : ""}</p>
            <span style={{ display: "inline-block", marginTop: 8, padding: "2px 10px", borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: ".5px", background: sc.bg, color: sc.color, border: `1px solid ${sc.bd}` }}>
              {SL[q.status].toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ padding: isCompact ? "20px 18px" : "28px 36px" }}>
          {(q.client.name || q.client.contact || q.client.rut || q.client.phone || q.client.website || q.equipment?.enabled) && (
            <div style={{ display: "grid", gridTemplateColumns: isCompact || !q.equipment?.enabled ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 26 }}>
              <div>
                {q.client.name && <p style={{ fontSize: 14, fontWeight: 700, color: C.black }}>{q.client.name}</p>}
                {q.client.contact && <p style={{ fontSize: 10, color: C.black, marginTop: 2 }}>{q.client.contact}</p>}
                {q.client.rut && <p style={{ fontSize: 10, color: C.black }}>RUT: {q.client.rut}</p>}
                {q.client.phone && <p style={{ fontSize: 10, color: C.black }}>Tel: {q.client.phone}</p>}
                {q.client.website && <p style={{ fontSize: 10, color: C.black }}>{q.client.website}</p>}
              </div>
              {q.equipment?.enabled && (q.equipment.brand || q.equipment.model || q.equipment.serial || q.equipment.year || q.equipment.extra) && (
                <div style={{ borderLeft: isCompact ? "none" : `1px solid #e0e0e0`, borderTop: isCompact ? `1px solid #e0e0e0` : "none", paddingLeft: isCompact ? 0 : 20, paddingTop: isCompact ? 16 : 0 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>Detalle del equipo</p>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>
                    {[["Marca", q.equipment.brand], ["Modelo", q.equipment.model], ["N° Serie", q.equipment.serial], ["Año", q.equipment.year], ["Obs.", q.equipment.extra]]
                      .filter(([, v]) => v).map(([label, val]) => (
                        <tr key={label}>
                          <td style={{ fontSize: 9, color: C.gray, fontWeight: 600, paddingRight: 8, paddingBottom: 3, whiteSpace: "nowrap", verticalAlign: "top" }}>{label}:</td>
                          <td style={{ fontSize: 9, color: C.black, paddingBottom: 3, verticalAlign: "top" }}>{val}</td>
                        </tr>
                      ))}
                  </tbody></table>
                </div>
              )}
            </div>
          )}

          {isCompact ? (
            <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
              {q.items.filter(i => i.description.trim()).map((item) => {
                const sv = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0);
                return (
                  <div key={item.id} style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 12 }}>
                    <p style={{ fontWeight: 700, color: C.black, fontSize: 12 }}>{item.description}</p>
                    {safeUrl(item.link) && <p style={{ marginTop: 4 }}><a href={safeUrl(item.link)} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontSize: 10, textDecoration: "none", wordBreak: "break-all" }}>{item.link}</a></p>}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                      <div><div style={{ fontSize: 9, color: C.gray, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Cantidad</div><div style={{ fontSize: 11, color: C.black }}>{item.qty} {parseFloat(item.qty) === 1 ? "Unidad" : "Unidades"}</div></div>
                      <div><div style={{ fontSize: 9, color: C.gray, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Precio unit.</div><div style={{ fontSize: 11, color: C.black }}>{fmtNum(item.unitPrice, q.currency)}</div></div>
                      {hasShp && <div><div style={{ fontSize: 9, color: C.gray, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Envío</div><div style={{ fontSize: 11, color: C.black }}>{item.shipping ? fmtNum(item.shipping, q.currency) : "—"}</div></div>}
                      <div style={{ gridColumn: hasShp ? "2 / 3" : "1 / -1" }}><div style={{ fontSize: 9, color: C.gray, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Subtotal</div><div style={{ fontSize: 12, color: C.black, fontWeight: 700 }}>{fmtNum(sv, q.currency)}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
              <thead>
                <tr>
                  <th style={{ ...THS, width: "40%" }}>Artículo</th>
                  <th style={{ ...THS, textAlign: "center" }}>Cantidad</th>
                  <th style={{ ...THS, textAlign: "center" }}>Precio unit.</th>
                  {hasShp && <th style={{ ...THS, textAlign: "center" }}>Envío</th>}
                  <th style={{ ...THS, textAlign: "right" }}>SUBTOTAL</th>
                </tr>
                <tr><td colSpan={hasShp ? 5 : 4}><div style={{ height: "0.75px", background: C.gray }} /></td></tr>
              </thead>
              <tbody>
                {q.items.filter(i => i.description.trim()).map((item) => {
                  const sv = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0);
                  return (
                    <tr key={item.id}>
                      <td style={{ ...TDS, borderBottom: `0.75px solid ${C.gray}` }}>
                        <p style={{ fontWeight: 700, color: C.black, fontSize: 10 }}>{item.description}</p>
                        {safeUrl(item.link) && <p style={{ marginTop: 2 }}><a href={safeUrl(item.link)} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontSize: 9, textDecoration: "none" }}>{item.link}</a></p>}
                      </td>
                      <td style={{ ...TDS, textAlign: "center", borderBottom: `0.75px solid ${C.gray}` }}>{item.qty} {parseFloat(item.qty) === 1 ? "Unidad" : "Unidades"}</td>
                      <td style={{ ...TDS, textAlign: "center", borderBottom: `0.75px solid ${C.gray}` }}>{fmtNum(item.unitPrice, q.currency)}</td>
                      {hasShp && <td style={{ ...TDS, textAlign: "center", borderBottom: `0.75px solid ${C.gray}` }}>{item.shipping ? fmtNum(item.shipping, q.currency) : "—"}</td>}
                      <td style={{ ...TDS, textAlign: "right", borderBottom: `0.75px solid ${C.gray}` }}>{fmtNum(sv, q.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div style={{ display: "flex", justifyContent: isCompact ? "stretch" : "flex-end", marginBottom: 32 }}>
            <div>
              {shp > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 32, fontSize: 10, color: C.gray, padding: "2px 0" }}><span>Subtotal</span><span>{fmtNum(sub, q.currency)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 32, fontSize: 10, color: C.gray, padding: "2px 0" }}><span>Envío</span><span>{fmtNum(shp, q.currency)}</span></div>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.gray }}>Total:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.gray }}>{fmtNum(total, q.currency)}</span>
              </div>
            </div>
          </div>

          {q.notes && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>Notas y condiciones</p>
              <div style={{ height: "0.75px", background: C.gray, marginBottom: 8 }} />
              <p style={{ fontSize: 10, color: C.gray, lineHeight: 1.7, whiteSpace: "pre-line" }}>{q.notes}</p>
            </div>
          )}

          {(iss.bank || iss.accountNumber) && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: C.gray, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>Información de pago</p>
              <div style={{ fontSize: 9, color: C.gray, lineHeight: 2 }}>
                {iss.bank && <p><span style={{ fontWeight: 500 }}>Banco:</span> {iss.bank}</p>}
                {iss.accountName && <p><span style={{ fontWeight: 500 }}>Nombre:</span> {iss.accountName}</p>}
                {iss.accountNumber && <p><span style={{ fontWeight: 500 }}>Número de cuenta:</span> {iss.accountNumber}</p>}
                {iss.accountType && <p><span style={{ fontWeight: 500 }}>Tipo de cuenta:</span> {iss.accountType}</p>}
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #ccc", padding: isCompact ? "12px 18px" : "12px 36px", textAlign: "center" }}>
          <p style={{ fontSize: 8, color: C.gray, fontWeight: 500, lineHeight: 1.8 }}>{iss.name}{iss.title && ` · ${iss.title}`}</p>
          <p style={{ fontSize: 8, color: C.gray, lineHeight: 1.8 }}>
            {iss.email && `Correo electrónico: ${iss.email}`}
            {iss.email && iss.phone && "  │  "}
            {iss.phone && `Teléfono: ${iss.phone}`}
          </p>
        </div>
      </div>
    </div>
  );
}
