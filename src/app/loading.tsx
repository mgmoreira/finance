export default function Loading() {
  return (
    <div style={{ padding: 14, display: "grid", gap: 12, maxWidth: 1600, margin: "0 auto" }}>
      <Skeleton height={52} />
      <Skeleton height={320} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Skeleton height={180} />
        <Skeleton height={180} />
      </div>
      <Skeleton height={240} />
      <Skeleton height={200} />
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
