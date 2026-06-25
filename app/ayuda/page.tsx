"use client";

import { COCO_RESOURCES, EXTERNAL_RESOURCES, type Resource } from "@/lib/resources";

function Card({ r }: { r: Resource }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.card}
    >
      <span style={{ ...styles.badge, background: r.badgeColor }}>{r.badge}</span>
      <div style={styles.name}>{r.name}</div>
      <div style={styles.desc}>{r.description}</div>
      <div style={styles.visit}>Visitar sitio →</div>
    </a>
  );
}

export default function AyudaPage() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>🤝 Ayuda y recursos</h1>
        <p style={styles.sub}>
          Terremoto Caracas · enlaces útiles para afectados y familiares
        </p>
      </header>

      <h2 style={styles.section}>Enviar ayuda</h2>
      {COCO_RESOURCES.map((r) => (
        <Card key={r.url} r={r} />
      ))}

      <h2 style={styles.section}>Otros recursos de emergencia</h2>
      {EXTERNAL_RESOURCES.map((r) => (
        <Card key={r.url} r={r} />
      ))}

      <p style={styles.disclaimer}>
        Estos enlaces son de terceros y se comparten solo como referencia.
        Verifica la información antes de actuar.
      </p>

      <a className="btn btn-ghost" href="/" style={{ marginTop: 8 }}>
        🗺️ Volver al mapa
      </a>
      <a className="btn btn-primary" href="/reporte" style={{ marginTop: 12, marginBottom: 32 }}>
        ➕ Reportar un edificio
      </a>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 520, margin: "0 auto", padding: 16 },
  header: { textAlign: "center", marginBottom: 8 },
  title: { fontSize: 22, margin: "8px 0 4px" },
  sub: { color: "var(--muted)", margin: 0, fontSize: 14 },
  section: { fontSize: 15, margin: "22px 0 10px", color: "var(--text)" },
  card: {
    display: "block",
    background: "var(--panel)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    textDecoration: "none",
    color: "var(--text)",
  },
  badge: {
    display: "inline-block",
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
  },
  name: { fontSize: 20, fontWeight: 800, margin: "12px 0 6px" },
  desc: { color: "var(--muted)", fontSize: 15, lineHeight: 1.4 },
  visit: { color: "#60a5fa", fontWeight: 700, marginTop: 12 },
  disclaimer: {
    color: "var(--muted)",
    fontSize: 12,
    margin: "16px 0 0",
    textAlign: "center",
  },
};
