import { C, F } from "../../constants/ui";

export function Sec({ t, children, style }) {
    return (
        <section
            style={{
                background: C.white,
                border: "1px solid #ddd",
                borderRadius: 4,
                padding: 20,
                boxShadow: "0 1px 4px rgba(0,0,0,.05)",
                ...style,
            }}
        >
            {t && (
                <h3
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.gray,
                        textTransform: "uppercase",
                        letterSpacing: ".8px",
                        marginBottom: 14,
                    }}
                >
                    {t}
                </h3>
            )}
            {children}
        </section>
    );
}

/* Campo con etiqueta. Si el hijo es un único input, la etiqueta lo envuelve
   y queda asociada (clic en la etiqueta enfoca el campo; lectores de pantalla
   lo anuncian). Con htmlFor se puede asociar explícitamente. */
export function F2({ l, children, htmlFor }) {
    const labelStyle = {
        display: "block",
        fontSize: 11,
        color: C.gray,
        fontWeight: 600,
        marginBottom: 4,
        letterSpacing: ".3px",
    };

    if (htmlFor) {
        return (
            <div style={{ marginBottom: 10 }}>
                <label htmlFor={htmlFor} style={labelStyle}>{l}</label>
                {children}
            </div>
        );
    }

    return (
        <label style={{ display: "block", marginBottom: 10 }}>
            <span style={labelStyle}>{l}</span>
            {children}
        </label>
    );
}

export function TR({ l, v, b }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 0",
                fontSize: b ? 14 : 12,
                fontWeight: b ? 700 : 400,
                color: b ? C.black : C.gray,
            }}
        >
            <span>{l}</span>
            <span>{v}</span>
        </div>
    );
}

export function Btn({ children, onClick, s, style, disabled, type = "button", ariaLabel }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            className={s ? "ui-btn ui-btn--solid" : "ui-btn"}
            style={{
                padding: "8px 18px",
                borderRadius: 5,
                fontSize: 13,
                fontWeight: 600,
                border: `1.5px solid ${s ? "#000" : "#ccc"}`,
                background: s ? "#000" : "#fff",
                color: s ? "#fff" : "#555",
                fontFamily: F,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1,
                ...style,
            }}
        >
            {children}
        </button>
    );
}

export function IB({ children, onClick, title, d }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={d ? "ui-ib ui-ib--danger" : "ui-ib"}
        >
            <span aria-hidden="true">{children}</span>
        </button>
    );
}
