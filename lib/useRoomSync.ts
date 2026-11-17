import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api, friendlyError } from './api';
import { subscribeRoom } from './realtime';
import { useGameStore } from './store';
import type { RoomState } from './types';

const POLL_MS = 10000;

/**
 * Keeps the screen in step with the server.
 *
 * Three sources of truth, in order: a broadcast (fastest), a Postgres change on
 * room_events (durable), and sync_room (authoritative rebuild). The client timer is
 * display only, so a locked phone or a wrong device clock cannot extend a window.
 */
export function useRoomSync(code: string | undefined) {
  const room = useGameStore((s) => s.room);
  const setRoom = useGameStore((s) => s.setRoom);
  const setConnection = useGameStore((s) => s.setConnection);
  const acceptEvent = useGameStore((s) => s.acceptEvent);
  const setError = useGameStore((s) => s.setError);

  const [roomId, setRoomId] = useState<string | null>(room?.room_id ?? null);
  const [loading, setLoading] = useState(room === null);
  const [error, setLocalError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (id: string): Promise<RoomState | null> => {
      try {
        const next = await api.syncRoom(id);
        if (!mounted.current) return next;
        setRoom(next);
        setLoading(false);
        setLocalError(null);
        return next;
      } catch (err) {
        const message = friendlyError(err);
        if (mounted.current) {
          setLocalError(message);
          setError(message);
          setLoading(false);
        }
        return null;
      }
    },
    [setRoom, setError],
  );

  // Resolve the room code to an id once, then stay on the id.
  useEffect(() => {
    if (roomId || !code) return;
    let cancelled = false;

    (async () => {
      try {
        const peek = await api.peekRoom(code);
        if (cancelled) return;
        if (!peek) {
          setLocalError('no room with that code');
          setLoading(false);
          return;
        }
        setRoomId(peek.room_id);
      } catch (err) {
        if (cancelled) return;
        setLocalError(friendlyError(err));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, roomId]);

  // Subscribe + initial sync + re-sync on reconnect and on foreground.
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;
    void refresh(roomId);

    const unsubscribe = subscribeRoom(roomId, {
      onEvent: (event) => {
        if (!acceptEvent(event.seq)) return;
        void refresh(roomId);
      },
      onConnection: (connection) => {
        setConnection(connection);
        if (connection === 'live' && !cancelled) void refresh(roomId);
      },
    });

    const interval = setInterval(() => {
      void refresh(roomId);
    }, POLL_MS);

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh(roomId);
    });

    let removeVisibility: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handler = () => {
        if (document.visibilityState === 'visible') void refresh(roomId);
      };
      document.addEventListener('visibilitychange', handler);
      removeVisibility = () => document.removeEventListener('visibilitychange', handler);
    }

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(interval);
      appStateSub.remove();
      removeVisibility?.();
    };
  }, [roomId, refresh, acceptEvent, setConnection]);

  const connection = useGameStore((s) => s.connection);

  return { room, roomId, connection, loading, error, refresh };
}
