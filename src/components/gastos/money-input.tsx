"use client";

import { useState, useEffect } from "react";

interface MoneyInputProps {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  autoFocus?: boolean;
}

function formatWithThousands(val: string): string {
  if (!val) return "";
  // Remove non-numeric except dots
  const clean = val.replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  const intPart = parts[0];
  const decPart = parts.length > 1 ? "." + parts[1] : "";
  // Add thousand separators
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formatted + (decPart ? "," + (parts[1] ?? "") : "");
}

function parseDisplay(display: string): string {
  // "1.500.000,50" → "1500000.50"
  return display.replace(/\./g, "").replace(",", ".");
}

export function MoneyInput({ value, onChange, placeholder, className, style, required, autoFocus }: MoneyInputProps) {
  const [display, setDisplay] = useState(() => {
    if (!value) return "";
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    const str = num.toString();
    const parts = str.split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.length > 1 ? intPart + "," + parts[1] : intPart;
  });

  // Sync from external value changes
  useEffect(() => {
    if (!value) {
      setDisplay("");
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const str = num.toString();
    const parts = str.split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const newDisplay = parts.length > 1 ? intPart + "," + parts[1] : intPart;
    // Only update if the raw value actually changed (avoid cursor jump)
    const currentRaw = parseDisplay(display);
    if (currentRaw !== value) {
      setDisplay(newDisplay);
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;
    // Allow empty
    if (!input) {
      setDisplay("");
      onChange("");
      return;
    }
    // Only allow digits, dots (thousand sep), commas (decimal sep)
    const cleaned = input.replace(/[^0-9.,]/g, "");
    setDisplay(cleaned);
    // Parse to raw number string for the parent
    const raw = parseDisplay(cleaned);
    if (raw && !isNaN(parseFloat(raw))) {
      onChange(raw);
    } else {
      onChange("");
    }
  }

  function handleBlur() {
    // On blur, reformat nicely
    if (!display) return;
    const raw = parseDisplay(display);
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    const str = num.toString();
    const parts = str.split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setDisplay(parts.length > 1 ? intPart + "," + parts[1] : intPart);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      style={style}
      required={required}
      autoFocus={autoFocus}
    />
  );
}
