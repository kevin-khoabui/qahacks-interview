import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { newId, normalizeQuestion, requireRemoteConfirmation, runD1, slugify, sqlText } from "./shared";

const DraftSchema = z.object({
  question: z.string().min(20),
  excerpt: z.string().min(80).max(260),
  short_answer: z.string().min(120),
  expert_answer: z.string().min(500),
  speaking_blueprint: z.string().min(300),
  common_mistakes: z.array(z.string().min(20)).min(4).max(6),
  follow_up_questions: z.array(z.string().min(10)).min(2).max(5)
});

type QueueTopic = {
  id: string;
  topic: string;
  role: string;
  level: string;
  category: string;
  technology: string | null;
  question_type: string;
  source: string | null;
};

function readApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.split(",")[0]?.trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS.");
  return key;
}

function prompt(topic: QueueTopic) {
  return `You are a senior QA engineering leader and technical interview coach.

Create one original, practical interview question and answer from this approved topic.

Topic: ${topic.topic}
Role: ${topic.role}
Level: ${topic.level}
Category: ${topic.category}
Technology: ${topic.technology || "General"}
Question type: ${topic.question_type}

Return only JSON with these fields:
question, excerpt, short_answer, expert_answer, speaking_blueprint, common_mistakes, follow_up_questions.

Rules:
- English only.
- The question must sound like a real interview question.
- Avoid generic AI introductions and textbook filler.
- short_answer: 90-150 words, directly usable in an interview.
- expert_answer: 500-850 words, practical, with decisions, trade-offs, risks, evidence, and collaboration.
- speaking_blueprint: a natural 2-3 minute response using [The Hook], [The Core Execution], and [The Punchline].
- common_mistakes: 4-6 specific mistakes.
- follow_up_questions: 2-5 realistic interviewer follow-ups.
- Do not claim a company asks this question unless a source explicitly says so.
- Do not create multiple questions in one article.`;
}

async function main() {
  const remote = requireRemoteConfirmation(process.argv.slice(2));
  const rows = runD1(
    `SELECT id, topic, role, level, category, technology, question_type, source
     FROM topic_queue
     WHERE status = 'approved'
     ORDER BY priority DESC, created_at ASC
     LIMIT 1`,
    remote
  ) as QueueTopic[];

  const topic = rows[0];
  if (!topic) {
    console.log("No approved topic found.");
    return;
  }

  runD1(`UPDATE topic_queue SET status = 'generating', updated_at = CURRENT_TIMESTAMP WHERE id = ${sqlText(topic.id)}`, remote);

  try {
    const genAI = new GoogleGenerativeAI(readApiKey());
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.35,
        topP: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      } as never
    });

    const result = await model.generateContent(prompt(topic));
    const draft = DraftSchema.parse(JSON.parse(result.response.text()));
    const fingerprint = normalizeQuestion(draft.question);
    const existing = runD1(
      `SELECT slug FROM interview_questions WHERE fingerprint = ${sqlText(fingerprint)} LIMIT 1`,
      remote
    ) as Array<{ slug: string }>;

    if (existing[0]) {
      runD1(
        `UPDATE topic_queue SET status = 'rejected', error_message = ${sqlText(`Duplicate of ${existing[0].slug}`)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${sqlText(topic.id)}`,
        remote
      );
      console.log(`Duplicate detected: ${existing[0].slug}`);
      return;
    }

    const slug = slugify(draft.question);
    const id = newId("question");
    const sql = `INSERT INTO interview_questions (
      id, slug, question, excerpt, short_answer, expert_answer, speaking_blueprint,
      common_mistakes, follow_up_questions, role, level, category, technology,
      question_type, status, quality_score, fingerprint, source, generated_by
    ) VALUES (
      ${sqlText(id)}, ${sqlText(slug)}, ${sqlText(draft.question)}, ${sqlText(draft.excerpt)},
      ${sqlText(draft.short_answer)}, ${sqlText(draft.expert_answer)}, ${sqlText(draft.speaking_blueprint)},
      ${sqlText(JSON.stringify(draft.common_mistakes))}, ${sqlText(JSON.stringify(draft.follow_up_questions))},
      ${sqlText(topic.role)}, ${sqlText(topic.level)}, ${sqlText(topic.category)}, ${sqlText(topic.technology)},
      ${sqlText(topic.question_type)}, 'draft', 0, ${sqlText(fingerprint)}, ${sqlText(topic.source)},
      ${sqlText(process.env.GEMINI_MODEL || "gemini-2.5-flash")}
    );
    UPDATE topic_queue SET status = 'generated', updated_at = CURRENT_TIMESTAMP WHERE id = ${sqlText(topic.id)};`;

    runD1(sql, remote);
    console.log(`Draft created: ${slug}`);
  } catch (error) {
    runD1(
      `UPDATE topic_queue SET status = 'failed', error_message = ${sqlText(error instanceof Error ? error.message : String(error))}, updated_at = CURRENT_TIMESTAMP WHERE id = ${sqlText(topic.id)}`,
      remote
    );
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
