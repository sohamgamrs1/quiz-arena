// dominant element: the option stack — nothing else on this screen competes with it.
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { CountdownRing } from '../ui/CountdownRing';
import { OptionCard } from '../ui/OptionCard';
import type { RoomState } from '@/lib/types';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  room: RoomState;
  remainingMs: number;
  lockedOptionId: string | null;
  submitting: boolean;
  onAnswer: (optionId: string) => void;
}

export function QuestionScreen({ room, remainingMs, lockedOptionId, submitting, onAnswer }: Props) {
  const question = room.question;
  if (!question) return null;

  const total = question.time_limit_ms;
  const seconds = Math.ceil(remainingMs / 1000);
  const progress = total === 0 ? 0 : remainingMs / total;
  const answered = question.answered_count ?? 0;
  const locked = lockedOptionId !== null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.counter}>
            question {room.index + 1} of {room.total_questions}
          </Text>
          <Text style={styles.answered}>
            {answered} of {room.player_count} answered
          </Text>
        </View>
        <CountdownRing progress={progress} seconds={seconds} />
      </View>

      <Text style={styles.prompt}>{question.prompt}</Text>

      <View style={styles.options}>
        {question.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            state={lockedOptionId === option.id ? 'selected' : locked ? 'muted' : 'idle'}
            disabled={locked || submitting || remainingMs === 0}
            onPress={() => onAnswer(option.id)}
          />
        ))}
      </View>

      {locked ? (
        <View style={styles.locked}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.lockedText}>answer locked</Text>
        </View>
      ) : (
        <Text style={styles.footnote}>tap an option — you get one</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space.x4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  answered: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: space.x1,
  },
  prompt: {
    color: colors.text,
    fontSize: typeScale.xl,
    fontWeight: weight.semibold,
    lineHeight: 36,
  },
  options: {
    gap: space.x3,
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.x2,
    paddingVertical: space.x3,
  },
  lockedText: {
    color: colors.success,
    fontSize: typeScale.sm,
    fontWeight: weight.semibold,
  },
  footnote: {
    color: colors.muted,
    fontSize: typeScale.xs,
    textAlign: 'center',
  },
});
