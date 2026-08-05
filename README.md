# QAHacks Interview

A curated QA, SDET, and software testing interview question library for `interview.qahacks.com`.

This project uses Next.js, OpenNext for Cloudflare Workers, Cloudflare D1, and Gemini for controlled draft generation.

## Safety model

Gemini-generated content is saved as `draft`. The public website only reads records where `status = 'published'`.

See `docs/DEPLOYMENT.md` after the initial scaffold is complete.
