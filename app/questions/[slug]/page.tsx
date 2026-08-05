import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedQuestion } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const question = await getPublishedQuestion(slug);
  if (!question) return { title: "Question not found" };
  return {
    title: question.question,
    description: question.excerpt,
    alternates: { canonical: `/questions/${question.slug}` }
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const question = await getPublishedQuestion(slug);
  if (!question) notFound();

  return (
    <main className="shell article">
      <article className="article-main">
        <Link className="back" href="/">← Back to interview library</Link>
        <div className="meta" style={{ marginTop: 28 }}>
          <span className="pill">{question.level}</span>
          <span className="pill">{question.role}</span>
          <span className="pill">{question.category}</span>
          {question.technology && <span className="pill">{question.technology}</span>}
        </div>
        <h1>{question.question}</h1>
        <p className="lead">{question.excerpt}</p>

        <section className="block" id="short-answer">
          <h2>Interview-ready answer</h2>
          <p>{question.short_answer}</p>
        </section>

        <section className="block" id="expert-answer">
          <h2>Expert answer</h2>
          {question.expert_answer.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>

        <section className="block" id="speaking-blueprint">
          <h2>Speaking blueprint</h2>
          {question.speaking_blueprint.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>

        <section className="block" id="common-mistakes">
          <h2>Common mistakes</h2>
          <ul>{question.common_mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
        </section>

        {question.follow_up_questions.length > 0 && (
          <section className="block" id="follow-ups">
            <h2>Likely follow-up questions</h2>
            <ul>{question.follow_up_questions.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        )}
      </article>

      <aside className="aside">
        <strong>On this page</strong>
        <a href="#short-answer"><span>Interview-ready answer</span></a>
        <a href="#expert-answer"><span>Expert answer</span></a>
        <a href="#speaking-blueprint"><span>Speaking blueprint</span></a>
        <a href="#common-mistakes"><span>Common mistakes</span></a>
        <span>Quality score: {question.quality_score}/100</span>
      </aside>
    </main>
  );
}
