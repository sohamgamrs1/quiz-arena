import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Monogram } from '@/components/ui/Monogram';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { loadProfile, saveProfile } from '@/lib/auth';
import { clearHistory, readHistory } from '@/lib/history';
import { displayName } from '@/lib/format';
import { MOCK_MODE } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/tokens';

export default function Profile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['profile'], queryFn: loadProfile });
  const history = useQuery({ queryKey: ['history'], queryFn: readHistory });

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile.data) setName(profile.data.display_name);
  }, [profile.data]);

  async function save(): Promise<void> {
    if (!profile.data) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveProfile({ ...profile.data, display_name: displayName(name) });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const entries = history.data ?? [];

  return (
    <Screen scroll>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      <View style={styles.hero}>
        <Monogram name={displayName(name || 'player')} size={72} />
        <T variant="row" style={styles.heroName}>
          {displayName(name || 'player')}
        </T>
        {MOCK_MODE ? <T variant="meta">Mock mode — nothing is saved to a server</T> : null}
      </View>

      <View style={styles.fields}>
        <Input label="Display name" value={name} onChangeText={setName} maxLength={24} autoCorrect={false} />
        <T variant="meta">Your tile colour is drawn from your name, so it stays consistent.</T>
        <Button label={saved ? 'Saved' : 'Save'} onPress={() => void save()} loading={saving} />
      </View>

      <View style={styles.section}>
        <T variant="label">Game history</T>
        {entries.length === 0 ? (
          <T variant="meta">No games yet.</T>
        ) : (
          <View style={styles.list}>
            {entries.map((entry, index) => (
              <View key={`${entry.at}-${index}`} style={styles.row}>
                <Monogram name={entry.quizTitle} size={38} square single />
                <View style={styles.rowBody}>
                  <T variant="body" numberOfLines={1}>
                    {entry.quizTitle}
                  </T>
                  <T variant="meta">
                    #{entry.rank} of {entry.players} · {entry.score.toLocaleString('en-IN')} pts ·{' '}
                    {new Date(entry.at).toLocaleDateString('en-IN')}
                  </T>
                </View>
              </View>
            ))}
            <Button
              label="Clear history"
              variant="secondary"
              onPress={() => {
                void clearHistory().then(() => queryClient.invalidateQueries({ queryKey: ['history'] }));
              }}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -space.x3 },
  hero: { alignItems: 'center', gap: space.x2, paddingVertical: space.x8 },
  heroName: { marginTop: space.x1 },
  fields: { gap: space.x4 },
  section: { marginTop: space.x8, gap: space.x3 },
  list: { gap: space.x2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x3,
    padding: space.x3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
  },
  rowBody: { flex: 1, gap: space.x1 },
});
