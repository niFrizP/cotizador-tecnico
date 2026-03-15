import { C, F } from "../../constants/ui";

export function Sec({ t, children, style }) {
    return (
        <div
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
                <p
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
                </p>
            )}
            {children}
        </div>
    );
}

export function F2({ l, children }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <label
                style={{
                    display: "block",
                    fontSize: 11,
                    color: C.gray,
                    fontWeight: 600,
                    marginBottom: 4,
                    letterSpacing: ".3px",
                }}
            >
                {l}
            </label>
            {children}
        </div>
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

export function Btn({ children, onClick, s }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: "8px 18px",
                borderRadius: 5,
                fontSize: 13,
                fontWeight: 600,
                border: `1.5px solid ${s ? "#000" : "#ccc"}`,
                background: s ? "#000" : "#fff",
                color: s ? "#fff" : "#555",
                fontFamily: F,
                transition: "opacity .12s",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.opacity = ".75";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
            }}
        >
            {children}
        </button>
    );
}

export function IB({ children, onClick, title, d }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: 30,
                height: 30,
                borderRadius: 5,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .12s",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = d ? "#dc2626" : "#000";
                e.currentTarget.style.background = d ? "#fef2f2" : "#f5f5f5";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.background = "#fff";
            }}
        >
            {children}
        </button>
    );
}
