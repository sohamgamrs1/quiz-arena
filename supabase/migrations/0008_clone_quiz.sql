-- 0008_clone_quiz.sql — copy a published quiz into your own account.
--
-- The seed ships a demo quiz owned by the demo host, and create_room requires the
-- host to own the quiz. Without this, a new account sees the starter bank and gets
-- "that quiz is not yours" when it tries to host it.

create or replace function public.clone_quiz(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_src public.quizzes;
  v_new uuid;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_src from public.quizzes z where z.id = p_quiz_id;
  if not found then
    raise exception 'quiz not found' using errcode = 'P0002';
  end if;
  if v_src.owner_id <> v_uid and v_src.status <> 'published' then
    raise exception 'quiz not available' using errcode = '42501';
  end if;

  insert into public.quizzes (owner_id, title, description, cover_emoji, status)
  values (v_uid, left(v_src.title || ' (copy)', 120), v_src.description, v_src.cover_emoji, v_src.status)
  returning id into v_new;

  insert into public.questions
    (quiz_id, position, prompt, options, correct_option_id, time_limit_ms, points_base, explanation)
  select v_new, q.position, q.prompt, q.options, q.correct_option_id,
         q.time_limit_ms, q.points_base, q.explanation
  from public.questions q
  where q.quiz_id = p_quiz_id
  order by q.position;

  select count(*) into v_count from public.questions q where q.quiz_id = v_new;

  return jsonb_build_object('quiz_id', v_new, 'question_count', v_count);
end;
$$;

revoke all on function public.clone_quiz(uuid) from public;
revoke all on function public.clone_quiz(uuid) from anon;
grant execute on function public.clone_quiz(uuid) to authenticated;
