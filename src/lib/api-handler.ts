import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";
import { obtenerUsuarioActual, SesionUsuario } from "./auth";

type RouteContext<T = Record<string, string>> = {
  params: Promise<T>;
};

type HandlerWithAuth<T = Record<string, string>> = (
  req: NextRequest,
  usuario: SesionUsuario,
  context: { params: T }
) => Promise<NextResponse | Response>;

type HandlerPublic<T = Record<string, string>> = (
  req: NextRequest,
  context: { params: T }
) => Promise<NextResponse | Response>;

interface Options {
  roles?: Array<"admin" | "vendedor">;
}

export function handleErrors(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
      { status: err.status }
    );
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      campo: i.path.join("."),
      mensaje: i.message,
    }));
    return NextResponse.json(
      {
        error: {
          code: "VALIDACION",
          message: "Hay campos con errores.",
          details,
        },
      },
      { status: 422 }
    );
  }

  if (err instanceof SyntaxError && "body" in err) {
    return NextResponse.json(
      {
        error: {
          code: "JSON_INVALIDO",
          message: "El cuerpo no es JSON válido.",
        },
      },
      { status: 400 }
    );
  }

  console.error("Error no controlado en API:", err);
  return NextResponse.json(
    {
      error: {
        code: "ERROR_INTERNO",
        message: "Ocurrió un error inesperado en el servidor.",
      },
    },
    { status: 500 }
  );
}

export function apiHandler<T = Record<string, string>>(
  handler: HandlerWithAuth<T>,
  options?: Options
) {
  return async (req: NextRequest, rawContext: RouteContext<T>) => {
    try {
      const params = await rawContext.params;
      const usuario = await obtenerUsuarioActual();

      if (options?.roles && !options.roles.includes(usuario.rol)) {
        throw new ApiError(403, "SIN_PERMISO", "El rol no alcanza para esta ruta.");
      }

      return await handler(req, usuario, { params });
    } catch (err) {
      return handleErrors(err);
    }
  };
}

export function publicApiHandler<T = Record<string, string>>(handler: HandlerPublic<T>) {
  return async (req: NextRequest, rawContext: RouteContext<T>) => {
    try {
      const params = await rawContext.params;
      return await handler(req, { params });
    } catch (err) {
      return handleErrors(err);
    }
  };
}
