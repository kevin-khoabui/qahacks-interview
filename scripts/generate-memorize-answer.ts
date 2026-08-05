import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { newId, normalizeQuestion, requireRemoteConfirmation, runD1, slugify, sqlText } from "./shared";

const DraftSchema = z.object({
  question: z.string().min(20),
  excerpt: z.string().min(80).max(220),
  short_answer: z.string().min(280).max(850),
  expert_answer: z.string().min(850).max(2600),
  speaking_blueprint: z.string().min(120).max(700),
  common_mistakes: z.array(z.string().min(15)).length(3),
  follow_up_questions: z.array(z.string().min(10)).length(3),
  interviewer_evaluates: z.array(z.string().min(15)).length(3),
  real_world_example: z.string().min(180).max(900),
  strong_signals: z.array(z.string().min(15)).length(4),
  related_questions: z.array(z.string().min(15)).length(3),
  estimated_answer_time: z.number().int().min(1).max(3)
});

type QueueTopic = {
  id: string; topic: string; role: string; level: string; category: string;
  technology: string | null; question_type: string; source: string | null;
  cluster: string | null; intent: string | null; unique_angle: string | null;
  must_cover: string; must_avoid: string;
};
type ExistingQuestion = { slug: string; question: string };
type JsonRecord = Record<string, unknown>;

function apiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.split(",")[0]?.trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS.");
  return key;
}
function parseList(value: string) { try { const x = JSON.parse(value); return Array.isArray(x) ? x : []; } catch { return []; } }
function extractJson(text: string) {
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}
function asString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(String).join("\n").trim();
  return value == null ? "" : String(value).trim();
}
function asArray(value: unknown) {
  if (Array.isArray(value)) return value.map(asString).filter(Boolean);
  const text = asString(value);
  if (!text) return [];
  try { const x = JSON.parse(text); if (Array.isArray(x)) return x.map(asString).filter(Boolean); } catch {}
  return text.split(/\n+|;|\|/).map((x) => x.replace(/^[-*•\d.)\s]+/, "").trim()).filter(Boolean);
}
function exact(items: string[], count: number, fallback: string[]) {
  const out = [...items.filter(Boolean)];
  for (const item of fallback) if (out.length < count) out.push(item);
  return out.slice(0, count);
}
function trimAt(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1); const boundary = cut.lastIndexOf(" ");
  return `${cut.slice(0, boundary > max * .7 ? boundary : max - 1).trim()}.`;
}
function normalize(input: unknown): JsonRecord {
  const x = input && typeof input === "object" ? input as JsonRecord : {};
  const rawTime = Number.parseInt(asString(x.estimated_answer_time), 10);
  return {
    question: asString(x.question),
    excerpt: trimAt(asString(x.excerpt), 220),
    short_answer: trimAt(asString(x.short_answer), 850),
    expert_answer: trimAt(asString(x.expert_answer), 2600),
    speaking_blueprint: trimAt(asString(x.speaking_blueprint), 700),
    common_mistakes: exact(asArray(x.common_mistakes), 3, ["Giving a vague answer.", "Listing tools without explaining the approach.", "Speaking longer than the interviewer needs."]),
    follow_up_questions: exact(asArray(x.follow_up_questions), 3, ["Can you give a concrete example?", "What trade-off would you consider?", "How would you measure success?"]),
    interviewer_evaluates: exact(asArray(x.interviewer_evaluates), 3, ["A clear practical process.", "Sound judgement and prioritisation.", "Concise communication."]),
    real_world_example: trimAt(asString(x.real_world_example), 900),
    strong_signals: exact(asArray(x.strong_signals), 4, ["Starts with a direct answer.", "Uses a simple structure.", "Includes one practical example.", "Ends with the outcome or decision."]),
    related_questions: exact(asArray(x.related_questions), 3, ["How would you apply this under time pressure?", "What is the biggest risk in this situation?", "How would you explain this to a stakeholder?"]),
    estimated_answer_time: Number.isFinite(rawTime) ? Math.max(1, Math.min(3, rawTime)) : 2
  };
}
function words(value: string) { return value.trim().split(/\s+/).filter(Boolean).length; }
function similarity(a: string, b: string) {
  const aa = new Set(normalizeQuestion(a).split(" ").filter((x) => x.length > 2));
  const bb = new Set(normalizeQuestion(b).split(" ").filter((x) => x.length > 2));
  const overlap = [...aa].filter((x) => bb.has(x)).length;
  return new Set([...aa, ...bb]).size ? overlap / new Set([...aa, ...bb]).size : 0;
}
function prompt(topic: QueueTopic) {
  return `You write memorisable interview answers for QA professionals. The reader may learn the answer by heart and speak it directly.

Question: ${topic.topic}
Role: ${topic.role}
Level: ${topic.level}
Category: ${topic.category}
Technology: ${topic.technology || "General"}
Unique angle: ${topic.unique_angle || "Give a practical, direct answer."}
Must cover: ${parseList(topic.must_cover).join("; ") || "approach, judgement, outcome"}
Must avoid: ${parseList(topic.must_avoid).join("; ") || "filler, repetition, lectures"}

Return one JSON object only with these exact keys: question, excerpt, short_answer, expert_answer, speaking_blueprint, common_mistakes, follow_up_questions, interviewer_evaluates, real_world_example, strong_signals, related_questions, estimated_answer_time.

The product goal is NOT deep study. The goal is to let a candidate quickly memorise a natural answer and speak for no more than 1–3 minutes.

Strict content rules:
- short_answer: 60–100 words. A complete 30–45 second answer that can be spoken exactly as written.
- expert_answer: 180–380 words. This is the MAIN memorisable answer. Use first-person interview language such as “I start by…”. No headings, no long lecture, no repeated conclusion.
- speaking_blueprint: exactly four short memory cues, one per line, formatted as “1. ...” through “4. ...”. Each cue must be 3–8 words.
- real_world_example: 60–120 words and optional in speech; keep it concrete and believable without invented metrics or company names.
- interviewer_evaluates: exactly 3 short items.
- strong_signals: exactly 4 short items.
- common_mistakes, follow_up_questions, related_questions: exactly 3 items each.
- estimated_answer_time: integer 1, 2, or 3 based on the main answer.
- English only. Plain natural language. Do not use markdown bold, tables, fake quotations, or textbook introductions.
- The answer must tell the candidate WHAT TO SAY, not teach a long lesson.

JSON rules: use correct JSON types, double quotes, no markdown fences, and no text outside the object.`;
}

