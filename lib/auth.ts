import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getDatabase } from "@/db";
import * as schema from "@/db/schema";
import { getAuthEnvironment } from "@/lib/env";

function createAuth(config: NonNullable<ReturnType<typeof getAuthEnvironment>>) {
  const database = getDatabase();
  if (!database) return null;

  return betterAuth({
    baseURL: config.baseUrl,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(database, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    advanced: {
      useSecureCookies: config.useSecureCookies,
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  const config = getAuthEnvironment();
  if (!config) return null;

  instance ??= createAuth(config);
  return instance;
}
