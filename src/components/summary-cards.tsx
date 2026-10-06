function fmtUsd(v: number) {
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

interface SummaryItem {
  label: string;
  value: number;
  pct: number;
}

const PAIS_HUES: Record<string, number> = {
  EEUU: 220, ARG: 200, BRASIL: 145, EUROPA: 260, ASIA: 30, LATINO: 340, CHINA: 10,
};
const SECTOR_HUES: Record<string, number> = {
  TECNOLOGIA: 240, "E-COMMERCE": 280, ENERGIA: 30, SALUD: 160,
  MINERIA: 50, CONSUMO: 200, AGRO: 110, ETF: 320,
};

function oklch(hue: number) {
  return `oklch(0.65 0.15 ${hue})`;
}

function AllocationPanel({
  title,
  rows,
  hueMap,
}: {
  title: string;
  rows: SummaryItem[];
  hueMap: Record<string, number>;
}) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
      {/* Panel title */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-jetbrains, monospace)",
          color: "var(--accent)",
          fontSize: 10,
          letterSpacing: 1,
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>

      <div style={{ padding: 14 }}>
        {/* Color bar */}
        <div
          style={{
            display: "flex",
            height: 8,
            marginBottom: 14,
            background: "var(--border)",
          }}
        >
          {rows.map((r) => (
            <div
              key={r.label}
              title={`${r.label} ${r.pct.toFixed(1)}%`}
              style={{
                width: `${r.pct}%`,
                background: oklch(hueMap[r.label] ?? 200),
              }}
            />
          ))}
        </div>

        {/* List */}
        <div
          style={{
            display: "grid",
            gap: 6,
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 11,
          }}
        >
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "grid",
                gridTemplateColumns: "12px 1fr auto auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: oklch(hueMap[r.label] ?? 200),
                }}
              />
              <span style={{ color: "var(--text-dim)" }}>{r.label}</span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--text)",
                }}
                data-money
              >
                {fmtUsd(r.value)}
              </span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--text-dim)",
                  minWidth: 44,
                  textAlign: "right",
                }}
              >
                {r.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SummaryCards({
  byCountry,
  bySector,
}: {
  byCountry: SummaryItem[];
  bySector: SummaryItem[];
}) {
  const countryRows = byCountry.map((c) => ({ label: c.label, value: c.value, pct: c.pct }));
  const sectorRows = bySector.map((s) => ({ label: s.label, value: s.value, pct: s.pct }));

  return (
    <>
      <style>{`
        .sumcards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 767px) {
          .sumcards-grid { grid-template-columns: 1fr; gap: 10px; }
        }
      `}</style>
      <div className="sumcards-grid">
        <AllocationPanel title="Por país" rows={countryRows} hueMap={PAIS_HUES} />
        <AllocationPanel title="Por sector" rows={sectorRows} hueMap={SECTOR_HUES} />
      </div>
    </>
  );
}
