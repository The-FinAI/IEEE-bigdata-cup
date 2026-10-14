# Receipt-only backend (Cloudflare Workers Free + D1)

This service accepts immutable pair-action receipts during open windows.
It has **no cron triggers, crawler, model calls, summaries, or return calculator**.
The existing fourteen local Codex events remain the only publication/scoring jobs.
The public Hugging Face Space remains a metadata-only page; its submission link
will open this service after deployment is verified.

## Deployment

Use an authenticated Cloudflare account on the Workers **Free** plan. Do not
upgrade billing. Run Wrangler from this directory:

1. `npx wrangler@4 login` (account owner approves OAuth).
2. `npx wrangler@4 d1 create finreason-task2-receipts`.
3. Copy the returned database ID into a local `wrangler.deploy.jsonc` based on
   `wrangler.jsonc`; this deployment file is ignored by Git.
4. `npx wrangler@4 d1 execute finreason-task2-receipts --remote --file schema.sql --config wrangler.deploy.jsonc`.
5. Configure `ADMIN_TOKEN` as a Worker Secret, then deploy using that config.
   Generate a random, backend-specific secret of at least 32 characters; do not
   reuse HF tokens, OpenAI keys, account credentials, or team tokens.
6. Verify `/health` says `ok: true`, `role: receipts-only`, `storage: private-d1`.
   Keep control `published: []` until a local release has actually been committed.

The organizer alone stores `RECEIPT_BACKEND: cloudflare`, `RECEIPT_API_URL`, and
`RECEIPT_ADMIN_TOKEN` in local `outputs/receipt-local.json` (permissions 0600).
This file is outside the Git checkout. The OpenAI key stays in its existing local
file and is never needed by this backend. No account-wide Cloudflare API token
is stored in the project.

## Interfaces and safeguards

- `/` serves the four-field receipt form; `/status` contains only round metadata.
- `POST /submissions` validates Team Name, ten eligible stocks, distinct stocks,
  LS/SL/F, server time and local organizer release authorization.
- D1 transaction + `(session, identity, round_id)` primary key enforce one
  accepted receipt, even under concurrent requests. Failed requests issue no
  acceptance receipt. The exact original team name/browser token is required
  after the first claim. Team names are not proof of organizational identity;
  pre-registration is needed if first-claim impersonation must be prevented.
- `GET /admin/receipts` exports private live receipts only with `ADMIN_TOKEN`.
  There is no public payload/leaderboard endpoint. Only the local organizer
  projects team/round/time/status metadata into the public HF Space.
- `PUT /admin/control` authorizes locally published rounds. Deadlines are fixed
  in code, not provided by contestants. Starting formal control closes rehearsal.
- Rehearsal uses a random 16-hex-character session and expires before the first
  formal release. It cannot write the `live` namespace. Cleanup requires an
  exact closed rehearsal session; the deletion endpoint rejects `live`.
- Secrets, headers and submissions are not logged by application code;
  observability is disabled in the deployment config. Do not enable payload logs.
- Free quotas are finite. If storage/verification fails, submissions and local
  scoring fail closed; do not score unavailable receipts as missing actions.

`node --test test.mjs` exercises the Worker using an in-memory SQLite adapter.
This verifies application/SQL logic, not Cloudflare deployment or a real browser
submission. Complete the manual end-to-end rehearsal before enabling live use.
