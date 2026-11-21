import { NextRequest, NextResponse } from "next/server";
import { apiHandler, leerJson } from "@/lib/api-handler";
import { listarFacturas, emitirFactura } from "@/services/facturas.service";

export const GET = apiHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const desde = searchParams.get("desde") || undefined;
  const hasta = searchParams.get("hasta") || undefined;
  const clienteId = searchParams.get("clienteId") ? Number(searchParams.get("clienteId")) : undefined;
  const vendedorId = searchParams.get("vendedorId") ? Number(searchParams.get("vendedorId")) : undefined;
  const forma = searchParams.get("forma") || undefined;
  const estado = searchParams.get("estado") || undefined;
  const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
  const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;

  const res = await listarFacturas({
    q,
    desde,
    hasta,
    clienteId,
    vendedorId,
    forma,
    estado,
    page,
    pageSize,
  });

  return NextResponse.json(res, { status: 200 });
});

export const POST = apiHandler(async (req: NextRequest, usuario) => {
  const body = await leerJson(req);
  const factura = await emitirFactura(usuario, body);
  return NextResponse.json(factura, { status: 201 });
});
