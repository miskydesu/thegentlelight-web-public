# Public repository (thegentlelight-web-public) — maintainer notes

This doc describes GitHub settings and checks **after** the public repo is created.

---

## Step 5: GitHub repository settings (manual)

At [github.com/miskydesu/thegentlelight-web-public/settings](https://github.com/miskydesu/thegentlelight-web-public/settings):

### Branch protection (main)

- **Settings → Branches → Add branch protection rule**
- Branch name pattern: `main`
- Enable:
  - **Require a pull request before merging**
  - **Do not allow bypassing the above settings**
  - **Require status checks to pass before merging** — add CI job names (e.g. `Secret scan`, `Install, lint, build & audit`)
- **Create** to save

### Security

- **Settings → Security → Code security and analysis**
  - **Private vulnerability reporting**: Enabled
  - **Dependabot alerts**: Enabled (recommended)

### General

- **Settings → General**
  - **Issues**: Enabled
  - **Discussions**: Optional (recommended)

---

## Step 6: First release (GitHub Release)

- **Code → Releases → Create a new release**
- **Choose a tag**: `v0.1.0`
- **Release title**: `v0.1.0 – Initial Public Release`
- **Description** example:

```text
Open-source UI for calm, topic-based news.

- Mock API included (USE_MOCK_DATA=1)
- Architecture and caching strategy documented
- Multi-edition (US / UK / Canada / Japan)
```

- **Publish release**

---

## Step 7: Verify with a fresh clone

In a different directory, run:

```bash
git clone https://github.com/miskydesu/thegentlelight-web-public.git
cd thegentlelight-web-public
cp env.example .env.local
# Add only USE_MOCK_DATA=1 to .env.local
pnpm install   # or npm install
pnpm build     # or npm run build
pnpm dev       # or npm run dev
```

Checklist:

- [ ] Home page loads
- [ ] `http://localhost:3000/api/mock/v1/us/latest` returns 200 with JSON
- [ ] Build succeeds

---

## Pre-publish security check (run before each publish)

1. **Secret scan** (tracked files only):
   ```bash
   git ls-files | xargs grep -E 'API_KEY|SECRET|TOKEN|PASSWORD|BEGIN PRIVATE KEY' || true
   ```
   Variable names only (no real values) is OK.

2. **Gitleaks** (recommended):
   ```bash
   brew install gitleaks   # if not installed
   gitleaks detect --source . --verbose --config-path .gitleaks.toml --no-git false
   ```
   Fix any findings before publishing.

3. **Never commit .env.local** — Confirm it remains in .gitignore.
