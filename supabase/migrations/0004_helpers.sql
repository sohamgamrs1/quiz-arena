-- 0004_helpers.sql — internal helpers. All SECURITY DEFINER with a pinned search_path.

create or replace function public.safe_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.new_room_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O/1/I
  v_code text;
  v_i int;
  v_try int := 0;
begin
  loop
    v_try := v_try + 1;
    v_code := '';
    for v_i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms r where r.code = v_code);
    if v_try >= 40 then
      raise exception 'could not allocate a room code' using errcode = 'P0001';
    end if;
  end loop;
  return v_code;
end;
$$;

-- The nth question of a quiz in play order. Returns null when the index is past the end.
create or replace function public.question_at(p_quiz_id uuid, p_index int)
returns public.questions
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select q.*
  from public.questions q
  where q.quiz_id = p_quiz_id
  order by q.position
  offset greatest(p_index, 0) limit 1;
$$;

-- Append to the event log and fan out over a private broadcast channel.
-- The broadcast is best effort: room_events is the durable path a reconnecting
-- client replays, so a Realtime outage degrades latency, not correctness.
create or replace function public.emit(p_room_id uuid, p_event text, p_payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_seq bigint;
begin
  insert into public.room_events (room_id, event, payload)
  values (p_room_id, p_event, p_payload)
  returning seq into v_seq;

  begin
    perform realtime.send(
      jsonb_build_object('seq', v_seq, 'event', p_event, 'payload', p_payload),
      'game',
      'room:' || p_room_id::text,
      true
    );
  exception when others then
    null;
  end;

  return v_seq;
end;
$$;

create or replace function public.leaderboard_rows(p_room_id uuid)
returns table (
  player_id uuid,
  display_name text,
  avatar_emoji text,
  score int,
  streak int,
  rank int,
  prev_rank int,
  is_me boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ranked as (
    select p.id,
           p.display_name,
           p.avatar_emoji,
           p.score,
           p.streak,
           p.prev_rank,
           p.user_id,
           row_number() over (
             order by p.score desc,
                      p.last_correct_at asc nulls last,   -- earliest correct answer wins a tie
                      p.joined_at asc,
                      p.id asc
           )::int as rank
    from public.players p
    where p.room_id = p_room_id
  )
  select r.id, r.display_name, r.avatar_emoji, r.score, r.streak, r.rank, r.prev_rank,
         (r.user_id = auth.uid())
  from ranked r
  order by r.rank;
$$;

create or replace function public.broadcast_leaderboard(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_top jsonb;
  v_your_rank int;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'player_id', l.player_id,
           'name', l.display_name,
           'avatar_emoji', l.avatar_emoji,
           'score', l.score,
           'rank', l.rank,
           'delta', case when l.prev_rank is null then 0 else l.prev_rank - l.rank end
         ) order by l.rank), '[]'::jsonb)
    into v_top
  from (select * from public.leaderboard_rows(p_room_id) limit 10) l;

  select l.rank into v_your_rank
  from public.leaderboard_rows(p_room_id) l
  where l.is_me
  limit 1;

  update public.players p
     set prev_rank = l.rank
    from public.leaderboard_rows(p_room_id) l
   where p.id = l.player_id;

  perform public.emit(p_room_id, 'leaderboard_updated',
    jsonb_build_object('top', v_top, 'your_rank', v_your_rank));
end;
$$;

revoke all on function public.safe_uuid(text) from public;
revoke all on function public.new_room_code() from public;
revoke all on function public.question_at(uuid, int) from public;
revoke all on function public.emit(uuid, text, jsonb) from public;
revoke all on function public.leaderboard_rows(uuid) from public;
revoke all on function public.broadcast_leaderboard(uuid) from public;

grant execute on function public.question_at(uuid, int) to authenticated;
grant execute on function public.leaderboard_rows(uuid) to authenticated;
