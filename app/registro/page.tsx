"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, business_name: businessName } }
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        const { error: organizationError } = await supabase.from("organizations").insert({
          name: businessName,
          created_by: data.user?.id
        });
        if (organizationError) throw organizationError;
        router.push("/");
        router.refresh();
      } else {
        setNotice("Cuenta creada. Revisa tu correo para confirmar el registro; después inicia sesión y termina de crear tu empresa.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>V.</span><strong>vozadmin</strong></div><p className="eyebrow">EMPIEZA A CRECER</p><h1>Tu negocio merece más.</h1><p className="auth-subtitle">Crea tu acceso y prepara tu espacio de trabajo.</p><form onSubmit={handleSubmit}><label>Tu nombre<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nombre completo"/></label><label>Nombre del negocio<input required minLength={2} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Ej. Mi negocio"/></label><label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@negocio.com"/></label><label>Contraseña<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></label>{error&&<p className="auth-error">{error}</p>}{notice&&<p className="auth-notice">{notice}</p>}<button className="primary-btn auth-submit" disabled={loading}>{loading?"Creando cuenta...":"Crear cuenta"}</button></form><p className="auth-footer">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p><p className="auth-legal">Al continuar, tus datos de negocio quedarán aislados de los de otras empresas.</p></section></main>;
}