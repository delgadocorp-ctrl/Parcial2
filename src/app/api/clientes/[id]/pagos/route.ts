import { NextRequest, NextResponse } from "next/server";
import { apiHandler, leerJson } from "@/lib/api-handler";
import { registrarPago } from "@/services/cuenta.service";

export const POST = apiHandler<{ id: string }>(
  async (req: NextRequest, usuario, { params }) => {
    const clienteId = Number(params.id);
    const body = await leerJson(req);
    const pago = await registrarPago(usuario, clienteId, body);
    return NextResponse.json(pago, { status: 201 });
  }
);
