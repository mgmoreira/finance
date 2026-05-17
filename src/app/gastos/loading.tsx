export default function Loading() {
  return (
    <div style={{ padding: 14, display: "grid", gap: 12, maxWidth: 1600, margin: "0 auto" }}>
      <Skeleton height={80} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
      <Skeleton height={360} />
      <Skeleton height={240} />
    </div>
  );
}

function Skeleton({ height }: { height: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 4,
        background: "var(--panel)",
        border: "1px solid var(--border)",
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}
