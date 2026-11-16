# Architecture

The whole design exists to answer one question: *what does a cheating player have to
work with?* Eight rules follow from that. Each one names the file that enforces it and
what would break if it were removed.

---

## R1 — the answer key never reaches the client before the question closes

| Where | What it does |
|---|---|
| `supabase/migrations/0002_views_and_grants.sql` | `public.questions` is revoked from `anon` and `authenticated`; clients read `v_questions`, which does not select `correct_option_id`. |
| `supabase/migrations/0005_game.sql` — `get_question`, `sync_room` | Both build their payload key by key. The key is not in the row they return. |
| `supabase/migrations/0004_helpers.sql` — `emit` | Broadcast payloads are built by the caller. `question_started` carries `question_id` and `ends_at`, nothing more. |
| `lib/types.ts` — `LiveQuestion` | The client's type for a live question has no field that could hold the answer. A component cannot accidentally render one. |

The reveal is a separate row: `public.reveals`, written only by `close_question`, and
read through `get_reveal` / `sync_room`. Before that row exists, there is nothing to
read.

## R2 — scoring is computed on the server, from server timestamps

`submit_answer` (`0005_game.sql`) takes three arguments: `room_id`, `question_id`,
`option_id`. There is no fourth. It reads `now()` and `rooms.question_started_at`
inside the transaction, computes `elapsed`, `speed` and `points`, writes them, and
returns `{ accepted, locked_at }`.

`lib/api.ts` sends exactly those three values. There is no client code that can post a
score, a duration, or a timestamp, because no function accepts one.

## R3 — correctness is not revealed on submit

`submit_answer` returns `{ accepted: true, locked_at }` on success and
`{ accepted: false, reason: 'late' }` on a late attempt. It never returns whether the
answer was right, how many points it earned, or what the correct option was.

Why it matters: if the response said "wrong", a player with a second device could
submit, learn, and relay the answer to a friend still inside the window. The reveal
happens once, in `close_question`, to everybody at the same moment.

`components/screens/RevealScreen.tsx` is the only place in the app that shows
correctness, and it renders from `room.reveal`, which only exists after close.

## R4 — one answer per player per question, enforced by the database

```sql
unique (room_id, question_id, player_id)   -- answers
```

`submit_answer` checks for an existing row first so the client gets a clean
`already answered` message, but the check is not the enforcement — the unique index
is. Two concurrent requests cannot both insert.

`supabase/tests/smoke.sql` asserts this by attempting a second insert and expecting a
`unique_violation`.

## R5 — answers are rejected after the deadline, using the database clock

In `submit_answer`:

```sql
v_late := v_now > (v_room.question_ends_at + interval '750 milliseconds');
```

A late row is still written, with `status = 'rejected_late'` and `points = 0`, so the
log tells you what happened. The streak resets.

The client never sends a time. `lib/useCountdown.ts` and `format.ts:clockOffsetMs`
correct the on-screen timer against `server_now` so the ring does not lie on a device
with a wrong clock — but the ring is decoration. The server's `now()` decides.

## R6 — private Realtime channels with authorisation

`0007_realtime.sql` installs a `select` policy on `realtime.messages` that admits a
subscriber only if `public.players` has a seat for `auth.uid()` in the room named by
the topic. Topics other than `room:*` are refused.

There is deliberately **no insert policy**: clients cannot broadcast. Every game event
is written by a `SECURITY DEFINER` function and fanned out by `realtime.send`. A player
cannot forge a `question_closed` or a `leaderboard_updated`.

`lib/realtime.ts` subscribes with `{ config: { private: true } }`. `room_events`
carries RLS of its own (`0003_rls.sql`), so the durable change feed is protected by the
same seat test.

## R7 — column-level protection on the answer key

Row level security hides rows, not columns. So:

```sql
revoke all on public.questions from anon, authenticated;
grant select on public.v_questions to anon, authenticated;
```

`v_questions` omits `correct_option_id` and filters to published quizzes plus the
caller's own. The one audited path that returns the key is
`get_quiz_for_edit(quiz_id)` (`0006_quiz.sql`), which raises unless
`quizzes.owner_id = auth.uid()` — an owner editing their own quiz needs to see the
answer they wrote. That is a different moment from a live room, and it is never
reachable while a question is open.

