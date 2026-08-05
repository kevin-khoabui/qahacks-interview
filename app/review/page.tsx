import Link from "next/link";
import { FormattedContent } from "@/components/formatted-content";
import { getReviewQueue, isReviewAdmin } from "@/lib/review-admin";

export const dynamic = "force-dynamic";

function renderList(title: string, items: string[]) {
  if (!items.length) return null;
  return <section className="review-block"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ key?: string; result?: string }> }) {
  const params = await searchParams;
  const token = params.key ?? "";
  const allowed = await isReviewAdmin(token);

  if (!allowed) {
    return <main className="shell review-admin"><div className="review-login"><span className="section-label">Private moderation</span><h1>Review queue</h1><p>Open this page with your private review key:</p><code>/review?key=YOUR_REVIEW_ADMIN_TOKEN</code><p className="review-muted">The page stays unavailable until the Cloudflare secret is configured.</p><Link href="/">← Back to interview library</Link></div></main>;
  }

  const items = await getReviewQueue();
  return (
    <main className="shell review-admin">
      <header className="review-admin-header"><div><span className="section-label">Private moderation</span><h1>Daily answer review</h1><p>Judge one thing first: can a candidate memorise this and answer naturally in 1–3 minutes?</p></div><Link href="/">View public site →</Link></header>
      {params.result && <div className="review-result">Article {params.result} successfully.</div>}
      {items.length === 0 ? <div className="review-empty"><h2>No answers waiting</h2><p>The daily pipeline will add one answer after it passes the speaking-length quality gate.</p></div> : (
        <div className="review-queue">{items.map((item) => {
          const notes = item.reviewer_notes;
          const issues = Array.isArray(notes?.issues) ? notes.issues.filter((x): x is string => typeof x === "string") : [];
          return (
            <article className="review-card" key={item.slug}>
              <div className="meta"><span className="pill">Score {item.quality_score}/100</span><span className="pill">Target {item.estimated_answer_time} min</span><span className="pill">{item.reviewed_at || "Recently reviewed"}</span></div>
              <h2>{item.question}</h2><p className="lead">{item.excerpt}</p>
              <section className="review-block review-highlight"><h3>30-second answer</h3><FormattedContent value={item.short_answer} /></section>
              <section className="review-block review-main-answer"><h3>Main answer to memorise · 1–3 minutes</h3><FormattedContent value={item.expert_answer} className="review-prose formatted-content" /></section>
              <section className="review-block review-memory"><h3>Four memory cues</h3><FormattedContent value={item.speaking_blueprint} className="formatted-content" /></section>
              {item.real_world_example && <details className="review-details"><summary>Optional example and interview notes</summary><section className="review-block"><h3>Real-world example</h3><FormattedContent value={item.real_world_example} /></section>{renderList("What the interviewer evaluates", item.interviewer_evaluates)}{renderList("Strong answer signals", item.strong_signals)}{renderList("Common mistakes", item.common_mistakes)}{renderList("Follow-up questions", item.follow_up_questions)}{renderList("Related questions", item.related_questions)}{issues.length > 0 && renderList("Reviewer issues", issues)}</details>}
              <div className="review-actions"><form action="/api/review-decision" method="post"><input type="hidden" name="token" value={token} /><input type="hidden" name="slug" value={item.slug} /><input type="hidden" name="decision" value="publish" /><button className="review-publish" type="submit">Keep & publish</button></form><form action="/api/review-decision" method="post"><input type="hidden" name="token" value={token} /><input type="hidden" name="slug" value={item.slug} /><input type="hidden" name="decision" value="discard" /><button className="review-discard" type="submit">Discard</button></form></div>
            </article>
          );
        })}</div>
      )}
    </main>
  );
}
