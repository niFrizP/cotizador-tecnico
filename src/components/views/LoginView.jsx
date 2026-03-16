import { useState } from "react";
import { Btn, F2, Sec } from "../common/Atoms";
import { C, F, IS } from "../../constants/ui";

const EMAIL_ACTION_COOLDOWN_MS = 60000;

export default function LoginView({
    onSubmit,
    onRecoverPassword,
    onSendMagicLink,
    onResendVerification,
    error,
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [emailActionLoading, setEmailActionLoading] = useState("");
    const [emailActionMessage, setEmailActionMessage] = useState("");
    const [emailActionError, setEmailActionError] = useState("");
    const [cooldowns, setCooldowns] = useState({ recover: 0, magic: 0, verify: 0 });
    const [localError, setLocalError] = useState("");

    const now = Date.now();
    const recoverLeft = Math.max(0, Math.ceil((cooldowns.recover - now) / 1000));
    const magicLeft = Math.max(0, Math.ceil((cooldowns.magic - now) / 1000));
    const verifyLeft = Math.max(0, Math.ceil((cooldowns.verify - now) / 1000));

    const startCooldown = (key) => {
        const nextUntil = Date.now() + EMAIL_ACTION_COOLDOWN_MS;
        setCooldowns((prev) => ({ ...prev, [key]: nextUntil }));
        setTimeout(() => {
            setCooldowns((prev) => ({ ...prev, [key]: 0 }));
        }, EMAIL_ACTION_COOLDOWN_MS + 100);
    };

    const withEmailAction = async (key, actionLabel, handler) => {
        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
            setEmailActionError("Ingresa un email para continuar.");
            return;
        }

        setEmailActionMessage("");
        setEmailActionError("");
        setEmailActionLoading(key);

        try {
            await handler(normalizedEmail);
            setEmailActionMessage(`${actionLabel} enviado. Revisa tu bandeja.`);
            startCooldown(key);
        } catch (actionError) {
            setEmailActionError(actionError.message || `No se pudo ${actionLabel.toLowerCase()}.`);
        } finally {
            setEmailActionLoading("");
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");
        setEmailActionError("");
        setSubmitting(true);

        try {
            await onSubmit({ email: email.trim(), password });
        } catch (submitError) {
            setLocalError(submitError.message || "No se pudo iniciar sesión.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 16px",
                background: "linear-gradient(180deg, #f4f4f4 0%, #e5e5e5 100%)",
                fontFamily: F,
            }}
        >
            <div style={{ width: "100%", maxWidth: 440 }}>
                <div style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, letterSpacing: ".9px", textTransform: "uppercase", marginBottom: 8 }}>
                        Cotizador técnico
                    </p>
                    <h1 style={{ fontSize: 32, lineHeight: 1.05, color: C.black, letterSpacing: "-1px", marginBottom: 8 }}>
                        Ingreso de usuarios
                    </h1>
                    <p style={{ color: C.gray, fontSize: 14 }}>
                        Accede con tu correo y contraseña para ver tus cotizaciones y datos asociados.
                    </p>
                </div>

                <Sec>
                    <form onSubmit={handleSubmit}>
                        <F2 l="Email">
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                                placeholder="tu@empresa.com"
                                style={IS}
                                required
                            />
                        </F2>
                        <F2 l="Contraseña">
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                style={IS}
                                required
                            />
                        </F2>

                        {(error || localError) && (
                            <div
                                style={{
                                    marginTop: 14,
                                    marginBottom: 4,
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    border: "1px solid #fecaca",
                                    background: "#fef2f2",
                                    color: "#b91c1c",
                                    fontSize: 13,
                                    fontWeight: 500,
                                }}
                            >
                                {localError || error}
                            </div>
                        )}

                        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                            <Btn s disabled={submitting || !email.trim() || !password} style={{ minWidth: 160 }}>
                                {submitting ? "Ingresando..." : "Iniciar sesión"}
                            </Btn>
                        </div>

                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #eee" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", color: C.gray, marginBottom: 10 }}>
                                Acciones de acceso por email
                            </p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <Btn
                                    onClick={() => withEmailAction("recover", "Correo de recuperación", onRecoverPassword)}
                                    disabled={submitting || emailActionLoading !== "" || !email.trim() || recoverLeft > 0}
                                >
                                    {recoverLeft > 0 ? `Recuperar (${recoverLeft}s)` : "Recuperar contraseña"}
                                </Btn>
                                <Btn
                                    onClick={() => withEmailAction("magic", "Magic link", onSendMagicLink)}
                                    disabled={submitting || emailActionLoading !== "" || !email.trim() || magicLeft > 0}
                                >
                                    {magicLeft > 0 ? `Magic link (${magicLeft}s)` : "Enviar magic link"}
                                </Btn>
                                <Btn
                                    onClick={() => withEmailAction("verify", "Verificación", onResendVerification)}
                                    disabled={submitting || emailActionLoading !== "" || !email.trim() || verifyLeft > 0}
                                >
                                    {verifyLeft > 0 ? `Verificar (${verifyLeft}s)` : "Reenviar verificación"}
                                </Btn>
                            </div>

                            {emailActionMessage && (
                                <div
                                    style={{
                                        marginTop: 10,
                                        padding: "10px 12px",
                                        borderRadius: 8,
                                        border: "1px solid #bbf7d0",
                                        background: "#f0fdf4",
                                        color: "#166534",
                                        fontSize: 13,
                                        fontWeight: 500,
                                    }}
                                >
                                    {emailActionMessage}
                                </div>
                            )}

                            {emailActionError && (
                                <div
                                    style={{
                                        marginTop: 10,
                                        padding: "10px 12px",
                                        borderRadius: 8,
                                        border: "1px solid #fecaca",
                                        background: "#fef2f2",
                                        color: "#b91c1c",
                                        fontSize: 13,
                                        fontWeight: 500,
                                    }}
                                >
                                    {emailActionError}
                                </div>
                            )}
                        </div>
                    </form>
                </Sec>
            </div>
        </div>
    );
}
