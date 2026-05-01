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
    <header
      style={{
        background: "var(--panel)",
        borderBottom: "1px solid var(--border-strong)",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontFamily: "var(--font-jetbrains, monospace)",
        fontSize: 11,
        color: "var(--text)",
        letterSpacing: 0.4,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <span style={{ fontWeight: 700, letterSpacing: 1 }}>
        <span style={{ color: "var(--accent)" }}>FIN</span>
        <span style={{ color: "var(--text)" }}>·TERM</span>
      </span>

      <span style={{ color: "var(--border-strong)" }}>│</span>

      {/* Nav tabs */}
      <nav style={{ display: "flex", gap: 16 }}>
        {sections.map((s) => {
          const isActive = s.href === "/" ? pathname === "/" : pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              style={{
                color: isActive ? "var(--accent)" : "var(--text-dim)",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                padding: "4px 2px",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
                fontSize: 11,
                letterSpacing: 1,
                transition: "color 0.15s",
              }}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      <span style={{ flex: 1 }} />

      {/* Right side indicators */}
      <HideToggle />

      <span style={{ color: "var(--text-dim)" }}>│</span>

      <span style={{ color: "var(--text-dim)", fontSize: 10.5 }}>
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

      <span style={{ color: "var(--border-strong)" }}>│</span>

      {/* LIVE indicator */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--up)",
            boxShadow: "0 0 8px var(--up)",
            display: "inline-block",
          }}
        />
        <span style={{ color: "var(--text-dim)", fontSize: 10.5 }}>
          LIVE {time}
        </span>
      </span>
    </header>
  );
}
