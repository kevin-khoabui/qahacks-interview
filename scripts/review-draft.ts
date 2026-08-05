import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireRemoteConfirmation, runD1, sqlText } from "./shared";

const ReviewSchema=z.object({technical_accuracy:z.number().int().min(0).max(100),interview_relevance:z.number().int().min(0).max(100),specificity:z.number().int().min(0).max(100),originality:z.number().int().min(0).max(100),structure:z.number().int().min(0).max(100),clarity:z.number().int().min(0).max(100),spam_risk:z.number().int().min(0).max(100),unsupported_claims:z.array(z.string()).max(10),issues:z.array(z.string()).max(12),recommendation:z.enum(["approve","review","reject"])});

type Draft={id:string;slug:string;question:string;excerpt:string;short_answer:string;expert_answer:string;speaking_blueprint:string;common_mistakes:string;follow_up_questions:string;interviewer_evaluates:string;real_world_example:string|null;strong_signals:string;related_questions:string;role:string;level:string;category:string;technology:string|null;similarity_score:number};
function apiKey(){const key=process.env.GEMINI_API_KEY||process.env.GEMINI_API_KEYS?.split(",")[0]?.trim();if(!key)throw new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS.");return key;}

async function main(){
  const remote=requireRemoteConfirmation(process.argv.slice(2));
  const rows=runD1(`SELECT * FROM interview_questions WHERE status='draft' AND quality_score=0 ORDER BY created_at ASC LIMIT 1`,remote) as Draft[];
  const draft=rows[0];if(!draft){console.log("No unreviewed draft found.");return;}
  const model=new GoogleGenerativeAI(apiKey()).getGenerativeModel({model:process.env.GEMINI_REVIEW_MODEL||process.env.GEMINI_MODEL||"gemini-2.5-flash",generationConfig:{temperature:.05,responseMimeType:"application/json",maxOutputTokens:6144} as never});
  const prompt=`You are a strict independent senior QA editor. Review this article for publication in QAHacks Interview Library.

Question: ${draft.question}
Role/level: ${draft.role} / ${draft.level}
Category/technology: ${draft.category} / ${draft.technology||"General"}
Excerpt: ${draft.excerpt}
Short answer: ${draft.short_answer}
Expert answer: ${draft.expert_answer}
Speaking blueprint: ${draft.speaking_blueprint}
Interviewer evaluates: ${draft.interviewer_evaluates}
Real-world example: ${draft.real_world_example}
Strong signals: ${draft.strong_signals}
Common mistakes: ${draft.common_mistakes}
Follow-ups: ${draft.follow_up_questions}
Related questions: ${draft.related_questions}
Computed similarity: ${draft.similarity_score}

Return only JSON: technical_accuracy, interview_relevance, specificity, originality, structure, clarity, spam_risk, unsupported_claims, issues, recommendation.
Reject padded, repetitive, generic, misleading, doubtful, keyword-stuffed, near-duplicate, or non-speakable content. Approve only content that is concrete, useful, original, technically careful, and supported by a realistic example.`;
  const result=await model.generateContent(prompt);const review=ReviewSchema.parse(JSON.parse(result.response.text()));
  const weighted=Math.round(review.technical_accuracy*.25+review.interview_relevance*.20+review.specificity*.20+review.originality*.15+review.structure*.10+review.clarity*.10-review.spam_risk*.25);
  const score=Math.max(0,Math.min(100,weighted));
  const hasUnsupported=review.unsupported_claims.length>0;let status="rejected";
  if(!hasUnsupported&&review.recommendation==="approve"&&score>=90&&draft.similarity_score<.72)status="review";
  else if(!hasUnsupported&&review.recommendation!=="reject"&&score>=85&&draft.similarity_score<.72)status="review";
  runD1(`UPDATE interview_questions SET status=${sqlText(status)},quality_score=${score},reviewer_notes=${sqlText(JSON.stringify(review))},reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(draft.id)}`,remote);
  console.log(`${draft.slug}: ${status} (${score}/100)`);
}
main().catch((error)=>{console.error(error);process.exit(1);});
