import { requireRemoteConfirmation, runD1, sqlText } from "./shared";

function readSlug(args: string[]) {
  const index = args.indexOf("--slug");
  const slug = index >= 0 ? args[index + 1] : "";
  if (!slug) throw new Error("Usage: npm run publish -- --slug <slug> [--remote --confirm]");
  return slug;
}

function main() {
  const args = process.argv.slice(2);
  const remote = requireRemoteConfirmation(args);
  const slug = readSlug(args);

  const rows = runD1(
    `SELECT slug, status, quality_score FROM interview_questions WHERE slug = ${sqlText(slug)} LIMIT 1`,
    remote
  ) as Array<{ slug: string; status: string; quality_score: number }>;

  const question = rows[0];
  if (!question) throw new Error(`Question not found: ${slug}`);
  if (question.status !== "review") throw new Error(`Question must be in review status. Current: ${question.status}`);
  if (Number(question.quality_score) < 80) throw new Error(`Quality score must be at least 80. Current: ${question.quality_score}`);

  runD1(
    `UPDATE interview_questions SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE slug = ${sqlText(slug)}`,
    remote
  );

  console.log(`Published: ${slug}`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
