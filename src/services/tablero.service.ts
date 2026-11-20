import { db } from "@/db";
import { facturas, facturaItems, productos, movimientosCuenta } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function obtenerDatosTablero() {
  const ahora = new Date();

  // Fecha hoy en formato YYYY-MM-DD según hora de Argentina
  const formatterArg = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hoyStr = formatterArg.format(ahora); // 'YYYY-MM-DD'
  const mesActualStr = hoyStr.slice(0, 7); // 'YYYY-MM'

  // Facturas de hoy
  const [resHoy] = await db
    .select({
      cantidad: sql<number>`count(*)`,
      importe: sql<number>`coalesce(sum(${facturas.total}), 0)`,
    })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, "emitida"),
        sql`date(${facturas.fecha}, '-3 hours') = ${hoyStr}`
      )
    );

  const hoy = {
    cantidad: Number(resHoy?.cantidad || 0),
    importe: Number(resHoy?.importe || 0),
  };

  // Facturas del mes
  const [resMes] = await db
    .select({
      cantidad: sql<number>`count(*)`,
      importe: sql<number>`coalesce(sum(${facturas.total}), 0)`,
    })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, "emitida"),
        sql`substr(date(${facturas.fecha}, '-3 hours'), 1, 7) = ${mesActualStr}`
      )
    );

  const mesCantidad = Number(resMes?.cantidad || 0);
  const mesImporte = Number(resMes?.importe || 0);
  const ticketPromedio = mesCantidad > 0 ? Math.round(mesImporte / mesCantidad) : 0;

  const mes = {
    cantidad: mesCantidad,
    importe: mesImporte,
    ticketPromedio,
  };

  // Cuentas corrientes: totalAdeudado y clientesConSaldo
  const clientesMovs = await db
    .select({
      clienteId: movimientosCuenta.clienteId,
      debitos: sql<number>`sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else 0 end)`,
      creditos: sql<number>`sum(case when ${movimientosCuenta.tipo} = 'credito' then ${movimientosCuenta.importe} else 0 end)`,
    })
    .from(movimientosCuenta)
    .groupBy(movimientosCuenta.clienteId);

  let totalAdeudado = 0;
  let clientesConSaldo = 0;

  for (const cm of clientesMovs) {
    const s = Math.max(0, Number(cm.debitos || 0) - Number(cm.creditos || 0));
    if (s > 0) {
      totalAdeudado += s;
      clientesConSaldo++;
    }
  }

  // Productos bajo mínimo (activos)
  const [resBajoMin] = await db
    .select({ cantidad: sql<number>`count(*)` })
    .from(productos)
    .where(
      and(
        eq(productos.activo, true),
        sql`${productos.existencia} <= ${productos.stockMinimo}`
      )
    );

  const bajoMinimo = {
    cantidad: Number(resBajoMin?.cantidad || 0),
  };

  // Ventas diarias de los últimos 30 días continuos (sin huecos)
  const diasMap: Record<string, number> = {};
  const listaDias: string[] = [];
  const [anio, mesHoy, dia] = hoyStr.split("-").map(Number);

  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(anio, mesHoy - 1, dia - i));
    const dayStr = d.toISOString().slice(0, 10);
    diasMap[dayStr] = 0;
    listaDias.push(dayStr);
  }

  const primerDia = listaDias[0];
  const ventasUltimos30Dias = await db
    .select({
      dia: sql<string>`date(${facturas.fecha}, '-3 hours')`,
      total: sql<number>`sum(${facturas.total})`,
    })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, "emitida"),
        sql`date(${facturas.fecha}, '-3 hours') >= ${primerDia}`
      )
    )
    .groupBy(sql`date(${facturas.fecha}, '-3 hours')`);

  for (const v of ventasUltimos30Dias) {
    if (diasMap[v.dia] !== undefined) {
      diasMap[v.dia] = Number(v.total || 0);
    }
  }

  const ventasDiarias = listaDias.map((fecha) => ({
    fecha,
    importe: diasMap[fecha] || 0,
  }));

  // Ventas por forma de pago del mes
  const formasBase: Record<string, number> = {
    contado: 0,
    tarjeta: 0,
    cuenta_corriente: 0,
  };

  const ventasPorForma = await db
    .select({
      forma: facturas.formaPago,
      total: sql<number>`sum(${facturas.total})`,
    })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, "emitida"),
        sql`substr(date(${facturas.fecha}, '-3 hours'), 1, 7) = ${mesActualStr}`
      )
    )
    .groupBy(facturas.formaPago);

  for (const v of ventasPorForma) {
    if (formasBase[v.forma] !== undefined) {
      formasBase[v.forma] = Number(v.total || 0);
    }
  }

  const porFormaDePago = [
    { forma: "contado", importe: formasBase.contado },
    { forma: "tarjeta", importe: formasBase.tarjeta },
    { forma: "cuenta_corriente", importe: formasBase.cuenta_corriente },
  ];

  // Más vendidos del mes (5 productos ordenados por cantidad de unidades)
  const masVendidosFilas = await db
    .select({
      productoId: facturaItems.productoId,
      codigo: facturaItems.codigo,
      descripcion: facturaItems.descripcion,
      unidades: sql<number>`sum(${facturaItems.cantidad})`,
      importe: sql<number>`sum(${facturaItems.subtotal})`,
    })
    .from(facturaItems)
    .innerJoin(facturas, eq(facturaItems.facturaId, facturas.id))
    .where(
      and(
        eq(facturas.estado, "emitida"),
        sql`substr(date(${facturas.fecha}, '-3 hours'), 1, 7) = ${mesActualStr}`
      )
    )
    .groupBy(facturaItems.productoId, facturaItems.codigo, facturaItems.descripcion)
    .orderBy(desc(sql`sum(${facturaItems.cantidad})`))
    .limit(5);

  const masVendidos = masVendidosFilas.map((mv) => ({
    productoId: mv.productoId,
    codigo: mv.codigo,
    descripcion: mv.descripcion,
    unidades: Number(mv.unidades || 0),
    importe: Number(mv.importe || 0),
  }));

  return {
    hoy,
    mes,
    cuentasCorrientes: {
      totalAdeudado,
      clientesConSaldo,
    },
    bajoMinimo,
    ventasDiarias,
    porFormaDePago,
    masVendidos,
  };
}
