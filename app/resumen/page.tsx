"use client";

import { useEffect, useMemo, useState } from "react";
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
        if (rows.length) setOrganizationId(current => current || rows[0].id);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No fue posible consultar tus empresas.");
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
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No fue posible cargar el resumen.");
      } finally {
        if (active) setLoadingData(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [organizationId]);

  const totals = useMemo(() => transactions.reduce((result, item) => {
    const amount = Number(item.amount) || 0;
    if (item.transaction_type === "income") result.income += amount;
    if (item.transaction_type === "expense") result.expenses += amount;
    return result;
  }, { income: 0, expenses: 0 }), [transactions]);

  const lowStock = products.filter(product => Number(product.stock_quantity) <= Number(product.minimum_stock)).length;
  const recent = transactions.slice(0, 7);

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
            <span className="nav-item" aria-disabled="true"><Wallet size={17}/>Ventas y gastos</span>
            <span className="nav-item" aria-disabled="true"><Package size={17}/>Inventario</span>
            <span className="nav-item" aria-disabled="true"><Users size={17}/>Clientes y proveedores</span>
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
            <button className="icon-btn" type="button" title="Actualizar datos" onClick={() => setOrganizationId(current => current)}><RefreshCw size={17}/></button>
          </div>
        </header>

        <section className="heading-row">
          <div><p className="eyebrow">TU NEGOCIO, EN CONTROL</p><h1 className="page-title">Resumen general</h1><p className="subtitle">Actividad real de {organization?.name || "tu empresa"}, conectada a tus datos.</p></div>
        </section>

        {error && <div role="alert" className="panel" style={{ marginBottom: 16, color: "#a33c32", borderColor: "#f2d5d0" }}>{error}</div>}

        {!loadingOrganizations && organizations.length === 0 && (
          <section className="panel" style={{ padding: 28 }}>
            <h2 className="panel-title">Todavía no tienes una empresa registrada</h2>
            <p className="subtitle">Tu cuenta está activa, pero no encontramos una empresa asociada. Completa el registro de tu negocio para comenzar.</p>
            <Link className="primary-btn" href="/registro">Registrar mi negocio</Link>
          </section>
        )}

        <section className="stats-grid">
          <article className="stat-card"><div className="stat-top"><span>Ingresos registrados</span><span className="stat-icon"><ArrowUpRight size={16}/></span></div><p className="stat-value">{loadingData ? "…" : formatMoney(totals.income, currency)}</p><p className="stat-foot">Movimientos guardados</p></article>
          <article className="stat-card"><div className="stat-top"><span>Gastos registrados</span><span className="stat-icon"><ArrowDownRight size={16}/></span></div><p className="stat-value">{loadingData ? "…" : formatMoney(totals.expenses, currency)}</p><p className="stat-foot">Movimientos guardados</p></article>
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
            <div className="panel-head"><div><h2 className="panel-title">Estado del sistema</h2><p className="panel-note">Conexiones y datos disponibles</p></div><span className="status">En línea</span></div>
            <div className="activity">
              <div className="activity-item"><span className="activity-icon"><Building2 size={14}/></span><div><strong>Empresa</strong><p>{organization?.name || "No hay empresa seleccionada"}</p></div></div>
              <div className="activity-item"><span className="activity-icon"><Wallet size={14}/></span><div><strong>Base financiera</strong><p>{transactions.length} movimientos consultados desde Supabase.</p></div></div>
              <div className="activity-item"><span className="activity-icon"><Package size={14}/></span><div><strong>Inventario</strong><p>{products.length} productos activos disponibles.</p></div></div>
              <div className="activity-item"><span className="activity-icon"><Users size={14}/></span><div><strong>Contactos</strong><p>{contacts.length} registros de clientes y proveedores.</p></div></div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
