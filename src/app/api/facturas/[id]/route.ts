import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { obtenerFactura } from "@/services/facturas.service";

export const GET = apiHandler<{ id: string }>(
  async (_req: NextRequest, _usuario, { params }) => {
    const id = Number(params.id);
    const factura = await obtenerFactura(id);
    return NextResponse.json(factura, { status: 200 });
  }
);
