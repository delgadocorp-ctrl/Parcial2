"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ModalRegistrarPago } from "@/components/modals/ModalRegistrarPago";
import { formatearMoneda, formatearFechaHora } from "@/lib/formatters";
import { ArrowLeft, HandCoins, History, Phone, Mail, MapPin } from "lucide-react";

export default function FichaClientePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [cliente, setCliente] = useState<Awaited<ReturnType<typeof import("@/services/clientes.service").obtenerCliente>> | null>(null);
  const [cuenta, setCuenta] = useState<Awaited<ReturnType<typeof import("@/services/cuenta.service").obtenerCuenta>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);

  const cargarDatos = useCallback(async () => {
    setIsLoading(true);
    try {
      const [meRes, cliRes, ctaRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/clientes/${id}`),
        fetch(`/api/clientes/${id}/cuenta`),
      ]);

      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      setUsuario(await meRes.json());

      if (cliRes.ok) {
        setCliente(await cliRes.json());
      }
      if (ctaRes.ok) {
        setCuenta(await ctaRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) cargarDatos();
  }, [id, cargarDatos]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-brand-800">
        Cargando cuenta corriente...
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-600 font-semibold mb-3">Cliente no encontrado.</p>
        <Link href="/clientes" className="text-xs text-brand-800 underline">
          ← Volver al listado de clientes
        </Link>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/clientes"
              className="p-2 text-brand-800 hover:text-brand-950 hover:bg-brand-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
                Clientes / Ficha y Cuenta Corriente
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
                {cliente.nombre}
              </h1>
              <p className="text-xs text-brand-800/70 font-mono mt-0.5">
                {cliente.tipoDoc}: {cliente.nroDoc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cliente.cuentaCorriente && (
              <Button
                onClick={() => setModalPagoAbierto(true)}
                disabled={cliente.saldo <= 0}
                className="text-xs font-bold bg-[#254d3c] hover:bg-[#34634d]"
              >
                <HandCoins className="w-4 h-4 mr-1.5" />
                Registrar pago
              </Button>
            )}
          </div>
        </div>

        {/* Tarjetas de Datos de la Cuenta */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-amber-600">
            <CardHeader className="pb-1">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Saldo Adeudado</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-serif font-bold text-amber-900 tabular-nums">
                {formatearMoneda(cliente.saldo)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Límite de Crédito</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-serif font-bold text-brand-950 tabular-nums">
                {cliente.limiteCredito !== null ? formatearMoneda(cliente.limiteCredito) : "Sin límite"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Crédito Disponible</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-serif font-bold text-emerald-800 tabular-nums">
                {cliente.disponible !== null ? formatearMoneda(cliente.disponible) : "Ilimitado"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Cuenta Corriente</span>
            </CardHeader>
            <CardContent className="pt-1">
              <Badge variant={cliente.cuentaCorriente ? "success" : "neutral"}>
                {cliente.cuentaCorriente ? "Habilitada para crédito" : "Inhabilitada"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Datos de contacto */}
        <Card className="p-4 bg-brand-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-brand-900">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand-700" />
              <span>Teléfono: <strong>{cliente.telefono || "No especificado"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-700" />
              <span>Correo: <strong>{cliente.email || "No especificado"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-700" />
              <span>Domicilio: <strong>{cliente.domicilio || "No especificado"}</strong></span>
            </div>
          </div>
        </Card>

        {/* Movimientos de Cuenta Corriente (RF-C4) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand-800" />
                Movimientos cronológicos de la cuenta
              </CardTitle>
              <p className="text-xs text-brand-800/60 mt-1">
                Débitos por ventas a crédito y créditos por pagos recibidos con saldo acumulado
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-100 text-brand-900">
              {cuenta?.movimientos?.length || 0} movimientos
            </span>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Fecha y Hora</th>
                    <th className="py-2.5 px-3 font-bold">Concepto / Comprobante</th>
                    <th className="py-2.5 px-3 font-bold">Tipo</th>
                    <th className="py-2.5 px-3 font-bold text-right">Débito (+)</th>
                    <th className="py-2.5 px-3 font-bold text-right">Crédito (-)</th>
                    <th className="py-2.5 px-3 font-bold text-right">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {(!cuenta?.movimientos || cuenta.movimientos.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No hay movimientos registrados en la cuenta corriente de este cliente.
                      </td>
                    </tr>
                  ) : (
                    cuenta.movimientos.map((m, idx: number) => (
                      <tr key={idx} className="hover:bg-brand-50/40">
                        <td className="py-2.5 px-3 text-brand-800/80">
                          {formatearFechaHora(m.fecha)}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-brand-950">
                          {m.facturaId ? (
                            <Link href={`/ventas/${m.facturaId}`} className="text-brand-800 hover:underline">
                              {m.descripcion}
                            </Link>
                          ) : m.pagoId ? (
                            <Link href={`/pagos/${m.pagoId}`} className="text-emerald-800 hover:underline">
                              {m.descripcion}
                            </Link>
                          ) : (
                            m.descripcion
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <Badge variant={m.tipo === "debito" ? "warning" : "success"}>
                            {m.tipo.toUpperCase()}
                          </Badge>
                        </td>

                        <td className="py-2.5 px-3 text-right font-medium tabular-nums text-amber-900">
                          {m.tipo === "debito" ? formatearMoneda(m.importe) : "—"}
                        </td>

                        <td className="py-2.5 px-3 text-right font-medium tabular-nums text-emerald-800">
                          {m.tipo === "credito" ? formatearMoneda(m.importe) : "—"}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-sm tabular-nums text-brand-950">
                          {formatearMoneda(m.saldo)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Registrar Pago */}
      <ModalRegistrarPago
        isOpen={modalPagoAbierto}
        onClose={() => setModalPagoAbierto(false)}
        cliente={cliente}
        onPagoRegistrado={(pago) => {
          cargarDatos();
          router.push(`/pagos/${pago.id}`);
        }}
      />
    </AppLayout>
  );
}
