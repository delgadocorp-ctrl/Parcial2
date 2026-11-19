import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { obtenerPago } from "@/services/cuenta.service";

export const GET = apiHandler<{ id: string }>(
  async (_req: NextRequest, _usuario, { params }) => {
    const id = Number(params.id);
    const pago = await obtenerPago(id);
    return NextResponse.json(pago, { status: 200 });
  }
);
