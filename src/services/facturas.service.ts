import { db } from "@/db";
import {
  facturas,
  facturaItems,
  productos,
  clientes,
  usuarios,
  movimientosCuenta,
} from "@/db/schema";
import { eq, and, or, sql, desc, gte, lte } from "drizzle-orm";
import { ApiError } from "@/lib/errors";
import { facturaCrearSchema, anulacionFacturaSchema } from "@/lib/schemas";
import { SesionUsuario } from "@/lib/auth";
import { formatearNumeroFactura } from "@/lib/formatters";
import { moverStock } from "./stock.service";
import { calcularSaldoCliente } from "./clientes.service";

/**
 * RF-V1: Obtener el próximo número de factura informativo
 */
export async function proximoNumeroFactura(puntoVenta: number = 1) {
  const [ultima] = await db
    .select({ numero: facturas.numero })
    .from(facturas)
    .where(eq(facturas.puntoVenta, puntoVenta))
    .orderBy(desc(facturas.numero))
    .limit(1);

  const siguiente = (ultima?.numero || 0) + 1;
  return {
    numeroFormateado: formatearNumeroFactura(puntoVenta, siguiente),
  };
}

/**
 * RF-V1 a RF-V6 / Reglas 1, 2, 3, 4, 6, 7, 9, 10, 11:
 * Emisión de factura completa en una única transacción atómica.
 */
