import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireRemoteConfirmation, runD1, sqlText } from "./shared";

const ReviewSchema = z.object({
  technical_accuracy: z.number().int().min(0).max(100),
  interview_relevance: z.number().int().min(0).max(100),
  memorisability: z.number().int().min(0).max(100),
  speakability: z.number().int().min(0).max(100),
  concision: z.number().int().min(0).max(100),
  clarity: z.number().int().min(0).max(100),
  spam_risk: z.number().int().min(0).max(100),
  unsupported_claims: z.array(z.string()).max(8),
  issues: z.array(z.string()).max(10),
  recommendation: z.enum(["approve", "review", "reject"])
});

type Draft = {
  id:string; slug:string; question:string; short_answer:string; expert_answer:string;
  speaking_blueprint:string; real_world_example:string|null; role:string; level:string;
  category:string; technology:string|null; similarity_score:number;
};
function apiKey(){const key=process.env.GEMINI_API_KEY||process.env.GEMINI_API_KEYS?.split(",")[0]?.trim();if(!key)throw new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS.");return key;}
function extractJson(text:string){let x=text.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");const a=x.indexOf("{");const b=x.lastIndexOf("}");return a>=0&&b>a?x.slice(a,b+1):x;}
function score(value:unknown){const n=typeof value==="number"?value:Number.parseFloat(String(value??"").replace(/[^0-9.-]/g,""));return Math.max(0,Math.min(100,Math.round(Number.isFinite(n)?n:0)));}
function list(value:unknown,max:number){if(Array.isArray(value))return value.map(String).map(x=>x.trim()).filter(Boolean).slice(0,max);const text=String(value??"").trim();if(!text||/^(none|n\/a|null)$/i.test(text))return[];try{const x=JSON.parse(text);if(Array.isArray(x))return x.map(String).slice(0,max);}catch{}return text.split(/\n+|;|\|/).map(x=>x.replace(/^[-*•\d.)\s]+/,"").trim()).filter(Boolean).slice(0,max);}
function recommendation(value:unknown):"approve"|"review"|"reject"{const x=String(value??"").toLowerCase();if(x.includes("reject")||x.includes("fail"))return"reject";if(x.includes("approve")||x.includes("pass")||x.includes("publish"))return"approve";return"review";}
function normalize(value:unknown){const x=value&&typeof value==="object"?value as Record<string,unknown>:{};return{technical_accuracy:score(x.technical_accuracy),interview_relevance:score(x.interview_relevance),memorisability:score(x.memorisability),speakability:score(x.speakability),concision:score(x.concision),clarity:score(x.clarity),spam_risk:score(x.spam_risk),unsupported_claims:list(x.unsupported_claims,8),issues:list(x.issues,10),recommendation:recommendation(x.recommendation)};}
function words(value:string){return value.trim().split(/\s+/).filter(Boolean).length;}

async function main(){
  const remote=requireRemoteConfirmation(process.argv.slice(2));
  const rows=runD1(`SELECT id,slug,question,short_answer,expert_answer,speaking_blueprint,real_world_example,role,level,category,technology,similarity_score FROM interview_questions WHERE status='draft' AND quality_score=0 ORDER BY created_at ASC LIMIT 1`,remote) as Draft[];
  const draft=rows[0];if(!draft){console.log("No unreviewed draft found.");return;}
  const shortWords=words(draft.short_answer);const mainWords=words(draft.expert_answer);
  const model=new GoogleGenerativeAI(apiKey()).getGenerativeModel({model:process.env.GEMINI_REVIEW_MODEL||process.env.GEMINI_MODEL||"gemini-2.5-flash",generationConfig:{temperature:.02,responseMimeType:"application/json",maxOutputTokens:4096} as never});
  const prompt=`You are reviewing a QA interview answer product designed for memorisation, not deep study.

Question: ${draft.question}
Role/level: ${draft.role} / ${draft.level}
Short answer (${shortWords} words): ${draft.short_answer}
Main answer (${mainWords} words): ${draft.expert_answer}
Memory cues: ${draft.speaking_blueprint}
Optional example: ${draft.real_world_example||"None"}
Similarity: ${draft.similarity_score}

Return JSON only with: technical_accuracy, interview_relevance, memorisability, speakability, concision, clarity, spam_risk, unsupported_claims, issues, recommendation.

Judge the content by these rules:
- The candidate should be able to memorise and speak the main answer directly.
- short_answer should be about 60–100 words.
- main answer should be about 180–380 words and take no more than 1–3 minutes.
- It must sound natural in first person, answer immediately, and avoid lecture-style explanations.
- Memory cues should be four short cues, not paragraphs.
- Reject unnecessary repetition, long definitions, excessive lists, unsupported claims, or content that sounds written rather than spoken.
- Scores must be JSON numbers. Arrays must be arrays. recommendation must be approve, review, or reject.`;
  const result=await model.generateContent(prompt);const review=ReviewSchema.parse(normalize(JSON.parse(extractJson(result.response.text()))));
  const lengthOk=shortWords>=55&&shortWords<=115&&mainWords>=160&&mainWords<=410;
  const weighted=Math.round(review.technical_accuracy*.22+review.interview_relevance*.18+review.memorisability*.20+review.speakability*.18+review.concision*.12+review.clarity*.10-review.spam_risk*.20);
  const finalScore=Math.max(0,Math.min(100,weighted));
  const pass=!review.unsupported_claims.length&&lengthOk&&draft.similarity_score<.72&&review.recommendation!=="reject"&&review.memorisability>=85&&review.speakability>=85&&review.concision>=80&&finalScore>=85;
  const status=pass?"review":"rejected";
  runD1(`UPDATE interview_questions SET status=${sqlText(status)},quality_score=${finalScore},reviewer_notes=${sqlText(JSON.stringify({...review,short_words:shortWords,main_words:mainWords,length_ok:lengthOk}))},reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(draft.id)}`,remote);
  console.log(`${draft.slug}: ${status} (${finalScore}/100, ${mainWords} words)`);
}
main().catch((error)=>{console.error(error);process.exit(1);});
