import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual } from "@/lib/auth";
import { obtenerDatosTablero } from "@/services/tablero.service";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatearMoneda } from "@/lib/formatters";
import { ChartVentasDiarias } from "@/components/dashboard/ChartVentasDiarias";
import { ChartFormaPago } from "@/components/dashboard/ChartFormaPago";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Wallet,
  ShoppingCart,
  Receipt,
  ArrowRight,
  Package,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let usuario;
  try {
    usuario = await obtenerUsuarioActual();
  } catch {
    redirect("/login");
  }

  const datos = usuario.demo
    ? await (await import("@/db/demo")).conDatosDemo(obtenerDatosTablero)
    : await obtenerDatosTablero();

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
              Tablero General
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
              Indicadores comerciales
            </h1>
            <p className="text-xs sm:text-sm text-brand-800/70 mt-1">
              Resumen de operaciones, saldos y existencias del comercio.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ventas/nueva"
              className="inline-flex items-center gap-2 bg-[#254d3c] hover:bg-[#34634d] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Nueva venta
            </Link>
          </div>
        </div>

        {/* 4 Tarjetas de Indicadores Principales (RF-T1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ventas de Hoy */}
          <Card className="border-l-4 border-l-emerald-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-bold text-brand-800/70 uppercase tracking-wider">
                Ventas de Hoy
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-serif font-medium text-brand-950 tabular-nums">
                {formatearMoneda(datos.hoy.importe)}
              </div>
              <p className="text-xs text-brand-800/60 mt-1">
                {datos.hoy.cantidad} {datos.hoy.cantidad === 1 ? "operación emitida" : "operaciones emitidas"}
              </p>
            </CardContent>
          </Card>

          {/* Ventas del Mes */}
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-bold text-brand-800/70 uppercase tracking-wider">
                Ventas del Mes
              </span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-serif font-medium text-brand-950 tabular-nums">
                {formatearMoneda(datos.mes.importe)}
              </div>
              <p className="text-xs text-brand-800/60 mt-1">
                {datos.mes.cantidad} operaciones · Promedio: {formatearMoneda(datos.mes.ticketPromedio)}
              </p>
            </CardContent>
          </Card>

          {/* Cuentas Corrientes Adeudadas */}
          <Card className="border-l-4 border-l-amber-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-bold text-brand-800/70 uppercase tracking-wider">
                Deuda en Cta. Cte.
              </span>
              <Wallet className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-serif font-medium text-brand-950 tabular-nums text-amber-900">
                {formatearMoneda(datos.cuentasCorrientes.totalAdeudado)}
              </div>
              <p className="text-xs text-brand-800/60 mt-1">
                {datos.cuentasCorrientes.clientesConSaldo}{" "}
                {datos.cuentasCorrientes.clientesConSaldo === 1 ? "cliente con saldo" : "clientes con saldo"}
              </p>
            </CardContent>
          </Card>

          {/* Productos Bajo Mínimo */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-bold text-brand-800/70 uppercase tracking-wider">
                Stock Bajo
              </span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-serif font-medium text-red-700 tabular-nums">
                {datos.bajoMinimo.cantidad}
              </div>
              <p className="text-xs text-brand-800/60 mt-1">
                {datos.bajoMinimo.cantidad === 1 ? "artículo para reponer" : "artículos para reponer"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos (RF-T2) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Ventas Diarias (30 días continuos) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Evolución de ventas diarias</CardTitle>
                  <p className="text-xs text-brand-800/60 mt-1">
                    Facturación diaria de los últimos 30 días sin huecos
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-100 text-brand-900">
                  Últimos 30 días
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ChartVentasDiarias ventasDiarias={datos.ventasDiarias} />
            </CardContent>
          </Card>

          {/* Gráfico por Forma de Pago del Mes */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas por medio de pago</CardTitle>
              <p className="text-xs text-brand-800/60 mt-1">
                Distribución acumulada durante el mes en curso
              </p>
            </CardHeader>
            <CardContent>
              <ChartFormaPago porFormaDePago={datos.porFormaDePago} />
            </CardContent>
          </Card>
        </div>

        {/* Sección Inferior: 5 Más Vendidos y Accesos Rápidos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 5 más vendidos del mes (RF-T3) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Productos más vendidos del mes</CardTitle>
                  <p className="text-xs text-brand-800/60 mt-1">
                    Ranking por unidades vendidas durante el mes actual
                  </p>
                </div>
                <Link
                  href="/productos"
                  className="text-xs font-bold text-brand-800 hover:text-brand-950 flex items-center gap-1"
                >
                  Ver catálogo <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {datos.masVendidos.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">
                  No se registraron ventas en el mes actual.
                </p>
              ) : (
                <div className="divide-y divide-brand-100">
                  {datos.masVendidos.map((prod, idx) => (
                    <div key={prod.productoId} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs flex-none">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-950 truncate">
                            {prod.descripcion}
                          </p>
                          <p className="text-xs text-brand-800/60">Código: {prod.codigo}</p>
                        </div>
                      </div>
                      <div className="text-right flex-none">
                        <span className="text-sm font-bold text-brand-950 block">
                          {prod.unidades} un.
                        </span>
                        <span className="text-xs text-brand-800/70 tabular-nums">
                          {formatearMoneda(prod.importe)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accesos Rápidos y Alertas */}
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <p className="text-xs text-brand-800/60 mt-1">Operaciones frecuentes del mostrador</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Link
                href="/ventas/nueva"
                className="flex items-center justify-between p-3 rounded-xl border border-brand-200 bg-brand-50/60 hover:bg-brand-100/80 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-brand-950 block leading-tight">
                      Nueva Venta
                    </span>
                    <span className="text-xs text-brand-800/60">Facturar en mostrador</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-800 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/ventas"
                className="flex items-center justify-between p-3 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-brand-950 block leading-tight">
                      Ver Facturas
                    </span>
                    <span className="text-xs text-brand-800/60">Historial y comprobantes</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-800 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/clientes/saldos"
                className="flex items-center justify-between p-3 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-brand-950 block leading-tight">
                      Saldos Deudores
                    </span>
                    <span className="text-xs text-brand-800/60">Cuentas con saldo pendiente</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-800 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/productos?bajoMinimo=true"
                className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-900 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-red-950 block leading-tight">
                      Reponer Stock
                    </span>
                    <span className="text-xs text-red-800/70">
                      {datos.bajoMinimo.cantidad} productos bajo mínimo
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-red-800 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
