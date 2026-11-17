/**
 * Dev-only in-memory stand-in for the Supabase backend (EXPO_PUBLIC_MOCK=1).
 *
 * It exists so Phase 1 screens can be clicked through before a project exists, and
 * so the design can be reviewed on a plane. It is not a security model: it lives in
 * the bundle and it knows the answers. Production builds ignore the flag entirely
 * (see supabase.ts), and the questions below are about this app, not quiz content.
 */
import type {
  AnswerStatus,
  GameEvent,
  GameEventName,
  LeaderboardRow,
  Option,
  QuizDraft,
  QuizRecord,
  QuizSummary,
  RevealPayload,
  RoomMode,
  RoomState,
  RoomStatus,
  SeatInfo,
} from './types';

interface MockQuestion {
  id: string;
  prompt: string;
  options: Option[];
  correct: string;
  time_limit_ms: number;
  points_base: number;
  explanation: string;
}

interface MockAnswer {
  optionId: string | null;
  status: AnswerStatus;
  points: number;
  elapsedMs: number;
}

interface MockPlayer {
  id: string;
  name: string;
  emoji: string;
  score: number;
  streak: number;
  isHost: boolean;
  isMe: boolean;
  joinedAt: number;
  lastCorrectAt: number | null;
}

interface MockRoom {
  id: string;
  code: string;
  mode: RoomMode;
  status: RoomStatus;
  index: number;
  quizId: string;
  title: string;
  emoji: string;
  startedAt: number;
  endsAt: number;
  players: MockPlayer[];
  answers: Record<string, Record<string, MockAnswer>>;
  reveal: RevealPayload | null;
  seq: number;
}

const QUESTIONS: MockQuestion[] = [
  {
    id: 'mock-q1',
    prompt: 'Where is a player\u2019s score computed?',
    options: [
      { id: 'a', text: 'On the client, then sent up' },
      { id: 'b', text: 'On the server, from server timestamps' },
      { id: 'c', text: 'In the Realtime channel' },
      { id: 'd', text: 'In the room code' },
    ],
    correct: 'b',
    time_limit_ms: 20000,
    points_base: 1000,
    explanation: 'The client sends only room, question and option. The database scores it.',
  },
  {
    id: 'mock-q2',
    prompt: 'When does a player learn the correct option?',
    options: [
      { id: 'a', text: 'The moment they submit' },
      { id: 'b', text: 'When they join the room' },
      { id: 'c', text: 'Only when the question closes' },
      { id: 'd', text: 'In the lobby' },
    ],
    correct: 'c',
    time_limit_ms: 20000,
    points_base: 1000,
    explanation: 'Revealing on submit would let a second device relay the answer.',
  },
  {
    id: 'mock-q3',
    prompt: 'What enforces one answer per player per question?',
    options: [
      { id: 'a', text: 'A unique database constraint' },
      { id: 'b', text: 'A disabled button' },
      { id: 'c', text: 'A client-side check' },
      { id: 'd', text: 'The countdown timer' },
    ],
    correct: 'a',
    time_limit_ms: 20000,
    points_base: 1000,
    explanation: 'The second insert has to fail at the database, not in the UI.',
  },
  {
    id: 'mock-q4',
    prompt: 'How many font weights does the design system allow?',
    options: [
      { id: 'a', text: 'Two' },
      { id: 'b', text: 'Three' },
      { id: 'c', text: 'Four' },
      { id: 'd', text: 'As many as needed' },
    ],
    correct: 'a',
    time_limit_ms: 15000,
    points_base: 1000,
    explanation: '400 and 600. A third weight is a bug.',
  },
  {
    id: 'mock-q5',
    prompt: 'What may a private room channel be used for?',
    options: [
      { id: 'a', text: 'Sending game events from the client' },
      { id: 'b', text: 'Anything a logged-in user wants' },
      { id: 'c', text: 'Reading the live stream, if you hold a seat' },
      { id: 'd', text: 'Storing scores' },
    ],
    correct: 'c',
    time_limit_ms: 20000,
    points_base: 1000,
    explanation: 'Clients only receive. The server authors every event.',
  },
];

