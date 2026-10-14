import { useState } from "react";
import { Btn, F2, Sec } from "../common/Atoms";
import { C, F, IS } from "../../constants/ui";

const MIN_LENGTH = 8;

/* Se muestra cuando el usuario llega desde el correo de recuperación
   (evento PASSWORD_RECOVERY de Supabase) para que defina su nueva contraseña. */
export default function ResetPasswordView({ email, onSubmit, onCancel }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= MIN_LENGTH && confirm === password && !saving;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSaving(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "linear-gradient(180deg, #f4f4f4 0%, #e5e5e5 100%)", fontFamily: F }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, letterSpacing: ".9px", textTransform: "uppercase", marginBottom: 8 }}>Recuperar acceso</p>
        <h1 style={{ fontSize: 28, lineHeight: 1.1, color: C.black, marginBottom: 8 }}>Define tu nueva contraseña</h1>
        {email && <p style={{ color: C.gray, fontSize: 14, marginBottom: 18 }}>Para la cuenta {email}</p>}
        <Sec>
          <form onSubmit={handleSubmit}>
            <F2 l="Nueva contraseña" htmlFor="new-password">
              <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={IS} required minLength={MIN_LENGTH} />
            </F2>
            {tooShort && <p style={{ fontSize: 12, color: "#b91c1c", marginTop: -4, marginBottom: 8 }}>Usa al menos {MIN_LENGTH} caracteres.</p>}
            <F2 l="Repite la contraseña" htmlFor="confirm-password">
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={IS} required />
            </F2>
            {mismatch && <p style={{ fontSize: 12, color: "#b91c1c", marginTop: -4, marginBottom: 8 }}>Las contraseñas no coinciden.</p>}
            {error && (
              <div role="alert" style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{error}</div>
            )}
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <Btn type="submit" s disabled={!canSubmit} style={{ width: "100%", minHeight: 44 }}>
                {saving ? "Guardando…" : "Guardar contraseña"}
              </Btn>
              <Btn type="button" onClick={onCancel} style={{ width: "100%", minHeight: 44 }}>Cancelar y cerrar sesión</Btn>
            </div>
          </form>
        </Sec>
      </div>
    </div>
  );
}
