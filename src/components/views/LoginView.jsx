import { useState } from "react";
import { Btn, F2, Sec } from "../common/Atoms";
import { C, F, IS } from "../../constants/ui";

export default function LoginView({ onSubmit, error }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");
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
                    </form>
                </Sec>
            </div>
        </div>
    );
}
