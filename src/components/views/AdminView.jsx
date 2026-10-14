import { useEffect, useState } from "react";
import { Btn, F2, Sec } from "../common/Atoms";
import { C, IS } from "../../constants/ui";
import { draftKey, readDraft, removeDraft, writeDraft } from "../../utils/drafts";

const EMPTY_FORM = {
    fullName: "",
    email: "",
    password: "",
    role: "user",
};

const ROLE_LABELS = {
    admin: "Administrador",
    user: "Usuario",
    client: "Cliente",
};

function fmtDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function StatusBadge({ active }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 10px",
                borderRadius: 999,
                background: active ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${active ? "#bbf7d0" : "#fecaca"}`,
                color: active ? "#166534" : "#b91c1c",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".4px",
                whiteSpace: "nowrap",
            }}
        >
            {active ? "ACTIVO" : "INACTIVO"}
        </span>
    );
}

export default function AdminView({ profiles, currentUserId, onBack, onCreateUser, onUpdateUser, onResendVerification, responsive = { isCompact: false } }) {
    const DRAFT_KEY = draftKey("admin-draft", currentUserId);
    const { isCompact } = responsive;
    // El borrador NUNCA incluye la contraseña: antes quedaba en texto plano en localStorage.
    const [initialDraft] = useState(() => readDraft(DRAFT_KEY));
    const [showCreate, setShowCreate] = useState(() => initialDraft?.showCreate === true);
    const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(initialDraft?.form ?? {}), password: "" }));
    const [savingCreate, setSavingCreate] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const { password: _omit, ...safeForm } = form;
        writeDraft(DRAFT_KEY, { form: safeForm, showCreate });
    }, [DRAFT_KEY, form, showCreate]);

    const updateForm = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setError("");
        setShowCreate(false);
        removeDraft(DRAFT_KEY);
    };

    const handleCreate = async () => {
        setError("");
        setSavingCreate(true);

        try {
            await onCreateUser(form);
            resetForm();
        } catch (createError) {
            setError(createError.message || "No se pudo crear el usuario.");
        } finally {
            setSavingCreate(false);
        }
    };

    const handleRoleChange = async (profile, role) => {
        if (role === profile.role) return;
        const label = ROLE_LABELS[role] ?? role;
        if (!window.confirm(`¿Cambiar el rol de ${profile.fullName || profile.email} a ${label}?`)) return;
        const profileId = profile.id;
        setSavingId(profileId);
        try {
            await onUpdateUser(profileId, { role });
        } finally {
            setSavingId(null);
        }
    };

    const handleToggleActive = async (profile) => {
        if (profile.isActive && !window.confirm(`¿Desactivar a ${profile.fullName || profile.email}? Perderá el acceso a la app.`)) return;
        setSavingId(profile.id);
        try {
            await onUpdateUser(profile.id, { isActive: !profile.isActive });
        } finally {
            setSavingId(null);
        }
    };

    const handleResendVerification = async (profile) => {
        setSavingId(profile.id);
        setError("");
        try {
            await onResendVerification(profile.email);
        } catch (resendError) {
            setError(resendError.message || "No se pudo reenviar la verificación.");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: isCompact ? "20px 14px 90px" : "36px 20px 90px" }} className="fd">
            <button
                onClick={onBack}
                style={{ background: "none", border: "none", color: C.gray, fontSize: 13, marginBottom: 16, cursor: "pointer", fontWeight: 500, padding: 0 }}
            >
                ← Volver
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: C.black, letterSpacing: "-.6px" }}>Panel de usuarios</h1>
                    <p style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>
                        {profiles.length} usuario{profiles.length !== 1 ? "s" : ""} con acceso configurado.
                    </p>
                </div>
                <Btn s onClick={() => setShowCreate(true)}>Crear usuario</Btn>
            </div>

            <Sec style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 13, color: C.gray, lineHeight: 1.6 }}>
                    Los cambios de rol y activación se controlan desde la tabla profiles. Desactivar un usuario bloquea su acceso en la app, aunque su cuenta de Auth siga existiendo.
                </p>
            </Sec>

            {showCreate && (
                <Sec t="Nuevo usuario" style={{ marginBottom: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                        <F2 l="Nombre completo">
                            <input value={form.fullName} onChange={(event) => updateForm("fullName", event.target.value)} style={IS} />
                        </F2>
                        <F2 l="Email">
                            <input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} style={IS} />
                        </F2>
                        <F2 l="Contraseña temporal">
                            <input type="password" autoComplete="new-password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} style={IS} />
                        </F2>
                        <F2 l="Rol inicial">
                            <select value={form.role} onChange={(event) => updateForm("role", event.target.value)} style={IS}>
                                <option value="admin">Administrador</option>
                                <option value="user">Usuario</option>
                                <option value="client">Cliente</option>
                            </select>
                        </F2>
                    </div>

                    {error && (
                        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
                        <Btn onClick={resetForm}>Cancelar</Btn>
                        <Btn
                            s
                            onClick={handleCreate}
                            disabled={savingCreate || !form.email.trim() || !form.password || !form.role}
                        >
                            {savingCreate ? "Creando..." : "Crear usuario"}
                        </Btn>
                    </div>
                </Sec>
            )}

            {isCompact ? (
                <div style={{ display: "grid", gap: 12 }}>
                    {profiles.map((profile) => {
                        const isCurrentUser = profile.id === currentUserId;
                        const rowBusy = savingId === profile.id;
                        return (
                            <div key={profile.id} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 14, padding: 14, boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: C.black }}>{profile.fullName || "Sin nombre"}</div>
                                        <div style={{ fontSize: 13, color: C.gray, marginTop: 2, wordBreak: "break-all" }}>{profile.email}</div>
                                        {isCurrentUser && <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>Tu cuenta</div>}
                                    </div>
                                    <StatusBadge active={profile.isActive} />
                                </div>
                                <label style={{ display: "block", marginBottom: 12 }}>
                                    <span style={{ display: "block", fontSize: 11, color: C.gray, fontWeight: 600, marginBottom: 4 }}>Rol</span>
                                    <select
                                        value={profile.role}
                                        onChange={(event) => handleRoleChange(profile, event.target.value)}
                                        style={IS}
                                        disabled={rowBusy || isCurrentUser}
                                    >
                                        <option value="admin">Administrador</option>
                                        <option value="user">Usuario</option>
                                        <option value="client">Cliente</option>
                                    </select>
                                </label>
                                <div style={{ fontSize: 12, color: C.gray, marginBottom: 12 }}>Creado: {fmtDate(profile.createdAt)}</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    <Btn onClick={() => handleResendVerification(profile)} disabled={rowBusy || !profile.email} style={{ flex: "1 1 160px" }}>
                                        Reenviar verificación
                                    </Btn>
                                    <Btn onClick={() => handleToggleActive(profile)} disabled={rowBusy || isCurrentUser} style={{ flex: "1 1 120px" }}>
                                        {profile.isActive ? "Desactivar" : "Activar"}
                                    </Btn>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ background: "#fff", borderRadius: 4, border: "1px solid #ddd", overflowX: "auto", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: C.bgTop, borderBottom: "2px solid #ccc" }}>
                                {["Usuario", "Email", "Rol", "Estado", "Creado", "", ""].map((header) => (
                                    <th
                                        key={header}
                                        style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, color: C.gray, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase" }}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {profiles.map((profile, index) => {
                                const isCurrentUser = profile.id === currentUserId;
                                const rowBusy = savingId === profile.id;

                                return (
                                    <tr key={profile.id} style={{ borderBottom: index < profiles.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                        <td style={{ padding: "14px", fontSize: 13 }}>
                                            <div style={{ fontWeight: 700, color: C.black }}>{profile.fullName || "Sin nombre"}</div>
                                            <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{isCurrentUser ? "Tu cuenta" : ""}</div>
                                        </td>
                                        <td style={{ padding: "14px", fontSize: 13, color: C.gray }}>{profile.email}</td>
                                        <td style={{ padding: "14px" }}>
                                            <select
                                                value={profile.role}
                                                onChange={(event) => handleRoleChange(profile, event.target.value)}
                                                style={{ ...IS, minWidth: 160 }}
                                                disabled={rowBusy || isCurrentUser}
                                            >
                                                <option value="admin">Administrador</option>
                                                <option value="user">Usuario</option>
                                                <option value="client">Cliente</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "14px" }}>
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    padding: "5px 10px",
                                                    borderRadius: 999,
                                                    background: profile.isActive ? "#f0fdf4" : "#fef2f2",
                                                    border: `1px solid ${profile.isActive ? "#bbf7d0" : "#fecaca"}`,
                                                    color: profile.isActive ? "#166534" : "#b91c1c",
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    letterSpacing: ".4px",
                                                }}
                                            >
                                                {profile.isActive ? "ACTIVO" : "INACTIVO"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "14px", fontSize: 13, color: C.gray }}>{fmtDate(profile.createdAt)}</td>
                                        <td style={{ padding: "14px", textAlign: "right" }}>
                                            <Btn
                                                onClick={() => handleResendVerification(profile)}
                                                disabled={rowBusy || !profile.email}
                                                style={{ minWidth: 170 }}
                                            >
                                                Reenviar verificación
                                            </Btn>
                                        </td>
                                        <td style={{ padding: "14px", textAlign: "right" }}>
                                            <Btn
                                                onClick={() => handleToggleActive(profile)}
                                                disabled={rowBusy || isCurrentUser}
                                                style={{ minWidth: 120 }}
                                            >
                                                {profile.isActive ? "Desactivar" : "Activar"}
                                            </Btn>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <p style={{ marginTop: 12, fontSize: 12, color: C.gray }}>
                El administrador actual no puede cambiar su propio rol ni desactivarse desde esta vista para evitar bloquear el acceso al sistema.
            </p>
        </div>
    );
}
