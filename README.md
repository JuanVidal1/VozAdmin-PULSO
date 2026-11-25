# VozAdmin — PULSO

Plataforma SaaS de inteligencia operativa para pequeños negocios de Latinoamérica. Colombia es el primer mercado.

## Estado

- Panel operativo responsive y PWA.
- Formularios de inicio de sesión y registro con Supabase Auth.
- Esquema PostgreSQL multiempresa con políticas Row Level Security (RLS).
- API inicial de movimientos financieros con autenticación, aislamiento por empresa y auditoría.
- PULSO y las integraciones externas aún requieren configuración y pruebas de extremo a extremo.

La interfaz del panel todavía muestra datos de demostración en memoria. No confundas esos valores con registros persistentes de Supabase.

## Requisitos

- Node.js 20.9 o superior
- npm

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre http://localhost:3000.

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. En Project Settings → API, copia Project URL y la clave publicable/anon.
3. Añade esos valores a `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

4. Abre SQL Editor en Supabase y ejecuta el contenido completo de `supabase/migrations/0001_initial_schema.sql`.
5. En Authentication → URL Configuration, añade la URL local `http://localhost:3000` como Site URL y configura las Redirect URLs de tu entorno.
6. Inicia la aplicación y visita `/registro`. El trigger de base de datos crea el perfil, la empresa y su membresía propietaria al registrarse.

No compartas ni publiques claves secretas. `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse en el navegador; esta primera implementación utiliza la clave pública junto con RLS.

## Rutas iniciales

- `/`: panel de operaciones (todavía con datos de demostración).
- `/registro`: creación de cuenta y empresa.
- `/login`: inicio de sesión.
- `/api/health`: estado de la aplicación.
- `/api/transactions`: consulta y creación de movimientos autenticados. Requiere `organization_id`.

## Verificación

```bash
npm run build
```

Endpoint de salud: `/api/health`.

## Arquitectura objetivo

- Next.js App Router, React y TypeScript.
- Supabase/PostgreSQL con aislamiento multiempresa y RLS.
- PULSO: orquestación IA con entradas de texto, voz e imágenes.
- API de dominio para ventas, gastos, caja, compras, inventario, clientes, proveedores, cartera e informes.
- Auditoría de operaciones y confirmación explícita para acciones sensibles.
- Integraciones futuras: OpenAI, Mercado Pago, Resend y WhatsApp.
- Despliegue objetivo: Vercel.

## Principios de seguridad

1. Cada registro de negocio pertenece a una empresa.
2. PostgreSQL aplica RLS y valida membresía en cada consulta.
3. La IA interpreta y propone; el backend valida permisos y reglas antes de ejecutar.
4. Las operaciones sensibles requieren confirmación explícita y dejan auditoría.
5. No se declara una integración lista hasta que esté conectada y probada de extremo a extremo.
