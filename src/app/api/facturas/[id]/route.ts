import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { obtenerFactura, eliminarFactura } from "@/services/facturas.service";

export const GET = apiHandler<{ id: string }>(
  async (_req: NextRequest, _usuario, { params }) => {
    const id = Number(params.id);
    const factura = await obtenerFactura(id);
    return NextResponse.json(factura, { status: 200 });
  }
);

export const DELETE = apiHandler<{ id: string }>(
  async (_req: NextRequest, usuario, { params }) => {
    return NextResponse.json(await eliminarFactura(Number(params.id), usuario));
  },
  { roles: ["admin"] }
);
