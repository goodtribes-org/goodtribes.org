#!/usr/bin/env node
// Enforces the schema convention decided on in the "Blueprint for GoodTribes"
// architecture memo (see CLAUDE.md): a `status` field is always a real
// Prisma enum, never a plain String. We paid for this once already — the
// ~19-field String-to-enum conversion (PRs #68, #71-#77) was a whole
// afternoon of shadow-database diffing that should never have needed to
// exist. This script is what stops it from needing to exist again: it fails
// with a non-zero exit (and a clear file:line per offender) if any `status`
// field in prisma/schema/*.prisma is typed as String instead of a named
// enum.
//
// Dependency-free on purpose (same reasoning as src/lib/logger.ts): this is
// a handful of regex checks over plain text, not worth a real Prisma schema
// parser as a new dependency.
//
// Run directly: node scripts/lint-schema-status-enums.mjs
// Wired into: npm run lint (see package.json)

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_DIR = join(import.meta.dirname, "..", "prisma", "schema");
const STATUS_FIELD_NAME = /status$/i;
// Escape hatch for a field that is named like a status but genuinely isn't
// a closed set this app controls (e.g. raw text from an external system) —
// require the marker directly in the field's trailing comment, so the
// exception is visible right where the violation would otherwise be
// reported, not hidden in a separate allowlist file.
const ALLOW_STRING_MARKER = "@allow-string-status";

const files = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".prisma"));

function findViolations() {
  const violations = [];

  for (const file of files) {
    const path = join(SCHEMA_DIR, file);
    const lines = readFileSync(path, "utf8").split("\n");

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      // Skip comments, attribute-only lines (@@index([status]) etc.), and
      // anything that isn't "at least two whitespace-separated tokens" --
      // enum member lines (bare identifiers like PENDING) never match that.
      if (trimmed.startsWith("//") || trimmed.startsWith("@@") || trimmed === "") return;

      const match = trimmed.match(/^(\S+)\s+(\S+)/);
      if (!match) return;
      const [, fieldName, rawType] = match;

      if (!STATUS_FIELD_NAME.test(fieldName)) return;

      // Strip Prisma's optional (?) and list ([]) suffixes to get the bare
      // type name.
      const type = rawType.replace(/[?[\]]/g, "");
      if (type === "String") {
        if (trimmed.includes(ALLOW_STRING_MARKER)) return;
        violations.push({ file, line: index + 1, fieldName, raw: trimmed });
      }
    });
  }

  return violations;
}

const violations = findViolations();

if (violations.length > 0) {
  console.error("Schema convention violation: status fields must be real Prisma enums, not String.\n");
  for (const v of violations) {
    console.error(`  prisma/schema/${v.file}:${v.line}  ${v.fieldName} is String — ${v.raw}`);
  }
  console.error(
    "\nDefine a proper enum for each field above and reference it as the field's type " +
      "(see any existing *Status enum in prisma/schema/ for the pattern), then generate a " +
      "real migration via the shadow-database workflow in CLAUDE.md. Do not run `prisma migrate dev`.\n\n" +
      `If this field genuinely isn't a closed set this app controls (e.g. raw text from an ` +
      `external system, like githubStatus), add "${ALLOW_STRING_MARKER}" to its trailing comment ` +
      "to document the exception instead of converting it."
  );
  process.exit(1);
}

console.log(`lint-schema-status-enums: OK (checked ${files.length} schema files)`);
