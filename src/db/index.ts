import { AsyncLocalStorage } from "node:async_hooks";
import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

const dbPrincipal = drizzle(client, { schema });
const contextoDb = new AsyncLocalStorage<typeof dbPrincipal>();

export function conBaseDeDatos<T>(base: typeof dbPrincipal, ejecutar: () => T): T {
  return contextoDb.run(base, ejecutar);
}

export const db = new Proxy(dbPrincipal, {
  get(objetivo, propiedad) {
    const base = contextoDb.getStore() ?? objetivo;
    const valor = Reflect.get(base, propiedad);
    return typeof valor === "function" ? valor.bind(base) : valor;
  },
});
