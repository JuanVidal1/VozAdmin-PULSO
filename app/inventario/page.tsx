"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Organization = { id: string; name: string };
type Membership = { organization: Organization | Organization[] | null };
type Product = {
  id: string;
  organization_id: string;
  sku: string | null;
  name: string;
  unit: string;
  sale_price: number | string;
  cost_price: number | string;
  stock_quantity: number | string;
  minimum_stock: number | string;
};

const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function InventoryPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
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
          else setError("Esta cuenta aún no tiene una empresa registrada.");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error al cargar empresas.");
      }
    }
    loadOrganizations();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    setLoading(true);
    async function loadProducts() {
      try {
        const response = await fetch(`/api/products?organization_id=${organizationId}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No fue posible cargar el inventario.");
        if (active) setProducts(result.data ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error al cargar el inventario.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProducts();
    return () => { active = false; };
  }, [organizationId]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          name: name.trim(),
          sku: sku.trim() || undefined,
          sale_price: Number(salePrice || 0),
          cost_price: Number(costPrice || 0),
          stock_quantity: Number(stock || 0),
          minimum_stock: Number(minimumStock || 0)
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No fue posible guardar el producto.");
      setProducts(current => [...current, result.data].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setName("");
      setSku("");
      setSalePrice("");
      setCostPrice("");
      setStock("0");
      setMinimumStock("0");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f6f3", padding: "28px clamp(16px,4vw,48px)", color: "#142522" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
          <div><p className="eyebrow">CONTROL DE EXISTENCIAS</p><h1 className="page-title">Inventario</h1><p className="subtitle">Administra productos, precios y niveles de existencias.</p></div>
          <Link href="/" className="secondary-btn" style={{ textDecoration: "none" }}>← Volver al resumen</Link>
        </header>
        <section className="panel" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div><h2 className="panel-title">Catálogo de productos</h2><p className="panel-note">{products.length} productos activos</p></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {organizations.length > 1 && <select value={organizationId} onChange={e => setOrganizationId(e.target.value)} aria-label="Empresa activa" className="period-select">{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select>}
              <button className="primary-btn" onClick={() => setShowForm(value => !value)}>+ Nuevo producto</button>
            </div>
          </div>
          {error && <p className="auth-error" role="alert" style={{ marginTop: 14 }}>{error}</p>}
          {showForm && <form onSubmit={createProduct} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 20, padding: 16, background: "#f7f9f6", borderRadius: 12 }}>
            <label style={{ fontSize: 12 }}>Nombre<input required value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del producto" style={fieldStyle}/></label>
            <label style={{ fontSize: 12 }}>SKU<input value={sku} onChange={e => setSku(e.target.value)} placeholder="Código interno" style={fieldStyle}/></label>
            <label style={{ fontSize: 12 }}>Precio de venta (COP)<input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} style={fieldStyle}/></label>
            <label style={{ fontSize: 12 }}>Costo (COP)<input type="number" min="0" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} style={fieldStyle}/></label>
            <label style={{ fontSize: 12 }}>Existencias iniciales<input type="number" min="0" step="0.001" value={stock} onChange={e => setStock(e.target.value)} style={fieldStyle}/></label>
            <label style={{ fontSize: 12 }}>Stock mínimo<input type="number" min="0" step="0.001" value={minimumStock} onChange={e => setMinimumStock(e.target.value)} style={fieldStyle}/></label>
            <div style={{ display: "flex", gap: 8, alignItems: "end" }}><button className="primary-btn" disabled={saving}>{saving ? "Guardando..." : "Guardar producto"}</button><button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>}
          <div style={{ overflowX: "auto", marginTop: 20 }}>
            <table className="table" style={{ minWidth: 680, width: "100%" }}><thead><tr><th>Producto</th><th>SKU</th><th>Existencias</th><th>Stock mínimo</th><th style={{ textAlign: "right" }}>Precio</th></tr></thead><tbody>
              {products.map(product => <tr key={product.id}><td><strong>{product.name}</strong><div className="panel-note">{product.unit}</div></td><td>{product.sku || "—"}</td><td>{Number(product.stock_quantity).toLocaleString("es-CO")}</td><td>{Number(product.minimum_stock).toLocaleString("es-CO")}</td><td style={{ textAlign: "right" }}>{money(Number(product.sale_price))}</td></tr>)}
            </tbody></table>
            {loading && <p className="panel-note" style={{ padding: 18 }}>Cargando productos...</p>}
            {!loading && products.length === 0 && <p className="empty-note">Todavía no hay productos. Registra el primero para comenzar.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

const fieldStyle = { display: "block", width: "100%", marginTop: 6, padding: "11px 12px", border: "1px solid #e1e8e2", borderRadius: 9, background: "#fff", fontSize: 13, outline: "none" };
