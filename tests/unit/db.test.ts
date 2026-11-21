import { describe, expect, it, vi } from "vitest";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { closeDatabase, getDatabase } from "@/db";
import { getDatabaseEnvironment } from "@/lib/env";

const mocks = vi.hoisted(() => ({
  database: { execute: vi.fn() },
  end: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({
  Pool: vi.fn(function MockPool() {
    return { end: mocks.end };
  }),
}));
vi.mock("drizzle-orm/neon-serverless", () => ({ drizzle: vi.fn(() => mocks.database) }));
vi.mock("@/lib/env", () => ({ getDatabaseEnvironment: vi.fn() }));

describe("database driver", () => {
  it("does not construct a pool without configuration", () => {
    vi.mocked(getDatabaseEnvironment).mockReturnValue(null);
    expect(getDatabase()).toBeNull();
    expect(Pool).not.toHaveBeenCalled();
  });

  it("uses a bounded Neon WebSocket pool and closes it for scripts", async () => {
    vi.mocked(getDatabaseEnvironment).mockReturnValue({ databaseUrl: "postgresql://localhost/test" });

    expect(getDatabase()).toBe(mocks.database);
    expect(Pool).toHaveBeenCalledWith({
      connectionString: "postgresql://localhost/test",
      max: 1,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
    });
    expect(drizzle).toHaveBeenCalledWith({
      client: expect.objectContaining({ end: mocks.end }),
      schema: expect.any(Object),
    });

    await closeDatabase();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});
