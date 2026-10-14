import { useState, useEffect } from "react";
import {
  fetchQuotes, fetchQuote, fetchClients, fetchIssuer,
  saveQuote as dbSave, deleteQuote as dbDelete,
  duplicateQuote as dbDuplicate, saveIssuer as dbSaveIssuer,
  saveClient as dbSaveClient, deleteClient,
  signIn as signInUser, signOut as signOutUser,
  resendSignupVerification,
  sendPasswordRecovery,
  sendMagicLink,
  updatePassword,
  getSession, onAuthStateChange,
  fetchMyProfile, fetchProfiles,
  createManagedUser, updateProfile,
} from "./lib/supabase";
import { C, F } from "./constants/ui";
import { calcTotals } from "./utils/format";
import { DEF_ISS, mkQuote } from "./utils/quoteFactory";
import { generatePDF } from "./utils/pdf";
import { clearLocalDrafts } from "./utils/drafts";
import useResponsiveLayout from "./hooks/useResponsiveLayout";
import { Btn, Sec } from "./components/common/Atoms";
import ListView from "./components/views/ListView";
import EditorView from "./components/views/EditorView";
import PreviewView from "./components/views/PreviewView";
import SettingsView from "./components/views/SettingsView";
import ClientsView from "./components/views/ClientsView";
import LoginView from "./components/views/LoginView";
import AdminView from "./components/views/AdminView";
import ResetPasswordView from "./components/views/ResetPasswordView";

const withQuoteSummary = (quote) => ({
  ...quote,
  summary: calcTotals(quote.items || []),
});

