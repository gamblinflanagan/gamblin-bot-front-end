import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, ".next", "standalone");
const server = path.join(directory, "server.js");

if (!existsSync(server)) {
  throw new Error("Standalone server is missing. Run pnpm test:e2e to build and package it.");
}

const child = spawn(process.execPath, [server], {
  cwd: directory,
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: "3100",
    DATABASE_URL: "",
    BETTER_AUTH_SECRET: "",
    BETTER_AUTH_URL: "",
    BETTER_AUTH_TRUSTED_ORIGINS: "",
    BACKEND_API_URL: "",
    BACKEND_API_KEY: "",
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  throw error;
});
child.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
