# NAS100 Bot Dashboard

Full-control web dashboard for the alert bot: view alerts/outcome,
change risk settings, toggle symbols, and trigger manual runs - all
without touching GitHub's UI directly.

## How it works

This is a separate Next.js app, deployed on Vercel. It talks to your
bot's GitHub repo via the GitHub API:
- **Reads** `state.json` and `alerts_log.json` to show status
- **Reads/writes** `settings.json` (a new file it creates) for the
  controls - the Python bot reads this file every run and applies your
  changes automatically
- **Triggers** a manual bot run via the same `workflow_dispatch`
  mechanism the Apps Script reliability trigger uses

Your actual API keys (Telegram, Twelve Data, cTrader) stay in GitHub
Secrets - this dashboard never touches them, only the non-secret
settings in `settings.json`.

## Deploy steps

### 1. Push this to its own GitHub repo

Create a new repo (e.g. `nas100-dashboard`) and push these files to it
- separate from your bot's repo.

### 2. Create a GitHub token for the dashboard

Same process as the Apps Script token, but a SEPARATE token (so you can
revoke one without breaking the other):
1. GitHub -> Settings -> Developer settings -> Personal access tokens
   -> Fine-grained tokens -> Generate new token
2. Repository access -> Only select repositories -> your BOT repo
   (`nas100-alert-bot`, not this dashboard repo)
3. Permissions -> Repository permissions:
   - **Contents**: Read and write
   - **Actions**: Read and write
4. Generate, copy the token

### 3. Import into Vercel

1. vercel.com -> New Project -> Import your `nas100-dashboard` repo
2. Vercel auto-detects Next.js - no config needed
3. Before deploying, add Environment Variables:

| Name | Value |
|---|---|
| `GITHUB_OWNER` | your GitHub username |
| `GITHUB_REPO` | `nas100-alert-bot` (the bot repo, not this one) |
| `GITHUB_PAT` | the token from step 2 |
| `DASHBOARD_PASSWORD` | a password you choose, to log into the site |
| `SESSION_SECRET` | any long random string (e.g. mash your keyboard for 40+ characters) |

4. Deploy

### 4. Use it

Visit your Vercel URL, log in with `DASHBOARD_PASSWORD`, and you'll see
the dashboard. Settings changes take effect on the bot's next run
(within 15 minutes, or immediately if you also tap "Run Now").

## Known limitations

- Single-user only - no multi-user accounts, just one shared password
- Settings take effect on the bot's NEXT run, not instantly
- If you disable a symbol, its strategies simply get no data that run
  (rather than being removed from the code) - re-enabling brings it
  right back
