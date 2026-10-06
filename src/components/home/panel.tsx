import type { CSSProperties, ReactNode } from "react";

const MONO = "var(--font-jetbrains, monospace)";

export const INPUT_STYLE: CSSProperties = {
  background: "#1a2030",
  border: "1px solid #2a3545",
  color: "var(--text)",
  fontSize: 11,
  padding: "3px 6px",
  fontFamily: MONO,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export const BTN_STYLE: CSSProperties = {
  background: "#1a2030",
  border: "1px solid #2a3545",
  color: "var(--text)",
  fontSize: 9.5,
  letterSpacing: 0.8,
  padding: "4px 10px",
  cursor: "pointer",
  fontFamily: MONO,
  whiteSpace: "nowrap",
};

export const TH_STYLE: CSSProperties = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 500,
  color: "var(--text-mute)",
  fontSize: 9.5,
  letterSpacing: 0.8,
  textAlign: "right",
  whiteSpace: "nowrap",
};

export const TD_STYLE: CSSProperties = {
  padding: "6px 10px",
  textAlign: "right",
  whiteSpace: "nowrap",
};

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", fontFamily: MONO }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--accent)", fontSize: 10, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase" }}>
          {title}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}
