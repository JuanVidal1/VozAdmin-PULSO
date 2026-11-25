"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    padding: "36px 20px", boxSizing: "border-box", position: "relative", overflow: "hidden",
    background: "radial-gradient(ellipse at 12% 12%, rgba(200,237,130,.18), transparent 32%), radial-gradient(ellipse at 90% 90%, rgba(29,102,85,.34), transparent 38%), linear-gradient(135deg,#101d19 0%,#19372e 55%,#10231e 100%)",
    fontFamily: "Arial, Helvetica, sans-serif"
  },
  glow: { position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1px solid rgba(214,239,178,.12)", top: -330, right: -130, pointerEvents: "none" },
  card: { width: "100%", maxWidth: 460, boxSizing: "border-box", position: "relative", zIndex: 1, padding: "42px 42px 32px", borderRadius: 24, background: "#fff", boxShadow: "0 30px 100px rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.65)" },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 38 },
  mark: { width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 15, background: "#c8ed82", color: "#17352b", fontSize: 19, fontWeight: 900, boxShadow: "0 7px 18px rgba(200,237,130,.35)" },
  brandName: { color: "#142522", fontSize: 22, fontWeight: 800, letterSpacing: "-.8px" },
  eyebrow: { margin: "0 0 12px", color: "#1d6655", fontSize: 10, fontWeight: 800, letterSpacing: "1.8px" },
  heading: { margin: 0, color: "#142522", fontSize: 34, lineHeight: 1.15, letterSpacing: "-1.3px", fontWeight: 800 },
  subtitle: { margin: "12px 0 28px", color: "#74827d", fontSize: 13, lineHeight: 1.65 },
  form: { display: "grid", gap: 18 },
  label: { display: "grid", gap: 8, color: "#43564d", fontSize: 12, fontWeight: 700 },
  input: { width: "100%", height: 48, boxSizing: "border-box", padding: "0 14px", border: "1px solid #dfe7e1", borderRadius: 11, background: "#fbfcfb", color: "#142522", fontSize: 14, outline: "none" },
  button: { width: "100%", height: 49, marginTop: 3, border: 0, borderRadius: 11, background: "#1d6655", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 18px rgba(29,102,85,.2)" },
  error: { margin: 0, padding: "11px 13px", borderRadius: 10, background: "#fff0ee", color: "#a33c32", border: "1px solid #f5d6d1", fontSize: 12, lineHeight: 1.5 },
  footer: { margin: "24px 0 0", textAlign: "center", color: "#74827d", fontSize: 12 },
  link: { color: "#1d6655", fontWeight: 800, textDecoration: "none" },
  legal: { margin: "23px 0 0", paddingTop: 17, borderTop: "1px solid #edf0ed", textAlign: "center", color: "#9aa69f", fontSize: 10, lineHeight: 1.6 }
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const destination = requestedPath && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : "/resumen";
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div aria-hidden="true" style={styles.glow} />
      <section style={styles.card}>
        <div style={styles.brand}>
          <span style={styles.mark}>V.</span>
          <strong style={styles.brandName}>vozadmin</strong>
        </div>
        <p style={styles.eyebrow}>TU NEGOCIO, EN CONTROL</p>
        <h1 style={styles.heading}>Qué bueno verte.</h1>
        <p style={styles.subtitle}>Ingresa para continuar a tu espacio de trabajo.</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Correo electrónico
            <input style={styles.input} type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@negocio.com" />
          </label>
          <label style={styles.label}>
            Contraseña
            <input style={styles.input} type="password" autoComplete="current-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña" />
          </label>
          {error && <p role="alert" style={styles.error}>{error}</p>}
          <button type="submit" style={{ ...styles.button, opacity: loading ? .7 : 1 }} disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
        <p style={styles.footer}>¿Aún no tienes cuenta?{" "}<Link href="/registro" style={styles.link}>Crea tu cuenta</Link></p>
        <p style={styles.legal}>Tu información se protege con controles de acceso por empresa.</p>
      </section>
    </main>
  );
}
