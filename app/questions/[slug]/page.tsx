import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormattedContent } from "@/components/formatted-content";
import { getPublishedQuestion } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseMemoryCues(value: string) {
  const normalized = value.replace(/\\n/g, "\n").trim();
  const bracketMatches = [...normalized.matchAll(/\[([^\]]+)\]\s*([^[]+)/g)].map((match) => ({
    title: match[1].replace(/^The\s+/i, "").trim(),
    text: match[2].trim()
  }));

  if (bracketMatches.length > 0) return bracketMatches.slice(0, 4);

  return normalized
    .split(/\n{2,}|\n(?=\d+[.)]\s|[-•]\s)/)
    .map((item, index) => ({
      title: `Cue ${index + 1}`,
      text: item.replace(/^\d+[.)]\s*|^[-•]\s*/, "").trim()
    }))
    .filter((item) => item.text)
    .slice(0, 4);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const question = await getPublishedQuestion(slug);
  if (!question) return { title: "Question not found" };
  return { title: question.question, description: question.excerpt, alternates: { canonical: `/questions/${question.slug}` } };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const question = await getPublishedQuestion(slug);
  if (!question) notFound();
  const memoryCues = parseMemoryCues(question.speaking_blueprint);

  return (
    <main className="shell answer-page">
      <article className="answer-page-main">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Interview library</Link><span>/</span><span>{question.role}</span><span>/</span><span>{question.category}</span></nav>

        <header className="answer-hero">
          <div className="meta"><span className="pill">{question.level}</span><span className="pill">{question.role}</span>{question.technology && <span className="pill">{question.technology}</span>}</div>
          <h1>{question.question}</h1>
          <p>{question.excerpt}</p>
          <div className="answer-meta-row">
            <span><b>{question.estimated_answer_time} min</b> target</span>
            <span><b>Learn</b> the main answer</span>
            <span><b>Recall</b> four cues</span>
          </div>
        </header>

        <section className="answer-card answer-card-quick" id="short-answer">
          <div className="answer-card-heading"><span>Quick version</span><strong>30 seconds</strong></div>
          <h2>Say this when they want a short answer</h2>
          <FormattedContent value={question.short_answer} />
        </section>

        <section className="answer-card answer-card-main" id="main-answer">
          <div className="answer-card-heading"><span>Main answer</span><strong>1–3 minutes</strong></div>
          <h2>Learn this answer</h2>
          <FormattedContent value={question.expert_answer} className="formatted-content memorise-copy" />
        </section>

        <section className="memory-section" id="memory-cues">
          <div className="section-label">Recall without memorising every word</div>
          <h2>Four memory cues</h2>
          <div className="memory-grid">
            {memoryCues.map((cue, index) => (
              <article className="memory-card" key={`${cue.title}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{cue.title}</h3>
                <p>{cue.text}</p>
              </article>
            ))}
          </div>
        </section>

        <details className="article-details compact-details">
          <summary>Optional interview notes</summary>
          {question.real_world_example && <section className="content-section"><div className="section-label">Use only when asked for an example</div><h2>Real-world example</h2><div className="example-card"><FormattedContent value={question.real_world_example} /></div></section>}
          {question.interviewer_evaluates.length > 0 && <section className="content-section"><h2>What the interviewer evaluates</h2><div className="signal-grid">{question.interviewer_evaluates.map((item) => <div className="signal-item" key={item}><b>✓</b><span>{item}</span></div>)}</div></section>}
          {question.common_mistakes.length > 0 && <section className="content-section"><h2>Common mistakes</h2><div className="mistake-list">{question.common_mistakes.map((mistake, index) => <div className="mistake-item" key={mistake}><span>{index + 1}</span><p>{mistake}</p></div>)}</div></section>}
          {question.follow_up_questions.length > 0 && <section className="content-section"><h2>Likely follow-up questions</h2><div className="follow-up-list">{question.follow_up_questions.map((item) => <div className="follow-up" key={item}><span>→</span><p>{item}</p></div>)}</div></section>}
        </details>

        <div className="article-end"><Link href="/#questions">← Browse more interview questions</Link></div>
      </article>

      <aside className="answer-sidebar">
        <div className="answer-sidebar-card">
          <span>How to use this</span>
          <strong>Read → repeat → recall</strong>
          <p>Read the main answer twice. Then use the four cues to say it naturally without looking.</p>
          <a href="#short-answer">30-second answer</a>
          <a href="#main-answer">Main answer</a>
          <a href="#memory-cues">Four cues</a>
        </div>
      </aside>
    </main>
  );
}
