All agents follow the `using-agent-skills` workflow. Read the relevant skill before making changes.

# Project Rules

- This repository is a template. Keep app names and configuration generic; do not add product-specific features here.
- Use npm workspaces and TypeScript. Shared contracts belong in `packages/shared`; validate external data at app boundaries.
- Keep the API, web, and Expo apps independently runnable. The API reads `DATABASE_URL`; web reads `API_URL`; mobile reads `EXPO_PUBLIC_API_URL`.
- Local PostgreSQL runs in Docker Compose. Never commit `.env` or credentials.
- For parallel agent work, commit a clean baseline, then use `scripts/agent-env.sh create <lowercase-name>`. Each worktree owns its `.env`, Compose project, database volume, and deterministic ports. Do not share an agent's worktree or environment.
- Before removing an agent environment, stop only that environment's Compose project. Keep its database volume unless the user explicitly requests deletion.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` after installing dependencies. Do not add cloud credentials to workflow files; use protected GitHub Environments.
- Keep staging/production workflow changes gated on the selected hosting provider and explicit environment protection.
