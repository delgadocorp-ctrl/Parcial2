import { db } from "@/db";
import { productos, movimientosStock, facturas, usuarios } from "@/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { ApiError } from "@/lib/errors";
import { movimientoStockManualSchema } from "@/lib/schemas";
import { SesionUsuario } from "@/lib/auth";

export interface MoverStockParams {
  productoId: number;
  tipo: "ingreso" | "egreso" | "venta" | "anulacion";
  cantidad: number; // Con signo: positivo suma, negativo resta
  motivo: string;
  observacion?: string | null;
  facturaId?: number | null;
  usuarioId: number;
  fecha?: string;
}

/**
 * Regla de negocio 1 y 2 / RF-P4, RF-P5, RF-V6, RF-V9:
 * Invariante crítico de existencias. Toda modificación de stock pasa EXCLUSIVAMENTE por esta función.
 * Aplica una actualización atómica verificando que el stock resultante nunca sea negativo.
 */
export async function moverStock(
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  params: MoverStockParams
) {
  const { productoId, tipo, cantidad, motivo, observacion, facturaId, usuarioId } = params;
  const fecha = params.fecha || new Date().toISOString();

  // 1. Obtenemos el producto actual
  const [producto] = await tx
    .select()
    .from(productos)
    .where(eq(productos.id, productoId))
    .limit(1);

  if (!producto) {
    throw new ApiError(404, "NO_ENCONTRADO", `Producto ${productoId} no encontrado.`);
  }

  const nuevaExistencia = producto.existencia + cantidad;
  if (!Number.isSafeInteger(nuevaExistencia)) {
    throw new ApiError(422, "VALIDACION", "La existencia resultante supera el máximo admitido.");
  }
  if (nuevaExistencia < 0) {
    throw new ApiError(
      409,
      "STOCK_INSUFICIENTE",
      `No hay stock suficiente para ${producto.descripcion}.`,
      {
        productoId,
        solicitado: Math.abs(cantidad),
        disponible: producto.existencia,
      }
    );
  }

  // 2. Actualización atómica con condición de no negatividad
  const updateRes = await tx
    .update(productos)
    .set({
      existencia: sql`${productos.existencia} + ${cantidad}`,
    })
    .where(
      and(
        eq(productos.id, productoId),
        sql`${productos.existencia} + ${cantidad} >= 0`
      )
    )
    .returning();

  if (!updateRes || updateRes.length === 0) {
    throw new ApiError(
      409,
      "STOCK_INSUFICIENTE",
      `No hay stock suficiente para ${producto.descripcion}.`,
      {
        productoId,
        solicitado: Math.abs(cantidad),
        disponible: producto.existencia,
      }
    );
  }

  const existenciaResultante = updateRes[0].existencia;

  // 3. Registro del movimiento en el mismo acto
  const [movimiento] = await tx
    .insert(movimientosStock)
    .values({
      productoId,
      tipo,
      cantidad,
      existenciaResultante,
      motivo,
      observacion: observacion || null,
      facturaId: facturaId || null,
      usuarioId,
      fecha,
    })
    .returning();

  return {
    ...movimiento,
    producto: {
      id: producto.id,
      codigo: producto.codigo,
      descripcion: producto.descripcion,
    },
  };
}

/**
 * RF-P4, RF-P5: Registro manual de ingreso o egreso de stock
 */
export async function registrarMovimientoManual(
  usuario: SesionUsuario,
  productoId: number,
  rawData: unknown
) {

  const data = movimientoStockManualSchema.parse(rawData);
  const cantidadConSigno = data.tipo === "egreso" ? -Math.abs(data.cantidad) : Math.abs(data.cantidad);

  return await db.transaction(async (tx) => {
    const mov = await moverStock(tx, {
      productoId,
      tipo: data.tipo,
      cantidad: cantidadConSigno,
      motivo: data.motivo,
      observacion: data.observacion,
      usuarioId: usuario.id,
    });

    return {
      id: mov.id,
      producto: { id: mov.producto.id, codigo: mov.producto.codigo },
      tipo: mov.tipo,
      cantidad: mov.cantidad,
      existenciaResultante: mov.existenciaResultante,
      motivo: mov.motivo,
      referencia: null,
      usuario: { id: usuario.id, nombre: usuario.nombre },
      fecha: mov.fecha,
    };
  });
}

/**
 * RF-P6: Consulta de movimientos de stock con filtros y paginación
 */
export async function listarMovimientosStock(filtros: {
  productoId?: number;
  tipo?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(filtros.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filtros.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filtros.productoId) {
    conditions.push(eq(movimientosStock.productoId, filtros.productoId));
  }
  if (filtros.tipo === "ingreso" || filtros.tipo === "egreso" || filtros.tipo === "venta" || filtros.tipo === "anulacion") {
    conditions.push(eq(movimientosStock.tipo, filtros.tipo));
  }
  if (filtros.desde) {
    conditions.push(gte(movimientosStock.fecha, `${filtros.desde}T00:00:00Z`));
  }
  if (filtros.hasta) {
    conditions.push(lte(movimientosStock.fecha, `${filtros.hasta}T23:59:59Z`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(movimientosStock)
    .where(whereClause);

  const total = Number(totalRes?.count || 0);

  const filas = await db
    .select({
      id: movimientosStock.id,
      tipo: movimientosStock.tipo,
      cantidad: movimientosStock.cantidad,
      existenciaResultante: movimientosStock.existenciaResultante,
      motivo: movimientosStock.motivo,
      observacion: movimientosStock.observacion,
      fecha: movimientosStock.fecha,
      productoId: productos.id,
      productoCodigo: productos.codigo,
      productoDescripcion: productos.descripcion,
      usuarioId: usuarios.id,
      usuarioNombre: usuarios.nombre,
      facturaId: facturas.id,
      facturaNumeroFormateado: facturas.numeroFormateado,
    })
    .from(movimientosStock)
    .innerJoin(productos, eq(movimientosStock.productoId, productos.id))
    .innerJoin(usuarios, eq(movimientosStock.usuarioId, usuarios.id))
    .leftJoin(facturas, eq(movimientosStock.facturaId, facturas.id))
    .where(whereClause)
    .orderBy(desc(movimientosStock.fecha), desc(movimientosStock.id))
    .limit(pageSize)
    .offset(offset);

  const data = filas.map((f) => ({
    id: f.id,
    producto: {
      id: f.productoId,
      codigo: f.productoCodigo,
      descripcion: f.productoDescripcion,
    },
    tipo: f.tipo,
    cantidad: f.cantidad,
    existenciaResultante: f.existenciaResultante,
    motivo: f.motivo,
    observacion: f.observacion,
    referencia: f.facturaId
      ? { facturaId: f.facturaId, numero: f.facturaNumeroFormateado }
      : null,
    usuario: { id: f.usuarioId, nombre: f.usuarioNombre },
    fecha: f.fecha,
  }));

  return {
    data,
    page,
    pageSize,
    total,
  };
}
