# Contributing

Contributions via pull requests and issues are welcome.

## Welcome

- **Bug fixes** — Include steps to reproduce and expected behavior in the Issue or PR
- **Documentation** — Improvements to README, env.example, and code comments
- **Accessibility** — Keyboard support, screen readers, contrast
- **Performance** — Build or runtime improvements (without breaking changes)
- **Types & tests** — Stronger TypeScript types, unit/integration tests
- **Mock & fixtures** — More or better `fixtures/*.json` for `USE_MOCK_DATA=1`

## Out of scope or please ask first

- **Changing backend API URL or auth** — Production relies on a private API; changing default behavior needs discussion
- **New admin features** — Auth and permissions are tied to external systems; confirm approach in an Issue first
- **Large UI overhauls** — Discuss in an Issue so design aligns with the product
- **New heavy dependencies** — Consider license, bundle size, and maintainability; ask first

## How to contribute

1. **Check existing work** — Search for similar Issues or PRs
2. **Fork** — Fork the repo and work on a topic branch (e.g. `fix/typo-readme`)
3. **Keep changes small** — Smaller PRs are easier to review
4. **Open a PR** — Describe what changed and why; link related Issues
5. **Review** — Address maintainer feedback

## Development setup

- Node.js 20 recommended
- After `cp env.example .env.local`, set `USE_MOCK_DATA=1` to run without the API
- Run `npm run lint` (or `pnpm run lint`) before submitting

## Code of conduct

Be constructive and respectful. Discriminatory or harassing behavior is not acceptable.

Thank you for contributing.