## R8 — no service-role key, no secrets, anywhere in the client bundle

`.env.example` lists two placeholder names and no values. `lib/supabase.ts` reads only
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Everything privileged
is a `SECURITY DEFINER` function with `set search_path = public, pg_temp`, revoked from
`public` and `anon`, granted to `authenticated` only.

`search_path` is pinned on every function, which is what stops the classic attack: a
user creates `public.now()` or `public.players` in a schema that wins the search path,
and a definer function calls it with the owner's rights.

---

## Realtime protocol

One private channel per room, `room:{room_id}`. Every payload is wrapped:

```json
{ "seq": 412, "event": "question_closed", "payload": { … } }
```

| Event | Payload |
|---|---|
| `room_created` | `{ code }` |
| `player_joined` | `{ player_id, display_name, avatar_emoji, rejoined }` |
| `game_started` | `{ total_questions }` |
| `question_started` | `{ index, question_id, ends_at, server_now, total_questions }` |
| `question_closed` | `{ question_id, correct_option_id, distribution, explanation, revealed_at }` |
| `leaderboard_updated` | `{ top: […], your_rank }` |
| `game_finished` | `{ final_leaderboard }` |

`seq` is the `room_events` primary key. `lib/store.ts:acceptEvent` drops anything it
has already applied, so the broadcast and the change feed can both arrive without
double-counting.

### Why three sources of truth

1. **Broadcast** — lowest latency, one hop, best effort.
2. **Postgres Changes on `room_events`** — durable. If a broadcast is missed, the row
   still arrives, RLS permitting.
3. **`sync_room`** — authoritative. Called on subscribe, on reconnect, on foreground,
   and every 10 seconds as a floor.

The client never trusts its own state for anything that scores. `sync_room` returns
the room status, the live question, the caller's own answer, the reveal if one exists,
and the leaderboard — one call rebuilds the entire screen, which is what makes a phone
locking mid-question a non-event.

---

## Edge cases and the decision taken

| Case | Behaviour |
|---|---|
| Host disconnects mid-game | The room keeps its timers. Any seat-holder may call `close_question` once the deadline has passed (and 750ms), so the game cannot stall. Players see the offline banner, not a dead screen. |
| Player joins after the start | Allowed, and they play **from the next question**. `close_question` only writes timeout rows for players whose `joined_at` is before `question_started_at`, so a late joiner is not penalised for questions they never saw. |
| Player drops and returns | `join_room` with the same code returns the existing seat with its score. |
| Two players tie | `score desc, last_correct_at asc nulls last, joined_at asc, id asc` — deterministic and stable. |
| Zero players at start | `start_game` requires 2 seats in a live room (`1` in solo/async) and raises a readable message; the lobby disables the button and says why. |
| Draft quiz hosted | `create_room` and `start_solo` require `status = 'published'`. |
| Duplicate display names | Allowed; the avatar emoji disambiguates, and every row is keyed by `player_id`. |
| Bad CSV/JSON import | `lib/importQuiz.ts` returns row-numbered issues and a `null` quiz; the editor imports nothing. `upsert_quiz` is a single transaction, so a partial save is impossible even if the client is wrong. |
| Malformed option ids | `submit_answer` checks the option exists on the live question before writing. |
| Editing a published quiz mid-game | The room holds its own `quiz_id`; a live game reads questions by position from the same quiz. Editing pulls the quiz through `upsert_quiz`, which replaces questions — so hosts are advised (in the editor copy) to publish before going live, and an in-flight room should finish first. |

---

## What is still worth doing

- A cron (pg_cron or a scheduled function) to prune finished rooms and old events.
- Rate limiting on `submit_answer` per user, at the edge, if you expect hostile traffic.
- pgTAP versions of `smoke.sql` for CI, rather than the psql script.
- Email upgrade path: `supabase.auth.updateUser({ email })` keeps the same user id, so
  seats and scores carry over untouched.
