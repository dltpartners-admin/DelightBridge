# AGENTS.md


For project overview, architecture, and design specs, see `PLAN.md`.

## Commit Discipline

- **Commit after every discrete action.** Each meaningful change (e.g. adding a feature, fixing a bug, refactoring, updating docs, adding a test) must be committed individually before moving on.
- Use concise, imperative commit messages (e.g. `add settings modal`, `fix draft loading indicator position`).
- Do not batch unrelated changes into a single commit.
- If a task involves multiple steps, commit after each step — not all at the end.

## Releases

- When asked to create a release: bump the version in `package.json`, commit, push, then create the release with `gh release create`.
- Releases must be published immediately — do **not** use `--draft`.
- Include release notes with concise, descriptive bullet points explaining what changed (e.g. `- Add settings modal with service/document/category management`). Do not just list version numbers or raw commit messages.
- Each bullet should describe the user-facing change, not implementation details.

## Comments

- By default, avoid writing comments at all.
- If you write one, it should be about "Why", not "What".

## General

- Avoid creating unnecessary interfaces, types, or abstractions if they are not shared. Prefer inlining types when they're only used in one place.
- All application state lives in `MainLayout.tsx`. Do not introduce external state management libraries.
- Run `pnpm build` after code changes to verify compilation before committing.
- Run `pnpm lint` and fix any warnings before committing.
- Keep commits small and reviewable.
- UI text must never expose AI model names — always use "AI" generically.

## Commands

```bash
pnpm dev          # Start development server (localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Environment Variables

Required in `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```
