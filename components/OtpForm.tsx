"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { sendMagicLink } from "@/lib/auth";

// Magic-link login form: enter email → we email a one-time sign-in link.
// Clicking the link returns the reporter to /mis-reportes already logged in.
// Used on the report success screen and on /mis-reportes.
export function OtpForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendMagicLink(email);
      setSent(true);
    } catch (e) {
      console.error(e);
      setError("No se pudo enviar el enlace. Verifica tu correo e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div style={styles.wrap}>
        <p style={styles.hint}>
          📧 Te enviamos un enlace a <b>{email}</b>. Ábrelo desde este teléfono
          para iniciar sesión y guardar tu recompensa. Revisa también spam.
        </p>
        <button
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          style={styles.link}
        >
          ‹ Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        style={styles.input}
      />
      <button
        className="btn btn-whatsapp"
        disabled={busy || !email.trim()}
        onClick={handleSend}
        style={styles.btn}
      >
        {busy ? "Enviando…" : "Enviar enlace"}
      </button>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { width: "100%", display: "flex", flexDirection: "column" },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 8,
    background: "var(--panel)",
    borderRadius: 12,
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontSize: 15,
  },
  btn: { padding: 13 },
  hint: { color: "var(--muted)", fontSize: 13, margin: 0 },
  link: {
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: 13,
    marginTop: 8,
    cursor: "pointer",
  },
  error: { color: "#b91c1c", fontSize: 13, margin: "8px 0 0" },
};
