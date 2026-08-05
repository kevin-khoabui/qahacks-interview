import { requireRemoteConfirmation, runD1 } from "./shared";

type ReviewRow = {
  slug: string;
  question: string;
  quality_score: number;
  reviewer_notes: string | null;
  reviewed_at: string | null;
};

function safeParse(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function main() {
  const remote = requireRemoteConfirmation(process.argv.slice(2));
  const rows = runD1(
    `SELECT slug, question, quality_score, reviewer_notes, reviewed_at
     FROM interview_questions
     WHERE status = 'review'
     ORDER BY quality_score DESC, reviewed_at DESC
     LIMIT 50`,
    remote
  ) as ReviewRow[];

  if (rows.length === 0) {
    console.log("No articles are currently waiting for publication review.");
    return;
  }

  console.log(`Found ${rows.length} article(s) in review status.\n`);

  rows.forEach((row, index) => {
    const notes = safeParse(row.reviewer_notes);
    const recommendation = typeof notes?.recommendation === "string" ? notes.recommendation : "unknown";
    const issues = Array.isArray(notes?.issues)
      ? notes.issues.filter((item): item is string => typeof item === "string")
      : [];
    const unsupported = Array.isArray(notes?.unsupported_claims)
      ? notes.unsupported_claims.filter((item): item is string => typeof item === "string")
      : [];

    console.log(`${index + 1}. ${row.question}`);
    console.log(`   Slug: ${row.slug}`);
    console.log(`   Score: ${row.quality_score}/100`);
    console.log(`   Recommendation: ${recommendation}`);
    console.log(`   Reviewed at: ${row.reviewed_at || "unknown"}`);
    console.log(`   Issues: ${issues.length ? issues.join(" | ") : "None reported"}`);
    console.log(`   Unsupported claims: ${unsupported.length ? unsupported.join(" | ") : "None reported"}`);
    console.log("");
  });
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
