import { requireRemoteConfirmation, runD1, sqlText } from "./shared";

function readSlug(args: string[]) {
  const index = args.indexOf("--slug");
  const slug = index >= 0 ? args[index + 1] : "";
  if (!slug) throw new Error("Usage: npm run inspect:review -- --slug <slug> [--remote --confirm]");
  return slug;
}

function main() {
  const args = process.argv.slice(2);
  const remote = requireRemoteConfirmation(args);
  const slug = readSlug(args);
  const rows = runD1(
    `SELECT question, excerpt, short_answer, expert_answer, speaking_blueprint,
            interviewer_evaluates, real_world_example, strong_signals,
            common_mistakes, follow_up_questions, related_questions,
            quality_score, reviewer_notes, status
     FROM interview_questions
     WHERE slug = ${sqlText(slug)} LIMIT 1`,
    remote
  ) as Array<Record<string, unknown>>;

  const article = rows[0];
  if (!article) throw new Error(`Question not found: ${slug}`);
  if (article.status !== "review") throw new Error(`Question must be in review status. Current: ${article.status}`);

  console.log(JSON.stringify(article, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
