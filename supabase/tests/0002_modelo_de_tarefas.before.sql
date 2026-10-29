-- Dados no formato anterior à 0002, cobrindo as variações encontradas no histórico.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('dddddddd-0000-0000-0000-000000000004', 'dora@x.com', '{"name": "Dora"}');

INSERT INTO public.workspaces (id, name, type, owner_id, invite_code) VALUES
  ('22222222-0000-0000-0000-000000000000', 'Casa',  'family',   'dddddddd-0000-0000-0000-000000000004', 'CASA2222'),
  -- workspace "órfão": dono sem linha em workspace_members
  ('33333333-0000-0000-0000-000000000000', 'Órfão', 'personal', 'dddddddd-0000-0000-0000-000000000004', 'ORFA3333');

INSERT INTO public.workspace_members (id, workspace_id, user_id, role, name, email) VALUES
  ('d0000000-0000-0000-0000-00000000000d', '22222222-0000-0000-0000-000000000000',
   'dddddddd-0000-0000-0000-000000000004', 'owner', 'Dora', 'dora@x.com');

INSERT INTO public.categories (id, workspace_id, name, color) VALUES
  ('c1000000-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', 'Trabalho', 'bg-blue-500 text-white'),
  ('c2000000-0000-0000-0000-000000000000', '22222222-0000-0000-0000-000000000000', 'Pessoal',  'bg-emerald-500 text-white');

-- Colunas: id, text, flags, datas, recurring_*, category
INSERT INTO public.tasks (id, workspace_id, assigned_to_id, created_by_id, text,
                          is_permanent, is_delivery, delivery_date, date, recurring_type, recurring_day, recurring_days,
                          category, completed, completed_dates)
SELECT v.id::uuid, '22222222-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-00000000000d', 'd0000000-0000-0000-0000-00000000000d',
       v.text, v.perm, v.deliv, v.ddate::date, v.dt::date, v.rtype, v.rday, v.rdays::jsonb, v.cat, v.done, v.cdates::date[]
FROM (VALUES
  ('70000000-0000-0000-0000-000000000001', 'única',              false, false, NULL,         '2026-03-10', NULL,     NULL, '[]',      'c1000000-0000-0000-0000-000000000000', true,  NULL),
  ('70000000-0000-0000-0000-000000000002', 'permanente',         true,  false, NULL,         '2026-03-01', NULL,     NULL, '[]',      'pessoal',                              NULL,  '{2026-03-01,2026-03-02}'),
  ('70000000-0000-0000-0000-000000000003', 'semanal array',      false, false, NULL,         '2026-03-01', 'weekly', NULL, '[1, 4]',  'xyz',                                  false, '{}'),
  ('70000000-0000-0000-0000-000000000004', 'semanal stringify',  false, false, NULL,         '2026-03-01', 'weekly', NULL, '"[2,3]"', NULL,                                   false, '{}'),
  ('70000000-0000-0000-0000-000000000005', 'semanal legado',     false, false, NULL,         '2026-03-01', 'weekly', 5,    '[]',      NULL,                                   false, '{}'),
  ('70000000-0000-0000-0000-000000000006', 'semanal sem dias',   false, false, NULL,         '2026-03-07', 'weekly', NULL, '[]',      NULL,                                   false, '{}'),
  ('70000000-0000-0000-0000-000000000007', 'entrega',            false, true,  '2026-04-01', '2026-03-01', NULL,     NULL, '[]',      NULL,                                   false, '{}'),
  ('70000000-0000-0000-0000-000000000008', 'entrega sem prazo',  false, true,  NULL,         '2026-03-08', NULL,     NULL, '[]',      NULL,                                   false, '{}')
) AS v(id, text, perm, deliv, ddate, dt, rtype, rday, rdays, cat, done, cdates);

INSERT INTO public.settings (workspace_id, key, value, updated_at) VALUES
  ('22222222-0000-0000-0000-000000000000', 'darkMode',   '{"value": true}', now()),
  ('22222222-0000-0000-0000-000000000000', 'sortByTime', 'false',           now());
