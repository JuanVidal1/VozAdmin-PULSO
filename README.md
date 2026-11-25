# VozAdmin — PULSO

Plataforma SaaS de inteligencia operativa para pequeños negocios de Latinoamérica. Colombia es el primer mercado.

## Estado actual

Primera base de aplicación: Next.js + React + TypeScript, panel responsive, PWA manifest y endpoint de salud. La interfaz incluye movimientos de demostración y formularios de sesión; **todavía no guarda datos en una base de datos ni ejecuta operaciones reales**. PULSO muestra el punto de integración conversacional, pero aún no está conectado a un proveedor de IA.

## Requisitos

- Node.js 20.9 o superior
- npm

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Verificación

```bash
npm run build
```

Endpoint de salud: `/api/health`.

## Arquitectura objetivo

- Next.js App Router, React y TypeScript.
- Supabase/PostgreSQL con aislamiento multiempresa y Row Level Security.
- PULSO: capa de orquestación IA con entradas de texto, voz e imágenes.
- API de dominio para ventas, gastos, caja, compras, inventario, clientes, proveedores, cartera e informes.
- Auditoría de operaciones y confirmación explícita para acciones sensibles.
- Integraciones futuras: OpenAI, Mercado Pago, Resend y WhatsApp.
- Despliegue objetivo: Vercel.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa únicamente las credenciales de servicios que se hayan creado. Nunca subas secretos al repositorio. Las variables con prefijo `NEXT_PUBLIC_` son públicas en el navegador.

## Principios

1. Todo dato de negocio pertenece a una empresa (`tenant`) y se valida en el servidor.
2. La IA interpreta y propone; el backend valida permisos y reglas antes de ejecutar.
3. Las operaciones sensibles requieren confirmación explícita y dejan auditoría.
4. No se declara una integración lista hasta que esté conectada y probada de extremo a extremo.
