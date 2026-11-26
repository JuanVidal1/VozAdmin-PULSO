"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.25 5.48-4.73 7.18l7.62 5.9c4.45-4.1 7.19-10.15 7.19-17.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.9l-7.62-5.9c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setNotice("");
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = "https://turbo-parakeet-x5v5qjvx4jqgf6x64-3000.app.github.dev/auth/callback?next=%2Fresumen";
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
    setNotice("");
    setLoading(true);
    try {
      const supabase = createClient();
      // Use the exact host where the registration page is running. Codespaces
      // assigns a host per forwarded port, so a saved env URL can become stale.
      const emailRedirectTo = "https://turbo-parakeet-x5v5qjvx4jqgf6x64-3000.app.github.dev/auth/callback?next=%2Fresumen";
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), business_name: businessName.trim() },
          emailRedirectTo,
        },
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        router.push("/resumen");
        router.refresh();
      } else {
        setNotice("Cuenta creada. Te enviamos un correo de confirmación. Abre el enlace para activar tu cuenta.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span>V.</span><strong>vozadmin</strong></div>
        <p className="eyebrow">EMPIEZA A CRECER</p>
        <h1>Tu negocio merece más.</h1>
        <p className="auth-subtitle">Crea tu acceso y prepara tu espacio de trabajo.</p>
        <button type="button" className="google-auth-btn" onClick={handleGoogleSignIn} disabled={googleLoading || loading}>
          <GoogleMark /> {googleLoading ? "Conectando con Google..." : "Continuar con Google"}
        </button>
        <div className="auth-divider"><span>o regístrate con tu correo</span></div>
        <form onSubmit={handleSubmit}>
          <label>Tu nombre<input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre completo" /></label>
          <label>Nombre del negocio<input required minLength={2} value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Ej. Mi negocio" /></label>
          <label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@negocio.com" /></label>
          <label>Contraseña<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></label>
          {error && <p className="auth-error">{error}</p>}
          {notice && <p className="auth-notice">{notice}</p>}
          <button className="primary-btn auth-submit" disabled={loading}>{loading ? "Creando cuenta..." : "Crear cuenta"}</button>
        </form>
        <p className="auth-footer">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p>
        <p className="auth-legal">Al continuar, tus datos de negocio quedarán aislados de los de otras empresas.</p>
      </section>
    </main>
  );
}
