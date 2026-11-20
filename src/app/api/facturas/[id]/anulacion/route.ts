import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { anularFactura } from "@/services/facturas.service";

export const POST = apiHandler<{ id: string }>(
  async (req: NextRequest, usuario, { params }) => {
    const id = Number(params.id);
    const body = await req.json();
    const facturaAnulada = await anularFactura(usuario, id, body);
    return NextResponse.json(facturaAnulada, { status: 200 });
  },
  { roles: ["admin"] }
);
