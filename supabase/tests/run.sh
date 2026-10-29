#!/usr/bin/env bash
# Aplica stub + migrations + testes num banco DESCARTÁVEL de um Postgres local.
# Conexão pelas variáveis padrão do psql (PGHOST, PGPORT, PGUSER, PGPASSWORD):
#   PGHOST=localhost PGUSER=postgres supabase/tests/run.sh
# Cria e apaga o banco "taskplanner_test". Nunca aponte para o Supabase.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB=taskplanner_test
psql -d postgres -qc "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
trap 'psql -d postgres -qc "DROP DATABASE IF EXISTS $DB"' EXIT
run() { psql -d "$DB" -q -v ON_ERROR_STOP=1 -f "$1" >/dev/null; }
run "$DIR/tests/_stub_supabase.sql"
for f in "$DIR"/migrations/*.sql; do echo "migração: $(basename "$f")"; run "$f"; done
for f in "$DIR"/tests/*.test.sql; do psql -d "$DB" -q -v ON_ERROR_STOP=1 -f "$f"; done
