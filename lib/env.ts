import "server-only";

import { z } from "zod";

const authEnvironmentSchema = z.object({
  databaseUrl: z.url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgres:" || protocol === "postgresql:";
  }),
  secret: z.string().min(32),
  baseUrl: z.url(),
  trustedOrigins: z.array(z.url()).min(1),
});

export interface AuthEnvironment {
  databaseUrl: string;
  secret: string;
  baseUrl: string;
  trustedOrigins: string[];
  useSecureCookies: boolean;
}

function validHttpOrigin(value: string, production: boolean): boolean {
  const url = new URL(value);
  if (url.origin !== value.replace(/\/$/, "")) return false;
  if (url.protocol === "https:") return true;

  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  return !production && url.protocol === "http:" && localHost;
}

export function getAuthEnvironment(env: Record<string, string | undefined> = process.env): AuthEnvironment | null {
  const values = {
    databaseUrl: env.DATABASE_URL?.trim() || "",
    secret: env.BETTER_AUTH_SECRET?.trim() || "",
    baseUrl: env.BETTER_AUTH_URL?.trim() || "",
    trustedOrigins: (env.BETTER_AUTH_TRUSTED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };

  if (!values.databaseUrl && !values.secret && !values.baseUrl && values.trustedOrigins.length === 0) {
    return null;
  }

  const parsed = authEnvironmentSchema.safeParse(values);
  if (!parsed.success) return null;

  const production = env.NODE_ENV === "production";
  const origins = [parsed.data.baseUrl, ...parsed.data.trustedOrigins];
  if (!origins.every((origin) => validHttpOrigin(origin, production))) return null;

  return {
    ...parsed.data,
    useSecureCookies: production,
  };
}

export function isAuthConfigured(): boolean {
  return getAuthEnvironment() !== null;
}