export async function emitirFactura(usuario: SesionUsuario, rawData: unknown) {
  const data = facturaCrearSchema.parse(rawData);
  const puntoVenta = 1;

  // 1. Validar cliente
  let clienteRecord: typeof clientes.$inferSelect | null = null;
  if (data.clienteId) {
    const [c] = await db
      .select()
      .from(clientes)
      .where(eq(clientes.id, data.clienteId))
      .limit(1);

    if (!c) {
      throw new ApiError(404, "NO_ENCONTRADO", "El cliente seleccionado no existe.");
    }
    if (!c.activo) {
      throw new ApiError(422, "VALIDACION", "El cliente seleccionado está inactivo.");
    }
    clienteRecord = c;
  }

  // Regla 6: Consumidor final no compra en cuenta corriente
  if (data.pago.forma === "cuenta_corriente") {
    if (!clienteRecord) {
      throw new ApiError(
        422,
        "CUENTA_CORRIENTE_NO_HABILITADA",
        "Consumidor final no puede comprar en cuenta corriente. Seleccione un cliente registrado."
      );
    }
    if (!clienteRecord.cuentaCorriente) {
      throw new ApiError(
        422,
        "CUENTA_CORRIENTE_NO_HABILITADA",
        "El cliente no tiene habilitada la cuenta corriente."
      );
    }
  }

  // 2. Validar productos y calcular precios desde el servidor
  const itemsCalculados: Array<{
    producto: typeof productos.$inferSelect;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }> = [];

  let totalFactura = 0;
  const erroresStock: Array<{ productoId: number; solicitado: number; disponible: number }> = [];

  for (const item of data.items) {
    const [p] = await db
      .select()
      .from(productos)
      .where(eq(productos.id, item.productoId))
      .limit(1);

    if (!p) {
      throw new ApiError(404, "NO_ENCONTRADO", `Producto ${item.productoId} no encontrado.`);
    }

    if (!p.activo) {
      throw new ApiError(
        422,
        "PRODUCTO_INACTIVO",
        `El producto ${p.descripcion} (${p.codigo}) está dado de baja.`
      );
    }

    if (p.existencia < item.cantidad) {
      erroresStock.push({
        productoId: p.id,
        solicitado: item.cantidad,
        disponible: p.existencia,
      });
    }

    const subtotal = p.precio * item.cantidad;
    if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(totalFactura + subtotal)) {
      throw new ApiError(422, "VALIDACION", "El importe de la venta supera el máximo admitido.");
    }
    totalFactura += subtotal;

    itemsCalculados.push({
      producto: p,
      cantidad: item.cantidad,
      precioUnitario: p.precio,
      subtotal,
    });
  }

  if (erroresStock.length > 0) {
    throw new ApiError(
      409,
      "STOCK_INSUFICIENTE",
      "No hay existencias suficientes para uno o más productos de la venta.",
      erroresStock
    );
  }

  // 3. Validar medio de pago
  let montoRecibido: number | null = null;
  let vuelto: number | null = null;

  if (data.pago.forma === "contado") {
    montoRecibido = data.pago.montoRecibido || totalFactura;
    if (montoRecibido < totalFactura) {
      throw new ApiError(
        422,
        "MONTO_INSUFICIENTE",
        `El monto recibido ($ ${(montoRecibido / 100).toFixed(2)}) no cubre el total de la venta ($ ${(totalFactura / 100).toFixed(2)}).`
      );
    }
    vuelto = montoRecibido - totalFactura;
  }

  // Regla 7: Límite de crédito en cuenta corriente
  // 4. TRANSACCIÓN ATÓMICA
  return await db.transaction(async (tx) => {
    let nuevoSaldoCliente: number | null = null;
    if (data.pago.forma === "cuenta_corriente" && clienteRecord) {
      const [clienteActual] = await tx.select().from(clientes).where(eq(clientes.id, clienteRecord.id)).limit(1);
      if (!clienteActual?.activo || !clienteActual.cuentaCorriente) {
        throw new ApiError(422, "CUENTA_CORRIENTE_NO_HABILITADA", "El cliente no tiene habilitada la cuenta corriente.");
      }
      const saldoActual = await calcularSaldoCliente(clienteActual.id, tx);
      nuevoSaldoCliente = saldoActual + totalFactura;
      if (clienteActual.limiteCredito !== null && nuevoSaldoCliente > clienteActual.limiteCredito) {
        const excedente = nuevoSaldoCliente - clienteActual.limiteCredito;
        throw new ApiError(422, "LIMITE_CREDITO_EXCEDIDO", "La venta excede el límite de crédito disponible del cliente.", {
          saldoActual, limite: clienteActual.limiteCredito, excedente,
        });
      }
    }
    // Asignar número correlativo sin huecos dentro de la transacción
    const [ultima] = await tx
      .select({ numero: facturas.numero })
      .from(facturas)
      .where(eq(facturas.puntoVenta, puntoVenta))
      .orderBy(desc(facturas.numero))
      .limit(1);

    const numero = (ultima?.numero || 0) + 1;
    const numeroFormateado = formatearNumeroFactura(puntoVenta, numero);
    const fecha = new Date().toISOString();

    // Guardar factura
    const [nuevaFactura] = await tx
      .insert(facturas)
      .values({
        puntoVenta,
        numero,
        numeroFormateado,
        fecha,
        clienteId: clienteRecord ? clienteRecord.id : null,
        usuarioId: usuario.id,
        clienteNombre: clienteRecord?.nombre ?? null,
        clienteTipoDoc: clienteRecord?.tipoDoc ?? null,
        clienteNroDoc: clienteRecord?.nroDoc ?? null,
        clienteDomicilio: clienteRecord?.domicilio ?? null,
        vendedorNombre: usuario.nombre,
        total: totalFactura,
        formaPago: data.pago.forma,
        tarjetaTipo: data.pago.tarjeta?.tipo || null,
        tarjetaMarca: data.pago.tarjeta?.marca || null,
        tarjetaUltimos4: data.pago.tarjeta?.ultimos4 || null,
        montoRecibido,
        vuelto,
        estado: "emitida",
      })
      .returning();

    // Guardar items y descontar existencias atómicamente
    const itemsRes = [];
    for (const it of itemsCalculados) {
      await tx
        .insert(facturaItems)
        .values({
          facturaId: nuevaFactura.id,
          productoId: it.producto.id,
          codigo: it.producto.codigo,
          descripcion: it.producto.descripcion,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
          subtotal: it.subtotal,
        })
        .returning();

      // Regla 2: Descuenta del stock y graba el movimiento en la misma transacción
      await moverStock(tx, {
        productoId: it.producto.id,
        tipo: "venta",
        cantidad: -it.cantidad,
        motivo: `Venta #${nuevaFactura.numeroFormateado}`,
        facturaId: nuevaFactura.id,
        usuarioId: usuario.id,
        fecha,
      });

      itemsRes.push({
        productoId: it.producto.id,
        codigo: it.producto.codigo,
        descripcion: it.producto.descripcion,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        subtotal: it.subtotal,
      });
    }

    // Si fue en cuenta corriente, graba el débito
    if (data.pago.forma === "cuenta_corriente" && clienteRecord) {
      await tx.insert(movimientosCuenta).values({
        clienteId: clienteRecord.id,
        tipo: "debito",
        importe: totalFactura,
        fecha,
        descripcion: `Factura ${nuevaFactura.numeroFormateado}`,
        facturaId: nuevaFactura.id,
      });
    }

    return {
      id: nuevaFactura.id,
      puntoVenta: nuevaFactura.puntoVenta,
      numero: nuevaFactura.numero,
      numeroFormateado: nuevaFactura.numeroFormateado,
      fecha: nuevaFactura.fecha,
      estado: nuevaFactura.estado,
      cliente: clienteRecord
        ? {
            id: clienteRecord.id,
            nombre: clienteRecord.nombre,
            tipoDoc: clienteRecord.tipoDoc,
            nroDoc: clienteRecord.nroDoc,
            domicilio: clienteRecord.domicilio,
          }
        : null,
      vendedor: { id: usuario.id, nombre: usuario.nombre },
      items: itemsRes,
      total: nuevaFactura.total,
      pago: {
        forma: nuevaFactura.formaPago,
        ...(nuevaFactura.formaPago === "contado"
          ? { montoRecibido: nuevaFactura.montoRecibido, vuelto: nuevaFactura.vuelto }
          : {}),
        ...(nuevaFactura.formaPago === "tarjeta"
          ? {
              tarjeta: {
                tipo: nuevaFactura.tarjetaTipo,
                marca: nuevaFactura.tarjetaMarca,
                ultimos4: nuevaFactura.tarjetaUltimos4,
              },
            }
          : {}),
      },
      ...(nuevoSaldoCliente !== null ? { saldoCliente: nuevoSaldoCliente } : {}),
    };
  });
}

