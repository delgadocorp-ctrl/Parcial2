import { db } from "@/db";
import { clientes, facturas, movimientosCuenta } from "@/db/schema";
import { eq, and, sql, not, desc } from "drizzle-orm";
import { ApiError } from "@/lib/errors";
import { clienteCrearSchema, clienteEditarSchema } from "@/lib/schemas";
import { SesionUsuario } from "@/lib/auth";

/**
 * Calcula el saldo actual de un cliente a partir de sus movimientos de cuenta corriente:
 * débitos (ventas) menos créditos (pagos y anulaciones)
 */
export async function calcularSaldoCliente(
  clienteId: number,
  conexion: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db
): Promise<number> {
  const [res] = await conexion
    .select({
      debitos: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else 0 end), 0)`,
      creditos: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'credito' then ${movimientosCuenta.importe} else 0 end), 0)`,
    })
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, clienteId));

  const debitos = Number(res?.debitos || 0);
  const creditos = Number(res?.creditos || 0);
  return debitos - creditos;
}

/**
 * RF-C1, RF-C6: Listado de clientes con saldos y filtros
 */
export async function listarClientes(filtros: {
  q?: string;
  conDeuda?: boolean | string;
  orden?: "saldo" | "nombre";
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Number(filtros.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filtros.pageSize) || 20));
  const soloConDeuda = String(filtros.conDeuda) === "true";

  // Calificar el ID externo para que la subconsulta no use el ID del movimiento.
  const todosClientes = await db
    .select({
      id: clientes.id,
      tipoDoc: clientes.tipoDoc,
      nroDoc: clientes.nroDoc,
      nombre: clientes.nombre,
      domicilio: clientes.domicilio,
      telefono: clientes.telefono,
      email: clientes.email,
      cuentaCorriente: clientes.cuentaCorriente,
      limiteCredito: clientes.limiteCredito,
      activo: clientes.activo,
      debitos: sql<number>`coalesce((select sum(mc.importe) from movimientos_cuenta mc where mc.cliente_id = clientes.id and mc.tipo = 'debito'), 0)`,
      creditos: sql<number>`coalesce((select sum(mc.importe) from movimientos_cuenta mc where mc.cliente_id = clientes.id and mc.tipo = 'credito'), 0)`,
    })
    .from(clientes);

  let procesados = todosClientes.map((c) => {
    const saldo = Number(c.debitos) - Number(c.creditos);
    const limite = c.limiteCredito !== null ? Number(c.limiteCredito) : null;
    const disponible = limite !== null ? Math.max(0, limite - saldo) : null;
    return {
      id: c.id,
      tipoDoc: c.tipoDoc,
      nroDoc: c.nroDoc,
      nombre: c.nombre,
      domicilio: c.domicilio,
      telefono: c.telefono,
      email: c.email,
      cuentaCorriente: c.cuentaCorriente,
      limiteCredito: limite,
      saldo,
      disponible,
      activo: c.activo,
    };
  });

  // Filtro por término q (nombre o documento ignorando puntos y guiones)
  if (filtros.q && filtros.q.trim().length > 0) {
    const qLimpio = filtros.q.trim().toLowerCase().replace(/[\.\-]/g, "");
    procesados = procesados.filter((c) => {
      const nombreNorm = c.nombre.toLowerCase();
      const docNorm = c.nroDoc.toLowerCase().replace(/[\.\-]/g, "");
      return nombreNorm.includes(qLimpio) || docNorm.includes(qLimpio);
    });
  }

  // Filtro conDeuda
  let totalAdeudado: number | undefined = undefined;
  if (soloConDeuda) {
    procesados = procesados.filter((c) => c.saldo > 0);
    totalAdeudado = procesados.reduce((acc, c) => acc + c.saldo, 0);
  }

  // Ordenamiento
  if (filtros.orden === "saldo" || soloConDeuda) {
    procesados.sort((a, b) => b.saldo - a.saldo || a.nombre.localeCompare(b.nombre));
  } else {
    procesados.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  const total = procesados.length;
  const offset = (page - 1) * pageSize;
  const paginados = procesados.slice(offset, offset + pageSize);

  return {
    data: paginados,
    page,
    pageSize,
    total,
    ...(totalAdeudado !== undefined ? { totalAdeudado } : {}),
  };
}

/**
 * RF-C3: Ficha individual de cliente con últimas 6 facturas
 */
export async function obtenerCliente(id: number) {
  const [c] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  if (!c) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  const saldo = await calcularSaldoCliente(c.id);
  const limite = c.limiteCredito !== null ? Number(c.limiteCredito) : null;
  const disponible = limite !== null ? Math.max(0, limite - saldo) : null;

  // Últimas 6 facturas
  const ultimas = await db
    .select({
      id: facturas.id,
      numeroFormateado: facturas.numeroFormateado,
      fecha: facturas.fecha,
      total: facturas.total,
      formaPago: facturas.formaPago,
      estado: facturas.estado,
    })
    .from(facturas)
    .where(eq(facturas.clienteId, c.id))
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(6);

  return {
    id: c.id,
    tipoDoc: c.tipoDoc,
    nroDoc: c.nroDoc,
    nombre: c.nombre,
    domicilio: c.domicilio,
    telefono: c.telefono,
    email: c.email,
    cuentaCorriente: c.cuentaCorriente,
    limiteCredito: limite,
    saldo,
    disponible,
    activo: c.activo,
    ultimasFacturas: ultimas,
  };
}

