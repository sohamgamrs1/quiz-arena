export type RoomStatus = 'lobby' | 'question' | 'reveal' | 'finished' | 'abandoned';
export type RoomMode = 'live' | 'solo' | 'async';
export type AnswerStatus = 'correct' | 'wrong' | 'timeout' | 'rejected_late';

export interface Option {
  id: string;
  text: string;
}

/** What a client is allowed to know about a live question. No key, ever. */
export interface LiveQuestion {
  question_id: string;
  prompt: string;
  options: Option[];
  time_limit_ms: number;
  points_base: number;
  started_at?: string;
  ends_at: string;
  explanation?: string;
  answered_count?: number;
}

export interface MyAnswer {
  option_id: string | null;
  status: AnswerStatus;
  points: number;
}

export interface RevealPayload {
  correct_option_id: string;
  distribution: Record<string, number>;
  revealed_at: string;
}

export interface LeaderboardRow {
  player_id: string;
  name: string;
  avatar_emoji: string;
  score: number;
  streak?: number;
  rank: number;
  delta: number;
  is_me?: boolean;
}

export interface SeatInfo {
  player_id: string;
  display_name: string;
  avatar_emoji: string;
  score: number;
  streak: number;
}

export interface QuizInfo {
  id: string;
  title: string;
  cover_emoji: string;
}

export interface RoomState {
  room_id: string;
  code: string;
  mode: RoomMode;
  status: RoomStatus;
  index: number;
  total_questions: number;
  server_now: string;
  is_host: boolean;
  me: SeatInfo;
  quiz: QuizInfo;
  player_count: number;
  leaderboard: LeaderboardRow[];
  question: LiveQuestion | null;
  reveal: RevealPayload | null;
  my_answer: MyAnswer | null;
}

export interface JoinResult {
  room_id: string;
  player_id: string;
  rejoined: boolean;
  room_status: RoomStatus;
  current_index: number;
}

export interface RoomPeek {
  room_id: string;
  code: string;
  status: RoomStatus;
  mode: RoomMode;
  quiz_title: string;
  cover_emoji: string;
  player_count: number;
}

export interface SubmitResult {
  accepted: boolean;
  locked_at?: string;
  reason?: 'late';
}

export interface QuestionDraft {
  id?: string;
  prompt: string;
  options: Option[];
  correct_option_id: string;
  time_limit_ms: number;
  points_base: number;
  explanation?: string;
}

export interface QuizDraft {
  id?: string;
  title: string;
  description?: string;
  cover_emoji?: string;
  questions: QuestionDraft[];
}

export interface QuizRecord extends QuizDraft {
  id: string;
  status: 'draft' | 'published';
  share_slug: string;
  questions: QuestionDraft[];
}

export interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  cover_emoji: string;
  status: 'draft' | 'published';
  share_slug: string;
  created_at: string;
}

export interface ChallengeInfo {
  quiz_id: string;
  title: string;
  description: string | null;
  cover_emoji: string;
  question_count: number;
  owner_name: string;
}

export type GameEventName =
  | 'room_created'
  | 'player_joined'
  | 'player_left'
  | 'room_abandoned'
  | 'game_started'
  | 'question_started'
  | 'question_closed'
  | 'leaderboard_updated'
  | 'game_finished';

export interface GameEvent {
  seq: number;
  event: GameEventName;
  payload: Record<string, unknown>;
}

export type ConnectionState = 'idle' | 'connecting' | 'live' | 'offline';

export interface Profile {
  id: string;
  display_name: string;
  avatar_emoji: string;
}
