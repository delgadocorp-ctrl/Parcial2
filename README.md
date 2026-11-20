# Sistema de Gestión Comercial — Segundo Parcial

Sistema integral de gestión comercial minorista desarrollado para el 2º parcial de **Programación IV: Desarrollo Web** (Universidad Tecnológica Nacional).

---

## 👥 Datos del Grupo y Comisión
- **Comisión:** Comisión 1 (C1)
- **Grupo:** **Grupo 1**
- **Integrantes:**
  - 63259 — Delgado Ojeda, Francisco Agustín
  - 63660 — Gordillo, Oriana Daniela
  - 54865 — Cequi, Sofía
- **Horario de Defensa Asignado:** **Martes de 10:20 a 10:40 hs**

---

## 🌐 Enlaces del Proyecto
- **Repositorio de GitHub:** `https://github.com/delgadocorp-ctrl/Parcial2.git`
- **Aplicación Publicada (Vercel):** `[URL de Vercel tras deploy]`
- **Base de Datos en Producción:** Turso (libSQL)

---

## 🔑 Credenciales de Acceso para Evaluación
El sistema incluye datos de prueba precargados con dos roles diferenciados:

| Rol | Correo / Usuario | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@comercio.test` | `Password123!` | Acceso total: ventas, stock manual, anulación de facturas, usuarios y configuración. |
| **Vendedor** | `vendedor@comercio.test` | `Password123!` | Operación de mostrador: emisión de ventas, cobro de cuenta corriente, alta de clientes y consulta de catálogo. |

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** [Next.js](https://nextjs.org/) (v15 con App Router y Route Handlers)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) (Tipado estricto)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes:** Componentes accesibles estilo [shadcn/ui](https://ui.shadcn.com/) con iconos de [Lucide React](https://lucide.dev/)
- **Gráficos:** [Chart.js](https://www.chartjs.org/) con `react-chartjs-2`
- **Base de Datos:** SQLite local en desarrollo mediante `@libsql/client`, libSQL en producción con [Turso](https://turso.tech/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/) con migraciones versionadas vía `drizzle-kit`
- **Validación:** [Zod](https://zod.dev/) para esquemas compartidos cliente-servidor
- **Autenticación:** Sesión segura basada en cookies firmadas `httpOnly`, `SameSite=Lax` con [jose](https://github.com/panva/jose) (JWT) y contraseñas hasheadas con [bcryptjs](https://github.com/dcodeIO/bcrypt.js)

---

## 🚀 Puesta en Marcha Local

El proyecto inicia localmente ejecutando los siguientes comandos:

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Aplicar migraciones sobre la base local SQLite
pnpm run db:migrate

# 4. Cargar datos de prueba iniciales en una base vacía (no ejecutarlo sobre datos existentes)
pnpm run db:seed

# 5. Iniciar servidor de desarrollo
pnpm run dev
```

