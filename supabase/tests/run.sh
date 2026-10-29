#!/usr/bin/env bash
# Aplica stub + migrations + testes num banco DESCARTÁVEL de um Postgres local.
# Conexão pelas variáveis padrão do psql (PGHOST, PGPORT, PGUSER, PGPASSWORD):
#   PGHOST=localhost PGUSER=postgres supabase/tests/run.sh
# Cria e apaga o banco "taskplanner_test". Nunca aponte para o Supabase.
#
# Para cada migrations/NNNN_x.sql:
#   tests/NNNN_x.before.sql  (opcional) dados no formato antigo, antes da migração
#   migrations/NNNN_x.sql
#   tests/NNNN_x.test.sql    (opcional) asserts logo depois
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB=taskplanner_test
psql -d postgres -qc "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
trap 'psql -d postgres -qc "DROP DATABASE IF EXISTS $DB"' EXIT
run() { psql -d "$DB" -q -v ON_ERROR_STOP=1 -f "$1"; }
run "$DIR/tests/_stub_supabase.sql" >/dev/null
for m in "$DIR"/migrations/*.sql; do
  name="$(basename "$m" .sql)"
  [ -f "$DIR/tests/$name.before.sql" ] && run "$DIR/tests/$name.before.sql" >/dev/null
  echo "migração: $name"
  run "$m" >/dev/null
  [ -f "$DIR/tests/$name.test.sql" ] && run "$DIR/tests/$name.test.sql"
done
echo "tudo ok"
