import { describe, expect, it } from "vitest";
import { getAuthEnvironment, getDatabaseEnvironment } from "@/lib/env";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:password@localhost:5432/test",
  BETTER_AUTH_SECRET: "a-test-secret-that-is-at-least-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000",
};

describe("database environment", () => {
  const database = {
    DATABASE_URL: "postgresql://user:password@pooled.example.com/test",
    DATABASE_URL_UNPOOLED: "postgresql://user:password@direct.example.com/test",
  };

  it("reports missing configuration without constructing a client", () => {
    expect(getDatabaseEnvironment({})).toBeNull();
  });

  it("uses the direct connection for local development", () => {
    expect(getDatabaseEnvironment({ ...database, NODE_ENV: "development" })).toEqual({
      databaseUrl: database.DATABASE_URL_UNPOOLED,
    });
  });

  it("uses the pooled connection in production", () => {
    expect(getDatabaseEnvironment({ ...database, NODE_ENV: "production" })).toEqual({
      databaseUrl: database.DATABASE_URL,
    });
  });

  it("falls back to the pooled connection when no direct connection is present", () => {
    expect(getDatabaseEnvironment({ DATABASE_URL: database.DATABASE_URL, NODE_ENV: "development" })).toEqual({
      databaseUrl: database.DATABASE_URL,
    });
  });

  it("rejects malformed PostgreSQL URLs", () => {
    expect(getDatabaseEnvironment({ ...database, DATABASE_URL: "https://example.com" })).toBeNull();
    expect(getDatabaseEnvironment({ ...database, DATABASE_URL_UNPOOLED: "https://example.com" })).toBeNull();
  });
});

describe("auth environment", () => {
  it("reports missing configuration without constructing a client", () => {
    expect(getAuthEnvironment({})).toBeNull();
  });

  it("accepts explicit localhost HTTP configuration in development", () => {
    expect(getAuthEnvironment(valid)).toEqual({
      databaseUrl: valid.DATABASE_URL,
      secret: valid.BETTER_AUTH_SECRET,
      baseUrl: valid.BETTER_AUTH_URL,
      trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
      useSecureCookies: false,
    });
  });

  it("fails closed for partial or malformed configuration", () => {
    expect(getAuthEnvironment({ DATABASE_URL: valid.DATABASE_URL })).toBeNull();
    expect(getAuthEnvironment({ ...valid, BETTER_AUTH_SECRET: "short" })).toBeNull();
    expect(getAuthEnvironment({ ...valid, DATABASE_URL: "https://example.com" })).toBeNull();
    expect(getAuthEnvironment({ ...valid, BETTER_AUTH_URL: "http://example.com" })).toBeNull();
  });

  it("requires HTTPS and secure cookies in production", () => {
    expect(getAuthEnvironment({ ...valid, NODE_ENV: "production" })).toBeNull();
    expect(
      getAuthEnvironment({
        ...valid,
        NODE_ENV: "production",
        BETTER_AUTH_URL: "https://app.example.com",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://app.example.com",
      }),
    ).toMatchObject({ useSecureCookies: true });
  });
});
