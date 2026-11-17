import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoomMode } from './types';

const KEY = 'quiz-arena.history.v1';
const LIMIT = 20;

export interface HistoryEntry {
  quizTitle: string;
  emoji: string;
  score: number;
  rank: number;
  players: number;
  mode: RoomMode;
  at: string;
}

export async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function recordGame(entry: HistoryEntry): Promise<void> {
  const existing = await readHistory();
  const next = [entry, ...existing].slice(0, LIMIT);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
