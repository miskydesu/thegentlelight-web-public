# The Gentle Light — Web

**Calm news for your mental health.** This repository is the **front-end** of [The Gentle Light](https://thegentlelight.org): a multi-edition (US / UK / Canada / Japan) news site that reduces doomscrolling and information overload through gentle framing and editorial structure.

- **Production site:** [thegentlelight.org](https://thegentlelight.org)
- **What this project is:** Open-source UI for calm, topic-based news (see below).
- **What this project is NOT:** Backend API, data pipeline, or internal admin services (see below).

---

## What this is

- **Official web front-end for The Gentle Light** (Next.js 14, React)
- Country editions (US / UK / CA / JP), Gentle mode, daily briefings, columns, quotes
- Production deploy targets: Cloudflare Pages (Vercel also supported)

## What this is NOT

- **Not the backend API** — News, topics, and user auth are provided by a separate (private) service
- **Not a data pipeline or editorial tool** — Content collection and editing are handled by other systems
- **Not the admin auth logic itself** — Admin API URL and credentials are private

In short: we open-source the **visible UI**; **data, operations, brand, product experience, and ongoing editorial** stay in other layers.

---

## Tech stack

- **Next.js 14** (App Router)
- **React 18**, TypeScript
- **Cloudflare Pages** for production (`@cloudflare/next-on-pages`)
- Optional: Sentry, Google Analytics, Google Sign-in

---

## Quick start (no API required)

So that anyone can fork and run the UI without a backend, we provide a **mock mode** that uses local fixtures instead of the API.

```bash
git clone https://github.com/miskydesu/thegentlelight-web-public.git
cd thegentlelight-web-public
cp env.example .env.local
```

Add this to `.env.local`:

```env
USE_MOCK_DATA=1
```

```bash
pnpm install   # or npm install
pnpm run dev   # or npm run dev
```

Open http://localhost:3000 — the UI will use sample data from `fixtures/*.json`. No production API keys needed.

- In mock mode, `fixtures/` JSON is used; missing endpoints return empty arrays or similar
- To use the real API, set `NEXT_PUBLIC_API_BASE_URL` and leave `USE_MOCK_DATA` unset

---

## Environment variables

| Variable | Description | Required for public build? |
|----------|-------------|----------------------------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | Only for production (omit with `USE_MOCK_DATA=1` for mock) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (canonical, OG, hreflang) | Recommended for production |
| `USE_MOCK_DATA` | Set to `1` to use fixtures (UI works without API) | For forks / demos |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | Base URL for images (covers, authors) | Optional |
| `ROBOTS_NOINDEX` | Set to `true` for noindex (e.g. staging) | Optional |

See `env.example` for GA, Sentry, Google Sign-in, etc. **Do not put API keys, tokens, or DB credentials in the repo.**

---

## Scripts

- `npm run dev` — Development server
- `npm run build` — Next.js build
- `npm run build:cf` — Cloudflare Pages build (next-on-pages + optional Sentry sourcemaps)
- `npm run start` — Production server
- `npm run lint` — ESLint

---

## Architecture overview

- **Root `/`** — Country selector landing
- **`/[country]`** — Country home (US/UK/CA/JP)
- **`/en/*`** — Shared English columns & quotes (308 redirects)
- **`/[country]/daily/*`** — Daily briefings
- **`/[country]/news`**, **`/category/*`** — News and categories
- API calls are centralized in `src/lib/tglApi.ts` (`fetchJson`). Mock mode uses `fixtures/` or `/api/mock/`

---

## License

[GPLv3](LICENSE) — You may use, modify, and distribute the code. **If you distribute a derivative that uses this code, that project must also be under GPL and its source must be made available.** Using it only as a service on your own server (SaaS) does not trigger the source-release obligation. This license is for those who want derivatives that are distributed to also be open.

---

## Contributing & security

- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security issues:** Report privately as described in [SECURITY.md](SECURITY.md)
