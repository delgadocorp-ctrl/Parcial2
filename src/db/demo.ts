import { randomBytes } from "node:crypto";
import { mkdtemp, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { conBaseDeDatos } from "./index";
import { cargarDatosDePrueba } from "./datos-prueba";
import * as schema from "./schema";

async function iniciarBaseDemo() {
  const directorio = await mkdtemp(join(tmpdir(), "mostrador-demo-"));
  const archivo = join(directorio, "demo.db");
  const cliente = createClient({ url: `file:${archivo}` });
  const base = drizzle(cliente, { schema });
  try {
    await migrate(base, { migrationsFolder: "drizzle" });
    await conBaseDeDatos(base, () =>
      cargarDatosDePrueba({
        admin: randomBytes(24).toString("hex"),
        vendedor: randomBytes(24).toString("hex"),
      })
    );
    await cliente.execute("PRAGMA query_only = ON");
    return base;
  } catch (error) {
    cliente.close();
    await unlink(archivo).catch(() => {});
    await rmdir(directorio).catch(() => {});
    throw error;
  }
}

let baseDemo: ReturnType<typeof iniciarBaseDemo> | undefined;

export async function conDatosDemo<T>(ejecutar: () => Promise<T>): Promise<T> {
  baseDemo ??= iniciarBaseDemo().catch((error) => {
    baseDemo = undefined;
    throw error;
  });
  return conBaseDeDatos(await baseDemo, ejecutar);
}
