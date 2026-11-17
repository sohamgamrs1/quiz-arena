-- 0003_rls.sql — row level security policies.
-- Every "is this my room?" check goes through a SECURITY DEFINER helper so the
-- policies on public.players never recurse into themselves.

create or replace function public.has_seat(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.players p
    where p.room_id = p_room_id and p.user_id = auth.uid()
  );
$$;

create or replace function public.is_host(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.host_id = auth.uid()
  );
$$;

revoke all on function public.has_seat(uuid) from public;
revoke all on function public.is_host(uuid)  from public;
grant execute on function public.has_seat(uuid) to authenticated;
grant execute on function public.is_host(uuid)  to authenticated;

-- profiles
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- quizzes: owners manage, everyone reads published ones (async challenge links)
create policy quizzes_select on public.quizzes
  for select to authenticated
  using (owner_id = auth.uid() or status = 'published');
create policy quizzes_insert on public.quizzes
  for insert to authenticated with check (owner_id = auth.uid());
create policy quizzes_update on public.quizzes
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy quizzes_delete on public.quizzes
  for delete to authenticated using (owner_id = auth.uid());

-- questions: owner-only, and only for their own draft questions. Published
-- questions are read through v_questions, never through this table.
create policy questions_owner on public.questions
  for all to authenticated
  using (exists (select 1 from public.quizzes z where z.id = quiz_id and z.owner_id = auth.uid()))
  with check (exists (select 1 from public.quizzes z where z.id = quiz_id and z.owner_id = auth.uid()));

-- rooms / players / answers / reveals / events: seat-holders only
create policy rooms_member_select on public.rooms
  for select to authenticated using (public.has_seat(id) or host_id = auth.uid());

create policy players_member_select on public.players
  for select to authenticated using (public.has_seat(room_id));

create policy answers_own_select on public.answers
  for select to authenticated
  using (exists (
    select 1 from public.players p
    where p.id = player_id and p.user_id = auth.uid()
  ));

create policy reveals_member_select on public.reveals
  for select to authenticated using (public.has_seat(room_id));

create policy room_events_member_select on public.room_events
  for select to authenticated using (public.has_seat(room_id));
