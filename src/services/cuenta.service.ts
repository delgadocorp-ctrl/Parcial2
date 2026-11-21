import { db } from "@/db";
import { clientes, pagos, movimientosCuenta, usuarios } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { ApiError } from "@/lib/errors";
import { pagoCrearSchema } from "@/lib/schemas";
import { SesionUsuario } from "@/lib/auth";
import { formatearNumeroRecibo } from "@/lib/formatters";
import { calcularSaldoCliente } from "./clientes.service";

/**
 * RF-C4: Consulta de cuenta corriente con movimientos cronológicos y saldo acumulado
 */
export async function obtenerCuenta(
  clienteId: number,
  filtros: { desde?: string; hasta?: string } = {}
) {
  const [c] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (!c) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  // Obtenemos todos los movimientos cronológicos de la cuenta
  const todosMovs = await db
    .select()
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, clienteId))
    .orderBy(asc(movimientosCuenta.fecha), asc(movimientosCuenta.id));

  let saldoAcumulado = 0;
  let saldoAnterior = 0;
  const fechaDesdeIso = filtros.desde ? `${filtros.desde}T00:00:00Z` : null;
  const fechaHastaIso = filtros.hasta ? `${filtros.hasta}T23:59:59Z` : null;

  const movimientosProcesados: Array<{
    fecha: string;
    tipo: "debito" | "credito";
    importe: number;
    descripcion: string;
    facturaId: number | null;
    pagoId: number | null;
    saldo: number;
  }> = [];

  for (const m of todosMovs) {
    const cambio = m.tipo === "debito" ? m.importe : -m.importe;
    saldoAcumulado += cambio;

    // Si hay filtro "desde" y el movimiento es anterior
    if (fechaDesdeIso && m.fecha < fechaDesdeIso) {
      saldoAnterior = saldoAcumulado;
      continue;
    }

    // Si hay filtro "hasta" y el movimiento es posterior
    if (fechaHastaIso && m.fecha > fechaHastaIso) {
      continue;
    }

    movimientosProcesados.push({
      fecha: m.fecha,
      tipo: m.tipo,
      importe: m.importe,
      descripcion: m.descripcion,
      facturaId: m.facturaId || null,
      pagoId: m.pagoId || null,
      saldo: saldoAcumulado,
    });
  }

  return {
    cliente: { id: c.id, nombre: c.nombre },
    saldoAnterior,
    movimientos: movimientosProcesados,
    saldo: saldoAcumulado,
  };
}

/**
 * RF-C5 / Regla 8: Registrar pago a cuenta
 * Graba el pago con su recibo y el crédito en la cuenta en una única transacción atómica.
 */
export async function registrarPago(
  usuario: SesionUsuario,
  clienteId: number,
  rawData: unknown
) {
  const data = pagoCrearSchema.parse(rawData);

  const [c] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (!c) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  if (!c.cuentaCorriente) {
    throw new ApiError(
      422,
      "CUENTA_CORRIENTE_NO_HABILITADA",
      "El cliente no tiene habilitada la cuenta corriente."
    );
  }

  return await db.transaction(async (tx) => {
    const saldoActual = await calcularSaldoCliente(clienteId, tx);
    if (data.importe > saldoActual) {
      throw new ApiError(
        422,
        "PAGO_SUPERA_DEUDA",
        `El importe ingresado ($ ${(data.importe / 100).toFixed(2)}) supera el saldo adeudado ($ ${(saldoActual / 100).toFixed(2)}).`
      );
    }
    // Generar próximo correlativo de recibo
    const [ultimoPago] = await tx
      .select({ id: pagos.id })
      .from(pagos)
      .orderBy(sql`${pagos.id} DESC`)
      .limit(1);

    const siguienteNum = (ultimoPago?.id || 0) + 1;
    const numeroRecibo = formatearNumeroRecibo(1, siguienteNum);
    const fecha = data.fecha ? new Date(data.fecha).toISOString() : new Date().toISOString();

    const [nuevoPago] = await tx
      .insert(pagos)
      .values({
        numeroRecibo,
        clienteId: c.id,
        usuarioId: usuario.id,
        fecha,
        importe: data.importe,
        medio: data.medio,
        observacion: data.observacion || null,
      })
      .returning();

    // Movimiento de crédito en la cuenta corriente
    await tx.insert(movimientosCuenta).values({
      clienteId: c.id,
      tipo: "credito",
      importe: data.importe,
      fecha,
      descripcion: `Recibo ${numeroRecibo}`,
      pagoId: nuevoPago.id,
    });

    const saldoClienteNuevo = saldoActual - data.importe;

    return {
      id: nuevoPago.id,
      numeroRecibo: nuevoPago.numeroRecibo,
      fecha: nuevoPago.fecha,
      cliente: { id: c.id, nombre: c.nombre },
      importe: nuevoPago.importe,
      medio: nuevoPago.medio,
      usuario: { id: usuario.id, nombre: usuario.nombre },
      saldoCliente: saldoClienteNuevo,
    };
  });
}

/**
 * Consulta de pago para reimpresión de recibo
 */
export async function obtenerPago(id: number) {
  const [p] = await db
    .select({
      id: pagos.id,
      numeroRecibo: pagos.numeroRecibo,
      fecha: pagos.fecha,
      importe: pagos.importe,
      medio: pagos.medio,
      observacion: pagos.observacion,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      usuarioId: usuarios.id,
      usuarioNombre: usuarios.nombre,
    })
    .from(pagos)
    .innerJoin(clientes, eq(pagos.clienteId, clientes.id))
    .innerJoin(usuarios, eq(pagos.usuarioId, usuarios.id))
    .where(eq(pagos.id, id))
    .limit(1);

  if (!p) {
    throw new ApiError(404, "NO_ENCONTRADO", "Recibo de pago no encontrado.");
  }

  const saldoCliente = await calcularSaldoCliente(p.clienteId);

  return {
    id: p.id,
    numeroRecibo: p.numeroRecibo,
    fecha: p.fecha,
    cliente: { id: p.clienteId, nombre: p.clienteNombre },
    importe: p.importe,
    medio: p.medio,
    observacion: p.observacion,
    usuario: { id: p.usuarioId, nombre: p.usuarioNombre },
    saldoCliente,
  };
}
