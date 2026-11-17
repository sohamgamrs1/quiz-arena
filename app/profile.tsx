import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { loadProfile, saveProfile } from '@/lib/auth';
import { clearHistory, readHistory } from '@/lib/history';
import { displayName } from '@/lib/format';
import { MOCK_MODE } from '@/lib/supabase';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

const EMOJI = ['🙂', '🦊', '🐧', '🌻', '🐙', '🎩', '🚀', '🍀', '🐝', '🎯', '🧊', '🌙'];

export default function Profile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['profile'], queryFn: loadProfile });
  const history = useQuery({ queryKey: ['history'], queryFn: readHistory });

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🙂');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.display_name);
      setEmoji(profile.data.avatar_emoji);
    }
  }, [profile.data]);

  async function save(): Promise<void> {
    if (!profile.data) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveProfile({ ...profile.data, display_name: displayName(name), avatar_emoji: emoji });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="back"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>profile</Text>
      </View>

      <View style={styles.hero}>
        <Avatar emoji={emoji} size={72} ring />
        <Text style={styles.heroName}>{displayName(name || 'player')}</Text>
        {MOCK_MODE ? <Text style={styles.mock}>mock mode — nothing is saved to a server</Text> : null}
      </View>

      <View style={styles.fields}>
        <Input
          label="display name"
          value={name}
          onChangeText={setName}
          maxLength={24}
          autoCorrect={false}
        />

        <View>
          <Text style={styles.label}>avatar</Text>
          <View style={styles.emojiRow}>
            {EMOJI.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`avatar ${option}`}
                accessibilityState={{ selected: emoji === option }}
                onPress={() => setEmoji(option)}
                style={styles.emojiButton}
              >
                <Avatar emoji={option} size={40} ring={emoji === option} />
              </Pressable>
            ))}
          </View>
        </View>

        <Button label={saved ? 'saved' : 'save'} onPress={() => void save()} loading={saving} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>game history</Text>
        {(history.data ?? []).length === 0 ? (
          <Text style={styles.muted}>no games yet</Text>
        ) : (
          <View style={styles.list}>
            {(history.data ?? []).map((entry, index) => (
              <Card key={`${entry.at}-${index}`} style={styles.row}>
                <Text style={styles.emoji}>{entry.emoji}</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {entry.quizTitle}
                  </Text>
                  <Text style={styles.muted}>
                    #{entry.rank} of {entry.players} · {entry.score} pts · {new Date(entry.at).toLocaleDateString()}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
        {(history.data ?? []).length > 0 ? (
          <Button
            label="clear history"
            variant="ghost"
            onPress={() => {
              void clearHistory().then(() => queryClient.invalidateQueries({ queryKey: ['history'] }));
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
  },
  hero: {
    alignItems: 'center',
    gap: space.x2,
    paddingVertical: space.x6,
  },
  heroName: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weight.semibold,
  },
  mock: {
    color: colors.muted,
    fontSize: typeScale.xs,
  },
  fields: {
    gap: space.x4,
  },
  label: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: space.x2,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.x2,
  },
  emojiButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: space.x8,
    gap: space.x3,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x3,
    paddingVertical: space.x3,
  },
  emoji: {
    fontSize: 20,
  },
  rowBody: {
    flex: 1,
    gap: space.x1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weight.semibold,
  },
  muted: {
    color: colors.muted,
    fontSize: typeScale.xs,
  },
});
