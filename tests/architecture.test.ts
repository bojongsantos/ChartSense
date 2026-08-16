import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const workspace = process.cwd();
const sourceRoot = join(workspace, "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from\s*|import\s*\()(["'])([^"']+)\1/g)].map(
    (match) => match[2],
  );
}

function assertNoForbiddenImports(
  directory: string,
  forbidden: RegExp,
  layer: string,
): void {
  for (const file of sourceFiles(directory)) {
    const imports = importSpecifiers(readFileSync(file, "utf8"));
    const violation = imports.find((specifier) => forbidden.test(specifier));
    assert.equal(
      violation,
      undefined,
      `${layer} boundary violated by ${relative(workspace, file)} -> ${violation}`,
    );
  }
}

test("source code follows Clean Architecture dependency boundaries", () => {
  assertNoForbiddenImports(
    join(sourceRoot, "core", "domain"),
    /^(?:react|next(?:\/|$)|@\/(?:app|infrastructure|presentation)(?:\/|$))/,
    "domain",
  );
  assertNoForbiddenImports(
    join(sourceRoot, "core", "application"),
    /^(?:react|next(?:\/|$)|@\/(?:app|infrastructure|presentation)(?:\/|$))/,
    "application",
  );
  assertNoForbiddenImports(
    join(sourceRoot, "infrastructure"),
    /^@\/(?:app|presentation)(?:\/|$)/,
    "infrastructure",
  );
  assertNoForbiddenImports(
    join(sourceRoot, "presentation"),
    /^@\/app(?:\/|$)/,
    "presentation",
  );
});

test("legacy source folders do not return to the repository root", () => {
  for (const directory of ["app", "components", "lib"]) {
    assert.equal(existsSync(join(workspace, directory)), false, `${directory}/ belongs under src/`);
  }
});
