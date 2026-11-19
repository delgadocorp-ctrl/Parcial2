/**
 * Formatea un importe en centavos enteros a moneda argentina ($ 12.345,50)
 */
export function formatearMoneda(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "$ 0,00";
  const pesos = centavos / 100;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pesos);
}

/**
 * Convierte un número decimal de pesos o string a centavos enteros
 */
export function aCentavos(pesos: number | string): number {
  if (typeof pesos === "string") {
    const limpio = pesos.replace(/\./g, "").replace(",", ".");
    pesos = parseFloat(limpio);
  }
  return Math.round((Number(pesos) || 0) * 100);
}

/**
 * Formatea una fecha ISO 8601 a formato argentino
 */
export function formatearFecha(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const fecha = new Date(isoString);
  if (isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(fecha);
}

/**
 * Formatea fecha y hora completa
 */
export function formatearFechaHora(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const fecha = new Date(isoString);
  if (isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(fecha);
}

/**
 * Formatea número correlativo de factura: 0001-00001234
 */
export function formatearNumeroFactura(puntoVenta: number, numero: number): string {
  const pv = String(puntoVenta).padStart(4, "0");
  const num = String(numero).padStart(8, "0");
  return `${pv}-${num}`;
}

/**
 * Formatea número correlativo de recibo de pago: R 0001-00000341
 */
export function formatearNumeroRecibo(puntoVenta: number, numero: number): string {
  const pv = String(puntoVenta).padStart(4, "0");
  const num = String(numero).padStart(8, "0");
  return `R ${pv}-${num}`;
}
