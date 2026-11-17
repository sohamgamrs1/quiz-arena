import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { api, friendlyError } from '@/lib/api';
import { loadProfile } from '@/lib/auth';
import { maskCode } from '@/lib/format';
import { useRoomSync } from '@/lib/useRoomSync';
import { colors, numericFont, space, type as typeScale, weight } from '@/lib/tokens';

export default function Lobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const profile = useQuery({ queryKey: ['profile'], queryFn: loadProfile });
  const [seatReady, setSeatReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joined = useRef(false);

  // Arriving by code or by link: take a seat before anything else can be read.
  useEffect(() => {
    if (!code || joined.current || !profile.data) return;
    joined.current = true;

    (async () => {
      try {
        await api.joinRoom(code, profile.data.display_name, profile.data.avatar_emoji);
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
          <Text style={styles.title}>could not join</Text>
          <Text style={styles.hint}>{error}</Text>
          <Button label="back home" variant="secondary" onPress={() => router.replace('/')} />
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

  // Once the host starts, everyone moves to the play surface together.
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
          accessibilityLabel="leave"
          onPress={() => router.replace('/')}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{room?.quiz.title ?? 'lobby'}</Text>
      </View>

      <OfflineBanner connection={connection} />

      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>room code</Text>
        <Text style={styles.code}>{code ? maskCode(code) : '· · · · · ·'}</Text>
        {link ? (
          <View style={styles.qr}>
            <QRCode value={link} size={104} backgroundColor={colors.surface} color={colors.text} />
          </View>
        ) : null}
        <Button
          label="share the link"
          variant="ghost"
          icon="share-outline"
          onPress={() => {
            void Share.share({ message: `join my quiz: ${link} — code ${code}` });
          }}
        />
      </Card>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>in the room</Text>
          <Pill label={`${room?.player_count ?? 0} joined`} tone="accent" />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.muted} />
        ) : (
          <View style={styles.list}>
            {players.map((player) => (
              <View key={player.player_id} style={styles.playerRow}>
                <Avatar emoji={player.avatar_emoji} size={32} ring={player.is_me} />
                <Text style={styles.playerName} numberOfLines={1}>
                  {player.name}
                  {player.is_me ? ' (you)' : ''}
                </Text>
                {player.is_me && room?.is_host ? <Pill label="host" tone="neutral" /> : null}
              </View>
            ))}
          </View>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.footer}>
        {room?.is_host ? (
          <>
            <Button
              label="start the game"
              onPress={() => void start()}
              loading={busy}
              disabled={!canStart}
              icon="play"
            />
            {!canStart ? (
              <Text style={styles.hint}>waiting for at least one player to join</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.hint}>the host starts when everyone is in</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.x3,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x2,
    marginBottom: space.x4,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space.x3,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
  },
  codeCard: {
    alignItems: 'center',
    gap: space.x2,
    paddingVertical: space.x6,
  },
  codeLabel: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  code: {
    color: colors.text,
    fontSize: typeScale.xxl,
    fontWeight: weight.semibold,
    fontFamily: numericFont,
    letterSpacing: 4,
  },
  qr: {
    marginVertical: space.x3,
    padding: space.x3,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    marginTop: space.x6,
    gap: space.x3,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  list: {
    gap: space.x2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x3,
    minHeight: 44,
  },
  playerName: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.sm,
  },
  error: {
    color: colors.danger,
    fontSize: typeScale.sm,
    marginTop: space.x3,
  },
  footer: {
    marginTop: space.x6,
    gap: space.x2,
  },
  hint: {
    color: colors.muted,
    fontSize: typeScale.xs,
    textAlign: 'center',
  },
});
