import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://interview.qahacks.com"),
  title: {
    default: "QAHacks Interview",
    template: "%s | QAHacks Interview"
  },
  description: "Curated QA, SDET, and software testing interview questions with expert answers and speaking blueprints."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="shell header">
          <Link className="brand" href="/">
            <span className="brand-mark">Q✓</span>
            <span>QAHacks Interview</span>
          </Link>
          <nav className="nav" aria-label="Main navigation">
            <Link href="/?role=Manual%20QA">Manual QA</Link>
            <Link href="/?role=Automation%20QA">Automation QA</Link>
            <Link href="/?role=QA%20Lead">QA Lead</Link>
            <Link href="https://qahacks.com">QAHacks.com</Link>
          </nav>
        </header>
        {children}
        <footer className="shell footer">
          Curated interview preparation for QA engineers, SDETs, and quality leaders.
        </footer>
      </body>
    </html>
  );
}
