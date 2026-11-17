-- 0007_realtime.sql — R6. A private broadcast channel per room, and the only people
-- who may listen to it are the people holding a seat in that room.

do $$
begin
  if not exists (
    select 1 from pg_tables where schemaname = 'realtime' and tablename = 'messages'
  ) then
    raise notice 'realtime.messages not present; skipping Realtime authorization setup';
    return;
  end if;

  execute 'alter table realtime.messages enable row level security';

  -- Receive: only seat-holders of room:{id}. No other topic is readable.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'realtime' and tablename = 'messages'
      and policyname = 'room members can receive room broadcasts'
  ) then
    execute $p$
      create policy "room members can receive room broadcasts"
      on realtime.messages
      for select
      to authenticated
      using (
        case
          when realtime.topic() like 'room:%'
            then exists (
              select 1 from public.players p
              where p.room_id = public.safe_uuid(split_part(realtime.topic(), ':', 2))
                and p.user_id = (select auth.uid())
            )
          else false
        end
      )
    $p$;
  end if;

  -- Send: deliberately absent. Clients never author game events; the server does.
  -- Without an insert policy, a player cannot forge a question_closed or a score.
end;
$$;

-- Postgres Changes on room_events is the reconciliation path. It respects RLS
-- (0003_rls.sql), so a lurker still cannot tail another room's event log.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.room_events';
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;
