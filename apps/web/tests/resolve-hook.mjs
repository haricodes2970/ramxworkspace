// Node.js module resolution hook mapping the "@/..." TypeScript alias to
// the apps/web/src directory. Registered via --experimental-loader in the
// package.json test script so node --test can load source files directly.
import { existsSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = join(ROOT, "src", specifier.slice(2));
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      join(base, "index.ts"),
      join(base, "index.tsx"),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }
  return next(specifier, context);
}
