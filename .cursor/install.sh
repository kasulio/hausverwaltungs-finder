#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap: Bun runtime, deps, dev env file, SQLite schema.
set -euo pipefail
cd "$(dirname "$0")/.."

# Bun (repo's package manager + runtime) is not in the default image. Install it
# and expose it on the global PATH so `bun dev` works in the dev terminal too.
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
  sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
  sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bunx
fi
bun --version

# Dev defaults for the env vars validated by env.ts (@t3-oss/env-nuxt).
# Must exist before `bun install`, whose postinstall runs `nuxt prepare` and
# validates these. Gitignored. Bun auto-loads .env; real secrets injected as
# process env vars take precedence, so e.g. a GOOGLE_MAPS_API_KEY Cursor secret wins.
if [ ! -f .env ]; then
  cat > .env <<'EOF'
GOOGLE_MAPS_API_KEY=dev-placeholder
NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=dev-placeholder
NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID=dev-placeholder
LOCAL_SQLITE_PATH=./server/db/sqlite.db
BETTER_AUTH_SECRET=dev-only-secret-change-me-0123456789abcdef
DEPLOYMENT_URL=http://localhost:3000
EOF
fi

bun install

# Bootstrap the SQLite schema. `bun db:migrate` dedupes flats *before* migrating,
# which throws on an empty DB (no `flat` table yet), so apply migrations directly.
# Idempotent: drizzle skips already-applied migrations.
bun -e 'import { migrate } from "drizzle-orm/bun-sqlite/migrator"; import { db } from "./server/db/client.ts"; migrate(db, { migrationsFolder: "./drizzle" });'
