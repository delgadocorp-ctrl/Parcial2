import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { proximoNumeroFactura } from "@/services/facturas.service";

export const GET = apiHandler(async () => {
  const res = await proximoNumeroFactura(1);
  return NextResponse.json(res, { status: 200 });
});
