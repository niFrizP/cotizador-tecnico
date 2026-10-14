import { useState } from "react";
import { Btn, F2, Sec } from "../common/Atoms";
import TaxModePicker from "../common/TaxModePicker";
import { C, F, IS } from "../../constants/ui";

/* Primer ingreso de un usuario sin negocio: crea "Mi negocio". */
export default function OnboardingView({ profile, onCreate, onLogout }) {
    const [name, setName] = useState(profile?.fullName || "");
    const [taxMode, setTaxMode] = useState("iva");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        setError("");
        try {
            await onCreate({ name: name.trim(), taxMode });
        } catch (err) {
            setError(err.message || "No se pudo crear tu negocio.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "linear-gradient(180deg, #f4f4f4 0%, #e5e5e5 100%)", fontFamily: F }}>
            <div style={{ width: "100%", maxWidth: 520 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, letterSpacing: ".9px", textTransform: "uppercase", marginBottom: 8 }}>Bienvenido</p>
                <h1 style={{ fontSize: 28, lineHeight: 1.1, color: C.black, marginBottom: 8 }}>Configura tu negocio</h1>
                <p style={{ color: C.gray, fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
                    Es quien emite las cotizaciones: tú como independiente o tu empresa. Tus clientes los agregas después.
                </p>
                <Sec>
                    <form onSubmit={handleSubmit}>
                        <F2 l="Nombre del negocio">
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez Servicio Técnico" style={IS} required autoFocus />
                        </F2>
                        <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, margin: "6px 0 6px" }}>¿Cómo cobras?</p>
                        <TaxModePicker value={taxMode} onChange={setTaxMode} />
                        <p style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>Puedes cambiarlo después en Ajustes.</p>
                        {error && (
                            <div role="alert" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{error}</div>
                        )}
                        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                            <Btn type="submit" s disabled={saving || !name.trim()} style={{ width: "100%", minHeight: 44 }}>
                                {saving ? "Creando…" : "Crear mi negocio"}
                            </Btn>
                            <Btn type="button" onClick={onLogout} style={{ width: "100%", minHeight: 44 }}>Cerrar sesión</Btn>
                        </div>
                    </form>
                </Sec>
            </div>
        </div>
    );
}
