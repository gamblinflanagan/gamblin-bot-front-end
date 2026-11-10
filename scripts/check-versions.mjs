import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function compare(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function assertStable(version, packageName) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`${packageName} must resolve to a stable exact release; received ${version}.`);
  }
}

export function checkVersions({ next, react, reactDom }) {
  for (const [name, version] of Object.entries({ next, react, "react-dom": reactDom })) {
    assertStable(version, name);
  }

  if (Number(next.split(".")[0]) !== 15 || compare(next, "15.5.28") < 0) {
    throw new Error(`Next.js must be 15.x at 15.5.28 or newer; resolved ${next}.`);
  }
  if (Number(react.split(".")[0]) !== 19 || compare(react, "19.2.1") < 0) {
    throw new Error(`React must be 19.x at 19.2.1 or newer; resolved ${react}.`);
  }
  if (react !== reactDom) {
    throw new Error(`React and React DOM must match; resolved ${react} and ${reactDom}.`);
  }
}

export function getResolvedVersions() {
  return {
    next: require("next/package.json").version,
    react: require("react/package.json").version,
    reactDom: require("react-dom/package.json").version,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const versions = getResolvedVersions();
  checkVersions(versions);
  console.log(`Version floors passed: Next.js ${versions.next}, React ${versions.react}, React DOM ${versions.reactDom}.`);
}
