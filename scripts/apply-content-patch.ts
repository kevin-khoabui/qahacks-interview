import fs from "node:fs";
import path from "node:path";
import { requireRemoteConfirmation, runD1, sqlText } from "./shared";

type Patch = {
  slug: string;
  excerpt?: string;
  short_answer?: string;
  expert_answer?: string;
  speaking_blueprint?: string;
  interviewer_evaluates?: string[];
  real_world_example?: string;
  strong_signals?: string[];
  common_mistakes?: string[];
  follow_up_questions?: string[];
  related_questions?: string[];
  estimated_answer_time?: number;
};

function readSlug(args: string[]) {
  const index = args.indexOf("--slug");
  const slug = index >= 0 ? args[index + 1] : "";
  if (!slug) throw new Error("Usage: npm run patch:content -- --slug <slug> [--remote --confirm]");
  return slug;
}

function loadPatch(slug: string): Patch {
  const file = path.join(process.cwd(), "content-patches", `${slug}.json`);
  if (!fs.existsSync(file)) throw new Error(`Content patch not found: ${file}`);
  const patch = JSON.parse(fs.readFileSync(file, "utf8")) as Patch;
  if (patch.slug !== slug) throw new Error(`Patch slug mismatch. Expected ${slug}, found ${patch.slug}`);
  return patch;
}

function main() {
  const args = process.argv.slice(2);
  const remote = requireRemoteConfirmation(args);
  const slug = readSlug(args);
  const patch = loadPatch(slug);

  const rows = runD1(
    `SELECT slug, status FROM interview_questions WHERE slug = ${sqlText(slug)} LIMIT 1`,
    remote
  ) as Array<{ slug: string; status: string }>;

  if (!rows[0]) throw new Error(`Question not found: ${slug}`);
  if (!["draft", "review", "rejected"].includes(rows[0].status)) {
    throw new Error(`Patch is only allowed for draft, review, or rejected content. Current status: ${rows[0].status}`);
  }

  const assignments: string[] = [];
  const textFields = ["excerpt", "short_answer", "expert_answer", "speaking_blueprint", "real_world_example"] as const;
  for (const field of textFields) {
    if (patch[field] !== undefined) assignments.push(`${field} = ${sqlText(patch[field] as string)}`);
  }

  const arrayFields = ["interviewer_evaluates", "strong_signals", "common_mistakes", "follow_up_questions", "related_questions"] as const;
  for (const field of arrayFields) {
    if (patch[field] !== undefined) assignments.push(`${field} = ${sqlText(JSON.stringify(patch[field]))}`);
  }

  if (patch.estimated_answer_time !== undefined) {
    const value = Math.max(2, Math.min(8, Math.round(patch.estimated_answer_time)));
    assignments.push(`estimated_answer_time = ${value}`);
  }

  if (assignments.length === 0) throw new Error("Patch contains no editable fields.");

  assignments.push("status = 'draft'");
  assignments.push("quality_score = 0");
  assignments.push("reviewer_notes = NULL");
  assignments.push("reviewed_at = NULL");
  assignments.push("updated_at = CURRENT_TIMESTAMP");

  runD1(
    `UPDATE interview_questions SET ${assignments.join(", ")} WHERE slug = ${sqlText(slug)}`,
    remote
  );

  console.log(`Applied content patch and returned article to draft: ${slug}`);
  console.log("Next step: run review-1 before publishing.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
