"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Organization = { id: string; name: string };
type Membership = { organization: Organization | Organization[] | null };
type Contact = {
  id: string;
  organization_id: string;
  contact_type: "customer" | "supplier" | "both";
  name: string;
  email: string | null;
  phone: string | null;
  document_number: string | null;
  address: string | null;
};

export default function CustomersPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadOrganizations() {
      try {
        const response = await fetch("/api/organizations", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No fue posible cargar las empresas.");
        const available = (result.data ?? []).map((item: Membership) =>
          Array.isArray(item.organization) ? item.organization[0] : item.organization
        ).filter((item: Organization | null | undefined): item is Organization => Boolean(item?.id));
        if (active) {
          setOrganizations(available);
          if (available[0]) setOrganizationId(available[0].id);
          else { setError("Esta cuenta aún no tiene una empresa registrada."); setLoading(false); }
        }
      } catch (err) {
        if (active) { setError(err instanceof Error ? err.message : "Error al cargar empresas."); setLoading(false); }
      }
    }
    loadOrganizations();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    setLoading(true);
    setContacts([]);
    async function loadContacts() {
      try {
        const response = await fetch(`/api/contacts?organization_id=${organizationId}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No fue posible cargar los clientes.");
        if (active) setContacts((result.data ?? []).filter((item: Contact) => item.contact_type === "customer" || item.contact_type === "both"));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error al cargar clientes.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadContacts();
    return () => { active = false; };
  }, [organizationId]);

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          contact_type: "customer",
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          document_number: documentNumber.trim() || undefined
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No fue posible guardar el cliente.");
      setContacts(current => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setName("");
      setEmail("");
      setPhone("");
      setDocumentNumber("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f6f3", padding: "28px clamp(16px,4vw,48px)", color: "#142522" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
          <div><p className="eyebrow">GESTIÓN COMERCIAL</p><h1 className="page-title">Clientes</h1><p className="subtitle">Centraliza la información y el historial de tus clientes.</p></div>
          <Link href="/" className="secondary-btn" style={{ textDecoration: "none" }}>← Volver al resumen</Link>
        </header>
        <section className="panel" style={{ padding: 22, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div><h2 className="panel-title">Directorio de clientes</h2><p className="panel-note">{contacts.length} clientes registrados</p></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {organizations.length > 1 && <select value={organizationId} onChange={e => setOrganizationId(e.target.value)} aria-label="Empresa activa" className="period-select">{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select>}
              <button className="primary-btn" onClick={() => setShowForm(value => !value)}>+ Nuevo cliente</button>
            </div>
          </div>
          {error && <p className="auth-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}
          {showForm && <form onSubmit={createContact} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 20, padding: 16, background: "#f7f9f6", borderRadius: 12 }}>
            <label style={{ fontSize: 12 }}>Nombre<input required value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del cliente" style={fieldStyle}/></label>
            <label style={{ fontSize: 12 }}>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" style={fieldStyle}/></label>
            <label style={{ fontSize: 12 }}>Teléfono<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 300..." style={fieldStyle}/></label>
            <label style={{ fontSize: 12 }}>Documento<input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="CC / NIT" style={fieldStyle}/></label>
            <div style={{ display: "flex", gap: 8, alignItems: "end" }}><button className="primary-btn" disabled={saving}>{saving ? "Guardando..." : "Guardar cliente"}</button><button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>}
          <div style={{ overflowX: "auto", marginTop: 20 }}>
            <table className="table" style={{ minWidth: 620, width: "100%" }}><thead><tr><th>Cliente</th><th>Documento</th><th>Teléfono</th><th>Correo</th></tr></thead><tbody>
              {contacts.map(contact => <tr key={contact.id}><td><strong>{contact.name}</strong></td><td>{contact.document_number || "—"}</td><td>{contact.phone || "—"}</td><td>{contact.email || "—"}</td></tr>)}
            </tbody></table>
            {loading && <p className="panel-note" style={{ padding: 18 }}>Cargando clientes...</p>}
            {!loading && contacts.length === 0 && <p className="empty-note">Todavía no hay clientes. Registra el primero para comenzar.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

const fieldStyle = { display: "block", width: "100%", marginTop: 6, padding: "11px 12px", border: "1px solid #e1e8e2", borderRadius: 9, background: "#fff", fontSize: 13, outline: "none" };
