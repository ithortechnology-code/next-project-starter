# Project Rules

- This repository is a template. Keep app names and configuration generic; do not add product-specific features here.
- `using-agent-skills` has to be followed before every request you recieve, if possible, add it to parmanent memory so its  guidance for choosing relevant skills is never missied, lifecyle is never missed. Treat skill  as recommendations for working, and apply judgment to fit the task and project.
- For user-facing UI and demos, follow `docs/design-guidelines.md` and use the `frontend-ui-engineering` and `impeccable` skills when relevant. Use Impeccable for visual exploration or review; treat its suggestions as input and verify the result against the project guidelines, accessibility, and task requirements.
- Keep business rules out of UI components. Share contracts and validation schemas through `packages/shared`; keep web and native visual components app-local, and share pure business logic only when more than one app needs it.
- Use npm workspaces and TypeScript. Shared contracts belong in `packages/shared`; validate external data at app boundaries.
- Keep the API, web, and Expo apps independently runnable. The API reads `DATABASE_URL`; web reads `API_URL`; mobile reads `EXPO_PUBLIC_API_URL`.
- Local PostgreSQL runs in Docker Compose. Never commit `.env` or credentials.
- For parallel agent work, commit a clean baseline, then use `scripts/agent-env.sh create <lowercase-name>`. Each worktree owns its `.env`, Compose project, database volume, and deterministic ports. Do not share an agent's worktree or environment.
- Before removing an agent environment, stop only that environment's Compose project. Keep its database volume unless the user explicitly requests deletion.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` after installing dependencies. Do not add cloud credentials to workflow files; use protected GitHub Environments.
- Keep staging/production workflow changes gated on the selected hosting provider and explicit environment protection.
