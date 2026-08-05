import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { newId, normalizeQuestion, requireRemoteConfirmation, runD1, slugify, sqlText } from "./shared";

const DraftSchema = z.object({
  question: z.string().min(20),
  excerpt: z.string().min(80).max(260),
  short_answer: z.string().min(120),
  expert_answer: z.string().min(900),
  speaking_blueprint: z.string().min(300),
  common_mistakes: z.array(z.string().min(20)).min(4).max(6),
  follow_up_questions: z.array(z.string().min(10)).min(3).max(5),
  interviewer_evaluates: z.array(z.string().min(15)).min(3).max(6),
  real_world_example: z.string().min(300),
  strong_signals: z.array(z.string().min(15)).min(3).max(6),
  related_questions: z.array(z.string().min(15)).min(3).max(6),
  estimated_answer_time: z.number().int().min(2).max(8)
});

type QueueTopic = {
  id:string; topic:string; role:string; level:string; category:string; technology:string|null;
  question_type:string; source:string|null; cluster:string|null; intent:string|null;
  unique_angle:string|null; must_cover:string; must_avoid:string;
};

type ExistingQuestion = { slug:string; question:string; cluster:string|null };

function readApiKey(){const key=process.env.GEMINI_API_KEY||process.env.GEMINI_API_KEYS?.split(",")[0]?.trim();if(!key)throw new Error("Missing GEMINI_API_KEY or GEMINI_API_KEYS.");return key;}
function parseList(value:string){try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[];}catch{return[];}}
function tokens(value:string){return new Set(normalizeQuestion(value).split(" ").filter((x)=>x.length>2));}
function similarity(a:string,b:string){const aa=tokens(a),bb=tokens(b);const intersection=[...aa].filter((x)=>bb.has(x)).length;const union=new Set([...aa,...bb]).size;return union?intersection/union:0;}

function prompt(topic:QueueTopic){
  return `You are a senior QA engineering leader and interview coach writing one original QAHacks Interview Library article.

Approved question: ${topic.topic}
Role: ${topic.role}
Level: ${topic.level}
Category: ${topic.category}
Technology: ${topic.technology||"General"}
Question type: ${topic.question_type}
Intent: ${topic.intent||"Practical interview preparation"}
Unique angle: ${topic.unique_angle||"Use concrete decisions, evidence, risks, and trade-offs."}
Must cover: ${parseList(topic.must_cover).join("; ")||"risk, evidence, execution, communication"}
Must avoid: ${parseList(topic.must_avoid).join("; ")||"generic filler, unsupported claims, repetition"}

Return only JSON with: question, excerpt, short_answer, expert_answer, speaking_blueprint, common_mistakes, follow_up_questions, interviewer_evaluates, real_world_example, strong_signals, related_questions, estimated_answer_time.

Rules:
- English only. Keep the approved question intent; do not broaden into multiple questions.
- short_answer: concise and directly speakable in an interview.
- expert_answer: 500-850 words with practical decisions, trade-offs, risks, evidence, and collaboration.
- speaking_blueprint: [The Hook], [The Core Execution], [The Punchline].
- real_world_example: one concrete scenario with context, action, evidence, and outcome; no invented company names or statistics.
- interviewer_evaluates and strong_signals must be specific to this question.
- related_questions must be adjacent but clearly distinct questions.
- Avoid textbook definitions, repeated conclusions, fake certainty, buzzwords, and generic AI introductions.`;
}

async function main(){
  const remote=requireRemoteConfirmation(process.argv.slice(2));
  const rows=runD1(`SELECT id,topic,role,level,category,technology,question_type,source,cluster,intent,unique_angle,must_cover,must_avoid FROM topic_queue WHERE status='approved' ORDER BY priority DESC,created_at ASC LIMIT 1`,remote) as QueueTopic[];
  const topic=rows[0];if(!topic){console.log("No approved topic found.");return;}
  const existing=runD1(`SELECT slug,question,cluster FROM interview_questions WHERE status NOT IN ('rejected','archived')`,remote) as ExistingQuestion[];
  const closest=existing.map((item)=>({...item,score:similarity(topic.topic,item.question)})).sort((a,b)=>b.score-a.score)[0];
  if(closest&&closest.score>=0.72){runD1(`UPDATE topic_queue SET status='rejected',error_message=${sqlText(`Pre-generation duplicate risk ${closest.score.toFixed(2)}: ${closest.slug}`)},updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)}`,remote);console.log(`Topic rejected as too similar to ${closest.slug}`);return;}
  runD1(`UPDATE topic_queue SET status='generating',updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)}`,remote);
  try{
    const model=new GoogleGenerativeAI(readApiKey()).getGenerativeModel({model:process.env.GEMINI_MODEL||"gemini-2.5-flash",generationConfig:{temperature:.28,topP:.8,maxOutputTokens:12288,responseMimeType:"application/json"} as never});
    const result=await model.generateContent(prompt(topic));const draft=DraftSchema.parse(JSON.parse(result.response.text()));
    const fingerprint=normalizeQuestion(draft.question);const postSimilarity=Math.max(0,...existing.map((item)=>similarity(draft.question,item.question)));
    if(postSimilarity>=.78){runD1(`UPDATE topic_queue SET status='rejected',error_message=${sqlText(`Generated duplicate risk ${postSimilarity.toFixed(2)}`)},updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)}`,remote);console.log("Generated draft rejected for similarity.");return;}
    const slug=slugify(draft.question);const id=newId("question");
    const sql=`INSERT INTO interview_questions (id,slug,question,excerpt,short_answer,expert_answer,speaking_blueprint,common_mistakes,follow_up_questions,interviewer_evaluates,real_world_example,strong_signals,related_questions,estimated_answer_time,role,level,category,technology,question_type,status,quality_score,fingerprint,source,generated_by,cluster,unique_angle,similarity_score) VALUES (${sqlText(id)},${sqlText(slug)},${sqlText(draft.question)},${sqlText(draft.excerpt)},${sqlText(draft.short_answer)},${sqlText(draft.expert_answer)},${sqlText(draft.speaking_blueprint)},${sqlText(JSON.stringify(draft.common_mistakes))},${sqlText(JSON.stringify(draft.follow_up_questions))},${sqlText(JSON.stringify(draft.interviewer_evaluates))},${sqlText(draft.real_world_example)},${sqlText(JSON.stringify(draft.strong_signals))},${sqlText(JSON.stringify(draft.related_questions))},${draft.estimated_answer_time},${sqlText(topic.role)},${sqlText(topic.level)},${sqlText(topic.category)},${sqlText(topic.technology)},${sqlText(topic.question_type)},'draft',0,${sqlText(fingerprint)},${sqlText(topic.source)},${sqlText(process.env.GEMINI_MODEL||"gemini-2.5-flash")},${sqlText(topic.cluster)},${sqlText(topic.unique_angle)},${postSimilarity}); UPDATE topic_queue SET status='generated',updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)};`;
    runD1(sql,remote);console.log(`Rich draft created: ${slug}`);
  }catch(error){runD1(`UPDATE topic_queue SET status='failed',error_message=${sqlText(error instanceof Error?error.message:String(error))},updated_at=CURRENT_TIMESTAMP WHERE id=${sqlText(topic.id)}`,remote);throw error;}
}
main().catch((error)=>{console.error(error);process.exit(1);});
