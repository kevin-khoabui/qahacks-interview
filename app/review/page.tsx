import Link from "next/link";
import { FormattedContent } from "@/components/formatted-content";
import { getReviewQueue, isReviewAdmin } from "@/lib/review-admin";

export const dynamic = "force-dynamic";

function renderList(title: string, items: string[]) {
  if (!items.length) return null;
  return (
    <section className="review-block">
      <h3>{title}</h3>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

export default async function ReviewPage({
  searchParams
}: {
  searchParams: Promise<{ key?: string; result?: string }>;
}) {
  const params = await searchParams;
  const token = params.key ?? "";
  const allowed = await isReviewAdmin(token);

  if (!allowed) {
    return (
      <main className="shell review-admin">
        <div className="review-login">
          <span className="section-label">Private moderation</span>
          <h1>Review queue</h1>
          <p>Open this page with your private review key:</p>
          <code>/review?key=YOUR_REVIEW_ADMIN_TOKEN</code>
          <p className="review-muted">The page stays unavailable until the Cloudflare secret is configured.</p>
          <Link href="/">← Back to interview library</Link>
        </div>
      </main>
    );
  }

  const items = await getReviewQueue();

  return (
    <main className="shell review-admin">
      <header className="review-admin-header">
        <div>
          <span className="section-label">Private moderation</span>
          <h1>Daily article review</h1>
          <p>Read the generated article, then publish it or discard it. Leaving it untouched keeps it in this queue.</p>
        </div>
        <Link href="/">View public site →</Link>
      </header>

      {params.result && <div className="review-result">Article {params.result} successfully.</div>}

      {items.length === 0 ? (
        <div className="review-empty">
          <h2>No articles waiting</h2>
          <p>The daily GitHub Action will add one reviewed article when it passes the quality gate.</p>
        </div>
      ) : (
        <div className="review-queue">
          {items.map((item) => {
            const notes = item.reviewer_notes;
            const issues = Array.isArray(notes?.issues) ? notes.issues.filter((x): x is string => typeof x === "string") : [];
            return (
              <article className="review-card" key={item.slug}>
                <div className="review-card-top">
                  <div>
                    <div className="meta"><span className="pill">Score {item.quality_score}/100</span><span className="pill">{item.reviewed_at || "Recently reviewed"}</span></div>
                    <h2>{item.question}</h2>
                    <p className="lead">{item.excerpt}</p>
                  </div>
                </div>

                <section className="review-block review-highlight"><h3>Interview-ready answer</h3><FormattedContent value={item.short_answer} /></section>
                <section className="review-block"><h3>Expert answer</h3><FormattedContent value={item.expert_answer} className="review-prose formatted-content" /></section>
                {renderList("What the interviewer evaluates", item.interviewer_evaluates)}
                {item.real_world_example && <section className="review-block"><h3>Real-world example</h3><FormattedContent value={item.real_world_example} /></section>}
                <section className="review-block"><h3>Speaking blueprint</h3><FormattedContent value={item.speaking_blueprint} className="formatted-content" /></section>
                {renderList("Strong answer signals", item.strong_signals)}
                {renderList("Common mistakes", item.common_mistakes)}
                {renderList("Follow-up questions", item.follow_up_questions)}
                {renderList("Related questions", item.related_questions)}
                {issues.length > 0 && renderList("Reviewer issues", issues)}

                <div className="review-actions">
                  <form action="/api/review-decision" method="post">
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="slug" value={item.slug} />
                    <input type="hidden" name="decision" value="publish" />
                    <button className="review-publish" type="submit">Keep & publish</button>
                  </form>
                  <form action="/api/review-decision" method="post">
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="slug" value={item.slug} />
                    <input type="hidden" name="decision" value="discard" />
                    <button className="review-discard" type="submit">Discard</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
