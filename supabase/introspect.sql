-- ============================================================
-- INTROSPECÇÃO DO SCHEMA REAL — somente leitura, não altera nada
--
-- Como usar:
--   1. Supabase → SQL Editor → cole este arquivo inteiro → Run
--   2. O resultado é UMA linha com UMA coluna (schema_snapshot)
--   3. Copie o valor (JSON) e salve em supabase/snapshot.json
--
-- Cobre o schema public: tabelas, colunas, constraints, índices,
-- policies RLS, funções/RPCs, triggers, grants e contagem de linhas.
-- ============================================================

WITH
tbls AS (
  SELECT c.oid, c.relname, c.relrowsecurity AS rls_enabled, c.reltuples::bigint AS approx_rows
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
cols AS (
  SELECT t.relname,
         jsonb_agg(jsonb_build_object(
           'name', a.attname,
           'type', format_type(a.atttypid, a.atttypmod),
           'not_null', a.attnotnull,
           'default', pg_get_expr(d.adbin, d.adrelid)
         ) ORDER BY a.attnum) AS columns
  FROM tbls t
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  GROUP BY t.relname
),
cons AS (
  SELECT t.relname,
         jsonb_agg(jsonb_build_object(
           'name', co.conname,
           'def', pg_get_constraintdef(co.oid)
         ) ORDER BY co.conname) AS constraints
  FROM tbls t
  JOIN pg_constraint co ON co.conrelid = t.oid
  GROUP BY t.relname
),
idx AS (
  SELECT t.relname,
         jsonb_agg(pg_get_indexdef(i.indexrelid) ORDER BY i.indexrelid::regclass::text) AS indexes
  FROM tbls t
  JOIN pg_index i ON i.indrelid = t.oid
  GROUP BY t.relname
),
pols AS (
  SELECT p.tablename AS relname,
         jsonb_agg(jsonb_build_object(
           'name', p.policyname,
           'cmd', p.cmd,
           'roles', p.roles,
           'permissive', p.permissive,
           'using', p.qual,
           'with_check', p.with_check
         ) ORDER BY p.policyname) AS policies
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  GROUP BY p.tablename
),
trgs AS (
  SELECT t.relname,
         jsonb_agg(pg_get_triggerdef(tg.oid) ORDER BY tg.tgname) AS triggers
  FROM tbls t
  JOIN pg_trigger tg ON tg.tgrelid = t.oid AND NOT tg.tgisinternal
  GROUP BY t.relname
),
grnts AS (
  SELECT g.table_name AS relname,
         jsonb_object_agg(g.grantee, g.privs) AS grants
  FROM (
    SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
    GROUP BY table_name, grantee
  ) g
  GROUP BY g.table_name
),
fns AS (
  SELECT jsonb_agg(jsonb_build_object(
           'name', p.proname,
           'args', pg_get_function_identity_arguments(p.oid),
           'returns', pg_get_function_result(p.oid),
           'security_definer', p.prosecdef,
           'anon_can_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
           'definition', pg_get_functiondef(p.oid)
         ) ORDER BY p.proname) AS functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  LEFT JOIN pg_depend dep ON dep.objid = p.oid AND dep.deptype = 'e'
  WHERE n.nspname = 'public' AND p.prokind = 'f' AND dep.objid IS NULL
)
SELECT jsonb_pretty(jsonb_build_object(
  'generated_at', now(),
  'pg_version', current_setting('server_version'),
  'tables', (
    SELECT jsonb_object_agg(t.relname, jsonb_build_object(
      'rls_enabled', t.rls_enabled,
      'approx_rows', t.approx_rows,
      'columns', COALESCE(cols.columns, '[]'),
      'constraints', COALESCE(cons.constraints, '[]'),
      'indexes', COALESCE(idx.indexes, '[]'),
      'policies', COALESCE(pols.policies, '[]'),
      'triggers', COALESCE(trgs.triggers, '[]'),
      'grants', COALESCE(grnts.grants, '{}')
    ))
    FROM tbls t
    LEFT JOIN cols  USING (relname)
    LEFT JOIN cons  USING (relname)
    LEFT JOIN idx   USING (relname)
    LEFT JOIN pols  USING (relname)
    LEFT JOIN trgs  USING (relname)
    LEFT JOIN grnts USING (relname)
  ),
  'functions', COALESCE((SELECT functions FROM fns), '[]')
)) AS schema_snapshot;
