#!/usr/bin/env bash
set -euo pipefail

# Load .env if present
if [ -f "$(dirname "$0")/../.env" ]; then
  set -a
  source "$(dirname "$0")/../.env"
  set +a
fi

DB_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/tanstack_ai}"
ES_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-tanstack_ai}"

echo "==> Truncating PostgreSQL tables..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
TRUNCATE TABLE
  messages,
  conversations,
  cronjob_logs,
  cronjobs,
  jobs,
  job_emails,
  notifications,
  generated_files,
  knowledgebase_files,
  user_settings,
  users
RESTART IDENTITY CASCADE;
SQL
echo "    Done."

echo "==> Deleting Elasticsearch indices..."
for index in memory_conversations memory_generated_files knowledge_base; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$ES_URL/$index")
  if [ "$status" = "200" ]; then
    echo "    Deleted index: $index"
  elif [ "$status" = "404" ]; then
    echo "    Index not found (skipping): $index"
  else
    echo "    Warning: unexpected status $status for index $index"
  fi
done

echo "==> Deleting generated and uploaded files..."
rm -rf files/generated/* files/knowledge-base/* public/generated/*
echo "    Done."

echo ""
echo "Reset complete. Run 'pnpm db:migrate' if you need fresh schema."
