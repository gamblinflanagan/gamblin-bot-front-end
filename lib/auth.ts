import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
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
    database: drizzleAdapter(database, { provider: "pg", schema, transaction: true }),
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
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
    },
    advanced: {
      useSecureCookies: config.useSecureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.useSecureCookies,
      },
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  const config = getAuthEnvironment();
  if (!config) return null;

  instance ??= createAuth(config);
  return instance;
}
