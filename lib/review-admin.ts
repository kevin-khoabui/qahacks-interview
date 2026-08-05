import { getCloudflareContext } from "@opennextjs/cloudflare";

export type ReviewQueueItem = {
  slug: string;
  question: string;
  excerpt: string;
  short_answer: string;
  expert_answer: string;
  speaking_blueprint: string;
  interviewer_evaluates: string[];
  real_world_example: string;
  strong_signals: string[];
  common_mistakes: string[];
  follow_up_questions: string[];
  related_questions: string[];
  quality_score: number;
  reviewer_notes: Record<string, unknown> | null;
  reviewed_at: string | null;
};

function parseArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function getEnv() {
  const context = await getCloudflareContext({ async: true });
  return context.env as unknown as {
    DB?: D1Database;
    REVIEW_ADMIN_TOKEN?: string;
  };
}

export async function isReviewAdmin(token: string) {
  const env = await getEnv();
  return Boolean(env.REVIEW_ADMIN_TOKEN && token && token === env.REVIEW_ADMIN_TOKEN);
}

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const env = await getEnv();
  if (!env.DB) return [];

  const result = await env.DB.prepare(
    `SELECT slug, question, excerpt, short_answer, expert_answer, speaking_blueprint,
            interviewer_evaluates, real_world_example, strong_signals, common_mistakes,
            follow_up_questions, related_questions, quality_score, reviewer_notes, reviewed_at
     FROM interview_questions
     WHERE status = 'review'
     ORDER BY reviewed_at DESC, quality_score DESC
     LIMIT 30`
  ).all<Record<string, unknown>>();

  return (result.results ?? []).map((row) => ({
    slug: String(row.slug ?? ""),
    question: String(row.question ?? ""),
    excerpt: String(row.excerpt ?? ""),
    short_answer: String(row.short_answer ?? ""),
    expert_answer: String(row.expert_answer ?? ""),
    speaking_blueprint: String(row.speaking_blueprint ?? ""),
    interviewer_evaluates: parseArray(row.interviewer_evaluates),
    real_world_example: String(row.real_world_example ?? ""),
    strong_signals: parseArray(row.strong_signals),
    common_mistakes: parseArray(row.common_mistakes),
    follow_up_questions: parseArray(row.follow_up_questions),
    related_questions: parseArray(row.related_questions),
    quality_score: Number(row.quality_score ?? 0),
    reviewer_notes: parseObject(row.reviewer_notes),
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null
  }));
}

export async function moderateReviewArticle(slug: string, decision: "publish" | "discard") {
  const env = await getEnv();
  if (!env.DB) throw new Error("D1 database binding is unavailable.");

  const row = await env.DB.prepare(
    "SELECT status, quality_score FROM interview_questions WHERE slug = ? LIMIT 1"
  ).bind(slug).first<{ status: string; quality_score: number }>();

  if (!row) throw new Error("Article not found.");
  if (row.status !== "review") throw new Error(`Article is not in review status: ${row.status}`);

  if (decision === "publish") {
    if (Number(row.quality_score) < 80) throw new Error("Quality score is below the publish threshold.");
    await env.DB.prepare(
      `UPDATE interview_questions
       SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE slug = ?`
    ).bind(slug).run();
    return;
  }

  await env.DB.prepare(
    `UPDATE interview_questions
     SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
     WHERE slug = ?`
  ).bind(slug).run();
}
