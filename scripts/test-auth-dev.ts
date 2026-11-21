import { execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
Object.assign(process.env, { NODE_ENV: "development" });

const execute = promisify(execFile);
const testEmail = `auth-test-${randomUUID()}@example.invalid`;
const rejectedEmail = `signup-test-${randomUUID()}@example.invalid`;
const baseUrl = "http://localhost:3000";

class IntegrationError extends Error {}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new IntegrationError(message);
}

async function createThrowawayUser() {
  try {
    const { stdout } = await execute("pnpm", ["users", "create", "--email", testEmail, "--name", "Throwaway Auth Test"], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "development" },
    });
    const match = stdout.match(/Generated password \(shown once\): (\S+)/);
    check(match?.[1], "The admin script did not return a generated password.");
    return match[1];
  } catch {
    throw new IntegrationError("The admin script could not create the throwaway user.");
  }
}

async function authRequest(path: string, body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/auth/[...all]/route");
  return POST(new Request(`${baseUrl}/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
    },
    body: JSON.stringify(body),
  }));
}

async function main() {
  check(process.env.NEON_BRANCH === "dev", "Refusing to run outside the Neon dev branch.");

  const password = await createThrowawayUser();
  const signUp = await authRequest("/sign-up/email", {
    name: "Rejected Signup",
    email: rejectedEmail,
    password: randomBytes(24).toString("base64url"),
  });
  check(signUp.status === 400 || signUp.status === 403, `Public sign-up was not rejected (status ${signUp.status}).`);

  const signIn = await authRequest("/sign-in/email", { email: testEmail, password });
  check(signIn.status === 200, `Valid sign-in failed (status ${signIn.status}).`);
  const setCookie = signIn.headers.get("set-cookie") || "";
  check(setCookie.includes("better-auth.session_token="), "Sign-in did not set a session cookie.");
  check(/httponly/i.test(setCookie), "Session cookie is not httpOnly.");
  check(/samesite=lax/i.test(setCookie), "Session cookie is not SameSite=Lax.");

  const database = getDatabase();
  check(database, "Database is not configured.");
  const sessions = await database
    .select({ id: session.id })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(user.email, testEmail));
  check(sessions.length === 1, "A session row was not created in Neon.");

  const wrongPassword = await authRequest("/sign-in/email", {
    email: testEmail,
    password: randomBytes(24).toString("base64url"),
  });
  const wrongPasswordBody = await wrongPassword.json() as { message?: unknown };
  check(wrongPassword.status === 401, `Wrong password was not rejected (status ${wrongPassword.status}).`);
  check(wrongPasswordBody.message === "Invalid email or password", "Wrong-password error was not generic.");

  console.log("PASS: public sign-up rejected");
  console.log("PASS: admin-created user signed in with an httpOnly SameSite=Lax session cookie");
  console.log("PASS: session row exists in Neon dev");
  console.log("PASS: wrong password rejected with a generic error");
}

const { getDatabase, closeDatabase } = await import("@/db");
const { session, user } = await import("@/db/schema");

try {
  await main();
} catch (error) {
  console.error(error instanceof IntegrationError ? error.message : "Dev auth integration test failed safely.");
  process.exitCode = 1;
} finally {
  let cleanupPassed = false;
  try {
    const database = getDatabase();
    if (database) {
      await database.delete(user).where(eq(user.email, testEmail));
      await database.delete(user).where(eq(user.email, rejectedEmail));
      const remainingUsers = await database.select({ id: user.id }).from(user).where(eq(user.email, testEmail));
      const remainingSessions = await database
        .select({ id: session.id })
        .from(session)
        .innerJoin(user, eq(session.userId, user.id))
        .where(eq(user.email, testEmail));
      check(remainingUsers.length === 0 && remainingSessions.length === 0, "Throwaway user cleanup failed.");
    }
    cleanupPassed = true;
  } catch {
    console.error("Throwaway user cleanup failed safely.");
    process.exitCode = 1;
  } finally {
    try {
      await closeDatabase();
    } catch {
      console.error("Database pool cleanup failed safely.");
      process.exitCode = 1;
    }
  }
  if (cleanupPassed) console.log("PASS: throwaway user and sessions deleted");
}