async function generate(model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>, topic: QueueTopic) {
  let last = ""; let lastError: unknown;
  for (let i = 1; i <= 3; i++) {
    const result = await model.generateContent(i === 1 ? prompt(topic) : `${prompt(topic)}\nThe previous output failed validation. Regenerate from scratch and obey every word and type limit.`);
    last = result.response.text();
    try {
      const draft = DraftSchema.parse(normalize(JSON.parse(extractJson(last))));
      const shortWords = words(draft.short_answer); const mainWords = words(draft.expert_answer);
      if (shortWords < 55 || shortWords > 115) throw new Error(`short_answer has ${shortWords} words`);
      if (mainWords < 160 || mainWords > 410) throw new Error(`expert_answer has ${mainWords} words`);
      return draft;
    } catch (error) { lastError = error; console.warn(`Attempt ${i} failed: ${error instanceof Error ? error.message : String(error)}`); }
  }
  throw new Error(`Gemini failed concise-answer validation. Preview: ${last.replace(/\s+/g, " ").slice(0, 500)}. Error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function main() {
  const remote = requireRemoteConfirmation(process.argv.slice(2));
  const topics = runD1(`SELECT id,topic,role,level,category,technology,question_type,source,cluster,intent,unique_angle,must_cover,must_avoid FROM topic_queue WHERE status='approved' ORDER BY priority DESC,created_at ASC LIMIT 1`, remote) as QueueTopic[];
  const topic = topics[0]; if (!topic) { console.log("No approved topic found."); return; }
  const existing = runD1(`SELECT slug,question FROM interview_questions WHERE status NOT IN ('rejected','archived')`, remote) as ExistingQuestion[];
  const closest = existing.map((x) => ({ ...x, score: similarity(topic.topic, x.question) })).sort((a,b) => b.score-a.score)[0];
  if (closest?.score >= .72) {
    runD1(`UPDATE topic_queue SET status='rejected',error_message=${sqlText(`Duplicate risk ${closest.score.toFixed(2)}: ${closest.slug}`)},updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)}`, remote);
    console.log(`Topic rejected as similar to ${closest.slug}`); return;
  }
  runD1(`UPDATE topic_queue SET status='generating',updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)}`, remote);
  try {
    const model = new GoogleGenerativeAI(apiKey()).getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash", generationConfig: { temperature: .12, topP: .65, maxOutputTokens: 6144, responseMimeType: "application/json" } as never });
    const draft = await generate(model, topic);
    const similarityScore = Math.max(0, ...existing.map((x) => similarity(draft.question, x.question)));
    if (similarityScore >= .78) throw new Error(`Generated duplicate risk ${similarityScore.toFixed(2)}`);
    const id = newId("question"); const slug = slugify(draft.question); const fingerprint = normalizeQuestion(draft.question);
    runD1(`INSERT INTO interview_questions (id,slug,question,excerpt,short_answer,expert_answer,speaking_blueprint,common_mistakes,follow_up_questions,interviewer_evaluates,real_world_example,strong_signals,related_questions,estimated_answer_time,role,level,category,technology,question_type,status,quality_score,fingerprint,source,generated_by,cluster,unique_angle,similarity_score) VALUES (${sqlText(id)},${sqlText(slug)},${sqlText(draft.question)},${sqlText(draft.excerpt)},${sqlText(draft.short_answer)},${sqlText(draft.expert_answer)},${sqlText(draft.speaking_blueprint)},${sqlText(JSON.stringify(draft.common_mistakes))},${sqlText(JSON.stringify(draft.follow_up_questions))},${sqlText(JSON.stringify(draft.interviewer_evaluates))},${sqlText(draft.real_world_example)},${sqlText(JSON.stringify(draft.strong_signals))},${sqlText(JSON.stringify(draft.related_questions))},${draft.estimated_answer_time},${sqlText(topic.role)},${sqlText(topic.level)},${sqlText(topic.category)},${sqlText(topic.technology)},${sqlText(topic.question_type)},'draft',0,${sqlText(fingerprint)},${sqlText(topic.source)},${sqlText(process.env.GEMINI_MODEL || "gemini-2.5-flash")},${sqlText(topic.cluster)},${sqlText(topic.unique_angle)},${similarityScore}); UPDATE topic_queue SET status='generated',error_message=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)};`, remote);
    console.log(`Memorisable draft created: ${slug} (${words(draft.expert_answer)} words, ${draft.estimated_answer_time} min)`);
  } catch (error) {
    runD1(`UPDATE topic_queue SET status='failed',error_message=${sqlText(error instanceof Error ? error.message : String(error))},updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)}`, remote);
    throw error;
  }
}
main().catch((error) => { console.error(error); process.exit(1); });
