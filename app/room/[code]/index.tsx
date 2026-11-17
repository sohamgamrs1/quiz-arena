import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/components/ui/Button';
import { Monogram } from '@/components/ui/Monogram';
import { Notice } from '@/components/ui/Notice';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { api, friendlyError } from '@/lib/api';
import { loadProfile } from '@/lib/auth';
import { useRoomSync } from '@/lib/useRoomSync';
import { colors, fonts, radius, space } from '@/lib/tokens';

export default function Lobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const profile = useQuery({ queryKey: ['profile'], queryFn: loadProfile });
  const [seatReady, setSeatReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joined = useRef(false);

  useEffect(() => {
    const me = profile.data;
    if (!code || joined.current || !me) return;
    joined.current = true;
    (async () => {
      try {
        await api.joinRoom(code, me.display_name, '');
        setSeatReady(true);
      } catch (err) {
        setError(friendlyError(err));
      }
    })();
  }, [code, profile.data]);

  if (error) {
    return (
      <Screen>
        <View style={styles.centre}>
          <T variant="h2" center>
            Could not join
          </T>
          <T variant="meta" center style={styles.gap}>
            {error}
          </T>
        </View>
      </Screen>
    );
  }

  if (!seatReady) {
    return (
      <Screen>
        <View style={styles.centre}>
          <ActivityIndicator color={colors.muted} />
        </View>
      </Screen>
    );
  }

  return <LobbyBody code={code} />;
}

function LobbyBody({ code }: { code: string | undefined }) {
  const router = useRouter();
  const { room, connection, loading, refresh } = useRoomSync(code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    if (room && room.status !== 'lobby' && room.status !== 'abandoned') {
      router.replace({ pathname: '/room/[code]/play', params: { code } });
    }
  }, [room, code, router]);

  async function start(): Promise<void> {
    if (!room) return;
    setBusy(true);
    setError(null);
    try {
      await api.startGame(room.room_id);
      await refresh(room.room_id);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const link = code ? Linking.createURL(`/room/${code}`) : '';
  const players = room?.leaderboard ?? [];
  const canStart = (room?.player_count ?? 0) >= 2;

  return (
    <Screen scroll>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave"
          onPress={() => router.replace('/')}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <T variant="row" numberOfLines={1} style={styles.quizTitle}>
          {room?.quiz.title ?? 'Lobby'}
        </T>
      </View>

      <OfflineBanner connection={connection} />

      <View style={styles.codeCard}>
        <T variant="label">Room code</T>
        <T style={styles.code}>{code ?? '······'}</T>
        {link ? (
          <View style={styles.qr}>
            <QRCode value={link} size={108} backgroundColor={colors.surface} color={colors.text} />
          </View>
        ) : null}
        <Button
          label="Share the link"
          variant="secondary"
          onPress={() => {
            void Share.share({ message: `Join my quiz: ${link} — code ${code}` });
          }}
          style={styles.shareButton}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <T variant="label">In the room</T>
          <T variant="label" color={colors.accent}>
            {room?.player_count ?? 0} joined
          </T>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.muted} />
        ) : (
          <View style={styles.list}>
            {players.map((player) => (
              <View key={player.player_id} style={styles.player}>
                <Monogram name={player.name} size={32} highlight={player.is_me} />
                <T variant="body" style={styles.playerName} numberOfLines={1}>
                  {player.name}
                </T>
                {player.is_me && room?.is_host ? (
                  <T variant="label" color={colors.muted}>
                    HOST
                  </T>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      {error ? <Notice message={error} /> : null}

      <View style={styles.footer}>
        {room?.is_host ? (
          <>
            <Button
              label="Start the game"
              onPress={() => void start()}
              loading={busy}
              disabled={!canStart}
            />
            {!canStart ? (
              <T variant="meta" center color={colors.faint}>
                Waiting for at least one player to join
              </T>
            ) : null}
          </>
        ) : (
          <T variant="meta" center color={colors.faint}>
            The host starts when everyone is in
          </T>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.x2 },
  gap: { maxWidth: 300 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.x2, marginBottom: space.x4 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -space.x3 },
  quizTitle: { flex: 1 },
  codeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingVertical: space.x6,
    gap: space.x2,
  },
  code: {
    fontFamily: fonts.semibold,
    fontSize: 34,
    letterSpacing: 7,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  qr: {
    marginVertical: space.x3,
    padding: space.x3,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  shareButton: { height: 46 },
  section: { marginTop: space.x6, gap: space.x3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { gap: space.x2 },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x3,
    minHeight: 46,
    paddingHorizontal: space.x3,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  playerName: { flex: 1 },
  footer: { marginTop: space.x8, gap: space.x2 },
});
