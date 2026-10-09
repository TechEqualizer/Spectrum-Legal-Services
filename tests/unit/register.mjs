// Fast unit tests run straight from TypeScript with Node's own test runner
// (Node strips the types). This resolves the app's "@/..." imports to src/,
// the way tsconfig does, and adds the .ts extension the source leaves off.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      import { existsSync } from "node:fs";
      import { fileURLToPath, pathToFileURL } from "node:url";
      const src = new URL("../../src/", ${JSON.stringify(import.meta.url)});
      export async function resolve(specifier, context, next) {
        if (specifier.startsWith("@/")) {
          const base = fileURLToPath(new URL(specifier.slice(2), src));
          for (const file of [base + ".ts", base + ".tsx", base + "/index.ts"]) {
            if (existsSync(file)) return next(pathToFileURL(file).href, context);
          }
        }
        return next(specifier, context);
      }
    `)
);
