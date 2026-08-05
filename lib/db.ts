import { getCloudflareContext } from "@opennextjs/cloudflare";

export type InterviewQuestion = {
  id: string;
  slug: string;
  question: string;
  excerpt: string;
  short_answer: string;
  expert_answer: string;
  speaking_blueprint: string;
  common_mistakes: string[];
  follow_up_questions: string[];
  role: string;
  level: string;
  category: string;
  technology: string | null;
  question_type: string;
  quality_score: number;
  published_at: string | null;
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

async function getDb(): Promise<D1Database | null> {
  try {
    const context = await getCloudflareContext({ async: true });
    return ((context.env as unknown as { DB?: D1Database }).DB ?? null);
  } catch {
    return null;
  }
}

function mapQuestion(row: Record<string, unknown>): InterviewQuestion {
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    question: String(row.question ?? ""),
    excerpt: String(row.excerpt ?? ""),
    short_answer: String(row.short_answer ?? ""),
    expert_answer: String(row.expert_answer ?? ""),
    speaking_blueprint: String(row.speaking_blueprint ?? ""),
    common_mistakes: parseArray(row.common_mistakes),
    follow_up_questions: parseArray(row.follow_up_questions),
    role: String(row.role ?? ""),
    level: String(row.level ?? ""),
    category: String(row.category ?? ""),
    technology: row.technology ? String(row.technology) : null,
    question_type: String(row.question_type ?? ""),
    quality_score: Number(row.quality_score ?? 0),
    published_at: row.published_at ? String(row.published_at) : null
  };
}

export async function getPublishedQuestions(search = "", limit = 60): Promise<InterviewQuestion[]> {
  const db = await getDb();
  if (!db) return [];

  const term = `%${search.trim()}%`;
  const query = search.trim()
    ? `SELECT * FROM interview_questions
       WHERE status = 'published'
       AND (question LIKE ? OR category LIKE ? OR role LIKE ? OR technology LIKE ?)
       ORDER BY quality_score DESC, published_at DESC
       LIMIT ?`
    : `SELECT * FROM interview_questions
       WHERE status = 'published'
       ORDER BY quality_score DESC, published_at DESC
       LIMIT ?`;

  const statement = db.prepare(query);
  const result = search.trim()
    ? await statement.bind(term, term, term, term, limit).all<Record<string, unknown>>()
    : await statement.bind(limit).all<Record<string, unknown>>();

  return (result.results ?? []).map(mapQuestion);
}

export async function getPublishedQuestion(slug: string): Promise<InterviewQuestion | null> {
  const db = await getDb();
  if (!db) return null;

  const row = await db
    .prepare("SELECT * FROM interview_questions WHERE slug = ? AND status = 'published' LIMIT 1")
    .bind(slug)
    .first<Record<string, unknown>>();

  return row ? mapQuestion(row) : null;
}
