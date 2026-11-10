import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".next", "standalone");

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(path.join(output, "server.js")))) {
  throw new Error("Standalone server.js is missing. Run pnpm build first.");
}

await mkdir(path.join(output, ".next"), { recursive: true });
await cp(path.join(root, ".next", "static"), path.join(output, ".next", "static"), { recursive: true });
if (await exists(path.join(root, "public"))) {
  await cp(path.join(root, "public"), path.join(output, "public"), { recursive: true });
}

console.log("Standalone static assets packaged.");
