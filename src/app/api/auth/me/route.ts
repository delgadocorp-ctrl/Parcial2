import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (_req: NextRequest, usuario) => {
  return NextResponse.json(usuario, { status: 200 });
});
