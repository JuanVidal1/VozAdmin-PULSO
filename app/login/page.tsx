"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
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

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>V.</span><strong>vozadmin</strong></div><p className="eyebrow">TU NEGOCIO, EN CONTROL</p><h1>Qué bueno verte.</h1><p className="auth-subtitle">Ingresa para continuar a tu espacio de trabajo.</p><form onSubmit={handleSubmit}><label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@negocio.com"/></label><label>Contraseña<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></label>{error&&<p className="auth-error">{error}</p>}<button className="primary-btn auth-submit" disabled={loading}>{loading?"Ingresando...":"Iniciar sesión"}</button></form><p className="auth-footer">¿Aún no tienes cuenta? <Link href="/registro">Crea tu cuenta</Link></p><p className="auth-legal">Tu información se protege con controles de acceso por empresa.</p></section></main>;
}