/**
 * RF-V9 / Regla 5: Anulación de factura (solo administrador)
 * Reingresa el stock y registra el crédito en la cuenta si fue a cuenta corriente.
 */
export async function anularFactura(
  usuario: SesionUsuario,
  id: number,
  rawData: unknown
) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede anular facturas.");
  }

  const data = anulacionFacturaSchema.parse(rawData);

  const [f] = await db
    .select()
    .from(facturas)
    .where(eq(facturas.id, id))
    .limit(1);

  if (!f) {
    throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
  }

  if (f.estado === "anulada") {
    throw new ApiError(409, "FACTURA_ANULADA", "La factura ya se encuentra anulada.");
  }

  const items = await db
    .select()
    .from(facturaItems)
    .where(eq(facturaItems.facturaId, id));

  await db.transaction(async (tx) => {
    const fecha = new Date().toISOString();

    // 1. Marcar como anulada
    const actualizadas = await tx
      .update(facturas)
      .set({
        estado: "anulada",
        motivoAnulacion: data.motivo,
        fechaAnulacion: fecha,
        usuarioAnulacionId: usuario.id,
      })
      .where(and(eq(facturas.id, id), eq(facturas.estado, "emitida")))
      .returning();
    if (actualizadas.length === 0) {
      throw new ApiError(409, "FACTURA_ANULADA", "La factura ya se encuentra anulada.");
    }

    // 2. Reingreso de stock por cada ítem
    for (const it of items) {
      await moverStock(tx, {
        productoId: it.productoId,
        tipo: "anulacion",
        cantidad: it.cantidad, // Positivo para reingresar
        motivo: `Anulación Factura ${f.numeroFormateado}`,
        observacion: data.motivo,
        facturaId: f.id,
        usuarioId: usuario.id,
        fecha,
      });
    }

    // 3. Si fue a cuenta corriente, graba crédito en la cuenta
    if (f.formaPago === "cuenta_corriente" && f.clienteId) {
      await tx.insert(movimientosCuenta).values({
        clienteId: f.clienteId,
        tipo: "credito",
        importe: f.total,
        fecha,
        descripcion: `Anulación Factura ${f.numeroFormateado}`,
        facturaId: f.id,
      });
    }

  });
  return await obtenerFactura(id);
}

/**
 * RF-V8: Listado de facturas con filtros, paginación y suma de totalEmitido
 */
