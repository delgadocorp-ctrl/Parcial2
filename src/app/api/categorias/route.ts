import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { listarCategorias, crearCategoria } from "@/services/categorias.service";
import { ApiError } from "@/lib/errors";

export const GET = apiHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const todas = searchParams.get("todas") === "true";
  const categorias = await listarCategorias(!todas);
  return NextResponse.json(categorias, { status: 200 });
});

export const POST = apiHandler(async (req: NextRequest, usuario) => {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede crear categorías.");
  }
  const body = await req.json();
  const nueva = await crearCategoria(usuario, body);
  return NextResponse.json(nueva, { status: 201 });
});
