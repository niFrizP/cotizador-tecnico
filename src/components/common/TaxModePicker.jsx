import { C, TAX_MODE_OPTIONS } from "../../constants/ui";

/* Selector del tipo de impuesto del negocio, con explicación de cada opción. */
export default function TaxModePicker({ value, onChange, disabled = false, name = "tax-mode" }) {
    return (
        <div role="radiogroup" aria-label="Tipo de impuesto" style={{ display: "grid", gap: 8 }}>
            {TAX_MODE_OPTIONS.map((opt) => {
                const selected = value === opt.value;
                return (
                    <label
                        key={opt.value}
                        style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `1.5px solid ${selected ? "#000" : "#ddd"}`,
                            background: selected ? "#fafafa" : "#fff",
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.7 : 1,
                        }}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={opt.value}
                            checked={selected}
                            disabled={disabled}
                            onChange={() => onChange(opt.value)}
                            style={{ marginTop: 3, minHeight: 0 }}
                        />
                        <span>
                            <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.black }}>{opt.label}</span>
                            <span style={{ display: "block", fontSize: 12, color: C.gray, marginTop: 2, lineHeight: 1.45 }}>{opt.help}</span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}