/**
 * RF-C2, RF-V2: Alta de cliente
 */
export async function crearCliente(usuario: SesionUsuario, rawData: unknown) {
  const data = clienteCrearSchema.parse(rawData);

  // Verificamos documento duplicado
  const [existente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.nroDoc, data.nroDoc))
    .limit(1);

  if (existente) {
    throw new ApiError(409, "DOCUMENTO_DUPLICADO", `Ya existe un cliente con el documento "${data.nroDoc}".`);
  }

  const [nuevo] = await db
    .insert(clientes)
    .values({
      tipoDoc: data.tipoDoc,
      nroDoc: data.nroDoc,
      nombre: data.nombre,
      domicilio: data.domicilio || null,
      telefono: data.telefono || null,
      email: data.email || null,
      cuentaCorriente: data.cuentaCorriente ?? false,
      limiteCredito: data.limiteCredito ?? null,
      activo: true,
    })
    .returning();

  return {
    id: nuevo.id,
    tipoDoc: nuevo.tipoDoc,
    nroDoc: nuevo.nroDoc,
    nombre: nuevo.nombre,
    domicilio: nuevo.domicilio,
    telefono: nuevo.telefono,
    email: nuevo.email,
    cuentaCorriente: nuevo.cuentaCorriente,
    limiteCredito: nuevo.limiteCredito,
    saldo: 0,
    disponible: nuevo.limiteCredito,
    activo: nuevo.activo,
  };
}

/**
 * RF-C2, RF-C7: Edición o baja lógica de cliente
 */
export async function actualizarCliente(
  usuario: SesionUsuario,
  id: number,
  rawData: unknown
) {
  const data = clienteEditarSchema.parse(rawData);

  const [existente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  if (!existente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  const telefonoFinal = data.telefono === undefined ? existente.telefono : data.telefono;
  const emailFinal = data.email === undefined ? existente.email : data.email;
  if (!telefonoFinal?.trim() && !emailFinal?.trim()) {
    throw new ApiError(422, "VALIDACION", "Debe conservar al menos un dato de contacto (teléfono o correo).");
  }

  // Si cambia el documento, chequear unicidad
  if (data.nroDoc && data.nroDoc !== existente.nroDoc) {
    const [duplicado] = await db
      .select()
      .from(clientes)
      .where(and(eq(clientes.nroDoc, data.nroDoc), not(eq(clientes.id, id))))
      .limit(1);

    if (duplicado) {
      throw new ApiError(409, "DOCUMENTO_DUPLICADO", `Ya existe otro cliente con el documento "${data.nroDoc}".`);
    }
  }

  // Regla 7 y RF-C7: Si se desactiva o se deshabilita la cuenta corriente, debe tener saldo cero
  const saldoActual = await calcularSaldoCliente(id);
  if (
    (data.activo === false && existente.activo && saldoActual !== 0) ||
    (data.cuentaCorriente === false && existente.cuentaCorriente && saldoActual !== 0)
  ) {
    throw new ApiError(
      422,
      "SALDO_PENDIENTE",
      "No se puede desactivar un cliente ni deshabilitar su cuenta corriente con saldo pendiente de pago."
    );
  }

  const [actualizado] = await db
    .update(clientes)
    .set({
      ...(data.tipoDoc ? { tipoDoc: data.tipoDoc } : {}),
      ...(data.nroDoc ? { nroDoc: data.nroDoc } : {}),
      ...(data.nombre ? { nombre: data.nombre } : {}),
      ...(data.domicilio !== undefined ? { domicilio: data.domicilio || null } : {}),
      ...(data.telefono !== undefined ? { telefono: data.telefono || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.cuentaCorriente !== undefined ? { cuentaCorriente: data.cuentaCorriente } : {}),
      ...(data.limiteCredito !== undefined ? { limiteCredito: data.limiteCredito } : {}),
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
    })
    .where(eq(clientes.id, id))
    .returning();

  const limite = actualizado.limiteCredito !== null ? Number(actualizado.limiteCredito) : null;
  const disponible = limite !== null ? Math.max(0, limite - saldoActual) : null;

  return {
    id: actualizado.id,
    tipoDoc: actualizado.tipoDoc,
    nroDoc: actualizado.nroDoc,
    nombre: actualizado.nombre,
    domicilio: actualizado.domicilio,
    telefono: actualizado.telefono,
    email: actualizado.email,
    cuentaCorriente: actualizado.cuentaCorriente,
    limiteCredito: limite,
    saldo: saldoActual,
    disponible,
    activo: actualizado.activo,
  };
}
