import { useState } from "react";
import { Btn, F2, Sec } from "../common/Atoms";
import TaxModePicker from "../common/TaxModePicker";
import { C, IS } from "../../constants/ui";
import { quoteLabel } from "../../utils/format";
import { logoFileToDataUrl } from "../../utils/image";

const ROLE_NAMES = { owner: "Dueño", editor: "Editor", viewer: "Solo lectura" };

export default function SettingsView({ org, issuer: init, onSave, onBack, responsive }) {
  const [f, setF] = useState(init);
  const [biz, setBiz] = useState({ name: org?.name ?? "", taxMode: org?.taxMode ?? "iva", quotePrefix: org?.quotePrefix ?? "" });
  const { isCompact } = responsive;
  const isOwner = org?.role === "owner";
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const sb = (k, v) => setBiz(p => ({ ...p, [k]: v }));

  const handleLogo = async (e) => {
    const fl = e.target.files[0];
    e.target.value = "";
    if (!fl) return;
    try {
      s("logoDataUrl", await logoFileToDataUrl(fl));
    } catch (err) {
      alert(err.message);
    }
  };

  const prefixClean = biz.quotePrefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10);
  const canSave = isOwner && biz.name.trim().length > 0;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: isCompact ? "24px 14px 90px" : "36px 20px" }} className="fd">
      <button type="button" onClick={onBack} style={{ background: "none", border: "none", color: C.gray, fontSize: 13, marginBottom: 16, cursor: "pointer", fontWeight: 500, padding: "6px 0" }}>← Volver</button>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.black, marginBottom: 6 }}>Ajustes</h2>
      <p style={{ fontSize: 13, color: C.gray, marginBottom: 20 }}>Datos con los que tu negocio emite las cotizaciones.</p>

      {!isOwner && (
        <div role="note" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 13 }}>
          Tu rol en este negocio es {ROLE_NAMES[org?.role] ?? "miembro"}. Solo el dueño puede cambiar estos datos.
        </div>
      )}

      <fieldset disabled={!isOwner} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
        <Sec t="Mi negocio" style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "2fr 1fr", gap: 14 }}>
            <F2 l="Nombre del negocio"><input value={biz.name} onChange={e => sb("name", e.target.value)} style={IS} required /></F2>
            <F2 l="Prefijo de numeración (opcional)">
              <input value={biz.quotePrefix} onChange={e => sb("quotePrefix", e.target.value)} placeholder="Ej: COT" maxLength={10} style={{ ...IS, textTransform: "uppercase" }} />
            </F2>
          </div>
          <p style={{ fontSize: 12, color: C.gray, marginTop: -2, marginBottom: 14 }}>
            Próxima cotización: <strong style={{ color: C.black }}>{quoteLabel(org?.nextQuoteNumber ?? 1, prefixClean) || "—"}</strong>
          </p>
          <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, marginBottom: 6 }}>Impuesto</p>
          <TaxModePicker value={biz.taxMode} onChange={v => sb("taxMode", v)} disabled={!isOwner} />
          <p style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>El cálculo del impuesto en el editor y el PDF llega en la próxima versión.</p>
        </Sec>

        <Sec t="Logotipo" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: isCompact ? "flex-start" : "center", flexDirection: isCompact ? "column" : "row", gap: 18 }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#000", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {f.logoDataUrl ? <img src={f.logoDataUrl} alt="Logotipo actual" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{(f.name || biz.name || "N").charAt(0)}</span>}
            </div>
            <div>
              <label style={{ cursor: isOwner ? "pointer" : "not-allowed", display: "inline-block", padding: "8px 18px", background: C.bgTop, border: "1.5px solid #ccc", borderRadius: 5, fontSize: 13, fontWeight: 600, color: C.gray }}>
                {f.logoDataUrl ? "Cambiar logotipo" : "Subir logotipo"} (PNG/JPG)
                <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
              </label>
              {f.logoDataUrl && <button type="button" onClick={() => s("logoDataUrl", null)} style={{ marginLeft: 10, background: "none", border: "none", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>Quitar</button>}
              <p style={{ fontSize: 11, color: C.gray, marginTop: 6 }}>Aparece en el encabezado. Recomendado: imagen cuadrada.</p>
            </div>
          </div>
        </Sec>

        <Sec t="Datos de contacto en la cotización" style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 14 }}>
            {[["name", "Nombre que aparece", "text"], ["title", "Título / Profesión", "text"], ["email", "Email", "email"], ["phone", "Teléfono", "tel"], ["website", "Sitio web", "url"]].map(([k, l, type]) => (
              <F2 key={k} l={l}><input type={type} value={f[k] || ""} onChange={e => s(k, e.target.value)} style={IS} /></F2>
            ))}
          </div>
        </Sec>

        <Sec t="Información de pago" style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 14 }}>
            {[["bank", "Banco"], ["accountName", "Nombre de cuenta"], ["accountNumber", "N° de cuenta"], ["accountType", "Tipo de cuenta"]].map(([k, l]) => (
              <F2 key={k} l={l}><input value={f[k] || ""} onChange={e => s(k, e.target.value)} style={IS} /></F2>
            ))}
          </div>
        </Sec>
      </fieldset>

      {isOwner && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn s disabled={!canSave} onClick={() => onSave({ issuer: f, org: { name: biz.name, taxMode: biz.taxMode, quotePrefix: prefixClean } })} style={{ width: isCompact ? "100%" : "auto", minWidth: 180 }}>
            Guardar ajustes
          </Btn>
        </div>
      )}
    </div>
  );
}
