import Link from "next/link";
import { getPublishedQuestions } from "@/lib/db";

export const dynamic = "force-dynamic";

const filters = ["", "Manual QA", "Automation QA", "QA Lead", "Localization QA"];

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const role = params.role?.trim() ?? "";
  const questions = await getPublishedQuestions(search, 90);
  const filtered = role ? questions.filter((item) => item.role === role) : questions;

  return (
    <main>
      <section className="shell library-intro">
        <div className="library-copy">
          <div className="eyebrow">QAHacks interview library</div>
          <h1>QA interview questions with answers built for real conversations.</h1>
          <p>Concise answers, senior-level reasoning, speaking structures, common mistakes, and likely follow-up questions.</p>
        </div>
        <div className="library-stat">
          <strong>{filtered.length}</strong>
          <span>{search || role ? "matching questions" : "curated questions"}</span>
        </div>
      </section>

      <section className="shell discovery">
        <form className="search search-compact" action="/" method="get">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input name="q" defaultValue={search} placeholder="Search Playwright, API testing, QA Lead..." aria-label="Search interview questions" />
          {role && <input type="hidden" name="role" value={role} />}
          <button type="submit">Search</button>
        </form>

        <nav className="filters" aria-label="Filter interview questions">
          {filters.map((item) => {
            const active = item === role;
            const href = item ? `/?role=${encodeURIComponent(item)}${search ? `&q=${encodeURIComponent(search)}` : ""}` : search ? `/?q=${encodeURIComponent(search)}` : "/";
            return <Link className={active ? "filter active" : "filter"} href={href} key={item || "all"}>{item || "All questions"}</Link>;
          })}
        </nav>
      </section>

      <section className="shell section question-library">
        <div className="section-head">
          <div>
            <div className="eyebrow">Interview knowledge base</div>
            <h2>{search || role ? "Matching questions" : "Featured questions"}</h2>
          </div>
          {(search || role) && <Link className="clear-link" href="/">Clear filters</Link>}
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <strong>No questions matched your search.</strong>
            <p>Try a broader skill, tool, role, or interview topic.</p>
          </div>
        ) : (
          <div className="grid">
            {filtered.map((question, index) => (
              <Link className={index === 0 && !search && !role ? "card card-featured" : "card"} href={`/questions/${question.slug}`} key={question.id}>
                <div className="meta">
                  <span className="pill">{question.level}</span>
                  <span className="pill">{question.role}</span>
                  {question.technology && <span className="pill">{question.technology}</span>}
                </div>
                <h3>{question.question}</h3>
                <p>{question.excerpt}</p>
                <div className="card-footer">
                  <span>Read answer</span>
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
