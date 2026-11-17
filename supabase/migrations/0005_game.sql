-- 0005_game.sql — the live loop. Every function is SECURITY DEFINER with a pinned
-- search_path, revoked from public, granted to authenticated only (R8).

-- ---------------------------------------------------------------- rooms

create or replace function public.create_room(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.quizzes;
  v_room_id uuid;
  v_code text;
  v_name text;
  v_emoji text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_quiz from public.quizzes z where z.id = p_quiz_id;
  if not found then
    raise exception 'quiz not found' using errcode = 'P0002';
  end if;
  if v_quiz.owner_id <> v_uid then
    raise exception 'that quiz is not yours' using errcode = '42501';
  end if;
  if v_quiz.status <> 'published' then
    raise exception 'only published quizzes can be hosted' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.questions q where q.quiz_id = p_quiz_id) then
    raise exception 'this quiz has no questions' using errcode = 'P0001';
  end if;

  v_code := public.new_room_code();

  insert into public.rooms (quiz_id, host_id, code, mode)
  values (p_quiz_id, v_uid, v_code, 'live')
  returning id into v_room_id;

  select coalesce(p.display_name, 'host'), coalesce(p.avatar_emoji, '🎩')
    into v_name, v_emoji
  from public.profiles p where p.id = v_uid;

  insert into public.players (room_id, user_id, display_name, avatar_emoji, is_host)
  values (v_room_id, v_uid, coalesce(v_name, 'host'), coalesce(v_emoji, '🎩'), true);

  perform public.emit(v_room_id, 'room_created', jsonb_build_object('code', v_code));

  return jsonb_build_object('room_id', v_room_id, 'code', v_code);
end;
$$;

create or replace function public.peek_room(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'room_id', r.id,
    'code', r.code,
    'status', r.status,
    'mode', r.mode,
    'quiz_title', z.title,
    'cover_emoji', z.cover_emoji,
    'player_count', (select count(*) from public.players p where p.room_id = r.id)
  )
  from public.rooms r
  join public.quizzes z on z.id = r.quiz_id
  where r.code = upper(btrim(p_code));
$$;