const BOT_NAMES: Array<[string, string]> = [
  ['asha', '🦊'],
  ['ravi', '🐧'],
  ['meera', '🌻'],
  ['dev', '🐙'],
];

const listeners = new Set<(e: GameEvent) => void>();
const timers: ReturnType<typeof setTimeout>[] = [];
let room: MockRoom | null = null;
let meId = 'me';
let seq = 0;

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

function code6(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet.charAt(rand(alphabet.length));
  return out;
}

function emit(event: GameEventName, payload: Record<string, unknown>): void {
  if (!room) return;
  seq += 1;
  room.seq = seq;
  const e: GameEvent = { seq, event, payload };
  listeners.forEach((fn) => fn(e));
}

function questionAt(index: number): MockQuestion | null {
  return QUESTIONS[index] ?? null;
}

function answerMap(questionId: string): Record<string, MockAnswer> {
  if (!room) return {};
  const existing = room.answers[questionId];
  if (existing) return existing;
  const created: Record<string, MockAnswer> = {};
  room.answers[questionId] = created;
  return created;
}

function leaderboard(): LeaderboardRow[] {
  if (!room) return [];
  const ranked = [...room.players].sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    const xc = x.lastCorrectAt ?? Number.MAX_SAFE_INTEGER;
    const yc = y.lastCorrectAt ?? Number.MAX_SAFE_INTEGER;
    if (xc !== yc) return xc - yc;
    return x.joinedAt - y.joinedAt;
  });
  return ranked.map((p, i) => ({
    player_id: p.id,
    name: p.name,
    avatar_emoji: p.emoji,
    score: p.score,
    streak: p.streak,
    rank: i + 1,
    delta: 0,
    is_me: p.isMe,
  }));
}

function scheduleBots(): void {
  if (!room) return;
  const q = questionAt(room.index);
  if (!q) return;
  room.players
    .filter((p) => !p.isMe)
    .forEach((bot) => {
      const delay = 1800 + rand(Math.max(1000, q.time_limit_ms - 3000));
      const t = setTimeout(() => {
        if (!room || room.status !== 'question') return;
        const gotIt = Math.random() < 0.55;
        const wrong = q.options.filter((o) => o.id !== q.correct);
        const pick = gotIt ? q.correct : wrong[rand(wrong.length)]?.id ?? q.correct;
        record(bot, q, pick, delay);
      }, delay);
      timers.push(t);
    });
}

function record(player: MockPlayer, q: MockQuestion, optionId: string, elapsedMs: number): void {
  const map = answerMap(q.id);
  if (map[player.id]) return;
  const correct = optionId === q.correct;
  const speed = Math.max(0, 1 - elapsedMs / q.time_limit_ms);
  const points = correct
    ? Math.round(q.points_base * (0.5 + 0.5 * speed)) + Math.min(player.streak, 5) * 50
    : 0;
  map[player.id] = {
    optionId,
    status: correct ? 'correct' : 'wrong',
    points,
    elapsedMs,
  };
  player.score += points;
  player.streak = correct ? player.streak + 1 : 0;
  if (correct) player.lastCorrectAt = Date.now();
}

function openQuestion(index: number): void {
  if (!room) return;
  const q = questionAt(index);
  if (!q) {
    room.status = 'finished';
    emit('game_finished', { final_leaderboard: leaderboard() });
    return;
  }
  room.status = 'question';
  room.index = index;
  room.startedAt = Date.now();
  room.endsAt = room.startedAt + q.time_limit_ms;
  room.reveal = null;
  emit('question_started', {
    index,
    question_id: q.id,
    ends_at: new Date(room.endsAt).toISOString(),
    server_now: new Date().toISOString(),
    total_questions: QUESTIONS.length,
  });
  scheduleBots();
}

function seat(): SeatInfo {
  if (!room) throw new Error('no room');
  const me = room.players.find((p) => p.isMe);
  if (!me) throw new Error('you are not in this room');
  return {
    player_id: me.id,
    display_name: me.name,
    avatar_emoji: me.emoji,
    score: me.score,
    streak: me.streak,
  };
}

