"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface ModalAnularFacturaProps {
  isOpen: boolean;
  onClose: () => void;
  facturaId: number;
  numeroFormateado: string;
  onFacturaAnulada: () => void;
}

export function ModalAnularFactura({
  isOpen,
  onClose,
  facturaId,
  numeroFormateado,
  onFacturaAnulada,
}: ModalAnularFacturaProps) {
  const [motivo, setMotivo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim() || motivo.trim().length < 3) {
      setError("El motivo de anulación es obligatorio (mínimo 3 caracteres).");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/facturas/${facturaId}/anulacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al anular factura.");
      }

      onFacturaAnulada();
      onClose();
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
      title="Anular Factura"
      description={`Comprobante N° ${numeroFormateado}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
          <strong>Atención:</strong> La anulación es una acción irreversible. Al confirmar,
          el sistema reingresará automáticamente las unidades vendidas al stock de cada producto
          y, si la factura fue en cuenta corriente, acreditará el importe en la cuenta del cliente.
        </div>

        <Input
          label="Motivo de la anulación *"
          placeholder="Ej. Error en la carga de cantidades, cliente desiste..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" isLoading={isLoading}>
            Confirmar Anulación
          </Button>
        </div>
      </form>
    </Modal>
  );
}
