"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { TopNav } from "@/components/TopNav";
import { OtpForm } from "@/components/OtpForm";
import { useSession, signOut } from "@/lib/auth";
import {
  fetchMyReports,
  computeBalance,
  buildPayoutMailto,
  claimPending,
  MIN_WITHDRAWAL,
  type MyReport,
} from "@/lib/rewards";
import { severityInfo } from "@/lib/severity";

export default function MisReportesPage() {
  const { session, loading } = useSession();
  const [rows, setRows] = useState<MyReport[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const load = useCallback(async () => {
    setLoadingRows(true);
    // Claim a report stashed before magic-link login (if any), then fetch.
    await claimPending();
    setRows(await fetchMyReports());
    setLoadingRows(false);
  }, []);

  useEffect(() => {
    if (session) load();
    else setRows([]);
  }, [session, load]);

  if (loading) {
    return (
      <main style={styles.page}>
        <TopNav showMapaLink />
      </main>
    );
  }

  // Logged out → OTP login.
  if (!session) {
    return (
      <main style={styles.page}>
        <TopNav showMapaLink />
        <h1 style={styles.title}>💵 Mis reportes</h1>
        <p style={styles.sub}>
          Ganas $1 por cada reporte aprobado. Inicia sesión con tu correo para
          ver tus reportes y tu recompensa.
        </p>
        <div style={{ marginTop: 12 }}>
          <OtpForm />
        </div>
      </main>
    );
  }

  const balance = computeBalance(rows);
  const canWithdraw = balance >= MIN_WITHDRAWAL;

  return (
    <main style={styles.page}>
      <TopNav showMapaLink />
      <h1 style={styles.title}>💵 Mis reportes</h1>

      <div style={styles.balanceCard}>
        <span style={styles.balanceLabel}>Tu recompensa</span>
        <span style={styles.balanceAmount}>${balance}</span>
      </div>

      {canWithdraw ? (
        <a
          className="btn btn-whatsapp"
          href={buildPayoutMailto(rows)}
          style={{ marginTop: 4 }}
        >
          Retirar ${balance}
        </a>
      ) : (
        <button className="btn btn-whatsapp" disabled style={{ marginTop: 4 }}>
          Junta ${MIN_WITHDRAWAL} para retirar (llevas ${balance})
        </button>
      )}

      <h2 style={styles.listHeading}>Tus reportes</h2>
      {loadingRows ? (
        <p style={styles.sub}>Cargando…</p>
      ) : rows.length === 0 ? (
        <p style={styles.sub}>
          Aún no tienes reportes vinculados a este correo.{" "}
          <a href="/reporte" style={{ color: "var(--text)" }}>
            Reporta un edificio
          </a>
          .
        </p>
      ) : (
        <ul style={styles.list}>
          {rows.map((r) => (
            <li key={r.id} style={styles.item}>
              <div style={{ minWidth: 0 }}>
                <div style={styles.itemPlace}>
                  {severityInfo(r.severity).emoji}{" "}
                  {r.place || "Edificio sin nombre"}
                </div>
                <div style={styles.itemDate}>
                  {new Date(r.created_at).toLocaleDateString("es-VE")}
                </div>
              </div>
              <span style={styles.status}>{statusLabel(r)}</span>
            </li>
          ))}
        </ul>
      )}

      <button onClick={signOut} style={styles.signOut}>
        Cerrar sesión
      </button>
    </main>
  );
}

function statusLabel(r: MyReport): string {
  if (r.paid) return "💵 Pagado";
  if (r.approved) return "✅ Aprobado";
  return "⏳ En revisión";
}

const styles: Record<string, CSSProperties> = {
  page: { maxWidth: 480, margin: "0 auto", padding: "84px 16px 32px" },
  title: { fontSize: 22, margin: "0 0 6px" },
  sub: { color: "var(--muted)", fontSize: 14, margin: 0 },
  balanceCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "16px 18px",
    margin: "14px 0 10px",
  },
  balanceLabel: { color: "var(--muted)", fontSize: 14, fontWeight: 600 },
  balanceAmount: { fontSize: 30, fontWeight: 800 },
  listHeading: { fontSize: 16, margin: "22px 0 8px" },
  list: { listStyle: "none", margin: 0, padding: 0 },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid var(--border)",
  },
  itemPlace: {
    fontWeight: 600,
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemDate: { color: "var(--muted)", fontSize: 12, marginTop: 2 },
  status: { flexShrink: 0, fontSize: 13, fontWeight: 700 },
  signOut: {
    display: "block",
    margin: "28px auto 0",
    padding: 8,
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: 14,
    cursor: "pointer",
  },
};