function roomState(): RoomState {
  if (!room) throw new Error('room not found');
  const q = questionAt(room.index);
  const reveal = room.reveal;
  const map = q ? answerMap(q.id) : {};
  const mine = q ? map[meId] : undefined;
  const showQuestion = room.status === 'question' || room.status === 'reveal' || room.status === 'finished';

  return {
    room_id: room.id,
    code: room.code,
    mode: room.mode,
    status: room.status,
    index: room.index,
    total_questions: QUESTIONS.length,
    server_now: new Date().toISOString(),
    is_host: true,
    me: seat(),
    quiz: { id: room.quizId, title: room.title, cover_emoji: room.emoji },
    player_count: room.players.length,
    leaderboard: leaderboard(),
    question:
      q && showQuestion
        ? {
            question_id: q.id,
            prompt: q.prompt,
            options: q.options,
            time_limit_ms: q.time_limit_ms,
            points_base: q.points_base,
            started_at: new Date(room.startedAt).toISOString(),
            ends_at: new Date(room.endsAt).toISOString(),
            explanation: reveal ? q.explanation : undefined,
            answered_count: Object.keys(map).length,
          }
        : null,
    reveal,
    my_answer: mine
      ? { option_id: mine.optionId, status: mine.status, points: mine.points }
      : null,
  };
}

function createRoom(mode: RoomMode): { room_id: string; code: string } {
  const id = `mock-${Math.random().toString(36).slice(2, 10)}`;
  room = {
    id,
    code: code6(),
    mode,
    status: 'lobby',
    index: -1,
    quizId: 'mock-quiz',
    title: 'How Quiz Arena works',
    emoji: '🎯',
    startedAt: 0,
    endsAt: 0,
    players: [
      { id: meId, name: 'you', emoji: '🙂', score: 0, streak: 0, isHost: true, isMe: true, joinedAt: Date.now(), lastCorrectAt: null },
      ...BOT_NAMES.map<MockPlayer>(([name, emoji], i) => ({
        id: `bot-${i}`,
        name,
        emoji,
        score: 0,
        streak: 0,
        isHost: false,
        isMe: false,
        joinedAt: Date.now() + i,
        lastCorrectAt: null,
      })),
    ],
    answers: {},
    reveal: null,
    seq: 0,
  };
  return { room_id: id, code: room.code };
}

const demoQuiz: QuizRecord = {
  id: 'mock-quiz',
  title: 'How Quiz Arena works',
  description: 'Five questions the mock engine actually knows.',
  cover_emoji: '🎯',
  status: 'published',
  share_slug: 'mockchallenge',
  questions: QUESTIONS.map((q, i) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    correct_option_id: q.correct,
    time_limit_ms: q.time_limit_ms,
    points_base: q.points_base,
    explanation: q.explanation,
    position: i + 1,
  })) as QuizRecord['questions'],
};

function close(): Record<string, unknown> {
  if (!room) throw new Error('room not found');
  const q = questionAt(room.index);
  if (!q) throw new Error('there is no live question');
  const map = answerMap(q.id);

  room.players.forEach((p) => {
    if (!map[p.id]) {
      map[p.id] = { optionId: null, status: 'timeout', points: 0, elapsedMs: q.time_limit_ms };
      p.streak = 0;
    }
  });

  const distribution: Record<string, number> = {};
  q.options.forEach((o) => {
    distribution[o.id] = 0;
  });
  Object.values(map).forEach((a) => {
    if (a.optionId && (a.status === 'correct' || a.status === 'wrong')) {
      distribution[a.optionId] = (distribution[a.optionId] ?? 0) + 1;
    }
  });

  room.reveal = {
    correct_option_id: q.correct,
    distribution,
    revealed_at: new Date().toISOString(),
  };
  room.status = 'reveal';

  emit('question_closed', {
    question_id: q.id,
    correct_option_id: q.correct,
    distribution,
    explanation: q.explanation,
    revealed_at: room.reveal.revealed_at,
  });
  emit('leaderboard_updated', { top: leaderboard().slice(0, 10), your_rank: 1 });

  return { question_id: q.id, ...room.reveal };
}

