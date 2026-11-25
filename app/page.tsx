"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, Bell, Boxes, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Command, CreditCard, FileText, Headphones, LayoutDashboard, Menu, Mic, Package, Plus, Search, Send, Settings, ShoppingBag, Sparkles, TrendingUp, Users, Wallet, X } from "lucide-react";

type Entry = { id: string; name: string; detail: string; amount: number; kind: "Ingreso" | "Gasto"; date: string };
const initialEntries: Entry[] = [];
const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
const navGroups = [
  { title: "Principal", items: [{ label: "Resumen", icon: LayoutDashboard }, { label: "Ventas", icon: ShoppingBag }, { label: "Gastos", icon: ArrowDownLeft }, { label: "Caja y bancos", icon: Wallet }] },
  { title: "Tu operación", items: [{ label: "Inventario", icon: Boxes }, { label: "Compras", icon: Package }, { label: "Clientes", icon: Users }, { label: "Proveedores", icon: BriefcaseBusiness }, { label: "Cuentas por cobrar", icon: ClipboardList }] },
  { title: "Inteligencia", items: [{ label: "Informes", icon: FileText }, { label: "Automatizaciones", icon: Activity }, { label: "Configuración", icon: Settings }] }
];

export default function Home() {
  const [active, setActive] = useState("Resumen");
  const [entries, setEntries] = useState(initialEntries);
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("Cargando empresa...");
  const [loadingData, setLoadingData] = useState(true);
  const [modal, setModal] = useState<"Ingreso" | "Gasto" | "Venta" | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [detail, setDetail] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [pulsoOpen, setPulsoOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const totals = useMemo(() => entries.reduce((acc, item) => { acc[item.kind] += item.amount; return acc; }, { Ingreso: 0, Gasto: 0 }), [entries]);
  const balance = totals.Ingreso - totals.Gasto;
  const filtered = entries.filter(item => (item.name + item.detail).toLowerCase().includes(search.toLowerCase()));
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2600); };

  useEffect(() => {
    let cancelled = false;
    async function loadWorkspace() {
      try {
        const response = await fetch("/api/organizations", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No fue posible cargar tu empresa.");
        const membership = result.data?.[0];
        const organization = Array.isArray(membership?.organization)
          ? membership.organization[0]
          : membership?.organization;
        if (!organization?.id) {
          if (!cancelled) {
            setOrganizationName("Sin empresa");
            setEntries([]);
            notify("Tu cuenta aún no tiene una empresa. Completa el registro del negocio.");
          }
          return;
        }
        if (cancelled) return;
        setOrganizationId(organization.id);
        setOrganizationName(organization.name);
        const transactionsResponse = await fetch(`/api/transactions?organization_id=${organization.id}`, { cache: "no-store" });
        const transactionsResult = await transactionsResponse.json();
        if (!transactionsResponse.ok) throw new Error(transactionsResult.error || "No fue posible cargar los movimientos.");
        if (!cancelled) {
          setEntries((transactionsResult.data ?? []).map((item: {
            id: string; description: string; category: string; amount: number | string;
            transaction_type: "income" | "expense"; transaction_date: string; payment_method: string | null;
          }) => ({
            id: item.id,
            name: item.description,
            detail: [item.category, item.payment_method].filter(Boolean).join(" · "),
            amount: Number(item.amount),
            kind: item.transaction_type === "expense" ? "Gasto" : "Ingreso",
            date: new Date(`${item.transaction_date}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
          })));
        }
      } catch (error) {
        if (!cancelled) notify(error instanceof Error ? error.message : "Error al cargar los datos.");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    loadWorkspace();
    return () => { cancelled = true; };
  }, []);

  const openEntry = (kind: "Ingreso" | "Gasto" | "Venta") => { setName(""); setAmount(""); setDetail(""); setModal(kind); };
  const saveEntry = async () => {
    const numeric = Number(amount.replace(/[^0-9]/g, ""));
    if (!organizationId) { notify("No hay una empresa activa para guardar el movimiento."); return; }
    if (!name.trim() || !numeric || numeric <= 0) { notify("Completa el concepto y un valor válido."); return; }
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          transaction_type: modal === "Gasto" ? "expense" : "income",
          category: modal === "Venta" ? "venta" : modal === "Gasto" ? "gasto" : "ingreso",
          description: name.trim(),
          amount: numeric,
          notes: detail.trim() || null
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No fue posible guardar el movimiento.");
      const item = result.data;
      setEntries(current => [{
        id: item.id,
        name: item.description,
        detail: [item.category, item.payment_method].filter(Boolean).join(" · "),
        amount: Number(item.amount),
        kind: item.transaction_type === "expense" ? "Gasto" : "Ingreso",
        date: new Date(`${item.transaction_date}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
      }, ...current]);
      setModal(null);
      notify("Movimiento guardado en la base de datos.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No fue posible guardar el movimiento.");
    }
  };
  const sendToPulso = () => {
    if (!message.trim()) return;
    const text = message.trim(); setMessage(""); setPulsoOpen(true);
    notify("PULSO recibió tu mensaje. Conecta el proveedor de IA para activar respuestas inteligentes.");
    if (/venta|ingreso|vendí/i.test(text)) setTimeout(() => notify("Puedo registrar esa venta cuando esté activa la conexión segura de PULSO."), 700);
  };
  const heading = active === "Resumen" ? "Tu negocio, en un solo lugar" : active;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark">V.</div><div className="brand-name">voz<span>admin</span></div></div>
      <div className="workspace"><div className="workspace-avatar">N</div><div><small>ESPACIO DE TRABAJO</small><strong>{organizationName}</strong></div><ChevronDown size={14} style={{marginLeft:"auto",color:"#a9b7b0"}}/></div>
      {navGroups.map(group => <div key={group.title}><p className="nav-label">{group.title}</p><div className="nav-list">{group.items.map(item => <button key={item.label} className={`nav-item ${active === item.label ? "active" : ""}`} onClick={() => {setActive(item.label);setMobileNav(false);}}><item.icon/><span>{item.label}</span></button>)}</div></div>)}
      <div className="nav-spacer"/><div className="sidebar-bottom"><div className="user-card"><div className="user-avatar">JV</div><div><strong>Administrador</strong><small>Espacio empresarial</small></div><Settings size={15} style={{marginLeft:"auto",color:"#9baaa2"}}/></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div style={{display:"flex",alignItems:"center",gap:12}}><button className="icon-btn mobile-menu" onClick={()=>setMobileNav(!mobileNav)} aria-label="Abrir menú"><Menu/></button><div className="breadcrumb">Espacio de trabajo <span style={{margin:"0 7px"}}>/</span> <b>{active}</b></div></div><div className="top-actions"><div className="date-chip"><CalendarDays size={13} style={{display:"inline",verticalAlign:"-2px",marginRight:7}}/>{new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</div><button className="icon-btn" aria-label="Buscar" onClick={()=>document.getElementById("movement-search")?.focus()}><Search/></button><button className="icon-btn" aria-label="Notificaciones" onClick={()=>notify("No tienes notificaciones nuevas.")}><Bell/><i className="dot"/></button></div></header>
      <section className="heading-row"><div><p className="eyebrow">PANEL DE CONTROL · COLOMBIA</p><h1 className="page-title">{heading}</h1><p className="subtitle">{loadingData ? "Cargando la información de tu empresa..." : "Hola. Aquí tienes el pulso de tu operación."}</p></div><button className="primary-btn" onClick={()=>openEntry("Venta")}><Plus size={16}/> Registrar movimiento</button></section>
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-top"><span>Ingresos registrados</span><span className="stat-icon"><ArrowUpRight/></span></div><div className="stat-value">{money(totals.Ingreso)}</div><div className="stat-foot"><span className="positive">↑ Datos reales</span> · Empresa activa</div></article>
        <article className="stat-card"><div className="stat-top"><span>Gastos registrados</span><span className="stat-icon" style={{background:"#fff2e9",color:"#c47b3e"}}><ArrowDownLeft/></span></div><div className="stat-value">{money(totals.Gasto)}</div><div className="stat-foot">Movimientos guardados en tu empresa</div></article>
        <article className="stat-card"><div className="stat-top"><span>Flujo neto</span><span className="stat-icon" style={{background:"#f1f0fb",color:"#7566a8"}}><TrendingUp/></span></div><div className="stat-value">{money(balance)}</div><div className="stat-foot">Ingresos menos gastos registrados</div></article>
        <article className="stat-card"><div className="stat-top"><span>Movimientos</span><span className="stat-icon" style={{background:"#fff4e7",color:"#b47c36"}}><ClipboardList/></span></div><div className="stat-value">{entries.length}</div><div className="stat-foot">Registros almacenados</div></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel"><div className="panel-head"><div><h2 className="panel-title">Actividad del negocio</h2><div className="panel-note">Vista ilustrativa · Conecta tus datos para ver tendencias reales</div></div><select className="period-select" aria-label="Periodo"><option>Últimos 7 días</option><option>Este mes</option></select></div><div className="chart-wrap"><div className="chart-grid"><i className="grid-line"/><i className="grid-line"/><i className="grid-line"/><i className="grid-line"/></div><svg className="chart-svg" viewBox="0 0 600 150" preserveAspectRatio="none" role="img" aria-label="Gráfico ilustrativo de actividad"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#78ad91" stopOpacity=".25"/><stop offset="100%" stopColor="#78ad91" stopOpacity="0"/></linearGradient></defs><path d="M0 115 C35 108 48 85 82 94 S135 118 170 82 S225 89 260 62 S315 83 345 55 S400 76 430 42 S485 64 520 28 S565 43 600 12 L600 150 L0 150Z" fill="url(#area)"/><path d="M0 115 C35 108 48 85 82 94 S135 118 170 82 S225 89 260 62 S315 83 345 55 S400 76 430 42 S485 64 520 28 S565 43 600 12" fill="none" stroke="#367b62" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round"/><path d="M0 132 C40 128 58 119 82 123 S135 130 170 113 S225 121 260 108 S315 115 345 100 S400 111 430 96 S485 104 520 84 S565 91 600 78" fill="none" stroke="#c7d89a" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round"/></svg><div className="chart-labels"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div></div><div className="legend"><span><i/>Ingresos</span><span><i/>Gastos</span></div></article>
        <article className="panel"><div className="panel-head"><div><h2 className="panel-title">Accesos rápidos</h2><div className="panel-note">Registra y organiza tu operación</div></div><Command size={17} color="#87958e"/></div><div className="quick-grid">{[{label:"Registrar venta",desc:"Nueva entrada",icon:ShoppingBag,kind:"Venta" as const},{label:"Registrar gasto",desc:"Salida de dinero",icon:ArrowDownLeft,kind:"Gasto" as const},{label:"Añadir ingreso",desc:"Otro ingreso",icon:CircleDollarSign,kind:"Ingreso" as const},{label:"Ver inventario",desc:"Productos y stock",icon:Boxes,kind:null}].map(item=><button className="quick-action" key={item.label} onClick={()=>item.kind?openEntry(item.kind):setActive("Inventario")}><span className="quick-icon"><item.icon/></span><strong>{item.label}</strong><small>{item.desc}</small></button>)}</div></article>
      </section>
      <section className="bottom-grid">
        <article className="panel"><div className="panel-head"><div><h2 className="panel-title">Movimientos recientes</h2><div className="panel-note">Movimientos almacenados en tu empresa</div></div><button className="secondary-btn" onClick={()=>setActive("Informes")}>Ver informes</button></div><div style={{display:"flex",gap:8,marginBottom:12}}><input id="movement-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar movimiento..." style={{border:"1px solid #e8ece8",borderRadius:9,padding:"9px 11px",fontSize:11,width:"100%",outline:"none"}}/></div><div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Concepto</th><th>Fecha</th><th>Tipo</th><th style={{textAlign:"right"}}>Valor</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id}><td>{item.name}<div style={{fontSize:9,color:"#89968f",fontWeight:400,marginTop:4}}>{item.detail}</div></td><td style={{color:"#7c8982"}}>{item.date}</td><td><span className={`status ${item.kind==="Gasto"?"pending":""}`}>{item.kind}</span></td><td className="amount" style={{textAlign:"right",color:item.kind==="Gasto"?"#b4773e":"#287457"}}>{item.kind==="Gasto"?"−":"+"}{money(item.amount)}</td></tr>)}</tbody></table>{filtered.length===0&&<div className="empty-note">No hay movimientos que coincidan con tu búsqueda.</div>}</div></article>
        <article className="panel"><div className="panel-head"><div><h2 className="panel-title">Centro de actividad</h2><div className="panel-note">Lo último en tu espacio</div></div><Activity size={17} color="#87958e"/></div><div className="activity"><div className="activity-item"><span className="activity-icon"><Check/></span><div><strong>Tu espacio está listo</strong><p>La interfaz inicial de VozAdmin está preparada para configurar tu negocio.</p><time>Ahora</time></div></div><div className="activity-item"><span className="activity-icon"><CreditCard/></span><div><strong>Pagos por configurar</strong><p>Conecta tu proveedor de pagos cuando quieras activar cobros.</p><time>Configuración pendiente</time></div></div><div className="activity-item"><span className="activity-icon"><Sparkles/></span><div><strong>PULSO está en preparación</strong><p>El asistente se conectará a IA y a tus datos con permisos y auditoría.</p><time>Próximamente</time></div></div></div></article>
      </section>
    </main>
    <button className="pulso-fab" onClick={()=>setPulsoOpen(!pulsoOpen)}><span className="pulso-orb"><Sparkles/></span> Hablar con PULSO</button>
    {pulsoOpen&&<div className="modal-backdrop" onClick={()=>setPulsoOpen(false)}><section className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div style={{display:"flex",alignItems:"center",gap:10}}><span className="pulso-orb" style={{width:34,height:34}}><Sparkles/></span><div><h2>PULSO</h2><div className="panel-note">Tu asistente operativo · Integración pendiente</div></div></div><button className="close-btn" onClick={()=>setPulsoOpen(false)}><X size={16}/></button></div><p style={{fontSize:12,color:"#64736b",lineHeight:1.6}}>PULSO será el centro de control conversacional de VozAdmin. Podrás registrar ventas, consultar inventario y entender tus resultados con texto, voz e imágenes. La conexión con el modelo de IA aún no está configurada.</p><div className="field"><label htmlFor="pulso-message">Escribe lo que necesitas</label><textarea id="pulso-message" rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ej. Hoy vendí 250.000 pesos..."/></div><div className="modal-actions"><button className="secondary-btn" onClick={()=>notify("La captura de voz se habilitará al conectar el servicio.")}><Mic size={14} style={{verticalAlign:"-3px",marginRight:5}}/>Voz</button><button className="primary-btn" onClick={sendToPulso}><Send size={14}/>Enviar</button></div></section></div>}
    {modal&&<div className="modal-backdrop" onClick={()=>setModal(null)}><section className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>{modal==="Venta"?"Registrar venta":modal==="Gasto"?"Registrar gasto":"Añadir ingreso"}</h2><button className="close-btn" onClick={()=>setModal(null)}><X size={16}/></button></div><div className="field"><label htmlFor="entry-name">Concepto</label><input id="entry-name" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Venta mostrador"/></div><div className="field"><label htmlFor="entry-amount">Valor (COP)</label><input id="entry-amount" inputMode="numeric" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ej. 150000"/></div><div className="field"><label htmlFor="entry-detail">Detalle (opcional)</label><input id="entry-detail" value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Medio de pago, categoría..."/></div><p style={{fontSize:10,color:"#8b9891"}}>El movimiento se guardará en la empresa activa y quedará registrado en el historial de auditoría.</p><div className="modal-actions"><button className="secondary-btn" onClick={()=>setModal(null)}>Cancelar</button><button className="primary-btn" onClick={saveEntry}><Check size={14}/>Guardar movimiento</button></div></section></div>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}