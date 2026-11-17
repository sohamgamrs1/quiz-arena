import type { ConnectionState, GameEvent, GameEventName } from './types';
import { mock } from './mock';
import { MOCK_MODE, supabase } from './supabase';

export interface RoomHandlers {
  onEvent: (event: GameEvent) => void;
  onConnection: (state: ConnectionState) => void;
}

function normalise(raw: unknown): GameEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const seq = typeof value.seq === 'number' ? value.seq : 0;
  const event = typeof value.event === 'string' ? (value.event as GameEventName) : null;
  if (!event) return null;
  const payload =
    typeof value.payload === 'object' && value.payload !== null
      ? (value.payload as Record<string, unknown>)
      : {};
  return { seq, event, payload };
}

/**
 * R6: the channel is private, so subscribing only succeeds if Realtime
 * Authorization finds a seat for this user in this room (0007_realtime.sql).
 * Clients receive; they never broadcast.
 */
export function subscribeRoom(roomId: string, handlers: RoomHandlers): () => void {
  if (MOCK_MODE) {
    handlers.onConnection('live');
    const off = mock.subscribe((event) => handlers.onEvent(event));
    return off;
  }

  handlers.onConnection('connecting');

  const channel = supabase.channel(`room:${roomId}`, {
    config: { private: true },
  });

  channel
    .on('broadcast', { event: 'game' }, (message) => {
      const event = normalise(message.payload);
      if (event) handlers.onEvent(event);
    })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'room_events', filter: `room_id=eq.${roomId}` },
      (message) => {
        const event = normalise(message.new);
        if (event) handlers.onEvent(event);
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') handlers.onConnection('live');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        handlers.onConnection('offline');
      } else {
        handlers.onConnection('connecting');
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
