# Deploy QAHacks Interview to Cloudflare

Target domain: `interview.qahacks.com`

Worker: `qahacks-interview`

D1 database: `qahacks-interview-db`

D1 database ID: `ba082a94-cbd3-4844-b7b7-83d434dc6c77`

## 1. Merge the MVP branch

Review and merge the pull request from `feature/initial-interview-mvp` into `main` only after the GitHub Build workflow succeeds.

## 2. Add GitHub repository secrets

GitHub → repository → Settings → Secrets and variables → Actions.

Secrets:

- `GEMINI_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional repository variables:

- `GEMINI_MODEL=gemini-2.5-flash`
- `GEMINI_REVIEW_MODEL=gemini-2.5-flash`

The Cloudflare API token needs permission to edit Workers and D1 for this account.

## 3. Set up D1 without using a local computer

GitHub → Actions → Setup QAHacks Interview Database → Run workflow.

Choose:

```text
setup-all
```

This applies the migration, inserts six curated published questions, and inserts ten approved Gemini topics into the queue.

The migration and seed statements use `IF NOT EXISTS` or `INSERT OR IGNORE`, so rerunning setup is safe.

## 4. Create the Worker from GitHub

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

## 5. Verify the workers.dev deployment

Open the generated `workers.dev` URL and check:

- homepage loads six curated questions
- search finds Playwright, API, localization, and release-readiness content
- question detail pages open without a 404 or 500
- navigation back to `qahacks.com` works

## 6. Attach the subdomain

Cloudflare Worker → Settings → Domains & Routes → Add custom domain.

Enter:

```text
interview.qahacks.com
```

Cloudflare will create the DNS record and attach the Worker route.

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

A cloud-only publishing workflow can be added after the first generated drafts have been inspected.

## 9. Safety checklist

- Public queries only return `status = 'published'`.
- Gemini-generated content starts as `draft`.
- The reviewer never publishes content.
- Duplicate fingerprints are rejected before insertion.
- The workflow creates or reviews only one record per manual run.
