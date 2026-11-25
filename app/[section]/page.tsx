import { notFound } from "next/navigation";
import Workspace from "@/components/workspace";
const sections = ["resumen","ventas","gastos","caja-y-bancos","inventario","compras","clientes","proveedores","cuentas-por-cobrar","informes","automatizaciones","configuracion"] as const;
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
 const { section } = await params;
 if (!sections.includes(section as typeof sections[number])) notFound();
 return <Workspace section={section as typeof sections[number]} />;
}
