"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HideToggle } from "./hide-toggle";

const sections = [
  { href: "/", label: "BOLSA" },
  { href: "/crypto", label: "CRYPTO" },
  { href: "/gastos", label: "GASTOS" },
];

const NAV_CSS = `
.nav-wrap {
  background: var(--panel);
  border-bottom: 1px solid var(--border-strong);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 18px;
  font-family: var(--font-jetbrains, monospace);
  font-size: 11px;
  color: var(--text);
  letter-spacing: 0.4px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-logo { font-weight: 700; letter-spacing: 1px; white-space: nowrap; }
.nav-sep { color: var(--border-strong); }
.nav-tabs { display: flex; gap: 16px; }
.nav-tab { padding: 4px 2px; font-size: 11px; letter-spacing: 1px; text-decoration: none; border-bottom: 2px solid transparent; transition: color 0.15s; }
.nav-spacer { flex: 1; }
.nav-spy { color: var(--text-dim); font-size: 10.5px; white-space: nowrap; }
.nav-live { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.nav-live__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--up); box-shadow: 0 0 8px var(--up); display: inline-block; }
.nav-live__txt { color: var(--text-dim); font-size: 10.5px; }

@media (max-width: 767px) {
  .nav-wrap { gap: 10px; padding: 7px 12px; }
  .nav-logo { font-size: 12px; }
  .nav-sep { display: none; }
  .nav-tabs { gap: 10px; }
  .nav-tab { font-size: 11px; letter-spacing: 0.6px; }
  .nav-spy { display: none; }
  .nav-live__txt { display: none; }
  .nav-spacer { display: none; }
  .nav-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
}
`;

export function NavBar() {
  const pathname = usePathname();
  const [time, setTime] = useState("");
  const [spyMtd, setSpyMtd] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("es-AR", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/market-data")
      .then((r) => r.json())
      .then((d) => setSpyMtd(d.spyMtdPct ?? null))
      .catch(() => {});
  }, []);

  return (
    <>
      <style>{NAV_CSS}</style>
      <header className="nav-wrap">
        {/* Logo */}
        <span className="nav-logo">
          <span style={{ color: "var(--accent)" }}>FIN</span>
          <span style={{ color: "var(--text)" }}>·TERM</span>
        </span>

        <span className="nav-sep">│</span>

        {/* Nav tabs */}
        <nav className="nav-tabs">
          {sections.map((s) => {
            const isActive = s.href === "/" ? pathname === "/" : pathname.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className="nav-tab"
                style={{
                  color: isActive ? "var(--accent)" : "var(--text-dim)",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>

        <span className="nav-spacer" />

        {/* Right side */}
        <span className="nav-actions" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <HideToggle />

          <span className="nav-sep">│</span>

          <span className="nav-spy">
            SPY MTD{" "}
            <span
              style={{
                color:
                  spyMtd != null
                    ? spyMtd >= 0
                      ? "var(--up)"
                      : "var(--down)"
                    : "var(--text)",
              }}
            >
              {spyMtd != null ? `${spyMtd >= 0 ? "+" : ""}${spyMtd.toFixed(2)}%` : "—"}
            </span>
          </span>

          <span className="nav-sep">│</span>

          <span className="nav-live">
            <span className="nav-live__dot" />
            <span className="nav-live__txt">LIVE {time}</span>
          </span>
        </span>
      </header>
    </>
  );
}
