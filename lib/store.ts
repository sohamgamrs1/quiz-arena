import { create } from 'zustand';
import type { ConnectionState, RoomState } from './types';

interface GameStore {
  room: RoomState | null;
  connection: ConnectionState;
  lastSeq: number;
  /** The option this device has locked in, before the server confirms. */
  pendingOptionId: string | null;
  error: string | null;
  setRoom: (room: RoomState) => void;
  setConnection: (connection: ConnectionState) => void;
  acceptEvent: (seq: number) => boolean;
  setPending: (optionId: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  room: null,
  connection: 'idle',
  lastSeq: 0,
  pendingOptionId: null,
  error: null,

  setRoom: (room) =>
    set((prev) => ({
      room,
      // Keep a local lock only while the server has not registered the answer yet.
      pendingOptionId: room.my_answer ? null : prev.pendingOptionId,
    })),

  setConnection: (connection) => set({ connection }),

  /** Returns false for an event this client has already applied (broadcast + log duplicate). */
  acceptEvent: (seq) => {
    if (seq <= get().lastSeq) return false;
    set({ lastSeq: seq });
    return true;
  },

  setPending: (pendingOptionId) => set({ pendingOptionId }),
  setError: (error) => set({ error }),
  reset: () =>
    set({ room: null, connection: 'idle', lastSeq: 0, pendingOptionId: null, error: null }),
}));
