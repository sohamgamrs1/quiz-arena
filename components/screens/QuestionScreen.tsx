// dominant element: the option stack
import { StyleSheet, View } from 'react-native';
import { T } from '../ui/T';
import { CountdownRing } from '../ui/CountdownRing';
import { OptionCard } from '../ui/OptionCard';
import type { RoomState } from '@/lib/types';
import { colors, space } from '@/lib/tokens';

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

  const seconds = Math.ceil(remainingMs / 1000);
  const progress = question.time_limit_ms === 0 ? 0 : remainingMs / question.time_limit_ms;
  const locked = lockedOptionId !== null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View>
          <T variant="label">
            Question {room.index + 1} of {room.total_questions}
          </T>
          <T variant="meta" style={styles.answered}>
            {question.answered_count ?? 0} of {room.player_count} answered
          </T>
        </View>
        <CountdownRing progress={progress} seconds={seconds} />
      </View>

      <T variant="h2" style={styles.prompt}>
        {question.prompt}
      </T>

      <View style={styles.options}>
        {question.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            state={lockedOptionId === option.id ? 'selected' : locked ? 'dim' : 'idle'}
            disabled={locked || submitting || remainingMs === 0}
            onPress={() => onAnswer(option.id)}
          />
        ))}
      </View>

      <T variant="meta" center color={colors.faint} style={styles.foot}>
        {locked ? 'Answer locked' : 'Tap an option — you get one'}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space.x6 },
  answered: { marginTop: space.x1 },
  prompt: { marginBottom: space.x6 },
  options: { gap: space.x3 },
  foot: { marginTop: 'auto', paddingTop: space.x4 },
});