export const mock = {
  subscribe(fn: (e: GameEvent) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  async rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
    switch (fn) {
      case 'create_room': {
        const created = createRoom('live');
        return created;
      }
      case 'peek_room': {
        if (!room || room.code !== String(args.p_code ?? '').toUpperCase()) return null;
        return {
          room_id: room.id,
          code: room.code,
          status: room.status,
          mode: room.mode,
          quiz_title: room.title,
          cover_emoji: room.emoji,
          player_count: room.players.length,
        };
      }
      case 'join_room': {
        if (!room) throw new Error('no room with that code');
        return {
          room_id: room.id,
          player_id: meId,
          rejoined: true,
          room_status: room.status,
          current_index: room.index,
        };
      }
      case 'leave_room':
        return null;
      case 'start_game': {
        openQuestion(0);
        emit('game_started', { total_questions: QUESTIONS.length });
        return { room_id: room?.id ?? '', total_questions: QUESTIONS.length };
      }
      case 'sync_room':
        return roomState();
      case 'submit_answer': {
        if (!room) throw new Error('room not found');
        const q = questionAt(room.index);
        if (!q || q.id !== args.p_question_id) throw new Error('that question has moved on');
        const map = answerMap(q.id);
        if (map[meId]) throw new Error('you already answered this question');
        const me = room.players.find((p) => p.isMe);
        if (!me) throw new Error('you are not in this room');
        const elapsed = Date.now() - room.startedAt;
        if (elapsed > q.time_limit_ms + 750) {
          map[meId] = { optionId: String(args.p_option_id), status: 'rejected_late', points: 0, elapsedMs: elapsed };
          return { accepted: false, reason: 'late' };
        }
        record(me, q, String(args.p_option_id), elapsed);
        return { accepted: true, locked_at: new Date().toISOString() };
      }
      case 'close_question':
        return close();
      case 'next_question': {
        if (!room) throw new Error('room not found');
        openQuestion(room.index + 1);
        return { state: room.status };
      }
      case 'get_leaderboard':
        return leaderboard();
      case 'start_solo':
      case 'start_async': {
        const created = createRoom(fn === 'start_solo' ? 'solo' : 'async');
        openQuestion(0);
        return { room_id: created.room_id, total_questions: QUESTIONS.length };
      }
      case 'get_challenge':
        return {
          quiz_id: demoQuiz.id,
          title: demoQuiz.title,
          description: demoQuiz.description ?? null,
          cover_emoji: demoQuiz.cover_emoji ?? '🎯',
          question_count: QUESTIONS.length,
          owner_name: 'demo host',
        };
      case 'upsert_quiz': {
        const draft = args.p_quiz as QuizDraft;
        return { quiz_id: draft.id ?? demoQuiz.id, question_count: draft.questions.length };
      }
      case 'publish_quiz':
        return { quiz_id: String(args.p_quiz_id), status: 'published', question_count: QUESTIONS.length };
      case 'unpublish_quiz':
        return null;
      case 'get_quiz_for_edit':
        return demoQuiz;
      case 'delete_quiz':
        return null;
      case 'clone_quiz':
        return { quiz_id: demoQuiz.id, question_count: QUESTIONS.length };
      default:
        throw new Error(`mock: ${fn} is not implemented`);
    }
  },

  listQuizzes(): QuizSummary[] {
    return [
      {
        id: demoQuiz.id,
        title: demoQuiz.title,
        description: demoQuiz.description ?? null,
        cover_emoji: demoQuiz.cover_emoji ?? '🎯',
        status: demoQuiz.status,
        share_slug: demoQuiz.share_slug,
        created_at: new Date().toISOString(),
      },
    ];
  },

  reset(): void {
    timers.forEach((t) => clearTimeout(t));
    timers.length = 0;
    room = null;
    seq = 0;
  },
};
