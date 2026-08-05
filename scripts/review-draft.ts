import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireRemoteConfirmation, runD1, sqlText } from "./shared";

const ReviewSchema = z.object({
  technical_accuracy: z.number().int().min(0).max(100),
  interview_relevance: z.number().int().min(0).max(100),
  specificity: z.number().int().min(0).max(100),
  clarity: z.number().int().min(0).max(100),
  spam_risk: z.number().int().min(0).max(100),
  issues: z.array(z.string()).max(10),
  recommendation: z.enum(["review", "reject"])
});

type Draft = {
  id: string;
  slug: string;
  question: string;
  excerpt: string;
  short_answer: string;
  expert_answer: string;
  speaking_blueprint: string;
  common_mistakes: string;
  follow_up_questions: string;
  role: string;
  level: string;
  category: string;
  technology: string | null;
};

function apiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.split(",")[0]?.trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS.");
  return key;
}

async function main() {
  const remote = requireRemoteConfirmation(process.argv.slice(2));
  const rows = runD1(
    `SELECT * FROM interview_questions WHERE status = 'draft' AND quality_score = 0 ORDER BY created_at ASC LIMIT 1`,
    remote
  ) as Draft[];

  const draft = rows[0];
  if (!draft) {
    console.log("No unreviewed draft found.");
    return;
  }

  const model = new GoogleGenerativeAI(apiKey()).getGenerativeModel({
    model: process.env.GEMINI_REVIEW_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      maxOutputTokens: 4096
    } as never
  });

  const prompt = `You are a strict senior QA content editor. Review this interview article.

Question: ${draft.question}
Role: ${draft.role}
Level: ${draft.level}
Category: ${draft.category}
Technology: ${draft.technology || "General"}
Excerpt: ${draft.excerpt}
Short answer: ${draft.short_answer}
Expert answer: ${draft.expert_answer}
Speaking blueprint: ${draft.speaking_blueprint}
Common mistakes: ${draft.common_mistakes}
Follow-up questions: ${draft.follow_up_questions}

Return only JSON with:
technical_accuracy, interview_relevance, specificity, clarity, spam_risk, issues, recommendation.

Reject content that is technically doubtful, repetitive, generic, padded, misleading, or not useful in a real interview. Use recommendation review only when a human should consider publishing it.`;

  const result = await model.generateContent(prompt);
  const review = ReviewSchema.parse(JSON.parse(result.response.text()));
  const quality = Math.round(
    review.technical_accuracy * 0.35 +
    review.interview_relevance * 0.25 +
    review.specificity * 0.2 +
    review.clarity * 0.2 -
    review.spam_risk * 0.25
  );
  const finalScore = Math.max(0, Math.min(100, quality));
  const status = review.recommendation === "review" && finalScore >= 80 ? "review" : "rejected";

  runD1(
    `UPDATE interview_questions SET
      status = ${sqlText(status)},
      quality_score = ${finalScore},
      reviewer_notes = ${sqlText(JSON.stringify(review))},
      reviewed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ${sqlText(draft.id)}`,
    remote
  );

  console.log(`${draft.slug}: ${status} (${finalScore}/100)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
