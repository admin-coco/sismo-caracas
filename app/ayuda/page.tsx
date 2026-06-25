"use client";

import { useState } from "react";
import { COCO_RESOURCES, EXTERNAL_RESOURCES, type Resource } from "@/lib/resources";
import { shareApp } from "@/lib/share";

function Card({ r }: { r: Resource }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.card}
    >
      {r.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.logo} alt={r.name} style={styles.logo} />
      )}
      <div style={styles.name}>{r.name}</div>
      <div style={styles.desc}>{r.description}</div>
      <div style={styles.bottomRow}>
        <span style={styles.visit}>Visitar sitio →</span>
        <span style={{ ...styles.badge, background: r.badgeColor }}>{r.badge}</span>
      </div>
    </a>
  );
}

export default function AyudaPage() {
  const [copied, setCopied] = useState(false);
  async function handleShare() {
    const result = await shareApp();
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>🤝 Ayuda y recursos</h1>
        <p style={styles.sub}>
          Terremoto Venezuela · enlaces útiles para afectados y familiares
        </p>
      </header>

      <h2 style={styles.section}>Enviar ayuda</h2>
      <div style={styles.grid}>
        {COCO_RESOURCES.map((r) => (
          <Card key={r.url} r={r} />
        ))}
      </div>

      <h2 style={styles.section}>Ayuda</h2>
      <div style={styles.grid}>
        {EXTERNAL_RESOURCES.map((r) => (
          <Card key={r.url} r={r} />
        ))}
      </div>

      <p style={styles.disclaimer}>
        Estos enlaces son de terceros y se comparten solo como referencia.
        Verifica la información antes de actuar.
      </p>

      <a className="btn btn-ghost" href="/" style={{ marginTop: 8 }}>
        🗺️ Volver al mapa
      </a>
      <button
        className="btn btn-whatsapp"
        onClick={handleShare}
        style={{ marginTop: 12, marginBottom: 32 }}
      >
        {copied ? "✅ ¡Enlace copiado!" : "📲 Compartir Ayuda"}
      </button>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1040, margin: "0 auto", padding: 16 },
  header: { textAlign: "center", marginBottom: 8 },
  title: { fontSize: 22, margin: "8px 0 4px" },
  sub: { color: "var(--muted)", margin: 0, fontSize: 14 },
  section: { fontSize: 15, margin: "22px 0 10px", color: "var(--text)" },
  // Up to 3 columns on desktop, collapsing to 1 on mobile.
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    background: "var(--panel)",
    borderRadius: 16,
    padding: 18,
    textDecoration: "none",
    color: "var(--text)",
    height: "100%",
  },
  bottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: "auto", // push the whole row to the bottom of the card
    paddingTop: 14,
  },
  badge: {
    flexShrink: 0,
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
  },
  logo: {
    height: 30,
    width: "100%", // full box so object-position can pin the artwork left
    objectFit: "contain",
    objectPosition: "left center",
    display: "block",
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: 800, margin: "0 0 6px" },
  desc: { color: "var(--muted)", fontSize: 15, lineHeight: 1.4 },
  visit: { color: "#60a5fa", fontWeight: 700 },
  disclaimer: {
    color: "var(--muted)",
    fontSize: 12,
    margin: "16px 0 0",
    textAlign: "center",
  },
};
