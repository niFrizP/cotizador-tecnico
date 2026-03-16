import { useState, useEffect } from "react";
import {
  fetchQuotes, fetchQuote, fetchClients, fetchIssuer,
  getNextNumber,
  saveQuote as dbSave, deleteQuote as dbDelete,
  duplicateQuote as dbDuplicate, saveIssuer as dbSaveIssuer,
  saveClient as dbSaveClient, deleteClient,
  signIn as signInUser, signOut as signOutUser,
  resendSignupVerification,
  sendPasswordRecovery,
  sendMagicLink,
  getSession, onAuthStateChange,
  fetchMyProfile, fetchProfiles,
  createManagedUser, updateProfile,
} from "./lib/supabase";
import ClientsView from "./components/views/ClientsView";
import LoginView from "./components/views/LoginView";
import AdminView from "./components/views/AdminView";

/* ─── Google Fonts ─────────────────────────────────────────────────── */
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap";
document.head.appendChild(_fl);

/* ─── Tokens ───────────────────────────────────────────────────────── */
const C = { black: "#000000", gray: "#535353", bgTop: "#f5f5f5", white: "#ffffff" };
const F = "'Barlow', sans-serif";

/* ─── Helpers ──────────────────────────────────────────────────────── */
const pad = (n) => n != null ? String(n).padStart(3, "0") : "---";
const fmtQuoteNumber = (n) => n != null ? pad(n) : "Se asigna al guardar";
const today = () => new Date().toISOString().split("T")[0];
const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split("T")[0] };
const fmtDate = (d) => { if (!d) return "—"; const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}` };
const fmtNum = (n, cur = "CLP") => {
  const v = Number(n || 0);
  if (cur === "USD") return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (cur === "UF") return `UF ${v.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${v.toLocaleString("es-CL")}`;
};

const SL = { draft: "Borrador", sent: "Enviada", accepted: "Aceptada", rejected: "Rechazada" };
const SC = {
  draft: { bg: "#f1f5f9", color: "#475569", bd: "#cbd5e1" },
  sent: { bg: "#eff6ff", color: "#2563eb", bd: "#bfdbfe" },
  accepted: { bg: "#f0fdf4", color: "#16a34a", bd: "#bbf7d0" },
  rejected: { bg: "#fef2f2", color: "#dc2626", bd: "#fecaca" },
};

/* ─── Data helpers ─────────────────────────────────────────────────── */
const mkItem = () => ({ id: crypto.randomUUID(), description: "", qty: 1, unitPrice: "", shipping: "", link: "" });
const mkQuote = (iss, userId = null) => ({
  id: crypto.randomUUID(), userId, number: null, status: "draft",
  issueDate: today(), validUntil: addDays(today(), 30),
  client: { name: "", contact: "", website: "", rut: "", phone: "" },
  equipment: { enabled: false, brand: "", model: "", serial: "", year: "", extra: "" },
  items: [mkItem()], notes: "", currency: "CLP",
  issuer: { ...iss },
});
const DEF_ISS = { name: "", title: "", email: "", phone: "", website: "", bank: "", accountName: "", accountNumber: "", accountType: "", logoDataUrl: null };

/* ─── Calcular totales ─────────────────────────────────────────────── */
const calcTotals = (items) => {
  const sub = items.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseFloat(i.qty) || 0), 0);
  const shp = items.reduce((s, i) => s + (parseFloat(i.shipping) || 0), 0);
  return { sub, shp, total: sub + shp };
};

const withQuoteSummary = (quote) => ({
  ...quote,
  summary: calcTotals(quote.items || []),
});

/* ═══════════════════════════════════════════════════════════════════ */
/*  GENERAR PDF — abre ventana limpia con HTML vectorial              */
/* ═══════════════════════════════════════════════════════════════════ */
function generatePDF(q, iss) {
  return new Promise((resolve) => {
    const { sub, shp, total } = calcTotals(q.items);
    const sc = SC[q.status];
    const exp = q.status === "sent" && q.validUntil < today();
    const hasShp = q.items.some(i => parseFloat(i.shipping) > 0);
    const logo = iss.logoDataUrl;
    const initials = (iss.name || "").split(" ").map(w => w[0]).join("").slice(0, 2) || "N!";
    const quoteNumberLabel = fmtQuoteNumber(q.number);
    const fileNumber = q.number != null ? pad(q.number) : "sin_numero";
    const filename = `Cotizacion_${fileNumber}_${(q.client?.name || "").replace(/\s+/g, "_") || "cliente"}`;

    const logoHtml = logo
      ? `<img src="${logo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;display:block"/>`
      : `<div style="width:52px;height:52px;border-radius:50%;background:#000;display:table-cell;text-align:center;vertical-align:middle;flex-shrink:0"><span style="color:#fff;font-size:16px;font-weight:700">${initials}</span></div>`;

    const equipmentRows = q.equipment?.enabled
      ? [["Marca", q.equipment.brand], ["Modelo", q.equipment.model], ["N° Serie", q.equipment.serial], ["Año", q.equipment.year], ["Obs.", q.equipment.extra]]
        .filter(([, v]) => v)
        .map(([l, v]) => `<tr><td style="font-size:9pt;color:#535353;font-weight:600;padding-right:8px;padding-bottom:2px;white-space:nowrap">${l}:</td><td style="font-size:9pt;color:#000;padding-bottom:2px">${v}</td></tr>`)
        .join("")
      : "";

    const itemRowsHtml = q.items.filter(i => i.description.trim()).map(item => {
      const sv = (parseFloat(item.unitPrice) || 0) * (parseFloat(item.qty) || 0);
      return `<tr>
        <td style="padding:8px 0;font-size:9pt;color:#000;vertical-align:top;border-bottom:0.5pt solid #535353">
          <strong>${item.description}</strong>
          ${item.link ? `<br/><a href="${item.link}" style="color:#2563eb;font-size:8pt">${item.link}</a>` : ""}
        </td>
        <td style="padding:8px 6px;font-size:9pt;color:#000;text-align:center;vertical-align:top;border-bottom:0.5pt solid #535353">${item.qty} ${parseFloat(item.qty) === 1 ? "Unidad" : "Unidades"}</td>
        <td style="padding:8px 6px;font-size:9pt;color:#000;text-align:center;vertical-align:top;border-bottom:0.5pt solid #535353">${fmtNum(item.unitPrice, q.currency)}</td>
        ${hasShp ? `<td style="padding:8px 6px;font-size:9pt;color:#000;text-align:center;vertical-align:top;border-bottom:0.5pt solid #535353">${item.shipping ? fmtNum(item.shipping, q.currency) : "—"}</td>` : ""}
        <td style="padding:8px 0;font-size:9pt;color:#000;text-align:right;vertical-align:top;border-bottom:0.5pt solid #535353">${fmtNum(sv, q.currency)}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${filename}</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Barlow',sans-serif;background:#fff;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{size:A4;margin:0}
    @media print{html,body{width:210mm}body{margin:0;padding:0}}
    .doc{width:210mm;margin:0 auto;background:#fff}
    .hdr{background:#f5f5f5;padding:20px 32px 18px;display:table;width:100%;table-layout:fixed}
    .hdr-l{display:table-cell;vertical-align:top}
    .hdr-r{display:table-cell;vertical-align:top;text-align:right;white-space:nowrap;padding-left:16px;width:180px}
    .logo-row{display:flex;align-items:flex-start;gap:12px}
    .body{padding:24px 32px 20px}
    .cli-tbl{display:table;width:100%;margin-bottom:20px}
    .cli-l{display:table-cell;vertical-align:top;width:50%}
    .cli-r{display:table-cell;vertical-align:top;width:50%;padding-left:18px;border-left:1pt solid #e0e0e0}
    .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:8pt;font-weight:700;letter-spacing:.5px;background:${sc.bg};color:${sc.color};border:1pt solid ${sc.bd}}
    table.items{width:100%;border-collapse:collapse;margin-bottom:14px}
    .ftr{border-top:0.5pt solid #ccc;padding:10px 32px;text-align:center;margin-top:6px}
    .tot-wrap{display:table;margin-left:auto;margin-bottom:20px}
    .tot-row{display:table-row}
    .tot-lbl{display:table-cell;font-size:9pt;color:#535353;padding-right:24px;padding-bottom:1px}
    .tot-val{display:table-cell;font-size:9pt;color:#535353;text-align:right;padding-bottom:1px}
    .tot-final-lbl{display:table-cell;font-size:12pt;font-weight:700;color:#535353;padding-right:16px;padding-top:3px}
    .tot-final-val{display:table-cell;font-size:12pt;font-weight:700;color:#535353;text-align:right;padding-top:3px}
  </style>
</head>
<body>
<div class="doc">
  <div class="hdr">
    <div class="hdr-l">
      <div class="logo-row">
        ${logoHtml}
        <div style="line-height:1.55">
          <div style="font-size:13pt;font-weight:600;color:#000">${iss.name || ""}</div>
          ${iss.title ? `<div style="font-size:9pt;color:#000">${iss.title}</div>` : ""}
          ${iss.website ? `<div style="font-size:9pt;color:#000">${iss.website}</div>` : ""}
          ${iss.phone ? `<div style="font-size:9pt;color:#000">${iss.phone}</div>` : ""}
          ${iss.email ? `<div style="font-size:9pt;color:#000">${iss.email}</div>` : ""}
        </div>
      </div>
    </div>
    <div class="hdr-r">
      <div style="font-size:11pt;font-weight:600;color:#000">Cotización Nro: <strong>${quoteNumberLabel}</strong></div>
      <div style="font-size:8pt;color:#535353;margin-top:5px">Emisión: ${fmtDate(q.issueDate)}</div>
      <div style="font-size:8pt;color:${exp ? "#dc2626" : "#535353"}">Válida hasta: ${fmtDate(q.validUntil)}${exp ? " ⚠" : ""}</div>
      <div style="margin-top:7px"><span class="badge">${SL[q.status].toUpperCase()}</span></div>
    </div>
  </div>

  <div class="body">
    <div class="cli-tbl">
      <div class="cli-l">
        ${q.client.name ? `<div style="font-size:13pt;font-weight:700;color:#000">${q.client.name}</div>` : ""}
        ${q.client.contact ? `<div style="font-size:9pt;color:#000;margin-top:2px">${q.client.contact}</div>` : ""}
        ${q.client.rut ? `<div style="font-size:9pt;color:#000">RUT: ${q.client.rut}</div>` : ""}
        ${q.client.phone ? `<div style="font-size:9pt;color:#000">Tel: ${q.client.phone}</div>` : ""}
        ${q.client.website ? `<div style="font-size:9pt;color:#000">${q.client.website}</div>` : ""}
      </div>
      ${q.equipment?.enabled && equipmentRows
        ? `<div class="cli-r">
            <div style="font-size:8pt;font-weight:700;color:#535353;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">Detalle del equipo</div>
            <table style="border-collapse:collapse"><tbody>${equipmentRows}</tbody></table>
          </div>`
        : `<div class="cli-r" style="border:none"></div>`}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="padding:0 0 7px 0;text-align:left;font-size:10pt;font-weight:600;color:#000;width:40%">Articulo</th>
          <th style="padding:0 6px 7px;text-align:center;font-size:10pt;font-weight:600;color:#000">Cantidad</th>
          <th style="padding:0 6px 7px;text-align:center;font-size:10pt;font-weight:600;color:#000">Precio Uni.</th>
          ${hasShp ? `<th style="padding:0 6px 7px;text-align:center;font-size:10pt;font-weight:600;color:#000">Envío</th>` : ""}
          <th style="padding:0 0 7px;text-align:right;font-size:10pt;font-weight:600;color:#000">SUBTOTAL</th>
        </tr>
        <tr><td colspan="${hasShp ? 5 : 4}" style="padding:0"><div style="height:0.5pt;background:#535353"></div></td></tr>
      </thead>
      <tbody>${itemRowsHtml}</tbody>
    </table>

    <div class="tot-wrap">
      ${shp > 0 ? `
      <div class="tot-row"><div class="tot-lbl">Subtotal</div><div class="tot-val">${fmtNum(sub, q.currency)}</div></div>
      <div class="tot-row"><div class="tot-lbl">Envío</div><div class="tot-val">${fmtNum(shp, q.currency)}</div></div>` : ""}
      <div class="tot-row"><div class="tot-final-lbl">Total:</div><div class="tot-final-val">${fmtNum(total, q.currency)}</div></div>
    </div>

    ${q.notes ? `
    <div style="margin-bottom:18px">
      <div style="font-size:9pt;font-weight:700;color:#535353;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px">Notas y condiciones</div>
      <div style="height:0.5pt;background:#535353;margin-bottom:7px"></div>
      <div style="font-size:9pt;color:#535353;line-height:1.7;white-space:pre-line">${q.notes}</div>
    </div>`: ""}

    ${(iss.bank || iss.accountNumber) ? `
    <div style="margin-bottom:14px">
      <div style="font-size:9pt;font-weight:600;color:#535353;text-transform:uppercase;letter-spacing:.8px;margin-bottom:7px">Información de pago</div>
      <div style="font-size:8.5pt;color:#535353;line-height:1.9">
        ${iss.bank ? `<div><span style="font-weight:500">Banco:</span> ${iss.bank}</div>` : ""}
        ${iss.accountName ? `<div><span style="font-weight:500">Nombre:</span> ${iss.accountName}</div>` : ""}
        ${iss.accountNumber ? `<div><span style="font-weight:500">Número de cuenta:</span> ${iss.accountNumber}</div>` : ""}
        ${iss.accountType ? `<div><span style="font-weight:500">Tipo de cuenta:</span> ${iss.accountType}</div>` : ""}
      </div>
    </div>`: ""}
  </div>

  <div class="ftr">
    <div style="font-size:7.5pt;color:#535353;font-weight:500;line-height:1.8">${iss.name || ""}${iss.title ? ` · ${iss.title}` : ""}</div>
    <div style="font-size:7.5pt;color:#535353;line-height:1.8">${iss.email ? `Correo electrónico: ${iss.email}` : ""}${iss.email && iss.phone ? "  │  " : ""}${iss.phone ? `Teléfono: ${iss.phone}` : ""}</div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() {
      document.title = "${filename}";
      window.print();
      setTimeout(function(){ window.close(); }, 1500);
    }, 1200);
  };
</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      resolve(false);
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    resolve(true);
  });
}

function getViewportFlags() {
  if (typeof window === "undefined") {
    return { isPortrait: false, isNarrow: false, isCompact: false };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height >= width;

  return {
    isPortrait,
    isNarrow: width <= 1080,
    isCompact: width <= 760 || (isPortrait && width <= 980),
  };
}

function useResponsiveLayout() {
  const [layout, setLayout] = useState(getViewportFlags);

  useEffect(() => {
    const updateLayout = () => setLayout(getViewportFlags());
    updateLayout();
    window.addEventListener("resize", updateLayout);

    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  return layout;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  APP                                                               */
/* ═══════════════════════════════════════════════════════════════════ */

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [issuer, setIssuer] = useState(DEF_ISS);
  const [view, setView] = useState("list");
  const [cur, setCur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const responsive = useResponsiveLayout();

  const notify = (msg, t = "ok") => { setToast({ msg, t }); setTimeout(() => setToast(null), 2800) };
  const refreshApp = () => setRefreshKey((prev) => prev + 1);

  const resetAppState = () => {
    setProfile(null);
    setProfiles([]);
    setQuotes([]);
    setClients([]);
    setIssuer(DEF_ISS);
    setCur(null);
    setView("list");
  };

  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        const nextSession = await getSession();
        if (!active) return;
        setSession(nextSession);
      } catch {
        if (!active) return;
        setAuthError("No se pudo verificar la sesión actual.");
      } finally {
        if (active) setAuthReady(true);
      }
    }

    initAuth();

    const { data: { subscription } } = onAuthStateChange((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!session) {
      resetAppState();
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAuthenticatedState() {
      try {
        setLoading(true);
        setAuthError(null);

        const nextProfile = await fetchMyProfile();

        if (!nextProfile) {
          await signOutUser();
          if (!cancelled) setAuthError("Tu usuario no tiene un perfil asignado. Pide a un administrador que lo cree.");
          return;
        }

        if (!nextProfile.isActive) {
          await signOutUser();
          if (!cancelled) setAuthError("Tu usuario está desactivado.");
          return;
        }

        if (cancelled) return;

        setProfile(nextProfile);

        if (nextProfile.role === "client") {
          setQuotes([]);
          setClients([]);
          setIssuer(DEF_ISS);
          setProfiles([]);
          setView((prev) => prev === "admin" ? "list" : prev);
          return;
        }

        const tasks = [fetchQuotes(), fetchClients(), fetchIssuer()];
        if (nextProfile.role === "admin") tasks.push(fetchProfiles());
        const [qs, cs, iss, allProfiles] = await Promise.all(tasks);

        if (cancelled) return;

        setQuotes(qs);
        setClients(cs);
        setIssuer(iss);
        setProfiles(allProfiles ?? []);

        if (nextProfile.role !== "admin") {
          setView((prev) => prev === "admin" ? "list" : prev);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setAuthError(err.message || "No se pudo cargar la información de la cuenta.");
        notify("Error al cargar: " + (err.message || "desconocido"), "err");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAuthenticatedState();

    return () => {
      cancelled = true;
    };
  }, [authReady, session, refreshKey]);

  const totals = (items) => calcTotals(items);

  const handleLogin = async ({ email, password }) => {
    setAuthError(null);
    await signInUser(email, password);
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setAuthError(null);
    } catch {
      notify("No se pudo cerrar la sesión.", "err");
    }
  };

  const handleResendVerification = async (email) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) throw new Error("Ingresa un email válido.");

    await resendSignupVerification(normalizedEmail);
    notify("Se reenvió el correo de verificación ✓", "ok");
  };

  const handleRecoverPassword = async (email) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) throw new Error("Ingresa un email válido.");

    await sendPasswordRecovery(normalizedEmail);
    notify("Correo de recuperación enviado ✓", "ok");
  };

  const handleSendMagicLink = async (email) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) throw new Error("Ingresa un email válido.");

    await sendMagicLink(normalizedEmail);
    notify("Magic link enviado ✓", "ok");
  };

  const newQ = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const nextNumber = await getNextNumber();
      setCur({ ...mkQuote(issuer, profile.id), number: nextNumber });
      setView("editor");
    } catch (err) {
      console.error("No se pudo obtener el siguiente número de cotización", err);
      notify("No se pudo obtener el siguiente número. Puedes seguir y se asignará al guardar.", "info");
      setCur(mkQuote(issuer, profile.id));
      setView("editor");
    } finally { setSaving(false); }
  };

  const editQ = async (q) => {
    try {
      setSaving(true);
      const full = q.items?.length > 0 ? q : await fetchQuote(q.id);
      setCur({ ...full }); setView("editor");
    } catch { notify("Error al cargar", "err"); }
    finally { setSaving(false); }
  };

  const prevQ = async (q) => {
    try {
      setSaving(true);
      const full = (q.number === null || q.items?.length > 0) ? q : await fetchQuote(q.id);
      setCur({ ...full }); setView("preview");
    } catch { notify("Error al cargar", "err"); }
    finally { setSaving(false); }
  };

  const saveQ = async (q) => {
    if (!profile) return;
    try {
      setSaving(true);
      const nextQuote = { ...q, userId: q.userId ?? profile.id };
      const isNew = !quotes.some((x) => x.id === nextQuote.id);
      const saved = await dbSave(nextQuote, isNew);
      setQuotes(prev => {
        const idx = prev.findIndex(x => x.id === saved.id);
        const nextSavedQuote = withQuoteSummary({ ...saved, items: nextQuote.items });
        if (idx >= 0) { const n = [...prev]; n[idx] = nextSavedQuote; return n; }
        return [nextSavedQuote, ...prev];
      });
      try {
        const cs = await fetchClients();
        setClients(cs);
      } catch (err) {
        console.warn("No se pudo refrescar el historial de clientes", err);
      }

      const iss = { ...issuer, ...q.issuer };
      notify("Cotización guardada ✓");
      setView("list");

      try {
        const pdfOk = await generatePDF({ ...q, number: saved.number }, iss);
        if (!pdfOk) {
          notify("Cotización guardada. El navegador bloqueó el PDF.", "info");
        }
      } catch (err) {
        console.error("Error al generar PDF", err);
        notify("Cotización guardada. No se pudo generar el PDF.", "info");
      }
    } catch (err) { notify("Error: " + err.message, "err"); console.error(err); }
    finally { setSaving(false); }
  };

  const delQ = async (id) => {
    try {
      setSaving(true);
      await dbDelete(id);
      setQuotes(prev => prev.filter(q => q.id !== id));
      notify("Eliminada", "info");
    } catch { notify("Error al eliminar", "err"); }
    finally { setSaving(false); }
  };

  const dupQ = async (q) => {
    try {
      setSaving(true);
      const full = q.items?.length > 0 ? q : await fetchQuote(q.id);
      const dup = await dbDuplicate(full);
      setQuotes(prev => [dup, ...prev]);
      notify("Duplicada ✓");
    } catch { notify("Error al duplicar", "err"); }
    finally { setSaving(false); }
  };

  const saveIssuerData = async (data) => {
    try {
      setSaving(true);
      await dbSaveIssuer(data);
      setIssuer(data);
      notify("Ajustes guardados ✓");
      setView("list");
    } catch { notify("Error al guardar ajustes", "err"); }
    finally { setSaving(false); }
  };

  const delClient = async (id) => {
    try { await deleteClient(id); setClients(prev => prev.filter(c => c.id !== id)); }
    catch { notify("Error al eliminar cliente", "err"); }
  };

  const saveClientData = async (client) => {
    if (!profile) throw new Error("No hay una sesión activa.");
    try {
      const id = await dbSaveClient({ ...client, userId: client.userId ?? profile.id });
      const updated = { ...client, id, userId: client.userId ?? profile.id };
      setClients(prev => {
        if (client.id) return prev.map(c => c.id === client.id ? updated : c);
        return [updated, ...prev];
      });
      notify(client.id ? "Cliente actualizado ✓" : "Cliente creado ✓");
      return id;
    } catch (err) { notify("Error al guardar cliente: " + err.message, "err"); throw err; }
  };

  const handleCreateUser = async (data) => {
    try {
      setSaving(true);
      const created = await createManagedUser(data);
      setProfiles((prev) => [created, ...prev]);
      notify("Usuario creado ✓");
      return created;
    } catch (err) {
      notify("Error al crear usuario: " + err.message, "err");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (id, updates) => {
    try {
      setSaving(true);
      const updated = await updateProfile(id, updates);
      setProfiles((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));

      if (profile?.id === id) {
        setProfile(updated);

        if (!updated.isActive) {
          await signOutUser();
          setAuthError("Tu usuario fue desactivado.");
          return updated;
        }

        if (updated.role !== "admin" && view === "admin") {
          setView("list");
        }
      }

      notify("Usuario actualizado ✓");
      return updated;
    } catch (err) {
      notify("Error al actualizar usuario: " + err.message, "err");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || (session && !profile && loading)) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, background: "#f5f5f5" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #ddd", borderTopColor: "#000", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: C.gray, fontWeight: 500 }}>Verificando sesión…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!session) {
    return (
      <LoginView
        onSubmit={handleLogin}
        onRecoverPassword={handleRecoverPassword}
        onSendMagicLink={handleSendMagicLink}
        onResendVerification={handleResendVerification}
        error={authError}
      />
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "#f5f5f5", fontFamily: F }}>
        <Sec style={{ maxWidth: 480, width: "100%" }}>
          <p style={{ fontSize: 11, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Acceso bloqueado</p>
          <h2 style={{ fontSize: 24, color: C.black, marginBottom: 10 }}>No se pudo cargar tu perfil</h2>
          <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.6, marginBottom: 18 }}>
            {authError || "La cuenta existe en Auth, pero no tiene permisos configurados en profiles."}
          </p>
          <Btn s onClick={handleLogout}>Cerrar sesión</Btn>
        </Sec>
      </div>
    );
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, background: "#f5f5f5" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #ddd", borderTopColor: "#000", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: C.gray, fontWeight: 500 }}>Cargando cotizaciones…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (profile.role === "client") {
    return (
      <div style={{ minHeight: "100vh", padding: 24, background: "#f1f1f1", fontFamily: F }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 11, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px" }}>Sesión activa</p>
              <h1 style={{ fontSize: 24, color: C.black, marginTop: 4 }}>{profile.fullName || profile.email}</h1>
            </div>
            <Btn onClick={handleLogout}>Cerrar sesión</Btn>
          </div>
          <Sec>
            <p style={{ fontSize: 11, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 10 }}>Portal cliente</p>
            <h2 style={{ fontSize: 22, color: C.black, marginBottom: 10 }}>Acceso de solo lectura en preparación</h2>
            <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.7 }}>
              Tu cuenta ya está identificada como cliente, pero esta vista todavía no expone cotizaciones en modo lectura. La infraestructura de sesión y roles ya quedó lista para incorporarla después.
            </p>
          </Sec>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#e8e8e8", fontFamily: F, position: "relative", paddingTop: 72 }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        input,textarea,select,button{font-family:${F}}
        button{cursor:pointer}
        .fd{animation:fd .18s ease}
        @keyframes fd{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes progress{0%{width:0;opacity:1}80%{width:100%;opacity:1}100%{width:100%;opacity:0}}
        input:focus,textarea:focus,select:focus{outline:2px solid #000;outline-offset:1px;border-color:#000!important}
        @media print{body>*{display:none!important}#PDFDOC{display:block!important;position:fixed;inset:0;background:white;overflow:auto;z-index:99999}.NOPRINT{display:none!important}}
      `}</style>

      {saving && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#000", animation: "progress 1.2s ease infinite", zIndex: 9999 }} />}

      <div style={{ position: "fixed", top: 14, right: 14, left: 14, zIndex: 9998, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto", width: "min(1120px, 100%)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,.9)", border: "1px solid rgba(0,0,0,.08)", boxShadow: "0 12px 32px rgba(0,0,0,.08)", backdropFilter: "blur(14px)" }}>
          <div>
            <div style={{ fontSize: 11, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px" }}>{profile.role === "admin" ? "Administrador" : "Usuario"}</div>
            <div style={{ fontSize: 14, color: C.black, fontWeight: 700 }}>{profile.fullName || profile.email}</div>
            <div style={{ fontSize: 12, color: C.gray }}>{profile.email}</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {profile.role === "admin" && (
              <Btn g onClick={() => setView((prev) => prev === "admin" ? "list" : "admin")}>
                {view === "admin" ? "Volver a la app" : "Usuarios"}
              </Btn>
            )}
            <Btn g onClick={refreshApp}>Recargar</Btn>
            <Btn g onClick={handleLogout}>Cerrar sesión</Btn>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: toast.t === "ok" ? "#000" : toast.t === "err" ? "#dc2626" : "#555", color: "#fff", padding: "9px 18px", borderRadius: 5, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.2)", animation: "fd .2s ease" }}>
          {toast.msg}
        </div>
      )}

      {authError && (
        <div style={{ position: "fixed", top: 84, left: "50%", transform: "translateX(-50%)", zIndex: 9997, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }}>
          {authError}
        </div>
      )}

      {view === "admin" && profile.role === "admin" && (
        <AdminView
          profiles={profiles}
          currentUserId={profile.id}
          onBack={() => setView("list")}
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onResendVerification={handleResendVerification}
        />
      )}
      {view === "list" && <ListView quotes={quotes} onNew={newQ} onEdit={editQ} onPreview={prevQ} onDelete={delQ} onDup={dupQ} onSettings={() => setView("settings")} onClients={() => setView("clients")} totals={totals} responsive={responsive} />}
      {view === "editor" && <EditorView quote={cur} onSave={saveQ} onCancel={() => setView("list")} onPreview={q => { setCur(q); setView("preview") }} totals={totals} clients={clients} issuer={issuer} responsive={responsive} />}
      {view === "preview" && <PreviewView quote={cur} onBack={() => setView("editor")} onList={() => setView("list")} totals={totals} issuer={issuer} onExport={(q, iss) => generatePDF(q, iss)} responsive={responsive} />}
      {view === "settings" && <SettingsView issuer={issuer} clients={clients} onSave={saveIssuerData} onDelClient={delClient} onBack={() => setView("list")} responsive={responsive} />}
      {view === "clients" && <ClientsView clients={clients} onSave={saveClientData} onDelete={delClient} onBack={() => setView("list")} responsive={responsive} />}
    </div>
  );
}

/* ─── LIST ─────────────────────────────────────────────────────────── */
function ListView({ quotes, onNew, onEdit, onPreview, onDelete, onDup, onSettings, onClients, totals, responsive }) {
  const [flt, setFlt] = useState("all");
  const [srch, setSrch] = useState("");
  const { isCompact } = responsive;
  const rows = quotes.filter(q => (flt === "all" || q.status === flt) && (q.client?.name?.toLowerCase().includes(srch.toLowerCase()) || String(q.number).includes(srch)));
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
          <button key={s} onClick={() => setFlt(s)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: ".5px", border: `1.5px solid ${flt === s ? "#000" : "#ccc"}`, background: flt === s ? "#000" : "#fff", color: flt === s ? "#fff" : "#666", transition: "all .12s" }}>
            {s === "all" ? "TODAS" : SL[s].toUpperCase()}
          </button>
        ))}
        <input value={srch} onChange={e => setSrch(e.target.value)} placeholder="Buscar…" style={{ marginLeft: isCompact ? 0 : "auto", padding: "5px 13px", borderRadius: 20, border: "1.5px solid #ccc", fontSize: 13, width: isCompact ? "100%" : 180, background: "#fff" }} />
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 0", color: C.gray }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 15, fontWeight: 500 }}>No hay cotizaciones aún.</p>
          <button onClick={onNew} style={{ marginTop: 18, padding: "9px 22px", background: "#000", color: "#fff", border: "none", borderRadius: 5, fontSize: 13, fontWeight: 600 }}>Crear la primera</button>
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
                    <div style={{ fontSize: 12, color: C.gray, fontWeight: 700, letterSpacing: ".6px" }}>#{pad(q.number)}</div>
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
                  <button onClick={() => { if (confirm("¿Eliminar?")) onDelete(q.id) }} style={{ flex: "1 1 120px", padding: "8px 18px", borderRadius: 5, fontSize: 13, fontWeight: 600, border: "1.5px solid #dc2626", background: "#fff", color: "#dc2626", fontFamily: F }}>Eliminar</button>
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
                  <tr key={q.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f0f0f0" : "none", transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: C.black }}>#{pad(q.number)}</td>
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
                        <IB title="Eliminar" d onClick={() => { if (confirm("¿Eliminar?")) onDelete(q.id) }}>🗑</IB>
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

/* ─── EDITOR ────────────────────────────────────────────────────────── */
function EditorView({ quote: init, onSave, onCancel, onPreview, totals, clients, issuer, responsive }) {
  const [q, setQ] = useState(init);
  const [cs, setCs] = useState(init.client?.name || "");
  const [dd, setDd] = useState(false);
  const { isCompact, isNarrow } = responsive;

  const sc = (f, v) => setQ(p => ({ ...p, client: { ...p.client, [f]: v } }));
  const se = (f, v) => setQ(p => ({ ...p, equipment: { ...p.equipment, [f]: v } }));
  const si = (f, v) => setQ(p => ({ ...p, issuer: { ...p.issuer, [f]: v } }));
  const itm = (id, f, v) => setQ(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [f]: v } : i) }));
  const addI = () => setQ(p => ({ ...p, items: [...p.items, mkItem()] }));
  const rmI = (id) => setQ(p => ({ ...p, items: p.items.filter(i => i.id !== id) }));

  const { sub, shp, total } = totals(q.items);
  const fltC = clients.filter(c => c.name.toLowerCase().includes(cs.toLowerCase()));
  const iss = { ...issuer, ...q.issuer };

  const handleLogo = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = (ev) => si("logoDataUrl", ev.target.result); r.readAsDataURL(f);
  };

  const go = () => {
    if (!q.items.some(i => i.description.trim())) { alert("Agrega al menos un ítem."); return }
    onSave(q);
  };

  const topGridColumns = isCompact ? "1fr" : isNarrow ? "1fr 1fr" : "1fr 1fr 1fr";
  const issuerGridColumns = isCompact ? "1fr" : isNarrow ? "1fr 1fr" : "1fr 1fr 1fr";

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: isCompact ? "24px 14px 90px" : "32px 20px" }} className="fd">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isCompact ? "stretch" : "center", flexDirection: isCompact ? "column" : "row", gap: isCompact ? 14 : 0, marginBottom: 22 }}>
        <div>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: C.gray, fontSize: 13, padding: 0, fontWeight: 500 }}>← Volver</button>
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
          <F2 l="Estado"><select value={q.status} onChange={e => setQ(p => ({ ...p, status: e.target.value }))} style={IS}>{Object.entries(SL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F2>
          <F2 l="Fecha de emisión"><input type="date" value={q.issueDate} onChange={e => setQ(p => ({ ...p, issueDate: e.target.value }))} style={IS} /></F2>
          <F2 l="Válida hasta"><input type="date" value={q.validUntil} onChange={e => setQ(p => ({ ...p, validUntil: e.target.value }))} style={IS} /></F2>
          <F2 l="Moneda"><select value={q.currency} onChange={e => setQ(p => ({ ...p, currency: e.target.value }))} style={IS}><option value="CLP">CLP – Peso Chileno</option><option value="USD">USD – Dólar</option><option value="UF">UF</option></select></F2>
        </Sec>

        <Sec t="Datos del cliente">
          <F2 l="Nombre / Empresa">
            <div style={{ position: "relative" }}>
              <input value={cs} onChange={e => { setCs(e.target.value); sc("name", e.target.value); setDd(true) }} onFocus={() => setDd(true)} onBlur={() => setTimeout(() => setDd(false), 180)} placeholder="Buscar o escribir…" style={IS} />
              {dd && fltC.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 6, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,.1)", maxHeight: 150, overflowY: "auto" }}>
                  {fltC.map(c => (
                    <div key={c.id} onMouseDown={() => { setQ(p => ({ ...p, client: { name: c.name, contact: c.contact || "", website: c.website || "", rut: c.rut || "", phone: c.client_phone || "" } })); setCs(c.name); setDd(false) }} style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f4f4f4" }} onMouseEnter={e => e.currentTarget.style.background = "#f8f8f8"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      <strong>{c.name}</strong>{c.contact && <span style={{ color: C.gray, marginLeft: 6, fontWeight: 400 }}>{c.contact}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </F2>
          <F2 l="Contacto"><input value={q.client.contact} onChange={e => sc("contact", e.target.value)} placeholder="Nombre del contacto" style={IS} /></F2>
          <F2 l="RUT"><input value={q.client.rut} onChange={e => sc("rut", e.target.value)} placeholder="12.345.678-9" style={IS} /></F2>
          <F2 l="Teléfono"><input value={q.client.phone || ""} onChange={e => sc("phone", e.target.value)} placeholder="+56 9 1234 5678" style={IS} /></F2>
          <F2 l="Sitio web"><input value={q.client.website} onChange={e => sc("website", e.target.value)} placeholder="https://…" style={IS} /></F2>
        </Sec>

        <Sec t="Detalle del equipo">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: q.equipment?.enabled ? 14 : 0 }}>
            <button onClick={() => se("enabled", !q.equipment?.enabled)} style={{ width: 38, height: 22, borderRadius: 11, border: "none", background: q.equipment?.enabled ? "#000" : "#ccc", position: "relative", transition: "background .2s", flexShrink: 0 }}>
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
                    {q.items.length > 1 && <button onClick={() => rmI(item.id)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 22, lineHeight: 1 }}>×</button>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    <F2 l="Descripción"><input value={item.description} onChange={e => itm(item.id, "description", e.target.value)} placeholder="Producto o servicio…" style={IS} /></F2>
                    <F2 l="Link"><input value={item.link} onChange={e => itm(item.id, "link", e.target.value)} placeholder="https://…" style={IS} /></F2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                      <F2 l="Cant."><input type="number" min="1" value={item.qty} onChange={e => itm(item.id, "qty", e.target.value)} style={IS} /></F2>
                      <F2 l="Envío"><input type="number" min="0" value={item.shipping} onChange={e => itm(item.id, "shipping", e.target.value)} placeholder="0" style={IS} /></F2>
                    </div>
                    <F2 l="Precio unit. (líquido)"><input type="number" min="0" value={item.unitPrice} onChange={e => itm(item.id, "unitPrice", e.target.value)} placeholder="0" style={IS} /></F2>
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
                      <td style={{ padding: "7px 6px" }}><input value={item.description} onChange={e => itm(item.id, "description", e.target.value)} placeholder="Producto o servicio…" style={{ ...IS, minWidth: 170 }} /></td>
                      <td style={{ padding: "7px 6px" }}><input value={item.link} onChange={e => itm(item.id, "link", e.target.value)} placeholder="https://…" style={{ ...IS, minWidth: 120 }} /></td>
                      <td style={{ padding: "7px 6px" }}><input type="number" min="1" value={item.qty} onChange={e => itm(item.id, "qty", e.target.value)} style={{ ...IS, width: 58 }} /></td>
                      <td style={{ padding: "7px 6px" }}><input type="number" min="0" value={item.unitPrice} onChange={e => itm(item.id, "unitPrice", e.target.value)} placeholder="0" style={{ ...IS, width: 120 }} /></td>
                      <td style={{ padding: "7px 6px" }}><input type="number" min="0" value={item.shipping} onChange={e => itm(item.id, "shipping", e.target.value)} placeholder="0" style={{ ...IS, width: 95 }} /></td>
                      <td style={{ padding: "7px 6px", fontWeight: 700, color: C.black, whiteSpace: "nowrap" }}>{fmtNum(sv, q.currency)}</td>
                      <td style={{ padding: "7px 6px" }}>{q.items.length > 1 && <button onClick={() => rmI(item.id)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 18, lineHeight: 1 }}>×</button>}</td>
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
        <textarea value={q.notes} onChange={e => setQ(p => ({ ...p, notes: e.target.value }))} placeholder="Consideraciones, condiciones al pie…" rows={4} style={{ ...IS, width: "100%", resize: "vertical" }} />
      </Sec>
    </div>
  );
}

/* ─── PREVIEW ───────────────────────────────────────────────────────── */
function PreviewView({ quote: q, onBack, onList, totals, issuer: gIss, onExport, responsive }) {
  const iss = { ...gIss, ...q.issuer };
  const { sub, shp, total } = totals(q.items);
  const sc = SC[q.status];
  const exp = q.status === "sent" && q.validUntil < today();
  const hasShp = q.items.some(i => parseFloat(i.shipping) > 0);
  const logo = iss.logoDataUrl;
  const quoteNumberLabel = fmtQuoteNumber(q.number);
  const initials = (iss.name || "").split(" ").map(w => w[0]).join("").slice(0, 2) || "N!";
  const { isCompact } = responsive;

  return (
    <div style={{ minHeight: "100vh", background: "#c8c8c8", padding: isCompact ? "20px 12px 90px" : "28px 16px", fontFamily: F }}>
      <div style={{ maxWidth: 680, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", alignItems: isCompact ? "stretch" : "center", flexDirection: isCompact ? "column" : "row", gap: isCompact ? 10 : 0 }}>
        <div style={{ display: "flex", gap: 8, width: isCompact ? "100%" : "auto", flexWrap: "wrap" }}>
          <Btn g onClick={onBack} style={{ flex: isCompact ? "1 1 100%" : "0 0 auto" }}>← Editar</Btn>
          <Btn g onClick={onList} style={{ flex: isCompact ? "1 1 100%" : "0 0 auto" }}>Lista</Btn>
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
                    {item.link && <p style={{ marginTop: 4 }}><a href={item.link} style={{ color: "#2563eb", fontSize: 10, textDecoration: "none", wordBreak: "break-all" }}>{item.link}</a></p>}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
                      <div><div style={{ fontSize: 9, color: C.gray, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Cantidad</div><div style={{ fontSize: 11, color: C.black }}>{item.qty} {parseFloat(item.qty) === 1 ? "Unidad" : "Unidades"}</div></div>
                      <div><div style={{ fontSize: 9, color: C.gray, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Precio Uni.</div><div style={{ fontSize: 11, color: C.black }}>{fmtNum(item.unitPrice, q.currency)}</div></div>
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
                  <th style={{ ...THS, width: "40%" }}>Articulo</th>
                  <th style={{ ...THS, textAlign: "center" }}>Cantidad</th>
                  <th style={{ ...THS, textAlign: "center" }}>Precio Uni.</th>
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
                        {item.link && <p style={{ marginTop: 2 }}><a href={item.link} style={{ color: "#2563eb", fontSize: 9, textDecoration: "none" }}>{item.link}</a></p>}
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

/* ─── SETTINGS ──────────────────────────────────────────────────────── */
function SettingsView({ issuer: init, clients, onSave, onDelClient, onBack, responsive }) {
  const [f, setF] = useState(init);
  const { isCompact } = responsive;
  const s = (k, v) => setF(p => ({ ...p, [k]: v }));
  const handleLogo = (e) => { const fl = e.target.files[0]; if (!fl) return; const r = new FileReader(); r.onload = (ev) => s("logoDataUrl", ev.target.result); r.readAsDataURL(fl) };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: isCompact ? "24px 14px 90px" : "36px 20px" }} className="fd">
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.gray, fontSize: 13, marginBottom: 16, cursor: "pointer", fontWeight: 500 }}>← Volver</button>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.black, marginBottom: 24 }}>Ajustes del emisor</h2>

      <Sec t="Logotipo" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: isCompact ? "flex-start" : "center", flexDirection: isCompact ? "column" : "row", gap: 18 }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#000", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {f.logoDataUrl ? <img src={f.logoDataUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{(f.name || "N").charAt(0)}</span>}
          </div>
          <div>
            <label style={{ cursor: "pointer", display: "inline-block", padding: "8px 18px", background: C.bgTop, border: "1.5px solid #ccc", borderRadius: 5, fontSize: 13, fontWeight: 600, color: C.gray }}>
              {f.logoDataUrl ? "Cambiar logotipo" : "Subir logotipo"} (PNG/JPG)
              <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
            </label>
            {f.logoDataUrl && <button onClick={() => s("logoDataUrl", null)} style={{ marginLeft: 10, background: "none", border: "none", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>Quitar</button>}
            <p style={{ fontSize: 11, color: C.gray, marginTop: 6 }}>Aparece en el encabezado. Recomendado: imagen cuadrada.</p>
          </div>
        </div>
      </Sec>

      <Sec t="Datos personales" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 14 }}>
          {[["name", "Nombre completo"], ["title", "Título / Profesión"], ["email", "Email"], ["phone", "Teléfono"], ["website", "Sitio web"]].map(([k, l]) => (
            <F2 key={k} l={l}><input value={f[k] || ""} onChange={e => s(k, e.target.value)} style={IS} /></F2>
          ))}
        </div>
      </Sec>

      <Sec t="Información de pago" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 14 }}>
          {[["bank", "Banco"], ["accountName", "Nombre de cuenta"], ["accountNumber", "N° de cuenta"], ["accountType", "Tipo de cuenta"]].map(([k, l]) => (
            <F2 key={k} l={l}><input value={f[k] || ""} onChange={e => s(k, e.target.value)} style={IS} /></F2>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <Btn s onClick={() => onSave(f)} style={{ width: isCompact ? "100%" : "auto" }}>Guardar ajustes</Btn>
        </div>
      </Sec>

      {clients.length > 0 && (
        <Sec t={`Historial de clientes (${clients.length})`}>
          {clients.map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: isCompact ? "flex-start" : "center", flexDirection: isCompact ? "column" : "row", gap: isCompact ? 8 : 12, padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
              <div>
                <strong style={{ fontSize: 14 }}>{c.name}</strong>
                {c.contact && <div style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>{c.contact}</div>}
                {c.rut && <div style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>RUT: {c.rut}</div>}
              </div>
              <button onClick={() => { if (confirm("¿Eliminar cliente?")) onDelClient(c.id) }} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
          ))}
        </Sec>
      )}
    </div>
  );
}

/* ─── SHARED ATOMS ──────────────────────────────────────────────────── */
const IS = { width: "100%", padding: "7px 10px", border: "1.5px solid #ddd", borderRadius: 5, fontSize: 13, color: C.black, background: C.white, fontFamily: F };
const THS = { padding: "0 8px 8px 0", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.black, fontFamily: F, verticalAlign: "bottom" };
const TDS = { padding: "10px 8px 10px 0", fontSize: 10, color: C.black, verticalAlign: "top", fontFamily: F };

function Sec({ t, children, style }) { return <div style={{ background: C.white, border: "1px solid #ddd", borderRadius: 4, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.05)", ...style }}>{t && <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 14 }}>{t}</p>}{children}</div> }
function F2({ l, children }) { return <div style={{ marginBottom: 10 }}><label style={{ display: "block", fontSize: 11, color: C.gray, fontWeight: 600, marginBottom: 4, letterSpacing: ".3px" }}>{l}</label>{children}</div> }
function TR({ l, v, b }) { return <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: b ? 14 : 12, fontWeight: b ? 700 : 400, color: b ? C.black : C.gray }}><span>{l}</span><span>{v}</span></div> }
function Btn({ children, onClick, s, style, disabled }) { return <button onClick={onClick} disabled={disabled} style={{ padding: "8px 18px", borderRadius: 5, fontSize: 13, fontWeight: 600, border: `1.5px solid ${s ? "#000" : "#ccc"}`, background: s ? "#000" : "#fff", color: s ? "#fff" : "#555", fontFamily: F, transition: "opacity .12s", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, ...style }} onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = ".75" }} onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? ".55" : "1" }}>{children}</button> }
function IB({ children, onClick, title, d }) { return <button onClick={onClick} title={title} style={{ width: 30, height: 30, borderRadius: 5, border: "1px solid #ddd", background: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .12s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = d ? "#dc2626" : "#000"; e.currentTarget.style.background = d ? "#fef2f2" : "#f5f5f5" }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.background = "#fff" }}>{children}</button> }