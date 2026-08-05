import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export const DATABASE_NAME = "qahacks-interview-db";

export function requireRemoteConfirmation(args: string[]) {
  const remote = args.includes("--remote");
  if (remote && !args.includes("--confirm")) {
    throw new Error("Remote D1 writes require both --remote and --confirm.");
  }
  return remote;
}

export function sqlText(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function normalizeQuestion(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(describe|explain|discuss|how do you|how would you|what is|what are)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function runD1(command: string, remote: boolean): unknown[] {
  const output = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      DATABASE_NAME,
      remote ? "--remote" : "--local",
      "--command",
      command,
      "--json"
    ],
    { encoding: "utf8", env: process.env }
  );

  const parsed = JSON.parse(output) as Array<{ results?: unknown[] }>;
  return parsed.flatMap((item) => item.results ?? []);
}
