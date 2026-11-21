import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";
import { getDatabaseEnvironment } from "@/lib/env";

let pool: Pool | undefined;
let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase(databaseUrl: string) {
  pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
  });
  return drizzle({ client: pool, schema });
}

export function getDatabase() {
  const config = getDatabaseEnvironment();
  if (!config) return null;

  database ??= createDatabase(config.databaseUrl);
  return database;
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
  database = undefined;
}
