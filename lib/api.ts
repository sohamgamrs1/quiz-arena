import { MOCK_MODE, supabase } from './supabase';
import { mock } from './mock';
import type {
  ChallengeInfo,
  JoinResult,
  LeaderboardRow,
  QuizDraft,
  QuizRecord,
  QuizSummary,
  RoomPeek,
  RoomState,
  SubmitResult,
} from './types';

/**
 * Every call below is a Postgres function. Nothing here decides correctness,
 * scores a point, or reads an answer key — the client has no code path for it.
 */
async function rpc<TReturn>(fn: string, args: Record<string, unknown> = {}): Promise<TReturn> {
  if (MOCK_MODE) {
    return (await mock.rpc(fn, args)) as TReturn;
  }
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as TReturn;
}

const FRIENDLY: Record<string, string> = {
  'no room with that code': 'no room with that code',
  'that room has ended': 'that room has already ended',
  'that room is full': 'that room is full',
  'already answered': 'you already answered this question',
  'the question is closed': 'that question just closed',
  'that is not the live question': 'that question has moved on',
  'only the host can start the game': 'only the host can start',
  'only the host can advance': 'only the host can advance',
  'at least one player must join before you start': 'waiting for a player to join',
  'this question has not been revealed yet': 'not revealed yet',
  'quiz is not published': 'publish this quiz first',
  'only published quizzes can be hosted': 'publish this quiz first',
};

export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  for (const key of Object.keys(FRIENDLY)) {
    if (raw.toLowerCase().includes(key)) return FRIENDLY[key] ?? raw;
  }
  return raw.replace(/^.*?error:\s*/i, '');
}

export const api = {
  createRoom: (quizId: string) => rpc<{ room_id: string; code: string }>('create_room', { p_quiz_id: quizId }),

  peekRoom: (code: string) => rpc<RoomPeek | null>('peek_room', { p_code: code }),

  joinRoom: (code: string, displayName: string, avatarEmoji: string) =>
    rpc<JoinResult>('join_room', { p_code: code, p_display_name: displayName, p_avatar_emoji: avatarEmoji }),

  leaveRoom: (roomId: string) => rpc<null>('leave_room', { p_room_id: roomId }),

  startGame: (roomId: string) =>
    rpc<{ room_id: string; total_questions: number }>('start_game', { p_room_id: roomId }),

  syncRoom: (roomId: string) => rpc<RoomState>('sync_room', { p_room_id: roomId }),

  submitAnswer: (roomId: string, questionId: string, optionId: string) =>
    rpc<SubmitResult>('submit_answer', {
      p_room_id: roomId,
      p_question_id: questionId,
      p_option_id: optionId,
    }),

  closeQuestion: (roomId: string) => rpc<Record<string, unknown>>('close_question', { p_room_id: roomId }),

  nextQuestion: (roomId: string) => rpc<Record<string, unknown>>('next_question', { p_room_id: roomId }),

  leaderboard: (roomId: string) => rpc<LeaderboardRow[]>('get_leaderboard', { p_room_id: roomId }),

  startSolo: (quizId: string) =>
    rpc<{ room_id: string; total_questions: number }>('start_solo', { p_quiz_id: quizId }),

  getChallenge: (slug: string) => rpc<ChallengeInfo | null>('get_challenge', { p_slug: slug }),

  startAsync: (slug: string) =>
    rpc<{ room_id: string; total_questions: number }>('start_async', { p_slug: slug }),

  listQuizzes: async (): Promise<QuizSummary[]> => {
    if (MOCK_MODE) return mock.listQuizzes();
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, cover_emoji, status, share_slug, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as QuizSummary[];
  },

  saveQuiz: (draft: QuizDraft) =>
    rpc<{ quiz_id: string; question_count: number }>('upsert_quiz', { p_quiz: draft }),

  publishQuiz: (quizId: string) =>
    rpc<{ quiz_id: string; status: string; question_count: number }>('publish_quiz', {
      p_quiz_id: quizId,
    }),

  unpublishQuiz: (quizId: string) => rpc<null>('unpublish_quiz', { p_quiz_id: quizId }),

  getQuizForEdit: (quizId: string) => rpc<QuizRecord>('get_quiz_for_edit', { p_quiz_id: quizId }),

  deleteQuiz: (quizId: string) => rpc<null>('delete_quiz', { p_quiz_id: quizId }),
};
