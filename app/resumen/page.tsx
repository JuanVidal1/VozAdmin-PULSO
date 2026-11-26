"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Activity, ArrowDownRight, ArrowUpRight, Building2, Package, RefreshCw, Users, Wallet } from "lucide-react";

type Organization = {
  id: string;
  name: string;
  currency_code: string;
  role: string;
};

type Transaction = {
  id: string;
  transaction_type: "income" | "expense";
  description: string;
  category: string;
  amount: number | string;
  payment_method: string | null;
  transaction_date: string;
  created_at: string;
};

type Product = { id: string; name: string; stock_quantity: number | string; minimum_stock: number | string; sale_price: number | string };
type Contact = { id: string; name: string; contact_type: "customer" | "supplier" | "both" };

async function readApi<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No fue posible cargar la información.");
  return payload as T;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "COP",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default function ResumenPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking");

  const organization = organizations.find(item => item.id === organizationId);
  const currency = organization?.currency_code || "COP";

  useEffect(() => {
    let active = true;
    async function loadOrganizations() {
      try {
        const result = await readApi<{ data: { role: string; organization: Organization }[] }>("/api/organizations");
        if (!active) return;
        const rows = (result.data || []).flatMap(item => item.organization ? [{ ...item.organization, role: item.role }] : []);
        setOrganizations(rows);
        setConnectionStatus("connected");
        setError("");
        if (rows.length) setOrganizationId(current => current || rows[0].id);
      } catch (cause) {
        if (active) {
          setConnectionStatus("error");
          setError(cause instanceof Error ? cause.message : "No fue posible consultar tus empresas.");
        }
      } finally {
        if (active) setLoadingOrganizations(false);
      }
    }
    void loadOrganizations();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!organizationId) {
      setTransactions([]);
      setProducts([]);
      setContacts([]);
      return;
    }
    let active = true;
    async function loadDashboard() {
      setLoadingData(true);
      setConnectionStatus("checking");
      setError("");
      const query = `?organization_id=${encodeURIComponent(organizationId)}`;
      try {
        const [movementResult, productResult, contactResult] = await Promise.all([
          readApi<{ data: Transaction[] }>(`/api/transactions${query}`),
          readApi<{ data: Product[] }>(`/api/products${query}`),
          readApi<{ data: Contact[] }>(`/api/contacts${query}`)
        ]);
        if (!active) return;
        setTransactions(movementResult.data || []);
        setProducts(productResult.data || []);
        setContacts(contactResult.data || []);
        setConnectionStatus("connected");
      } catch (cause) {
        if (active) {
          setConnectionStatus("error");
          setError(cause instanceof Error ? cause.message : "No fue posible cargar el resumen.");
        }
      } finally {
        if (active) setLoadingData(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [organizationId, reloadToken]);

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newOrganizationName.trim();
    if (name.length < 2) {
      setError("El nombre de la empresa debe tener al menos 2 caracteres.");
      return;
    }
    setCreatingOrganization(true);
    setError("");
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, country_code: "CO", currency_code: "COP" })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No fue posible crear la empresa.");
      const refreshed = await readApi<{ data: { role: string; organization: Organization }[] }>("/api/organizations");
      const rows = (refreshed.data || []).flatMap(item => item.organization ? [{ ...item.organization, role: item.role }] : []);
      setOrganizations(rows);
      setOrganizationId(payload.data.id);
      setNewOrganizationName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible crear la empresa.");
    } finally {
      setCreatingOrganization(false);
    }
  }

  const totals = useMemo(() => transactions.reduce((result, item) => {
    const amount = Number(item.amount) || 0;
    if (item.transaction_type === "income") result.income += amount;
    if (item.transaction_type === "expense") result.expenses += amount;
    return result;
  }, { income: 0, expenses: 0 }), [transactions]);

  const lowStock = products.filter(product => Number(product.stock_quantity) <= Number(product.minimum_stock)).length;
  const recent = transactions.slice(0, 7);
  const connectionLabel = connectionStatus === "checking" ? "Verificando conexión" : connectionStatus === "error" ? "Revisar conexión" : "Supabase conectado";
  const connectionClass = connectionStatus === "error" ? "status pending" : connectionStatus === "connected" ? "status" : "legend";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">V.</span><span className="brand-name">vozadmin<span>.</span></span></div>
        <div className="workspace">
          <div className="workspace-avatar"><Building2 size={17}/></div>
          <div><small>EMPRESA ACTIVA</small><strong>{organization?.name || (loadingOrganizations ? "Cargando..." : "Sin empresa")}</strong></div>
        </div>
        <div>
          <p className="nav-label">OPERACIÓN</p>
          <nav className="nav-list">
            <Link className="nav-item active" href="/resumen"><Activity size={17}/>Resumen</Link>
            <span className="nav-item" aria-disabled="true" title="Módulo en desarrollo"><Wallet size={17}/>Ventas y gastos <small style={{ marginLeft: "auto", fontSize: 9, opacity: .65 }}>Pronto</small></span>
            <span className="nav-item" aria-disabled="true" title="Módulo en desarrollo"><Package size={17}/>Inventario <small style={{ marginLeft: "auto", fontSize: 9, opacity: .65 }}>Pronto</small></span>
            <span className="nav-item" aria-disabled="true" title="Módulo en desarrollo"><Users size={17}/>Clientes y proveedores <small style={{ marginLeft: "auto", fontSize: 9, opacity: .65 }}>Pronto</small></span>
          </nav>
        </div>
        <div className="nav-spacer"/>
        <div className="sidebar-bottom"><div className="user-card"><div className="user-avatar">VA</div><div><strong>Espacio de trabajo</strong><small>Cuenta autenticada</small></div></div></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">VozAdmin <span>/</span> <b>Resumen</b></div>
          <div className="top-actions">
            <select aria-label="Empresa activa" className="date-chip" value={organizationId} onChange={event => setOrganizationId(event.target.value)} disabled={organizations.length === 0}>
              {organizations.length === 0 && <option value="">{loadingOrganizations ? "Cargando empresas..." : "Sin empresas"}</option>}
              {organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="icon-btn" type="button" title="Actualizar datos" onClick={() => setReloadToken(current => current + 1)}><RefreshCw size={17}/></button>
          </div>
        </header>

        <section className="heading-row">
          <div><p className="eyebrow">TU NEGOCIO, EN CONTROL</p><h1 className="page-title">Resumen general</h1><p className="subtitle">Actividad real de {organization?.name || "tu empresa"}, conectada a tus datos.</p></div>
        </section>

        {error && <div role="alert" className="panel" style={{ marginBottom: 16, color: "#a33c32", borderColor: "#f2d5d0" }}>{error}</div>}

        {!loadingOrganizations && organizations.length === 0 && (
          <section className="panel" style={{ padding: 28 }}>
            <h2 className="panel-title">Todavía no tienes una empresa registrada</h2>
            <p className="subtitle">Tu cuenta está activa, pero no encontramos una empresa asociada. Registra tu negocio para comenzar.</p>
            <form onSubmit={handleCreateOrganization} style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
              <input aria-label="Nombre de la empresa" required minLength={2} maxLength={120} value={newOrganizationName} onChange={event => setNewOrganizationName(event.target.value)} placeholder="Nombre de tu negocio" style={{ flex: "1 1 240px", minHeight: 44, border: "1px solid #dfe7e1", borderRadius: 10, padding: "0 13px", fontSize: 13 }} />
              <button className="primary-btn" type="submit" disabled={creatingOrganization}>{creatingOrganization ? "Creando..." : "Crear empresa"}</button>
            </form>
          </section>
        )}

        <section className="stats-grid">
          <article className="stat-card"><div className="stat-top"><span>Ingresos registrados</span><span className="stat-icon"><ArrowUpRight size={16}/></span></div><p className="stat-value">{loadingData ? "…" : formatMoney(totals.income, currency)}</p><p className="stat-foot">Cálculo sobre los últimos 100 movimientos consultados</p></article>
          <article className="stat-card"><div className="stat-top"><span>Gastos registrados</span><span className="stat-icon"><ArrowDownRight size={16}/></span></div><p className="stat-value">{loadingData ? "…" : formatMoney(totals.expenses, currency)}</p><p className="stat-foot">Cálculo sobre los últimos 100 movimientos consultados</p></article>
          <article className="stat-card"><div className="stat-top"><span>Productos activos</span><span className="stat-icon"><Package size={16}/></span></div><p className="stat-value">{loadingData ? "…" : products.length.toLocaleString("es-CO")}</p><p className="stat-foot">{lowStock} con existencias en nivel mínimo</p></article>
          <article className="stat-card"><div className="stat-top"><span>Contactos</span><span className="stat-icon"><Users size={16}/></span></div><p className="stat-value">{loadingData ? "…" : contacts.length.toLocaleString("es-CO")}</p><p className="stat-foot">Clientes y proveedores</p></article>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-head"><div><h2 className="panel-title">Movimientos recientes</h2><p className="panel-note">Últimos registros financieros de la empresa</p></div><span className="legend">{transactions.length} registros</span></div>
            {loadingData ? <p className="empty-note">Cargando movimientos…</p> : recent.length === 0 ? <p className="empty-note">Aún no hay movimientos registrados. Cuando registres ingresos o gastos, aparecerán aquí.</p> : (
              <div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Descripción</th><th>Fecha</th><th>Tipo</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead><tbody>
                {recent.map(item => <tr key={item.id}><td>{item.description}</td><td>{formatDate(item.transaction_date)}</td><td><span className={item.transaction_type === "income" ? "status" : "status pending"}>{item.transaction_type === "income" ? "Ingreso" : "Gasto"}</span></td><td className="amount" style={{ textAlign: "right" }}>{formatMoney(Number(item.amount), currency)}</td></tr>)}
              </tbody></table></div>
            )}
          </article>
          <article className="panel">
            <div className="panel-head"><div><h2 className="panel-title">Conexión de datos</h2><p className="panel-note">Estado de las consultas realizadas por este panel</p></div><span className={connectionClass}>{connectionLabel}</span></div>
            <div className="activity">
              <div className="activity-item"><span className="activity-icon"><Building2 size={14}/></span><div><strong>Empresa</strong><p>{organization?.name || "No hay empresa seleccionada"}</p></div></div>
              <div className="activity-item"><span className="activity-icon"><Wallet size={14}/></span><div><strong>Movimientos financieros</strong><p>{transactions.length} registros consultados. La API limita esta vista a los últimos 100.</p></div></div>
              <div className="activity-item"><span className="activity-icon"><Package size={14}/></span><div><strong>Inventario</strong><p>{products.length} productos activos disponibles.</p></div></div>
              <div className="activity-item"><span className="activity-icon"><Users size={14}/></span><div><strong>Contactos</strong><p>{contacts.length} registros consultados desde Supabase.</p></div></div>
              <div className="activity-item"><span className="activity-icon"><Activity size={14}/></span><div><strong>Estado de conexión</strong><p>{connectionLabel}. Este indicador no representa todavía las integraciones futuras de IA, voz o pagos.</p></div></div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
