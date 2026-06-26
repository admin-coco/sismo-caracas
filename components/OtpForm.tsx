"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { sendOtp, verifyOtp } from "@/lib/auth";

// Email-OTP form: enter email → receive a 6-digit code → verify. Calls
// onVerified() once the session is established. Used on the report success
// screen (to claim a reward) and on /mis-reportes (to log in).
export function OtpForm({ onVerified }: { onVerified?: () => void }) {
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendOtp(email);
      setStage("code");
    } catch (e) {
      console.error(e);
      setError("No se pudo enviar el código. Verifica tu correo e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email, code);
      onVerified?.();
    } catch (e) {
      console.error(e);
      setError("Código incorrecto o vencido. Revisa el correo o pide uno nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "code") {
    return (
      <div style={styles.wrap}>
        <p style={styles.hint}>
          Te enviamos un código de 6 dígitos a <b>{email}</b>. Escríbelo aquí:
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          style={{ ...styles.input, letterSpacing: 6, textAlign: "center" }}
        />
        <button
          className="btn btn-whatsapp"
          disabled={busy || code.length < 6}
          onClick={handleVerify}
          style={styles.btn}
        >
          {busy ? "Verificando…" : "Verificar"}
        </button>
        <button
          onClick={() => {
            setStage("email");
            setCode("");
            setError(null);
          }}
          style={styles.link}
        >
          ‹ Usar otro correo
        </button>
        {error && <p style={styles.error}>{error}</p>}
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
        {busy ? "Enviando…" : "Enviar código"}
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
  hint: { color: "var(--muted)", fontSize: 13, margin: "0 0 8px" },
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
