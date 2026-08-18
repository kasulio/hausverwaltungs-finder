#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap: dependencies, dev env file, SQLite schema.
set -euo pipefail
cd "$(dirname "$0")/.."

bun install

# Dev defaults for the env vars validated by env.ts (@t3-oss/env-nuxt).
# Gitignored. Bun auto-loads .env; real secrets injected as process env vars
# take precedence, so adding e.g. GOOGLE_MAPS_API_KEY as a Cursor secret wins.
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

# Bootstrap the SQLite schema. `bun db:migrate` dedupes flats *before* migrating,
# which throws on an empty DB (no `flat` table yet), so apply migrations directly.
# Idempotent: drizzle skips already-applied migrations.
bun -e 'import { migrate } from "drizzle-orm/bun-sqlite/migrator"; import { db } from "./server/db/client.ts"; migrate(db, { migrationsFolder: "./drizzle" });'
