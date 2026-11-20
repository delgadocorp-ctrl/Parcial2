import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { obtenerDatosTablero } from "@/services/tablero.service";

export const GET = apiHandler(async () => {
  const datos = await obtenerDatosTablero();
  return NextResponse.json(datos, { status: 200 });
});
