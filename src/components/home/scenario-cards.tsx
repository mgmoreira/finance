import { projectToGoal, reachGoal, nextTarget, ageAt, type Scenario } from "@/lib/goals";
import type { CurrentWealth } from "@/lib/wealth-data";
import { Panel } from "./panel";
import { fmtUsd, fmtSignedUsd, fmtPct, fmtCut } from "./format";

const LABEL = { fontSize: 9, color: "var(--text-dim)", letterSpacing: 0.8, marginTop: 8 } as const;

export function ScenarioCards({ scenarios, today, contributions12m }: { scenarios: Scenario[]; today: CurrentWealth; contributions12m: number }) {
  const cards = scenarios
    .filter((s) => s.visible)
    .map((s) => {
      const points = projectToGoal(s);
      return { s, next: nextTarget(points, today.date), goal: reachGoal(points) };
    })
    .filter((c) => c.next !== null);

  if (cards.length === 0) {
    return (
      <Panel title="ESCENARIOS">
        <div style={{ padding: 16, textAlign: "center", color: "var(--text-mute)", fontSize: 10, letterSpacing: 1 }}>
          SIN ESCENARIOS VISIBLES CON OBJETIVOS FUTUROS
        </div>
      </Panel>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      {cards.map(({ s, next, goal }) => {
        // Today vs the next 1/3 target
        const diff = today.total - next!.value;
        const diffPct = next!.value > 0 ? (diff / next!.value) * 100 : null;
        const remaining = next!.value - today.total;
        const up = diff >= 0;
        const yearsToGoal = goal ? (Date.parse(goal.date) - Date.parse(today.date)) / (365.25 * 86400000) : null;
        return (
          <div
            key={s.id}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderTop: `2px solid ${s.color}`,
              padding: "10px 14px 12px",
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div style={{ color: s.color, fontWeight: 700, fontSize: 11, letterSpacing: 0.6 }}>{s.name}</div>

            <div style={LABEL}>OBJETIVO {fmtCut(next!.date)}</div>
            <div data-money>{fmtUsd(next!.value)}</div>

            <div style={LABEL}>HOY VS OBJETIVO {fmtCut(next!.date)}</div>
            {diffPct == null ? (
              <div style={{ color: "var(--text-dim)" }}>—</div>
            ) : (
              <div style={{ color: up ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
                {fmtPct(diffPct)} <span data-money style={{ fontWeight: 400 }}>({fmtSignedUsd(diff)})</span>
              </div>
            )}

            <div style={LABEL}>FALTA</div>
            {remaining <= 0 ? (
              <div style={{ color: "var(--up)", fontWeight: 600 }}>ALCANZADO ✓</div>
            ) : (
              <div data-money>{fmtUsd(remaining)}</div>
            )}

            <div style={LABEL}>LLEGA A $1M</div>
            {goal && yearsToGoal != null ? (
              <div style={{ color: "var(--accent)", fontWeight: 600 }}>
                {fmtCut(goal.date)} · EDAD {ageAt(goal.date)}
                <span style={{ color: "var(--text-dim)", fontWeight: 400 }}> · faltan {yearsToGoal.toFixed(1)} años</span>
              </div>
            ) : (
              <div style={{ color: "var(--text-dim)" }}>NO LLEGA ANTES DE 2100</div>
            )}

            <div style={LABEL}>APORTE / AÑO</div>
            <div>
              <span style={{ color: "var(--text-dim)" }}>escenario </span>
              <span data-money>{fmtUsd(s.contribution)}</span>
              <span style={{ color: "var(--text-dim)" }}> · real 12m </span>
              <span data-money style={{ color: contributions12m >= s.contribution ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
                {fmtUsd(contributions12m)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