La aplicación quedará disponible en [http://localhost:3000](http://localhost:3000).

El comando `pnpm run build` ejecuta `src/db/deploy.ts` antes de compilar: aplica migraciones y carga datos iniciales únicamente si la base no tiene usuarios. En producción deben configurarse `DATABASE_URL` (o `TURSO_DATABASE_URL`) y un `SESSION_SECRET` de al menos 32 caracteres. `SEED_RESET` no borra ni reemplaza datos existentes; solo permite inicializar una base vacía.

---

## 🏛️ Arquitectura y Capas del Sistema

Siguiendo las pautas arquitectónicas del parcial, la aplicación respeta una estricta separación de responsabilidades:

1. **Capa de Acceso a Datos (`src/db/`):** Define el esquema relacional (`schema.ts`), las conexiones compatibles local/Turso (`index.ts`) y las migraciones versionadas (`drizzle/`).
2. **Capa de Servicios de Negocio (`src/services/`):** Concentra **el 100% de las reglas de negocio**. Todas las operaciones que tocan múltiples tablas se ejecutan en **transacciones atómicas**:
   - `stock.service.ts`: `moverStock()` es la **única función autorizada** para modificar la existencia de un producto, aplicando actualización atómica (`UPDATE productos SET existencia = existencia + ? WHERE id = ? AND existencia + ? >= 0`) y registrando el movimiento de stock en el mismo acto.
   - `facturas.service.ts`: `emitirFactura()` verifica stock, congela precios del catálogo, valida crédito y forma de pago, genera numeración correlativa sin huecos (`0001-00000001`), descuenta existencias y genera deuda en cuenta corriente en una sola transacción.
   - `cuenta.service.ts`: `registrarPago()` valida que el pago no supere la deuda y registra el crédito y recibo correlativo (`R 0001-00000001`).
   - `clientes.service.ts`: Calcula dinámicamente el saldo exacto a partir de los movimientos de cuenta corriente.
   - `tablero.service.ts`: Indicadores del día, del mes, cuentas corrientes y ventas continuas de los últimos 30 días sin huecos.
3. **Capa de Adaptadores API REST (`src/app/api/`):** 31 Route Handlers organizados bajo convención `/api/*` que envuelven las llamadas a los servicios, validan sesión y rol, y traducen errores al contrato unificado `{ error: { code, message, details } }`.
4. **Capa de Interfaz (`src/app/`, `src/components/`):** Vistas responsivas con panel lateral fijo, soporte completo para teclado en el mostrador, avisos claros y comprobantes imprimibles.

---

## 📋 Cumplimiento de Requerimientos Funcionales y Reglas de Negocio

- **RF-V1 a RF-V6 (Nueva Venta y Facturación):** Facturación en mostrador con selección de comprador (Consumidor Final o Cliente registrado), modal de alta rápida de clientes sin perder los ítems cargados, verificación de stock atómica y cálculo de precios desde el servidor.
- **RF-V5 (Formas de Pago):**
  - *Contado:* Cálculo automático de vuelto.
  - *Tarjeta:* Registro seguro de marca, tipo (débito/crédito) y últimos 4 dígitos. Rechaza números completos por esquema.
  - *Cuenta Corriente:* Exclusiva para clientes registrados y habilitados; respeta el límite de crédito disponible.
- **RF-V7 a RF-V9 (Comprobantes y Anulaciones):** Vista imprimible formal de comprobante de venta. Historial de facturas con filtros avanzados y paginación. Anulación exclusiva para administradores con motivo obligatorio, reingresando stock y acreditando saldo.
- **RF-P1 a RF-P7 (Productos y Stock):** Catálogo con búsqueda sin distinción de mayúsculas ni acentos, filtro por categoría y marca visible para productos bajo el stock mínimo. Historial cronológico de movimientos de stock. Gestión de categorías con protección ante desactivación si contienen productos activos (`CATEGORIA_EN_USO`).
- **RF-C1 a RF-C7 (Clientes y Cuenta Corriente):** Listado de clientes con saldos calculados en tiempo real. Ficha individual con historial de movimientos cronológicos (débitos por ventas, créditos por pagos y anulaciones) con saldo acumulado renglón por renglón. Registro de pagos con emisión de recibo oficial numerado. Ranking de saldos deudores (`/clientes/saldos`).
- **RF-U1 a RF-U5 (Usuarios y Seguridad):** Autenticación con cookies `httpOnly`, protección de rutas y permisos verificados en el servidor (un vendedor recibe `403 SIN_PERMISO` si invoca rutas de administración). Protección contra auto-desactivación del propio administrador. Cambio de contraseña propio y reseteo administrativo.
- **RF-T1 a RF-T3 (Tablero e Indicadores):** KPI cards (ventas de hoy, del mes, cuentas corrientes, productos bajo mínimo), gráfico de evolución de ventas diarias de 30 días continuos con Chart.js, gráfico de ventas por medio de pago y ranking de los 5 artículos más vendidos del mes.

---

## 🛡️ Guía para la Defensa Individual

Respuestas rápidas a las preguntas frecuentes del examen:

- **¿Dónde se define el esquema de tablas?** En [`src/db/schema.ts`](./src/db/schema.ts).
- **¿Dónde se conecta con la base de datos?** En [`src/db/index.ts`](./src/db/index.ts), detectando automáticamente SQLite local (`file:local.db`) o Turso (`libsql://...`).
- **¿Cómo se aplican migraciones?** Con `drizzle-kit` mediante el script `src/db/migrate.ts` y automáticamente antes de cada build en `src/db/deploy.ts`.
- **¿Dónde se controlan las existencias y la atomicidad?** En `moverStock()` dentro de [`src/services/stock.service.ts`](./src/services/stock.service.ts) mediante `UPDATE productos SET existencia = existencia + ? WHERE id = ? AND existencia + ? >= 0`.
- **¿Cómo se almacenan los importes?** En centavos enteros (`integer`), eliminando cualquier error de precisión de coma flotante.
- **¿Dónde se impide vender en cuenta corriente a consumidor final o exceder el límite?** En [`src/services/facturas.service.ts`](./src/services/facturas.service.ts).
- **¿Dónde se verifica el rol de usuario?** En [`src/lib/api-handler.ts`](./src/lib/api-handler.ts) y dentro de cada servicio de negocio antes de ejecutar la acción.
