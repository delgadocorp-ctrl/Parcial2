import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { listarClientes, crearCliente } from "@/services/clientes.service";

export const GET = apiHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const conDeuda = searchParams.get("conDeuda") || undefined;
  const orden = (searchParams.get("orden") as "saldo" | "nombre") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;

  const res = await listarClientes({ q, conDeuda, orden, page, pageSize });
  return NextResponse.json(res, { status: 200 });
});

export const POST = apiHandler(async (req: NextRequest, usuario) => {
  const body = await req.json();
  const nuevo = await crearCliente(usuario, body);
  return NextResponse.json(nuevo, { status: 201 });
});
