import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { obtenerProducto, actualizarProducto } from "@/services/productos.service";
import { ApiError } from "@/lib/errors";

export const GET = apiHandler<{ id: string }>(
  async (_req: NextRequest, _usuario, { params }) => {
    const id = Number(params.id);
    const prod = await obtenerProducto(id);
    return NextResponse.json(prod, { status: 200 });
  }
);

export const PATCH = apiHandler<{ id: string }>(
  async (req: NextRequest, usuario, { params }) => {
    if (usuario.rol !== "admin") {
      throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede modificar productos.");
    }
    const id = Number(params.id);
    const body = await req.json();
    const actualizado = await actualizarProducto(usuario, id, body);
    return NextResponse.json(actualizado, { status: 200 });
  }
);
