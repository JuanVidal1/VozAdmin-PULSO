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
  googleButton: { width: "100%", height: 47, display: "flex", alignItems: "center", justifyContent: "center", gap: 11, border: "1px solid #dfe7e1", borderRadius: 11, background: "#fff", color: "#25352e", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  separator: { display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: "#9aa69f", fontSize: 10 },
  error: { margin: 0, padding: "11px 13px", borderRadius: 10, background: "#fff0ee", color: "#a33c32", border: "1px solid #f5d6d1", fontSize: 12, lineHeight: 1.5 },
  footer: { margin: "24px 0 0", textAlign: "center", color: "#74827d", fontSize: 12 },
  link: { color: "#1d6655", fontWeight: 800, textDecoration: "none" },
  legal: { margin: "23px 0 0", paddingTop: 17, borderTop: "1px solid #edf0ed", textAlign: "center", color: "#9aa69f", fontSize: 10, lineHeight: 1.6 }
};

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.25 5.48-4.73 7.18l7.62 5.9c4.45-4.1 7.19-10.15 7.19-17.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.9l-7.62-5.9c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const destination = requestedPath && requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/resumen";
      const redirectTo = new URL(`/auth/callback?next=${encodeURIComponent(destination)}`, window.location.origin).toString();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible conectar con Google.");
      setGoogleLoading(false);
    }
  }

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
        <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || loading} style={{ ...styles.googleButton, opacity: googleLoading ? .7 : 1 }}>
          <GoogleMark /> {googleLoading ? "Conectando con Google..." : "Continuar con Google"}
        </button>
        <div style={styles.separator}><span>o continúa con tu correo</span></div>
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
