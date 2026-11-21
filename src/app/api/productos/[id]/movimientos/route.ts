import { NextRequest, NextResponse } from "next/server";
import { apiHandler, leerJson } from "@/lib/api-handler";
import { listarMovimientosStock, registrarMovimientoManual } from "@/services/stock.service";

export const GET = apiHandler<{ id: string }>(
  async (req: NextRequest, _usuario, { params }) => {
    const productoId = Number(params.id);
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;

    const res = await listarMovimientosStock({ productoId, page, pageSize });
    return NextResponse.json(res, { status: 200 });
  }
);

export const POST = apiHandler<{ id: string }>(
  async (req: NextRequest, usuario, { params }) => {
    const productoId = Number(params.id);
    const body = await leerJson(req);
    const mov = await registrarMovimientoManual(usuario, productoId, body);
    return NextResponse.json(mov, { status: 201 });
  }
);
