import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol", { enum: ["admin", "vendedor"] }).notNull().default("vendedor"),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const categorias = sqliteTable("categorias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull().unique(),
  activa: integer("activa", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const productos = sqliteTable("productos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  descripcion: text("descripcion").notNull(),
  categoriaId: integer("categoria_id").notNull().references(() => categorias.id),
  precio: integer("precio").notNull(), // en centavos
  existencia: integer("existencia").notNull().default(0),
  stockMinimo: integer("stock_minimo").notNull().default(0),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const movimientosStock = sqliteTable("movimientos_stock", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productoId: integer("producto_id").notNull().references(() => productos.id),
  tipo: text("tipo", { enum: ["ingreso", "egreso", "venta", "anulacion"] }).notNull(),
  cantidad: integer("cantidad").notNull(), // positivo o negativo
  existenciaResultante: integer("existencia_resultante").notNull(),
  motivo: text("motivo").notNull(),
  observacion: text("observacion"),
  facturaId: integer("factura_id").references(() => facturas.id),
  usuarioId: integer("usuarioId").notNull().references(() => usuarios.id),
  fecha: text("fecha").notNull(),
});

export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tipoDoc: text("tipo_doc", { enum: ["DNI", "CUIT"] }).notNull().default("DNI"),
  nroDoc: text("nro_doc").notNull().unique(),
  nombre: text("nombre").notNull(),
  domicilio: text("domicilio"),
  telefono: text("telefono"),
  email: text("email"),
  cuentaCorriente: integer("cuenta_corriente", { mode: "boolean" }).notNull().default(false),
  limiteCredito: integer("limite_credito"), // en centavos, null si sin limite
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const facturas = sqliteTable("facturas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  puntoVenta: integer("punto_venta").notNull().default(1),
  numero: integer("numero").notNull(),
  numeroFormateado: text("numero_formateado").notNull().unique(),
  fecha: text("fecha").notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id),
  usuarioId: integer("usuario_id").notNull().references(() => usuarios.id),
  clienteNombre: text("cliente_nombre"),
  clienteTipoDoc: text("cliente_tipo_doc"),
  clienteNroDoc: text("cliente_nro_doc"),
  clienteDomicilio: text("cliente_domicilio"),
  vendedorNombre: text("vendedor_nombre"),
  total: integer("total").notNull(), // en centavos
  formaPago: text("forma_pago", { enum: ["contado", "tarjeta", "cuenta_corriente"] }).notNull(),
  montoRecibido: integer("monto_recibido"),
  vuelto: integer("vuelto"),
  estado: text("estado", { enum: ["emitida", "anulada"] }).notNull().default("emitida"),
  motivoAnulacion: text("motivo_anulacion"),
  fechaAnulacion: text("fecha_anulacion"),
  usuarioAnulacionId: integer("usuario_anulacion_id").references(() => usuarios.id),
});

export const facturaItems = sqliteTable("factura_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facturaId: integer("factura_id").notNull().references(() => facturas.id),
  productoId: integer("producto_id").notNull().references(() => productos.id),
  codigo: text("codigo").notNull(),
  descripcion: text("descripcion").notNull(),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: integer("precio_unitario").notNull(), // en centavos
  subtotal: integer("subtotal").notNull(), // en centavos
});

export const pagos = sqliteTable("pagos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  numeroRecibo: text("numero_recibo").notNull().unique(),
  clienteId: integer("cliente_id").notNull().references(() => clientes.id),
  usuarioId: integer("usuario_id").notNull().references(() => usuarios.id),
  fecha: text("fecha").notNull(),
  importe: integer("importe").notNull(), // en centavos
  medio: text("medio", { enum: ["efectivo", "transferencia", "tarjeta_debito"] }).notNull(),
  observacion: text("observacion"),
});

export const movimientosCuenta = sqliteTable("movimientos_cuenta", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteId: integer("cliente_id").notNull().references(() => clientes.id),
  tipo: text("tipo", { enum: ["debito", "credito"] }).notNull(),
  importe: integer("importe").notNull(), // en centavos
  fecha: text("fecha").notNull(),
  descripcion: text("descripcion").notNull(),
  facturaId: integer("factura_id").references(() => facturas.id),
  pagoId: integer("pago_id").references(() => pagos.id),
});

export const configuracion = sqliteTable("configuracion", {
  clave: text("clave").primaryKey(),
  valor: text("valor").notNull(),
});
