"use client";

import { useState } from "react";
import { COCO_RESOURCES, EXTERNAL_RESOURCES, type Resource } from "@/lib/resources";
import { shareApp } from "@/lib/share";
import { TopNav } from "@/components/TopNav";

// Single grid sorted alphabetically by name, regardless of whether the
// resource is one of Coco's own products or an external partner. The split
// existed for editorial reasons but felt arbitrary to users.
const ALL_RESOURCES: Resource[] = [...COCO_RESOURCES, ...EXTERNAL_RESOURCES]
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

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
        <img
          src={r.logo}
          alt={r.name}
          style={{
            ...styles.logo,
            ...(r.logoHeight ? { height: r.logoHeight } : {}),
            ...(r.logoStyle ?? {}),
          }}
        />
      )}
      <div style={styles.name}>{r.name}</div>
      <div style={styles.desc}>{r.description}</div>
      {r.benefits && (
        <ul style={styles.benefits}>
          {r.benefits.map((b) => (
            <li key={b} style={styles.benefit}>
              {b}
            </li>
          ))}
        </ul>
      )}
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
    <main className="ayuda-page" style={styles.page}>
      <TopNav showMapaLink />
      <header style={styles.header}>
        <span style={styles.pill}>Ayuda comunitaria</span>
        <h1 style={styles.title}>Ofertas de Ayuda</h1>
        <p style={styles.sub}>
          Estas empresas se encuentran otorgando servicios de ayuda y/o gratuitos.
        </p>
      </header>

      <div style={styles.grid}>
        {ALL_RESOURCES.map((r) => (
          <Card key={r.url} r={r} />
        ))}
      </div>

      {/* Fixed share bar — always visible at the bottom while scrolling. */}
      <div style={styles.shareBar}>
        <button
          className="btn btn-whatsapp"
          onClick={handleShare}
          style={{ width: "100%", maxWidth: 480 }}
        >
          {copied ? "✅ ¡Enlace copiado!" : "📲🎟️ Compartir Promociones"}
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Top padding leaves room for the fixed-position TopNav pills.
  // Horizontal + bottom padding here; top padding is responsive via the
  // .ayuda-page class (inline padding-top would override the class).
  page: {
    maxWidth: 1040,
    margin: "0 auto",
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 110,
  },
  shareBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center", // center the button on wide screens
    padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)",
    background: "rgba(250,246,236,0.96)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    borderTop: "1px solid var(--border)",
    zIndex: 40,
  },
  header: { textAlign: "center", marginBottom: 22 },
  pill: {
    display: "inline-block",
    background: "#16a34a",
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "5px 12px",
    borderRadius: 999,
    marginBottom: 10,
  },
  title: { fontSize: 26, fontWeight: 800, margin: "0 0 6px" },
  sub: { color: "var(--muted)", margin: 0, fontSize: 14, lineHeight: 1.5 },
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
  benefits: {
    listStyle: "none",
    margin: "8px 0 0",
    padding: 0,
  },
  benefit: {
    fontSize: 12.5,
    lineHeight: 1.35,
    color: "var(--text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  visit: { color: "#60a5fa", fontWeight: 700 },
};
