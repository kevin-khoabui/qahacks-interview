# Deploy QAHacks Interview to Cloudflare

Target domain: `interview.qahacks.com`

Worker: `qahacks-interview`

D1 database: `qahacks-interview-db`

D1 database ID: `ba082a94-cbd3-4844-b7b7-83d434dc6c77`

## 1. Merge the MVP branch

Review and merge the pull request from `feature/initial-interview-mvp` into `main` only after the Cloudflare build succeeds.

## 2. Create the Worker from GitHub

In Cloudflare:

1. Workers & Pages
2. Create application
3. Import a repository
4. Select `kevin-khoabui/qahacks-interview`
5. Project name: `qahacks-interview`
6. Production branch: `main`
7. Build command: `npm run build`
8. Deploy command: `npm run deploy`
9. Add build variable `NODE_VERSION=22`

The D1 binding is already declared in `wrangler.jsonc` as `DB`.

## 3. Apply the clean D1 schema

Run once from a terminal with Wrangler authenticated:

```bash
npm install
npm run db:migrate:remote
```

## 4. Add the six curated public questions

```bash
npm run db:seed:remote
```

These records use `status = 'published'` and will immediately appear on the public site.

## 5. Add the curated AI topic queue

```bash
npm run db:topics:remote
```

These topics do not appear on the website. They are only inputs for Gemini.

## 6. Add GitHub repository secrets

GitHub → repository → Settings → Secrets and variables → Actions.

Secrets:

- `GEMINI_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional repository variables:

- `GEMINI_MODEL=gemini-2.5-flash`
- `GEMINI_REVIEW_MODEL=gemini-2.5-flash`

## 7. Generate and review safely

GitHub → Actions → QAHacks Interview Content Pipeline → Run workflow.

Choose `generate` to create one D1 record with `status = 'draft'`.

Choose `review` to score one unreviewed draft. A successful review changes the record to `review`; weak content becomes `rejected`.

Neither action publishes content.

## 8. Publish one reviewed question

Publishing is intentionally explicit:

```bash
npm run publish -- --slug <question-slug> --remote --confirm
```

The command refuses to publish unless:

- current status is `review`
- quality score is at least 80
- both `--remote` and `--confirm` are present

## 9. Attach the subdomain

Cloudflare Worker → Settings → Domains & Routes → Add custom domain.

Enter:

```text
interview.qahacks.com
```

Cloudflare will create the DNS record and attach the Worker route.

## 10. Verification checklist

- Homepage loads six curated questions.
- Search finds Playwright, API, localization, and release-readiness content.
- A question page opens without a 404 or 500.
- Draft and review records are not visible publicly.
- `qahacks.com` link returns to the main QA Hacks website.
- Gemini Action creates only one draft per manual run.
