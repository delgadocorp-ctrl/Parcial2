import { NextRequest, NextResponse } from "next/server";
import { apiHandler, leerJson } from "@/lib/api-handler";
import { obtenerProducto, actualizarProducto } from "@/services/productos.service";

export const GET = apiHandler<{ id: string }>(
  async (_req: NextRequest, _usuario, { params }) => {
    const id = Number(params.id);
    const prod = await obtenerProducto(id);
    return NextResponse.json(prod, { status: 200 });
  }
);

export const PATCH = apiHandler<{ id: string }>(
  async (req: NextRequest, _usuario, { params }) => {
    const id = Number(params.id);
    const body = await leerJson(req);
    const actualizado = await actualizarProducto(id, body);
    return NextResponse.json(actualizado, { status: 200 });
  }
);
