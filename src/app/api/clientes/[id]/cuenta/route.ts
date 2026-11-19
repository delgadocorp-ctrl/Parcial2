import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { obtenerCuenta } from "@/services/cuenta.service";

export const GET = apiHandler<{ id: string }>(
  async (req: NextRequest, _usuario, { params }) => {
    const id = Number(params.id);
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde") || undefined;
    const hasta = searchParams.get("hasta") || undefined;

    const cuenta = await obtenerCuenta(id, { desde, hasta });
    return NextResponse.json(cuenta, { status: 200 });
  }
);
