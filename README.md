# VozAdmin — PULSO

Plataforma SaaS de inteligencia operativa para pequeños negocios de Latinoamérica. Colombia es el primer mercado.

## Estado real del repositorio

- Panel operativo responsive y PWA.
- Formularios de registro e inicio de sesión preparados para Supabase Auth.
- Esquema multiempresa PostgreSQL con Row Level Security.
- Módulos de datos preparados para contactos, productos, movimientos financieros, ventas, compras, inventario, caja y cartera.
- API inicial de movimientos financieros autenticados.
- PULSO y las integraciones externas aún requieren configuración y pruebas de extremo a extremo.
- El panel principal conserva datos demostrativos en memoria hasta completar su conexión con la API.

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

1. Crea una organización Supabase y, dentro de ella, un **proyecto** llamado `vozadmin-pulso`. La organización por sí sola no crea la base de datos.
2. Elige una región de Sudamérica si está disponible y guarda de forma privada la contraseña de la base de datos.
3. En Project Settings → API, copia Project URL y la clave publicable (o anon legacy).
4. Añade los valores a `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

5. En Supabase → SQL Editor, ejecuta primero `supabase/migrations/0001_initial_schema.sql` y después `supabase/migrations/0002_operational_modules.sql`, completos y en ese orden.
6. En Authentication → URL Configuration, configura la URL local y las Redirect URLs de tu entorno.
7. Inicia la aplicación y visita `/registro`. El trigger crea el perfil y, cuando se confirma el usuario según la configuración de Auth, crea la organización a partir del nombre de negocio enviado en el registro.

No compartas ni publiques claves secretas. `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse en el navegador. La aplicación utiliza la clave pública junto con RLS.

## Rutas iniciales

- `/`: panel operativo (datos demostrativos hasta conectar la persistencia).
- `/registro`: creación de cuenta.
- `/login`: inicio de sesión.
- `/api/health`: estado de la aplicación.
- `/api/transactions`: consulta y creación de movimientos autenticados; requiere `organization_id`.

## Verificación

```bash
npm run build
npm run lint
npm audit
```

No se debe ejecutar `npm audit fix --force` sin revisar antes el árbol de dependencias y los cambios incompatibles.

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
3. Los permisos se validan por rol en el backend y en la base de datos.
4. La IA interpreta y propone; el backend valida permisos y reglas antes de ejecutar.
5. Las operaciones sensibles requieren confirmación explícita y dejan auditoría.
6. No se declara una integración lista hasta que esté conectada y probada de extremo a extremo.
