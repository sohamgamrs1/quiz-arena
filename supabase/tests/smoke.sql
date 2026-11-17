-- smoke.sql — the definition-of-done checks, as SQL.
--
--   supabase db reset
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
--        -v ON_ERROR_STOP=1 -f supabase/tests/smoke.sql
--
-- Everything runs inside one transaction that is rolled back, so it is safe to run
-- against a database you care about. Each check raises on failure.

begin;

do $$
declare
  v_host uuid := gen_random_uuid();
  v_player uuid := gen_random_uuid();
  v_quiz uuid;
  v_question uuid;
  v_room jsonb;
  v_code text;
  v_state jsonb;
  v_payload jsonb;
  v_first jsonb;
  v_second jsonb;
  v_reveal jsonb;
  v_rows int;
  v_top text;
begin
  -- two throwaway users
  insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_host, 'authenticated', 'authenticated',
          'smoke-host@example.test', now(), now()),
         ('00000000-0000-0000-0000-000000000000', v_player, 'authenticated', 'authenticated',
          'smoke-player@example.test', now(), now());

  insert into public.quizzes (owner_id, title, status)
  values (v_host, 'smoke quiz', 'published')
  returning id into v_quiz;

  insert into public.questions
    (quiz_id, position, prompt, options, correct_option_id, time_limit_ms, points_base)
  values (v_quiz, 1, 'smoke question',
          '[{"id":"a","text":"wrong"},{"id":"b","text":"right"},{"id":"c","text":"other"}]'::jsonb,
          'b', 20000, 1000)
  returning id into v_question;

  insert into public.questions
    (quiz_id, position, prompt, options, correct_option_id, time_limit_ms, points_base)
  values (v_quiz, 2, 'second smoke question',
          '[{"id":"a","text":"one"},{"id":"b","text":"two"}]'::jsonb, 'a', 20000, 1000);

  -- host opens a room
  perform set_config('request.jwt.claims', json_build_object('sub', v_host, 'role', 'authenticated')::text, true);
  v_room := public.create_room(v_quiz);
  v_code := v_room->>'code';
  raise notice 'room code %', v_code;

  -- player joins
  perform set_config('request.jwt.claims', json_build_object('sub', v_player, 'role', 'authenticated')::text, true);
  perform public.join_room(v_code, 'smoke player', '🐧');

  -- host starts
  perform set_config('request.jwt.claims', json_build_object('sub', v_host, 'role', 'authenticated')::text, true);
  perform public.start_game((v_room->>'room_id')::uuid);

  -- CHECK 1: the question payload a player receives contains no answer key
  perform set_config('request.jwt.claims', json_build_object('sub', v_player, 'role', 'authenticated')::text, true);
  v_state := public.sync_room((v_room->>'room_id')::uuid);
  if (v_state->'question') ? 'correct_option_id' then
    raise exception 'FAIL: sync_room leaked correct_option_id';
  end if;
  if (v_state->'question'->'options'->0) ? 'correct' then
    raise exception 'FAIL: an option object mentions correctness';
  end if;

  -- CHECK 2: first answer is accepted and reveals nothing about correctness
  v_first := public.submit_answer((v_room->>'room_id')::uuid, v_question, 'b');
  if not (v_first->>'accepted')::boolean then
    raise exception 'FAIL: first answer was not accepted';
  end if;
  if (v_first::text) like '%correct%' or v_first ? 'points' then
    raise exception 'FAIL: submit_answer returned correctness or points';
  end if;

  -- CHECK 3: a second answer for the same question fails at the database
  begin
    v_second := public.submit_answer((v_room->>'room_id')::uuid, v_question, 'c');
    raise exception 'FAIL: a second answer was accepted';
  exception
    when unique_violation then
      null; -- expected
  end;

  -- CHECK 4: an answer after ends_at + 750ms is stored as rejected_late, for zero
  perform set_config('request.jwt.claims', json_build_object('sub', v_host, 'role', 'authenticated')::text, true);
  update public.rooms set question_ends_at = now() - interval '2 seconds'
  where id = (v_room->>'room_id')::uuid;

  v_payload := public.submit_answer((v_room->>'room_id')::uuid, v_question, 'b');
  if (v_payload->>'accepted')::boolean then
    raise exception 'FAIL: a late answer was accepted';
  end if;

  select count(*) into v_rows from public.answers a
  where a.room_id = (v_room->>'room_id')::uuid
    and a.question_id = v_question
    and a.status = 'rejected_late'
    and a.points = 0;
  if v_rows <> 1 then
    raise exception 'FAIL: expected one rejected_late row, found %', v_rows;
  end if;

  -- CHECK 5: close_question is the first place the key appears
  v_reveal := public.close_question((v_room->>'room_id')::uuid);
  if v_reveal->>'correct_option_id' is distinct from 'b' then
    raise exception 'FAIL: reveal did not carry the key';
  end if;
  if (v_reveal->'distribution'->>'b')::int <> 1 then
    raise exception 'FAIL: distribution wrong: %', v_reveal->'distribution';
  end if;

  -- CHECK 6: the player who answered correctly leads the board
  select l.display_name into v_top
  from public.leaderboard_rows((v_room->>'room_id')::uuid) l
  where l.rank = 1;
  if v_top is distinct from 'smoke player' then
    raise exception 'FAIL: leaderboard top is %, expected the player', v_top;
  end if;

  -- CHECK 7: the host advances, and the run finishes after the last question
  perform set_config('request.jwt.claims', json_build_object('sub', v_host, 'role', 'authenticated')::text, true);
  perform public.next_question((v_room->>'room_id')::uuid);
  perform public.close_question((v_room->>'room_id')::uuid);
  perform public.next_question((v_room->>'room_id')::uuid);

  select count(*) into v_rows from public.rooms
  where id = (v_room->>'room_id')::uuid and status = 'finished';
  if v_rows <> 1 then
    raise exception 'FAIL: room did not finish';
  end if;

  raise notice 'all doctrine checks passed';
end;
$$;

-- CHECK 8: the answer key is not readable by a plain authenticated user.
do $$
begin
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}', true);
    perform count(*) from public.questions;
    raise exception 'FAIL: authenticated could select from public.questions';
  exception
    when insufficient_privilege then
      null; -- expected: the grant is revoked
  end;
end;
$$;

rollback;

\echo 'smoke.sql finished'
