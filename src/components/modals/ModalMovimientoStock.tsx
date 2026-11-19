"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface ModalMovimientoStockProps {
  isOpen: boolean;
  onClose: () => void;
  producto: { id: number; codigo: string; descripcion: string; existencia: number };
  onMovimientoRegistrado: () => void;
}

export function ModalMovimientoStock({
  isOpen,
  onClose,
  producto,
  onMovimientoRegistrado,
}: ModalMovimientoStockProps) {
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("ingreso");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("Reposición");
  const [observacion, setObservacion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const cantNum = parseInt(cantidad, 10);
      if (isNaN(cantNum) || cantNum <= 0) {
        throw new Error("La cantidad debe ser un número entero mayor a 0.");
      }

      if (tipo === "egreso" && cantNum > producto.existencia) {
        throw new Error(
          `No se puede egresar ${cantNum} unidades. El stock actual es de ${producto.existencia} unidades.`
        );
      }

      const res = await fetch(`/api/productos/${producto.id}/movimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          cantidad: cantNum,
          motivo,
          observacion: observacion.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al registrar movimiento.");
      }

      onMovimientoRegistrado();
      onClose();
      setCantidad("1");
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
      title="Registrar Movimiento de Stock"
      description={`${producto.codigo} · ${producto.descripcion}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-brand-50 rounded-lg flex items-center justify-between text-xs text-brand-900">
          <span>Stock actual:</span>
          <span className="font-bold text-sm">{producto.existencia} unidades</span>
        </div>

        <Select
          label="Tipo de Movimiento *"
          value={tipo}
          onChange={(e) => {
            const nuevoTipo = e.target.value as "ingreso" | "egreso";
            setTipo(nuevoTipo);
            setMotivo(nuevoTipo === "ingreso" ? "Reposición" : "Rotura");
          }}
        >
          <option value="ingreso">Ingreso (Suma existencias)</option>
          <option value="egreso">Egreso (Descuenta existencias)</option>
        </Select>

        <Input
          label="Cantidad a mover *"
          type="number"
          min="1"
          step="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          required
        />

        <Select
          label="Motivo *"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        >
          {tipo === "ingreso" ? (
            <>
              <option value="Reposición">Reposición</option>
              <option value="Stock inicial">Stock inicial</option>
              <option value="Devolución de cliente">Devolución de cliente</option>
              <option value="Ajuste de inventario">Ajuste de inventario</option>
            </>
          ) : (
            <>
              <option value="Rotura">Rotura</option>
              <option value="Vencimiento">Vencimiento</option>
              <option value="Ajuste de inventario">Ajuste de inventario</option>
              <option value="Uso interno">Uso interno</option>
            </>
          )}
        </Select>

        <Input
          label="Observación (opcional)"
          placeholder="Ej. Caída en depósito, mercadería de proveedor..."
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Confirmar Movimiento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