create or replace function public.join_room(
  p_code text,
  p_display_name text default null,
  p_avatar_emoji text default '🙂'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_player public.players;
  v_name text;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_room from public.rooms r where r.code = upper(btrim(p_code));
  if not found then
    raise exception 'no room with that code' using errcode = 'P0002';
  end if;
  if v_room.status in ('finished', 'abandoned') then
    raise exception 'that room has ended' using errcode = 'P0001';
  end if;

  select * into v_player
  from public.players p where p.room_id = v_room.id and p.user_id = v_uid;

  if found then
    if nullif(btrim(coalesce(p_display_name, '')), '') is not null then
      update public.players p
         set display_name = left(btrim(p_display_name), 24),
             avatar_emoji = coalesce(nullif(p_avatar_emoji, ''), p.avatar_emoji)
       where p.id = v_player.id
       returning * into v_player;
    end if;

    perform public.emit(v_room.id, 'player_joined', jsonb_build_object(
      'player_id', v_player.id,
      'display_name', v_player.display_name,
      'avatar_emoji', v_player.avatar_emoji,
      'rejoined', true));

    return jsonb_build_object(
      'room_id', v_room.id,
      'player_id', v_player.id,
      'rejoined', true,
      'room_status', v_room.status,
      'current_index', v_room.current_index);
  end if;

  select count(*) into v_count from public.players p where p.room_id = v_room.id;
  if v_count >= 100 then
    raise exception 'that room is full' using errcode = 'P0001';
  end if;

  v_name := nullif(btrim(coalesce(p_display_name, '')), '');
  if v_name is null then
    select p.display_name into v_name from public.profiles p where p.id = v_uid;
  end if;
  v_name := left(coalesce(v_name, 'player'), 24);

  insert into public.players (room_id, user_id, display_name, avatar_emoji)
  values (v_room.id, v_uid, v_name, coalesce(nullif(p_avatar_emoji, ''), '🙂'))
  returning * into v_player;

  perform public.emit(v_room.id, 'player_joined', jsonb_build_object(
    'player_id', v_player.id,
    'display_name', v_player.display_name,
    'avatar_emoji', v_player.avatar_emoji,
    'rejoined', false));

  return jsonb_build_object(
    'room_id', v_room.id,
    'player_id', v_player.id,
    'rejoined', false,
    'room_status', v_room.status,
    'current_index', v_room.current_index);
end;
$$;

create or replace function public.leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms;
begin
  select * into v_room from public.rooms r where r.id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  if v_room.status <> 'lobby' then
    raise exception 'you can only leave a room in the lobby' using errcode = 'P0001';
  end if;

  if v_room.host_id = auth.uid() then
    update public.rooms r set status = 'abandoned' where r.id = p_room_id;
    perform public.emit(p_room_id, 'room_abandoned', '{}'::jsonb);
  else
    delete from public.players p where p.room_id = p_room_id and p.user_id = auth.uid();
    perform public.emit(p_room_id, 'player_left', jsonb_build_object('user_id', auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------- game loop

create or replace function public.start_game(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms;
  v_q public.questions;
  v_total int;
  v_players int;
  v_min int;
begin
  select * into v_room from public.rooms r where r.id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if v_room.host_id <> auth.uid() then
    raise exception 'only the host can start the game' using errcode = '42501';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'the game already started' using errcode = 'P0001';
  end if;

  select count(*) into v_total from public.questions q where q.quiz_id = v_room.quiz_id;
  if v_total = 0 then
    raise exception 'this quiz has no questions' using errcode = 'P0001';
  end if;

  select count(*) into v_players from public.players p where p.room_id = p_room_id;
  v_min := case when v_room.mode = 'live' then 2 else 1 end;
  if v_players < v_min then
    raise exception 'at least one player must join before you start' using errcode = 'P0001';
  end if;

  v_q := public.question_at(v_room.quiz_id, 0);
  if v_q.id is null then
    raise exception 'this quiz has no questions' using errcode = 'P0001';
  end if;

  update public.rooms r
     set status = 'question',
         current_index = 0,
         question_started_at = now(),
         question_ends_at = now() + make_interval(secs => v_q.time_limit_ms::double precision / 1000)
   where r.id = p_room_id
   returning * into v_room;

  perform public.emit(p_room_id, 'game_started', jsonb_build_object('total_questions', v_total));
  perform public.emit(p_room_id, 'question_started', jsonb_build_object(
    'index', 0,
    'question_id', v_q.id,
    'ends_at', v_room.question_ends_at,
    'server_now', now(),
    'total_questions', v_total));

  return jsonb_build_object('room_id', p_room_id, 'total_questions', v_total);
end;
$$;

-- R1: the key is not in this payload, and cannot be, because it is never selected.
create or replace function public.get_question(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms;
  v_q public.questions;
  v_me public.players;
  v_ans public.answers;
  v_total int;
begin
  select * into v_room from public.rooms r where r.id = p_room_id;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  select * into v_me from public.players p where p.room_id = p_room_id and p.user_id = auth.uid();
  if not found then
    raise exception 'you are not in this room' using errcode = '42501';
  end if;

  select count(*) into v_total from public.questions q where q.quiz_id = v_room.quiz_id;

  if v_room.status <> 'question' then
    return jsonb_build_object(
      'state', v_room.status,
      'index', v_room.current_index,
      'total_questions', v_total,
      'server_now', now());
  end if;

  v_q := public.question_at(v_room.quiz_id, v_room.current_index);
  if v_q.id is null then
    return jsonb_build_object(
      'state', 'finished', 'index', v_room.current_index,
      'total_questions', v_total, 'server_now', now());
  end if;

  select * into v_ans from public.answers a
  where a.room_id = p_room_id and a.question_id = v_q.id and a.player_id = v_me.id;

  return jsonb_build_object(
    'state', 'question',
    'index', v_room.current_index,
    'total_questions', v_total,
    'question_id', v_q.id,
    'prompt', v_q.prompt,
    'options', v_q.options,
    'time_limit_ms', v_q.time_limit_ms,
    'points_base', v_q.points_base,
    'started_at', v_room.question_started_at,
    'ends_at', v_room.question_ends_at,
    'server_now', now(),
    'answered', v_ans.id is not null,
    'my_option_id', v_ans.option_id,
    'answered_count', (select count(*) from public.answers a
                       where a.room_id = p_room_id and a.question_id = v_q.id),
    'player_count', (select count(*) from public.players p where p.room_id = p_room_id));
end;
$$;

-- R2 + R3 + R4 + R5 all live in here.
-- The client sends room_id, question_id and option_id. Nothing else is accepted,
-- nothing about correctness comes back.
create or replace function public.submit_answer(
  p_room_id uuid,
  p_question_id uuid,
  p_option_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms;
  v_q public.questions;
  v_me public.players;
  v_now timestamptz;
  v_elapsed int;
  v_correct boolean;
  v_speed numeric;
  v_points int;
  v_late boolean;
begin
  select * into v_room from public.rooms r where r.id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  select * into v_me from public.players p where p.room_id = p_room_id and p.user_id = auth.uid();
  if not found then
    raise exception 'you are not in this room' using errcode = '42501';
  end if;

  if v_room.status <> 'question' then
    raise exception 'the question is closed' using errcode = 'P0001';
  end if;

  v_q := public.question_at(v_room.quiz_id, v_room.current_index);
  if v_q.id is null or v_q.id <> p_question_id then
    raise exception 'that is not the live question' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(v_q.options) o where o->>'id' = p_option_id
  ) then
    raise exception 'unknown option' using errcode = 'P0001';
  end if;

  -- R4. The unique index is the real enforcement; this is for a clean error message.
  if exists (
    select 1 from public.answers a
    where a.room_id = p_room_id and a.question_id = v_q.id and a.player_id = v_me.id
  ) then
    raise exception 'already answered' using errcode = '23505';
  end if;

  v_now := now();                                   -- R2: the database clock, not the device's
  v_elapsed := greatest(0, (extract(epoch from (v_now - v_room.question_started_at)) * 1000)::int);
  v_late := v_now > (v_room.question_ends_at + interval '750 milliseconds');   -- R5

  if v_late then
    insert into public.answers
      (room_id, question_id, player_id, option_id, status, elapsed_ms, points, answered_at)
    values
      (p_room_id, v_q.id, v_me.id, p_option_id, 'rejected_late', v_elapsed, 0, v_now);

    update public.players p set streak = 0 where p.id = v_me.id;

    return jsonb_build_object('accepted', false, 'reason', 'late', 'locked_at', v_now);
  end if;

  v_correct := (p_option_id = v_q.correct_option_id);

  if v_correct then
    v_speed := greatest(0, 1 - (v_elapsed::numeric / v_q.time_limit_ms));
    v_points := round(v_q.points_base * (0.5 + 0.5 * v_speed))::int
                + least(v_me.streak, 5) * 50;
  else
    v_points := 0;
  end if;

  insert into public.answers
    (room_id, question_id, player_id, option_id, status, elapsed_ms, points, answered_at)
  values
    (p_room_id, v_q.id, v_me.id, p_option_id,
     case when v_correct then 'correct' else 'wrong' end, v_elapsed, v_points, v_now);

  update public.players p
     set score = p.score + v_points,
         streak = case when v_correct then p.streak + 1 else 0 end,
         last_correct_at = case when v_correct then v_now else p.last_correct_at end
   where p.id = v_me.id;

  -- R3: no correctness, no points, no key. Just proof of lock.
  return jsonb_build_object('accepted', true, 'locked_at', v_now);
end;
$$;

create or replace function public.close_question(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms;
  v_q public.questions;
  v_me public.players;
  v_reveal public.reveals;
  v_dist jsonb;
begin
  select * into v_room from public.rooms r where r.id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  select * into v_me from public.players p where p.room_id = p_room_id and p.user_id = auth.uid();
  if not found then
    raise exception 'you are not in this room' using errcode = '42501';
  end if;

  if v_room.status in ('lobby', 'finished', 'abandoned') then
    raise exception 'there is nothing to close' using errcode = 'P0001';
  end if;

  v_q := public.question_at(v_room.quiz_id, v_room.current_index);
  if v_q.id is null then
    raise exception 'there is no live question' using errcode = 'P0001';
  end if;

  select * into v_reveal from public.reveals rv
  where rv.room_id = p_room_id and rv.question_id = v_q.id;

  if found then
    return jsonb_build_object(
      'question_id', v_q.id,
      'correct_option_id', v_reveal.correct_option_id,
      'distribution', v_reveal.distribution,
      'revealed_at', v_reveal.revealed_at,
      'already_closed', true);
  end if;

  -- The host may close early. Everyone else has to wait for the deadline.
  if not (v_room.host_id = auth.uid()
          or now() > (v_room.question_ends_at + interval '750 milliseconds')) then
    raise exception 'the question is still open' using errcode = '42501';
  end if;

  -- Anyone who was seated when the question opened and did not answer is a timeout.
  insert into public.answers (room_id, question_id, player_id, status, elapsed_ms, points)
  select p_room_id, v_q.id, p.id, 'timeout', v_q.time_limit_ms, 0
  from public.players p
  where p.room_id = p_room_id
    and p.joined_at <= v_room.question_started_at
    and not exists (
      select 1 from public.answers a
      where a.room_id = p_room_id and a.question_id = v_q.id and a.player_id = p.id
    );

  update public.players p
     set streak = 0
   where p.room_id = p_room_id
     and exists (
       select 1 from public.answers a
       where a.room_id = p_room_id and a.question_id = v_q.id and a.player_id = p.id
         and a.status in ('timeout', 'wrong', 'rejected_late')
     );

  select jsonb_object_agg(o->>'id', coalesce(c.cnt, 0))
    into v_dist
  from jsonb_array_elements(v_q.options) o
  left join (
    select a.option_id, count(*)::int as cnt
    from public.answers a
    where a.room_id = p_room_id and a.question_id = v_q.id
      and a.status in ('correct', 'wrong')
    group by a.option_id
  ) c on c.option_id = o->>'id';

  insert into public.reveals (room_id, question_id, correct_option_id, distribution)
  values (p_room_id, v_q.id, v_q.correct_option_id, coalesce(v_dist, '{}'::jsonb))
  returning * into v_reveal;

  update public.rooms r set status = 'reveal' where r.id = p_room_id;

  perform public.emit(p_room_id, 'question_closed', jsonb_build_object(
    'question_id', v_q.id,
    'correct_option_id', v_q.correct_option_id,
    'distribution', v_reveal.distribution,
    'explanation', v_q.explanation,
    'revealed_at', v_reveal.revealed_at));

  perform public.broadcast_leaderboard(p_room_id);

  return jsonb_build_object(
    'question_id', v_q.id,
    'correct_option_id', v_reveal.correct_option_id,
    'distribution', v_reveal.distribution,
    'revealed_at', v_reveal.revealed_at,
    'already_closed', false);
end;
$$;

create or replace function public.next_question(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms;
  v_q public.questions;
  v_total int;
  v_board jsonb;
begin
  select * into v_room from public.rooms r where r.id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if v_room.host_id <> auth.uid() then
    raise exception 'only the host can advance' using errcode = '42501';
  end if;
  if v_room.status = 'lobby' then
    raise exception 'the game has not started' using errcode = 'P0001';
  end if;
  if v_room.status = 'question' then
    raise exception 'close the current question first' using errcode = 'P0001';
  end if;
  if v_room.status in ('finished', 'abandoned') then
    raise exception 'the game is over' using errcode = 'P0001';
  end if;

  select count(*) into v_total from public.questions q where q.quiz_id = v_room.quiz_id;
  v_q := public.question_at(v_room.quiz_id, v_room.current_index + 1);

  if v_q.id is null then
    update public.rooms r
       set status = 'finished', finished_at = now()
     where r.id = p_room_id;

    select coalesce(jsonb_agg(jsonb_build_object(
             'player_id', l.player_id,
             'name', l.display_name,
             'avatar_emoji', l.avatar_emoji,
             'score', l.score,
             'rank', l.rank) order by l.rank), '[]'::jsonb)
      into v_board
    from public.leaderboard_rows(p_room_id) l;

    perform public.emit(p_room_id, 'game_finished',
      jsonb_build_object('final_leaderboard', v_board));

    return jsonb_build_object('state', 'finished', 'total_questions', v_total);
  end if;

  update public.rooms r
     set status = 'question',
         current_index = r.current_index + 1,
         question_started_at = now(),
         question_ends_at = now() + make_interval(secs => v_q.time_limit_ms::double precision / 1000)
   where r.id = p_room_id
   returning * into v_room;

  perform public.emit(p_room_id, 'question_started', jsonb_build_object(
    'index', v_room.current_index,
    'question_id', v_q.id,
    'ends_at', v_room.question_ends_at,
    'server_now', now(),
    'total_questions', v_total));

  return jsonb_build_object('state', 'question', 'index', v_room.current_index);
end;
$$;

-- ---------------------------------------------------------------- reads

create or replace function public.get_leaderboard(p_room_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'player_id', l.player_id,
           'name', l.display_name,
           'avatar_emoji', l.avatar_emoji,
           'score', l.score,
           'streak', l.streak,
           'rank', l.rank,
           'delta', case when l.prev_rank is null then 0 else l.prev_rank - l.rank end,
           'is_me', l.is_me) order by l.rank), '[]'::jsonb)
  from public.leaderboard_rows(p_room_id) l;
$$;

-- Only exists once the question has closed, which is the whole point.
create or replace function public.get_reveal(p_room_id uuid, p_question_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_reveal public.reveals;
  v_me public.players;
  v_ans public.answers;
begin
  select * into v_me from public.players p where p.room_id = p_room_id and p.user_id = auth.uid();
  if not found then
    raise exception 'you are not in this room' using errcode = '42501';
  end if;

  select * into v_reveal from public.reveals rv
  where rv.room_id = p_room_id and rv.question_id = p_question_id;

  if not found then
    raise exception 'this question has not been revealed yet' using errcode = 'P0001';
  end if;

  select * into v_ans from public.answers a
  where a.room_id = p_room_id and a.question_id = p_question_id and a.player_id = v_me.id;

  return jsonb_build_object(
    'question_id', p_question_id,
    'correct_option_id', v_reveal.correct_option_id,
    'distribution', v_reveal.distribution,
    'revealed_at', v_reveal.revealed_at,
    'explanation', (select q.explanation from public.questions q where q.id = p_question_id),
    'my_option_id', v_ans.option_id,
    'my_status', v_ans.status,
    'my_points', coalesce(v_ans.points, 0));
end;
$$;

-- One call the client can make after any reconnect to rebuild its entire view.
create or replace function public.sync_room(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_room public.rooms;
  v_quiz public.quizzes;
  v_me public.players;
  v_q public.questions;
  v_ans public.answers;
  v_reveal public.reveals;
  v_total int;
  v_state jsonb;
begin
  select * into v_room from public.rooms r where r.id = p_room_id;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  select * into v_me from public.players p where p.room_id = p_room_id and p.user_id = auth.uid();
  if not found then
    raise exception 'you are not in this room' using errcode = '42501';
  end if;

  select * into v_quiz from public.quizzes z where z.id = v_room.quiz_id;
  select count(*) into v_total from public.questions q where q.quiz_id = v_room.quiz_id;

  v_state := jsonb_build_object(
    'room_id', v_room.id,
    'code', v_room.code,
    'mode', v_room.mode,
    'status', v_room.status,
    'index', v_room.current_index,
    'total_questions', v_total,
    'server_now', now(),
    'is_host', (v_room.host_id = auth.uid()),
    'me', jsonb_build_object(
      'player_id', v_me.id,
      'display_name', v_me.display_name,
      'avatar_emoji', v_me.avatar_emoji,
      'score', v_me.score,
      'streak', v_me.streak),
    'quiz', jsonb_build_object(
      'id', v_quiz.id, 'title', v_quiz.title, 'cover_emoji', v_quiz.cover_emoji),
    'player_count', (select count(*) from public.players p where p.room_id = p_room_id),
    'leaderboard', (select coalesce(jsonb_agg(jsonb_build_object(
        'player_id', l.player_id,
        'name', l.display_name,
        'avatar_emoji', l.avatar_emoji,
        'score', l.score,
        'streak', l.streak,
        'rank', l.rank,
        'delta', case when l.prev_rank is null then 0 else l.prev_rank - l.rank end,
        'is_me', l.is_me) order by l.rank), '[]'::jsonb)
      from public.leaderboard_rows(p_room_id) l),
    'question', null,
    'reveal', null,
    'my_answer', null);

  if v_room.status = 'question' then
    v_q := public.question_at(v_room.quiz_id, v_room.current_index);
    if v_q.id is not null then
      select * into v_ans from public.answers a
      where a.room_id = p_room_id and a.question_id = v_q.id and a.player_id = v_me.id;

      v_state := v_state || jsonb_build_object(
        'question', jsonb_build_object(
          'question_id', v_q.id,
          'prompt', v_q.prompt,
          'options', v_q.options,
          'time_limit_ms', v_q.time_limit_ms,
          'points_base', v_q.points_base,
          'started_at', v_room.question_started_at,
          'ends_at', v_room.question_ends_at,
          'answered_count', (select count(*) from public.answers a
                             where a.room_id = p_room_id and a.question_id = v_q.id)),
        'my_answer', case when v_ans.id is null then null else jsonb_build_object(
          'option_id', v_ans.option_id,
          'status', v_ans.status,
          'points', v_ans.points) end);
    end if;

  elsif v_room.status in ('reveal', 'finished') then
    v_q := public.question_at(v_room.quiz_id, v_room.current_index);
    if v_q.id is not null then
      select * into v_reveal from public.reveals rv
      where rv.room_id = p_room_id and rv.question_id = v_q.id;

      select * into v_ans from public.answers a
      where a.room_id = p_room_id and a.question_id = v_q.id and a.player_id = v_me.id;

      v_state := v_state || jsonb_build_object(
        'question', jsonb_build_object(
          'question_id', v_q.id,
          'prompt', v_q.prompt,
          'options', v_q.options,
          'time_limit_ms', v_q.time_limit_ms,
          'points_base', v_q.points_base,
          'explanation', v_q.explanation,
          'ends_at', v_room.question_ends_at),
        'reveal', case when v_reveal.question_id is null then null else jsonb_build_object(
          'correct_option_id', v_reveal.correct_option_id,
          'distribution', v_reveal.distribution,
          'revealed_at', v_reveal.revealed_at) end,
        'my_answer', case when v_ans.id is null then null else jsonb_build_object(
          'option_id', v_ans.option_id,
          'status', v_ans.status,
          'points', v_ans.points) end);
    end if;
  end if;

  return v_state;
end;
$$;

-- ---------------------------------------------------------------- solo + async

create or replace function public.start_solo(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.quizzes;
  v_room_id uuid;
  v_name text;
  v_emoji text;
  v_res jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_quiz from public.quizzes z where z.id = p_quiz_id;
  if not found or v_quiz.status <> 'published' then
    raise exception 'quiz not available' using errcode = 'P0002';
  end if;

  select coalesce(p.display_name, 'you'), coalesce(p.avatar_emoji, '🙂')
    into v_name, v_emoji
  from public.profiles p where p.id = v_uid;

  insert into public.rooms (quiz_id, host_id, code, mode)
  values (p_quiz_id, v_uid, public.new_room_code(), 'solo')
  returning id into v_room_id;

  insert into public.players (room_id, user_id, display_name, avatar_emoji, is_host)
  values (v_room_id, v_uid, coalesce(v_name, 'you'), coalesce(v_emoji, '🙂'), true);

  v_res := public.start_game(v_room_id);

  return jsonb_build_object(
    'room_id', v_room_id,
    'code', (select r.code from public.rooms r where r.id = v_room_id),
    'total_questions', v_res->'total_questions');
end;
$$;

create or replace function public.get_challenge(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'quiz_id', z.id,
    'title', z.title,
    'description', z.description,
    'cover_emoji', z.cover_emoji,
    'question_count', (select count(*) from public.questions q where q.quiz_id = z.id),
    'owner_name', coalesce((select p.display_name from public.profiles p where p.id = z.owner_id), 'someone')
  )
  from public.quizzes z
  where z.share_slug = btrim(p_slug) and z.status = 'published';
$$;

create or replace function public.start_async(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.quizzes;
  v_room_id uuid;
  v_name text;
  v_emoji text;
  v_res jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_quiz from public.quizzes z
  where z.share_slug = btrim(p_slug) and z.status = 'published';
  if not found then
    raise exception 'challenge not found' using errcode = 'P0002';
  end if;

  select coalesce(p.display_name, 'you'), coalesce(p.avatar_emoji, '🙂')
    into v_name, v_emoji
  from public.profiles p where p.id = v_uid;

  insert into public.rooms (quiz_id, host_id, code, mode)
  values (v_quiz.id, v_uid, public.new_room_code(), 'async')
  returning id into v_room_id;

  insert into public.players (room_id, user_id, display_name, avatar_emoji, is_host)
  values (v_room_id, v_uid, coalesce(v_name, 'you'), coalesce(v_emoji, '🙂'), true);

  v_res := public.start_game(v_room_id);

  return jsonb_build_object(
    'room_id', v_room_id,
    'code', (select r.code from public.rooms r where r.id = v_room_id),
    'total_questions', v_res->'total_questions');
end;
$$;

-- ---------------------------------------------------------------- grants

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.create_room(uuid)',
    'public.peek_room(text)',
    'public.join_room(text, text, text)',
    'public.leave_room(uuid)',
    'public.start_game(uuid)',
    'public.get_question(uuid)',
    'public.submit_answer(uuid, uuid, text)',
    'public.close_question(uuid)',
    'public.next_question(uuid)',
    'public.get_leaderboard(uuid)',
    'public.get_reveal(uuid, uuid)',
    'public.sync_room(uuid)',
    'public.start_solo(uuid)',
    'public.get_challenge(text)',
    'public.start_async(text)'
  ]
  loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
