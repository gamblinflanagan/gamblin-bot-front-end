import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { getAuthEnvironment } from "@/lib/env";

let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase(databaseUrl: string) {
  return drizzle({ client: neon(databaseUrl), schema });
}

export function getDatabase() {
  const config = getAuthEnvironment();
  if (!config) return null;

  database ??= createDatabase(config.databaseUrl);
  return database;
}
