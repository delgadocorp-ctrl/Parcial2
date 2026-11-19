import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

async function runMigrate() {
  console.log("Aplicando migraciones...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migraciones aplicadas exitosamente.");
}

runMigrate().catch((err) => {
  console.error("Error aplicando migraciones:", err);
  process.exit(1);
});
