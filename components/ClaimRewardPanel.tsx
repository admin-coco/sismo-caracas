"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSession } from "@/lib/auth";
import { claimReport } from "@/lib/rewards";
import { OtpForm } from "./OtpForm";

// Shown on the report success screen. Lets the reporter claim $1 for the
// report they just submitted. A returning (logged-in) reporter claims silently;
// a new one verifies their email once, then claims.
export function ClaimRewardPanel({ reportId }: { reportId: string }) {
  const { session, loading } = useSession();
  const [claimed, setClaimed] = useState(false);
  const claimingRef = useRef(false); // guard against double-claim on re-render

  async function claim() {
    if (claimingRef.current || claimed) return;
    claimingRef.current = true;
    try {
      await claimReport(reportId);
      setClaimed(true);
    } catch (e) {
      console.error(e);
    } finally {
      claimingRef.current = false;
    }
  }

  // Already logged in → claim this report automatically.
  useEffect(() => {
    if (session && !claimed) claim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (loading) return null;

  if (claimed) {
    return (
      <div style={styles.panel}>
        <p style={styles.title}>✅ Sumaste $1 a tu recompensa</p>
        <a className="btn btn-ghost" href="/mis-reportes" style={styles.btn}>
          💵 Ver Mis reportes
        </a>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <p style={styles.title}>💚 Ganas $1 por cada reporte</p>
      <p style={styles.sub}>
        Junta $5 y retíralos por Coco Wallet. Verifica tu correo para guardar tu
        recompensa:
      </p>
      <OtpForm onVerified={claim} />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    width: "100%",
    maxWidth: 320,
    margin: "8px auto 0",
    padding: 16,
    background: "var(--panel)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    textAlign: "left",
  },
  title: { fontWeight: 700, fontSize: 15, margin: "0 0 4px" },
  sub: { color: "var(--muted)", fontSize: 13, margin: "0 0 12px" },
  btn: { padding: 11, fontSize: 15, marginTop: 4 },
};