const UNSAVED_MESSAGE = "Tienes cambios sin guardar en la cotización. ¿Salir de todas formas?";

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
  const [draftDirty, setDraftDirty] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const responsive = useResponsiveLayout();
  const { isCompact } = responsive;

  const notify = (msg, t = "ok") => { setToast({ msg, t }); setTimeout(() => setToast(null), 2800) };
  const refreshApp = () => setRefreshKey((prev) => prev + 1);

  const resetAppState = () => {
    setProfile(null);
    setProfiles([]);
    setQuotes([]);
    setClients([]);
    setIssuer(DEF_ISS);
    setCur(null);
    setDraftDirty(false);
    setView("list");
    setLoading(false);
  };

  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        const nextSession = await getSession();
        if (!active) return;
        setSession(nextSession);
        if (!nextSession) setLoading(false);
      } catch {
        if (!active) return;
        setAuthError("No se pudo verificar la sesión actual.");
        setLoading(false);
      } finally {
        if (active) setAuthReady(true);
      }
    }

    initAuth();

    const { data: { subscription } } = onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === "TOKEN_REFRESHED") return;
      // Llegó desde el correo de recuperación: pedir la nueva contraseña.
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (!nextSession) {
        resetAppState();
        setRecoveryMode(false);
      }
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;

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
        setDraftDirty(false);

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

  // Cada cambio de pantalla parte desde arriba (antes heredaba el scroll anterior).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Avisar antes de cerrar o recargar la pestaña con una cotización sin guardar.
  const editingUnsaved = draftDirty && (view === "editor" || view === "preview");
  useEffect(() => {
    if (!editingUnsaved) return;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editingUnsaved]);

  const confirmDiscard = () => !editingUnsaved || window.confirm(UNSAVED_MESSAGE);

  const goTo = (next) => {
    if (next === view) return;
    if (!confirmDiscard()) return;
    if (view === "editor" || view === "preview") setDraftDirty(false);
    setView(next);
  };

  const totals = (items) => calcTotals(items);

  const handleLogin = async ({ email, password }) => {
    setAuthError(null);
    await signInUser(email, password);
  };

  const handleLogout = async () => {
    if (!confirmDiscard()) return;
    try {
      await signOutUser();
      clearLocalDrafts();
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
    notify("Enlace de acceso enviado ✓", "ok");
  };

  const handleSetNewPassword = async (password) => {
    await updatePassword(password);
    setRecoveryMode(false);
    notify("Contraseña actualizada ✓");
  };

  const handleCancelRecovery = async () => {
    setRecoveryMode(false);
    await handleLogout();
  };

  // El número ya no se pide al crear: se asigna en el servidor al guardar,
  // así no se consumen números de cotizaciones que nunca se guardan.
  const newQ = () => {
    if (!profile) return;
    if (!confirmDiscard()) return;
    setCur(mkQuote(issuer, profile.id));
    setDraftDirty(false);
    setView("editor");
  };

  const editQ = async (q) => {
    try {
      setSaving(true);
      const full = q.items?.length > 0 ? q : await fetchQuote(q.id);
      setCur({ ...full }); setView("editor");
      setDraftDirty(false);
    } catch { notify("Error al cargar", "err"); }
    finally { setSaving(false); }
  };

  const prevQ = async (q) => {
    try {
      setSaving(true);
      const full = (q.number === null || q.items?.length > 0) ? q : await fetchQuote(q.id);
      setCur({ ...full }); setView("preview");
      setDraftDirty(false);
    } catch { notify("Error al cargar", "err"); }
    finally { setSaving(false); }
  };

  const exportPdf = async (q, iss) => {
    const ok = await generatePDF(q, iss);
    if (!ok) notify("El navegador bloqueó la ventana del PDF. Permite ventanas emergentes para este sitio.", "info");
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
      setDraftDirty(false);
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
      setQuotes(prev => [withQuoteSummary(dup), ...prev]);
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
      setDraftDirty(false);
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

  /* ─── Avisos (toast) ─────────────────────────────────────────────── */
  const toastEl = toast && (
    <div
      role={toast.t === "err" ? "alert" : "status"}
      aria-live="polite"
      style={{
        position: "fixed",
        zIndex: 10001,
        ...(isCompact
          ? { left: 12, right: 12, bottom: 16, textAlign: "center" }
          : { right: 16, bottom: 16, maxWidth: 420 }),
        background: toast.t === "ok" ? "#000" : toast.t === "err" ? "#dc2626" : "#555",
        color: "#fff",
        padding: "11px 18px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        animation: "fd .2s ease",
      }}
    >
      {toast.msg}
    </div>
  );

  if (!authReady || (session && !profile && loading)) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, background: "#f5f5f5" }}>
      <div style={{ textAlign: "center" }} role="status">
        <div style={{ width: 40, height: 40, border: "3px solid #ddd", borderTopColor: "#000", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: C.gray, fontWeight: 500 }}>Verificando sesión…</p>
      </div>
    </div>
  );

  if (!session) {
    return (
      <>
        <LoginView
          onSubmit={handleLogin}
          onRecoverPassword={handleRecoverPassword}
          onSendMagicLink={handleSendMagicLink}
          onResendVerification={handleResendVerification}
          error={authError}
        />
        {toastEl}
      </>
    );
  }

  if (recoveryMode) {
    return (
      <>
        <ResetPasswordView email={session.user?.email} onSubmit={handleSetNewPassword} onCancel={handleCancelRecovery} />
        {toastEl}
      </>
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

  const showLoadingOverlay = loading && !!session && !!profile;

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

  const headerBtnStyle = isCompact ? { flex: "1 1 0", padding: "8px 10px" } : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "#e8e8e8", fontFamily: F, position: "relative" }}>
      {showLoadingOverlay && (
        <div style={{ position: "fixed", ...(isCompact ? { left: 12, right: 12, bottom: 16 } : { right: 18, bottom: 18 }), zIndex: 10000, pointerEvents: "none" }} role="status">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, background: "rgba(0,0,0,.88)", color: "#fff", boxShadow: "0 12px 30px rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.12)" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,.28)", borderTopColor: "#fff", animation: "spin .75s linear infinite" }} />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".4px" }}>Sincronizando datos</div>
              <div style={{ fontSize: 11, opacity: .82 }}>Actualizando cotizaciones y clientes…</div>
            </div>
          </div>
        </div>
      )}

      {saving && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "#000", animation: "progress 1.2s ease infinite", zIndex: 9999 }} />}

      {/* Barra superior: va en el flujo normal de la página (antes era fija y
          tapaba hasta 94 px de contenido en móvil). En escritorio queda pegada
          arriba al hacer scroll; en móvil se desplaza con el contenido. */}
      <header
        style={{
          position: isCompact ? "relative" : "sticky",
          top: 0,
          zIndex: 9998,
          padding: isCompact ? "10px 12px 0" : "14px 20px 0",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "min(940px, 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: isCompact ? 10 : 12,
            flexWrap: "wrap",
            padding: isCompact ? "10px 12px" : "10px 14px",
            borderRadius: 14,
            background: "rgba(255,255,255,.94)",
            border: "1px solid rgba(0,0,0,.08)",
            boxShadow: "0 12px 32px rgba(0,0,0,.08)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div style={{ minWidth: 0, flex: isCompact ? "1 1 100%" : "0 1 auto" }}>
            <div style={{ fontSize: 11, color: C.gray, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px" }}>{profile.role === "admin" ? "Administrador" : "Usuario"}</div>
            <div style={{ fontSize: 14, color: C.black, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.fullName || profile.email}
              {isCompact && profile.fullName && <span style={{ fontSize: 12, color: C.gray, fontWeight: 400 }}> · {profile.email}</span>}
            </div>
            {!isCompact && <div style={{ fontSize: 12, color: C.gray }}>{profile.email}</div>}
          </div>
          <nav aria-label="Cuenta" style={{ display: "flex", gap: 8, flexWrap: isCompact ? "nowrap" : "wrap", width: isCompact ? "100%" : "auto" }}>
            {profile.role === "admin" && (
              <Btn onClick={() => goTo(view === "admin" ? "list" : "admin")} style={headerBtnStyle}>
                {view === "admin" ? "Volver" : "Usuarios"}
              </Btn>
            )}
            <Btn onClick={() => { if (confirmDiscard()) refreshApp(); }} style={headerBtnStyle}>Recargar</Btn>
            <Btn onClick={handleLogout} style={headerBtnStyle}>{isCompact ? "Salir" : "Cerrar sesión"}</Btn>
          </nav>
        </div>
      </header>

      {authError && (
        <div role="alert" style={{ maxWidth: 940, margin: "12px auto 0", padding: "0 12px" }}>
          <div style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
            {authError}
          </div>
        </div>
      )}

      <main>
        {view === "admin" && profile.role === "admin" && (
          <AdminView
            profiles={profiles}
            currentUserId={profile.id}
            onBack={() => setView("list")}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onResendVerification={handleResendVerification}
            responsive={responsive}
          />
        )}
        {view === "list" && <ListView quotes={quotes} onNew={newQ} onEdit={editQ} onPreview={prevQ} onDelete={delQ} onDup={dupQ} onSettings={() => setView("settings")} onClients={() => setView("clients")} totals={totals} responsive={responsive} />}
        {view === "editor" && <EditorView quote={cur} onSave={saveQ} onCancel={() => goTo("list")} onPreview={q => { setCur(q); setView("preview") }} onDraftChange={(next) => { setCur(next); setDraftDirty(true); }} totals={totals} clients={clients} issuer={issuer} responsive={responsive} />}
        {view === "preview" && <PreviewView quote={cur} onBack={() => setView("editor")} onList={() => goTo("list")} totals={totals} issuer={issuer} onExport={exportPdf} responsive={responsive} />}
        {view === "settings" && <SettingsView issuer={issuer} onSave={saveIssuerData} onBack={() => setView("list")} responsive={responsive} />}
        {view === "clients" && <ClientsView key={profile.id} userId={profile.id} clients={clients} onSave={saveClientData} onDelete={delClient} onBack={() => setView("list")} responsive={responsive} />}
      </main>

      {toastEl}
    </div>
  );
}