export async function listarFacturas(filtros: {
  q?: string;
  desde?: string;
  hasta?: string;
  clienteId?: number;
  vendedorId?: number;
  forma?: string;
  estado?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(filtros.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filtros.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filtros.q && filtros.q.trim().length > 0) {
    const t = `%${filtros.q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${facturas.numeroFormateado}) LIKE ${t}`,
        sql`lower(${clientes.nombre}) LIKE ${t}`
      )
    );
  }

  if (filtros.desde) {
    conditions.push(gte(facturas.fecha, `${filtros.desde}T00:00:00Z`));
  }
  if (filtros.hasta) {
    conditions.push(lte(facturas.fecha, `${filtros.hasta}T23:59:59Z`));
  }
  if (filtros.clienteId) {
    conditions.push(eq(facturas.clienteId, Number(filtros.clienteId)));
  }
  if (filtros.vendedorId) {
    conditions.push(eq(facturas.usuarioId, Number(filtros.vendedorId)));
  }
  if (filtros.forma === "contado" || filtros.forma === "tarjeta" || filtros.forma === "cuenta_corriente") {
    conditions.push(eq(facturas.formaPago, filtros.forma));
  }
  if (filtros.estado === "emitida" || filtros.estado === "anulada") {
    conditions.push(eq(facturas.estado, filtros.estado));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total de registros
  const [totalRes] = await db
    .select({
      count: sql<number>`count(*)`,
      totalEmitido: sql<number>`coalesce(sum(case when ${facturas.estado} = 'emitida' then ${facturas.total} else 0 end), 0)`,
    })
    .from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .where(whereClause);

  const total = Number(totalRes?.count || 0);
  const totalEmitido = Number(totalRes?.totalEmitido || 0);

  const filas = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      numeroFormateado: facturas.numeroFormateado,
      fecha: facturas.fecha,
      total: facturas.total,
      formaPago: facturas.formaPago,
      estado: facturas.estado,
      clienteId: clientes.id,
      clienteNombre: facturas.clienteNombre,
      vendedorId: usuarios.id,
      vendedorNombre: facturas.vendedorNombre,
    })
    .from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
    .where(whereClause)
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(pageSize)
    .offset(offset);

  const data = filas.map((f) => ({
    id: f.id,
    puntoVenta: f.puntoVenta,
    numero: f.numero,
    numeroFormateado: f.numeroFormateado,
    fecha: f.fecha,
    total: f.total,
    formaPago: f.formaPago,
    estado: f.estado,
    cliente: f.clienteId ? { id: f.clienteId, nombre: f.clienteNombre } : null,
    vendedor: { id: f.vendedorId, nombre: f.vendedorNombre },
  }));

  return {
    data,
    page,
    pageSize,
    total,
    totalEmitido,
  };
}

/**
 * RF-V7: Consulta de factura individual con detalle completo y comprobante
 */
export async function obtenerFactura(id: number) {
  const [f] = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      numeroFormateado: facturas.numeroFormateado,
      fecha: facturas.fecha,
      total: facturas.total,
      formaPago: facturas.formaPago,
      tarjetaTipo: facturas.tarjetaTipo,
      tarjetaMarca: facturas.tarjetaMarca,
      tarjetaUltimos4: facturas.tarjetaUltimos4,
      montoRecibido: facturas.montoRecibido,
      vuelto: facturas.vuelto,
      estado: facturas.estado,
      motivoAnulacion: facturas.motivoAnulacion,
      fechaAnulacion: facturas.fechaAnulacion,
      clienteId: clientes.id,
      clienteNombre: facturas.clienteNombre,
      clienteTipoDoc: facturas.clienteTipoDoc,
      clienteNroDoc: facturas.clienteNroDoc,
      clienteDomicilio: facturas.clienteDomicilio,
      vendedorId: usuarios.id,
      vendedorNombre: facturas.vendedorNombre,
      usuarioAnulacionId: facturas.usuarioAnulacionId,
    })
    .from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
    .where(eq(facturas.id, id))
    .limit(1);

  if (!f) {
    throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
  }

  const items = await db
    .select({
      productoId: facturaItems.productoId,
      codigo: facturaItems.codigo,
      descripcion: facturaItems.descripcion,
      cantidad: facturaItems.cantidad,
      precioUnitario: facturaItems.precioUnitario,
      subtotal: facturaItems.subtotal,
    })
    .from(facturaItems)
    .where(eq(facturaItems.facturaId, id));

  let anulacionInfo = null;
  if (f.estado === "anulada" && f.usuarioAnulacionId) {
    const [usrAnul] = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.id, f.usuarioAnulacionId))
      .limit(1);

    anulacionInfo = {
      fecha: f.fechaAnulacion,
      motivo: f.motivoAnulacion,
      usuario: usrAnul || { id: f.usuarioAnulacionId, nombre: "Administrador" },
    };
  }

  return {
    id: f.id,
    puntoVenta: f.puntoVenta,
    numero: f.numero,
    numeroFormateado: f.numeroFormateado,
    fecha: f.fecha,
    estado: f.estado,
    cliente: f.clienteId
      ? {
          id: f.clienteId,
          nombre: f.clienteNombre,
          tipoDoc: f.clienteTipoDoc,
          nroDoc: f.clienteNroDoc,
          domicilio: f.clienteDomicilio,
        }
      : null,
    vendedor: { id: f.vendedorId, nombre: f.vendedorNombre },
    items,
    total: f.total,
    pago: {
      forma: f.formaPago,
      ...(f.formaPago === "contado"
        ? { montoRecibido: f.montoRecibido, vuelto: f.vuelto }
        : {}),
      ...(f.formaPago === "tarjeta"
        ? {
            tarjeta: {
              tipo: f.tarjetaTipo,
              marca: f.tarjetaMarca,
              ultimos4: f.tarjetaUltimos4,
            },
          }
        : {}),
    },
    ...(anulacionInfo ? { anulacion: anulacionInfo } : {}),
  };
}
