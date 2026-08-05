import Link from "next/link";
import { getPublishedQuestions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const role = params.role?.trim() ?? "";
  const questions = await getPublishedQuestions(search, 90);
  const filtered = role ? questions.filter((item) => item.role === role) : questions;

  return (
    <main>
      <section className="shell hero">
        <div className="eyebrow">Curated QA interview knowledge base</div>
        <h1>Prepare smarter. Answer like a senior QA professional.</h1>
        <p>
          Practical interview questions, concise answers, deep technical explanations, and speaking blueprints for QA, SDET, automation, and quality leadership roles.
        </p>
        <form className="search" action="/" method="get">
          <input name="q" defaultValue={search} placeholder="Search Playwright, API testing, QA Lead..." aria-label="Search interview questions" />
          {role && <input type="hidden" name="role" value={role} />}
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="shell section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Interview library</div>
            <h2>{search || role ? "Matching questions" : "Featured questions"}</h2>
          </div>
          <p>{filtered.length} curated question{filtered.length === 1 ? "" : "s"}</p>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <strong>No published questions yet.</strong>
            <p>Apply the D1 migration and seed file, then refresh this page.</p>
          </div>
        ) : (
          <div className="grid">
            {filtered.map((question) => (
              <Link className="card" href={`/questions/${question.slug}`} key={question.id}>
                <div className="meta">
                  <span className="pill">{question.level}</span>
                  <span className="pill">{question.role}</span>
                  {question.technology && <span className="pill">{question.technology}</span>}
                </div>
                <h3>{question.question}</h3>
                <p>{question.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
