import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { getDatabase, closeDatabase } = await import("@/db");
const { account, session, user } = await import("@/db/schema");
const { getAuth } = await import("@/lib/auth");

class UserCommandError extends Error {}

function fail(message: string): never {
  throw new UserCommandError(message);
}

function generatedPassword() {
  return randomBytes(24).toString("base64url");
}

function parseOptions(args: string[], allowed: string[]) {
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      fail("Invalid arguments. Passwords are generated automatically; never pass one as an argument.");
    }
    const key = flag.slice(2);
    if (!allowed.includes(key) || options[key]) fail(`Unsupported or duplicate option: ${flag}`);
    options[key] = value;
  }
  return options;
}

function emailOption(value: string | undefined) {
  if (!value || !z.email().safeParse(value).success) fail("A valid --email is required.");
  return value.toLowerCase();
}

async function authContext() {
  const auth = getAuth();
  if (!auth) fail("Authentication is not configured.");
  return auth.$context;
}

async function requireUser(email: string) {
  const context = await authContext();
  const found = await context.internalAdapter.findUserByEmail(email);
  if (!found?.user) fail("No user exists for that email.");
  return { context, user: found.user };
}

async function createUser(args: string[]) {
  const options = parseOptions(args, ["email", "name"]);
  const email = emailOption(options.email);
  const name = options.name?.trim();
  if (!name) fail("A non-empty --name is required.");

  const context = await authContext();
  const existing = await context.internalAdapter.findUserByEmail(email);
  if (existing?.user) fail("A user already exists for that email.");

  const database = getDatabase();
  if (!database) fail("Database is not configured.");

  const password = generatedPassword();
  const passwordHash = await context.password.hash(password);
  let createdUser: { id: string } | undefined;
  try {
    createdUser = await context.internalAdapter.createUser(
      { email, name, emailVerified: true },
      { method: "email-password" },
    );
    if (!createdUser) fail("Could not create the user.");
    await context.internalAdapter.linkAccount({
      userId: createdUser.id,
      accountId: createdUser.id,
      providerId: "credential",
      password: passwordHash,
    });
  } catch (error) {
    if (createdUser) await database.delete(user).where(eq(user.id, createdUser.id));
    throw error;
  }

  console.log("User created.");
  console.log(`Generated password (shown once): ${password}`);
}

async function resetPassword(args: string[]) {
  const email = emailOption(parseOptions(args, ["email"]).email);
  const { context, user: existingUser } = await requireUser(email);
  const database = getDatabase();
  if (!database) fail("Database is not configured.");

  const password = generatedPassword();
  const passwordHash = await context.password.hash(password);
  const now = new Date();
  await database.transaction(async (transaction) => {
    const credentials = await transaction
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, existingUser.id), eq(account.providerId, "credential")))
      .limit(1);

    if (credentials[0]) {
      await transaction.update(account).set({ password: passwordHash, updatedAt: now }).where(eq(account.id, credentials[0].id));
    } else {
      await transaction.insert(account).values({
        id: randomUUID(),
        accountId: existingUser.id,
        providerId: "credential",
        userId: existingUser.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    }
    await transaction.delete(session).where(eq(session.userId, existingUser.id));
  });

  console.log("Password reset; existing sessions revoked.");
  console.log(`Generated password (shown once): ${password}`);
}

async function disableUser(args: string[]) {
  const email = emailOption(parseOptions(args, ["email"]).email);
  const { user: existingUser } = await requireUser(email);
  const database = getDatabase();
  if (!database) fail("Database is not configured.");

  await database.transaction(async (transaction) => {
    await transaction
      .update(account)
      .set({ password: null, updatedAt: new Date() })
      .where(and(eq(account.userId, existingUser.id), eq(account.providerId, "credential")));
    await transaction.delete(session).where(eq(session.userId, existingUser.id));
  });

  console.log("Credential sign-in disabled; existing sessions revoked.");
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "create") return createUser(args);
  if (command === "reset-password") return resetPassword(args);
  if (command === "disable") return disableUser(args);
  fail("Usage: pnpm users <create|reset-password|disable> --email <email> [--name <name>]");
}

try {
  await main();
} catch (error) {
  console.error(error instanceof UserCommandError ? error.message : "User command failed safely.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
