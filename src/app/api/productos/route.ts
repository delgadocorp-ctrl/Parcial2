import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { listarProductos, crearProducto } from "@/services/productos.service";
import { ApiError } from "@/lib/errors";

export const GET = apiHandler(async (req: NextRequest, usuario) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const categoriaId = searchParams.get("categoriaId")
    ? Number(searchParams.get("categoriaId"))
    : undefined;
  const bajoMinimo = searchParams.get("bajoMinimo") || undefined;
  const activo = searchParams.get("activo") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;

  const res = await listarProductos(
    { q, categoriaId, bajoMinimo, activo, page, pageSize },
    usuario
  );
  return NextResponse.json(res, { status: 200 });
});

export const POST = apiHandler(async (req: NextRequest, usuario) => {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede crear productos.");
  }
  const body = await req.json();
  const nuevo = await crearProducto(usuario, body);
  return NextResponse.json(nuevo, { status: 201 });
});
