import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./brand.css";
import "./answer-page.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://interview.qahacks.com"),
  title: {
    default: "QAHacks Interview",
    template: "%s | QAHacks Interview"
  },
  description: "Curated QA, SDET, and software testing interview questions with expert answers and speaking blueprints."
};

const linkedinUrl = "https://linkedin.com/company/qa-hacks";
const newsletterUrl = "https://qahacks.substack.com/";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="shell header">
          <Link className="brand brand-official" href="/" aria-label="QAHacks Interview Library home">
            <img className="brand-icon" src="/brand/qa-hacks-icon.svg" alt="" width="42" height="42" />
            <span className="brand-copy">
              <strong>QA Hacks</strong>
              <small>Interview Library</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Main navigation">
            <Link href="/?role=Manual%20QA#questions">Manual QA</Link>
            <Link href="/?role=Automation%20QA#questions">Automation QA</Link>
            <Link href="/?role=QA%20Lead#questions">QA Lead</Link>
            <a className="newsletter-link" href={newsletterUrl} target="_blank" rel="noopener noreferrer">Get QA Insights</a>
          </nav>
        </header>

        {children}

        <section className="shell newsletter-cta" aria-labelledby="newsletter-title">
          <div>
            <span className="section-label">QA Hacks Newsletter</span>
            <h2 id="newsletter-title">Get practical QA lessons in your inbox.</h2>
            <p>Interview preparation, testing insights, release-quality ideas, and practical lessons for QA professionals.</p>
          </div>
          <a className="newsletter-button" href={newsletterUrl} target="_blank" rel="noopener noreferrer">Subscribe on Substack →</a>
        </section>

        <footer className="shell footer site-footer">
          <div className="footer-intro">
            <a className="brand brand-official" href="https://qahacks.com" aria-label="QA Hacks main website">
              <img className="brand-icon" src="/brand/qa-hacks-icon.svg" alt="" width="42" height="42" />
              <span className="brand-copy">
                <strong>QA Hacks</strong>
                <small>Software Quality Consulting for Startups</small>
              </span>
            </a>
            <p>Independent QA consulting, practical tools, and curated learning resources for software teams and quality professionals.</p>
            <div className="footer-socials" aria-label="Connect with QA Hacks">
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="QA Hacks on LinkedIn">LinkedIn</a>
              <a href={newsletterUrl} target="_blank" rel="noopener noreferrer" aria-label="QA Hacks newsletter on Substack">Newsletter</a>
            </div>
          </div>

          <div className="footer-links">
            <div>
              <strong>Interview Library</strong>
              <Link href="/?role=Manual%20QA#questions">Manual QA</Link>
              <Link href="/?role=Automation%20QA#questions">Automation QA</Link>
              <Link href="/?role=QA%20Lead#questions">QA Lead</Link>
            </div>
            <div>
              <strong>QA Hacks</strong>
              <a href="https://qahacks.com">Main Website</a>
              <a href="https://qahacks.com/tools">Free QA Tools</a>
              <a href="https://qahacks.com/blog">Blog</a>
            </div>
            <div>
              <strong>Connect</strong>
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href={newsletterUrl} target="_blank" rel="noopener noreferrer">Substack Newsletter</a>
              <a href="mailto:contact@qahacks.com">Contact</a>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 QA Hacks. All rights reserved.</span>
            <span>Interview preparation for QA engineers, SDETs, and quality leaders.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
