-- 0002_views_and_grants.sql — R7: column-level protection of the answer key.
-- Row level security cannot hide a column. Revoke the table, expose a view.

create view public.v_questions as
  select q.id,
         q.quiz_id,
         q.position,
         q.prompt,
         q.options,
         q.time_limit_ms,
         q.points_base,
         q.explanation
  from public.questions q
  join public.quizzes z on z.id = q.quiz_id
  where z.status = 'published' or z.owner_id = auth.uid();

comment on view public.v_questions is
  'Client-facing questions. Omits correct_option_id (R1/R7).';

revoke all on public.questions from anon, authenticated;
grant select on public.v_questions to anon, authenticated;

-- Nothing on the base tables is reachable without a policy; the functions below are
-- the only privileged surface (R8: no service key in the client).
revoke all on public.rooms       from anon, authenticated;
revoke all on public.players     from anon, authenticated;
revoke all on public.answers     from anon, authenticated;
revoke all on public.reveals     from anon, authenticated;
revoke all on public.room_events from anon, authenticated;

grant select on public.rooms       to authenticated;
grant select on public.players     to authenticated;
grant select on public.answers     to authenticated;
grant select on public.reveals     to authenticated;
grant select on public.room_events to authenticated;

grant select, insert, update, delete on public.quizzes to authenticated;
grant select, insert, update          on public.profiles to authenticated;

grant usage, select on all sequences in schema public to authenticated;
