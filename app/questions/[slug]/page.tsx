import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormattedContent } from "@/components/formatted-content";
import { getPublishedQuestion } from "@/lib/db";

export const dynamic = "force-dynamic";

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

  return (
    <main className="shell article">
      <article className="article-main">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Interview library</Link><span>/</span><span>{question.role}</span><span>/</span><span>{question.category}</span></nav>
        <header className="question-header">
          <div className="meta"><span className="pill">{question.level}</span><span className="pill">{question.role}</span>{question.technology && <span className="pill">{question.technology}</span>}</div>
          <h1>{question.question}</h1><p className="lead">{question.excerpt}</p>
          <div className="question-facts"><div><span>Target</span><strong>{question.estimated_answer_time} min</strong></div><div><span>Format</span><strong>Memorise & speak</strong></div><div><span>Quality</span><strong>{question.quality_score}/100</strong></div></div>
        </header>

        <section className="answer-highlight" id="short-answer"><div className="section-label">Quick version</div><h2>30-second answer</h2><FormattedContent value={question.short_answer} /></section>
        <section className="content-section main-memorise-answer" id="main-answer"><div className="section-label">Learn this answer</div><h2>1–3 minute answer</h2><FormattedContent value={question.expert_answer} className="prose formatted-content" /></section>
        <section className="content-section memory-cues" id="memory-cues"><div className="section-label">Remember only four things</div><h2>Memory cues</h2><FormattedContent value={question.speaking_blueprint} className="formatted-content" /></section>

        <details className="article-details">
          <summary>Optional interview notes</summary>
          {question.real_world_example && <section className="content-section"><div className="section-label">Use only when asked</div><h2>Real-world example</h2><div className="example-card"><FormattedContent value={question.real_world_example} /></div></section>}
          {question.interviewer_evaluates.length > 0 && <section className="content-section"><h2>What the interviewer evaluates</h2><div className="signal-grid">{question.interviewer_evaluates.map((item) => <div className="signal-item" key={item}><b>✓</b><span>{item}</span></div>)}</div></section>}
          {question.common_mistakes.length > 0 && <section className="content-section"><h2>Common mistakes</h2><div className="mistake-list">{question.common_mistakes.map((mistake, index) => <div className="mistake-item" key={mistake}><span>{index + 1}</span><p>{mistake}</p></div>)}</div></section>}
          {question.follow_up_questions.length > 0 && <section className="content-section"><h2>Likely follow-up questions</h2><div className="follow-up-list">{question.follow_up_questions.map((item) => <div className="follow-up" key={item}><span>→</span><p>{item}</p></div>)}</div></section>}
        </details>

        <div className="article-end"><Link href="/#questions">← Browse more interview questions</Link></div>
      </article>
      <aside className="aside"><div className="aside-group"><strong>Use this page</strong><a href="#short-answer">30-second answer</a><a href="#main-answer">1–3 minute answer</a><a href="#memory-cues">Memory cues</a></div><div className="aside-card"><span>Goal</span><strong>Say it naturally</strong><p>Learn the main answer, remember the four cues, and stop within three minutes.</p></div></aside>
    </main>
  );
}
