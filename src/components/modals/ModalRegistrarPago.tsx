"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatearMoneda } from "@/lib/formatters";

interface ModalRegistrarPagoProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: { id: number; nombre: string; saldo: number };
  onPagoRegistrado: (pago: Awaited<ReturnType<typeof import("@/services/cuenta.service").registrarPago>>) => void;
}

export function ModalRegistrarPago({
  isOpen,
  onClose,
  cliente,
  onPagoRegistrado,
}: ModalRegistrarPagoProps) {
  const [fecha, setFecha] = useState("");
  const [importe, setImporte] = useState("");
  const [medio, setMedio] = useState<"efectivo" | "transferencia" | "tarjeta_debito">("transferencia");
  const [observacion, setObservacion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saldoMaxPesos = (cliente.saldo / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const impCentavos = Math.round(parseFloat(importe) * 100);
      if (isNaN(impCentavos) || impCentavos <= 0) {
        throw new Error("El importe debe ser mayor a cero.");
      }

      if (impCentavos > cliente.saldo) {
        throw new Error(`El pago no puede superar la deuda actual de ${formatearMoneda(cliente.saldo)}.`);
      }

      const res = await fetch(`/api/clientes/${cliente.id}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: fecha ? new Date(fecha).toISOString() : undefined,
          importe: impCentavos,
          medio,
          observacion: observacion.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al registrar pago.");
      }

      onPagoRegistrado(data);
      onClose();
      setFecha("");
      setImporte("");
      setObservacion("");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pago a Cuenta"
      description={`Cliente: ${cliente.nombre}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-950">
          <span>Deuda actual a cancelar:</span>
          <span className="font-bold text-base text-emerald-850">
            {formatearMoneda(cliente.saldo)}
          </span>
        </div>

        <div className="space-y-1">
          <Input
            label="Importe en Pesos ($) *"
            type="number"
            min="0.01"
            max={saldoMaxPesos}
            step="0.01"
            placeholder="0.00"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setImporte(saldoMaxPesos)}
              className="text-xs text-brand-700 hover:underline font-semibold"
            >
              Pagar deuda total ({formatearMoneda(cliente.saldo)})
            </button>
          </div>
        </div>

        <Input
          label="Fecha y hora del pago"
          type="datetime-local"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <Select
          label="Medio de Pago *"
          value={medio}
          onChange={(e) => setMedio(e.target.value as "efectivo" | "transferencia" | "tarjeta_debito")}
        >
          <option value="transferencia">Transferencia bancaria</option>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta_debito">Tarjeta de débito</option>
        </Select>

        <Input
          label="Observación (opcional)"
          placeholder="Ej. Pago parcial, comprobante N°..."
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Emitir Recibo de Pago
          </Button>
        </div>
      </form>
    </Modal>
  );
}
