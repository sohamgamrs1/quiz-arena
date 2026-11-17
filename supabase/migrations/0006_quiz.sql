-- 0006_quiz.sql — authoring. The editor writes through one transactional function,
-- so a malformed import can never be half-saved.

create or replace function public.upsert_quiz(p_quiz jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_title text;
  v_q jsonb;
  v_opt jsonb;
  v_opts jsonb;
  v_new_opts jsonb;
  v_new_id text;
  v_correct_in text;
  v_correct_out text;
  v_idx int;
  v_pos int := 0;
  v_count int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_title := nullif(btrim(coalesce(p_quiz->>'title', '')), '');
  if v_title is null then
    raise exception 'a quiz needs a title' using errcode = 'P0001';
  end if;

  v_id := public.safe_uuid(coalesce(p_quiz->>'id', ''));

  if v_id is null then
    insert into public.quizzes (owner_id, title, description, cover_emoji)
    values (
      v_uid,
      left(v_title, 120),
      nullif(btrim(coalesce(p_quiz->>'description', '')), ''),
      coalesce(nullif(p_quiz->>'cover_emoji', ''), '🎯'))
    returning id into v_id;
  else
    update public.quizzes z
       set title = left(v_title, 120),
           description = nullif(btrim(coalesce(p_quiz->>'description', '')), ''),
           cover_emoji = coalesce(nullif(p_quiz->>'cover_emoji', ''), z.cover_emoji),
           updated_at = now()
     where z.id = v_id and z.owner_id = v_uid;

    if not found then
      raise exception 'quiz not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.questions q where q.quiz_id = v_id;

  for v_q in
    select value from jsonb_array_elements(coalesce(p_quiz->'questions', '[]'::jsonb))
  loop
    v_pos := v_pos + 1;

    if nullif(btrim(coalesce(v_q->>'prompt', '')), '') is null then
      raise exception 'question % has no prompt', v_pos using errcode = 'P0001';
    end if;

    v_opts := coalesce(v_q->'options', '[]'::jsonb);
    if jsonb_typeof(v_opts) <> 'array'
       or jsonb_array_length(v_opts) < 2
       or jsonb_array_length(v_opts) > 6 then
      raise exception 'question % needs between 2 and 6 options', v_pos using errcode = 'P0001';
    end if;

    v_correct_in := nullif(btrim(coalesce(v_q->>'correct_option_id', '')), '');
    if v_correct_in is null then
      raise exception 'question % has no correct option', v_pos using errcode = 'P0001';
    end if;

    -- Option ids are reassigned here, in a shuffled order, so option order carries
    -- no signal about the answer (the author never chooses "b is correct" in a way
    -- a client could learn from).
    v_new_opts := '[]'::jsonb;
    v_correct_out := null;
    v_idx := 0;

    for v_opt in
      select value from jsonb_array_elements(v_opts) order by random()
    loop
      v_idx := v_idx + 1;
      v_new_id := substr('abcdef', v_idx, 1);

      if nullif(btrim(coalesce(v_opt->>'text', '')), '') is null then
        raise exception 'question % has an empty option', v_pos using errcode = 'P0001';
      end if;

      if (v_opt->>'id') = v_correct_in then
        v_correct_out := v_new_id;
      end if;

      v_new_opts := v_new_opts || jsonb_build_array(
        jsonb_build_object('id', v_new_id, 'text', left(btrim(v_opt->>'text'), 120)));
    end loop;

    if v_correct_out is null then
      raise exception 'question % names a correct option that does not exist', v_pos
        using errcode = 'P0001';
    end if;

    insert into public.questions
      (quiz_id, position, prompt, options, correct_option_id, time_limit_ms, points_base, explanation)
    values (
      v_id,
      v_pos,
      left(btrim(v_q->>'prompt'), 500),
      v_new_opts,
      v_correct_out,
      least(greatest(coalesce(nullif(v_q->>'time_limit_ms', '')::int, 20000), 5000), 60000),
      least(greatest(coalesce(nullif(v_q->>'points_base', '')::int, 1000), 0), 5000),
      nullif(btrim(coalesce(v_q->>'explanation', '')), ''));

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'a quiz needs at least one question' using errcode = 'P0001';
  end if;

  return jsonb_build_object('quiz_id', v_id, 'question_count', v_count);
end;
$$;

create or replace function public.publish_quiz(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
  v_bad int;
begin
  if not exists (
    select 1 from public.quizzes z where z.id = p_quiz_id and z.owner_id = auth.uid()
  ) then
    raise exception 'quiz not found' using errcode = 'P0002';
  end if;

  select count(*) into v_count from public.questions q where q.quiz_id = p_quiz_id;
  if v_count = 0 then
    raise exception 'add at least one question before publishing' using errcode = 'P0001';
  end if;

  select count(*) into v_bad
  from public.questions q
  where q.quiz_id = p_quiz_id
    and not exists (
      select 1 from jsonb_array_elements(q.options) o
      where o->>'id' = q.correct_option_id
    );

  if v_bad > 0 then
    raise exception '% question(s) are missing a valid correct option', v_bad
      using errcode = 'P0001';
  end if;

  update public.quizzes z
     set status = 'published', updated_at = now()
   where z.id = p_quiz_id;

  return jsonb_build_object('quiz_id', p_quiz_id, 'status', 'published', 'question_count', v_count);
end;
$$;

create or replace function public.unpublish_quiz(p_quiz_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.quizzes z
     set status = 'draft', updated_at = now()
   where z.id = p_quiz_id and z.owner_id = auth.uid();
$$;

-- The only path that ever returns correct_option_id, and only to the quiz owner.
-- A host needs the key to edit their own quiz; nobody else can read it, and it is
-- never part of a live room payload.
create or replace function public.get_quiz_for_edit(p_quiz_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_quiz public.quizzes;
  v_questions jsonb;
begin
  select * into v_quiz from public.quizzes z where z.id = p_quiz_id;
  if not found then
    raise exception 'quiz not found' using errcode = 'P0002';
  end if;
  if v_quiz.owner_id <> auth.uid() then
    raise exception 'that quiz is not yours' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', q.id,
           'position', q.position,
           'prompt', q.prompt,
           'options', q.options,
           'correct_option_id', q.correct_option_id,
           'time_limit_ms', q.time_limit_ms,
           'points_base', q.points_base,
           'explanation', q.explanation) order by q.position), '[]'::jsonb)
    into v_questions
  from public.questions q
  where q.quiz_id = p_quiz_id;

  return jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'cover_emoji', v_quiz.cover_emoji,
    'status', v_quiz.status,
    'share_slug', v_quiz.share_slug,
    'questions', v_questions);
end;
$$;

create or replace function public.delete_quiz(p_quiz_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.quizzes z where z.id = p_quiz_id and z.owner_id = auth.uid();
  if not found then
    raise exception 'quiz not found' using errcode = 'P0002';
  end if;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.upsert_quiz(jsonb)',
    'public.publish_quiz(uuid)',
    'public.unpublish_quiz(uuid)',
    'public.get_quiz_for_edit(uuid)',
    'public.delete_quiz(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
