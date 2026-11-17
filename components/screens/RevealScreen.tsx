// dominant element: the correct option, with your own pick marked beside it.
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DistributionBars } from '../ui/DistributionBars';
import { OptionCard } from '../ui/OptionCard';
import type { RoomState } from '@/lib/types';
import { colors, space, type as typeScale, weight } from '@/lib/tokens';

interface Props {
  room: RoomState;
  isHost: boolean;
  onNext: () => void;
  onSeeBoard: () => void;
  busy: boolean;
}

export function RevealScreen({ room, isHost, onNext, onSeeBoard, busy }: Props) {
  const question = room.question;
  const reveal = room.reveal;
  if (!question || !reveal) return null;

  const mine = room.my_answer;
  const gotIt = mine?.status === 'correct';
  const points = mine?.points ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.counter}>
          question {room.index + 1} of {room.total_questions}
        </Text>
        <Text style={[styles.result, gotIt ? styles.good : mine ? styles.bad : styles.neutral]}>
          {gotIt ? 'correct' : mine?.status === 'timeout' ? 'too slow' : mine ? 'not this time' : 'no answer'}
        </Text>
      </View>

      <Text style={styles.prompt}>{question.prompt}</Text>

      <View style={styles.options}>
        {question.options.map((option) => {
          const isCorrect = option.id === reveal.correct_option_id;
          const isMine = option.id === mine?.option_id;
          const state = isCorrect ? 'correct' : isMine ? 'wrong' : 'muted';
          return <OptionCard key={option.id} option={option} state={state} />;
        })}
      </View>

      <Card style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>you earned</Text>
        <Text style={styles.points}>+{points}</Text>
      </Card>

      {question.explanation ? (
        <Text style={styles.explanation}>{question.explanation}</Text>
      ) : null}

      <View style={styles.distribution}>
        <Text style={styles.sectionLabel}>how the room answered</Text>
        <DistributionBars
          options={question.options}
          distribution={reveal.distribution}
          correctOptionId={reveal.correct_option_id}
          myOptionId={mine?.option_id ?? null}
        />
      </View>

      <View style={styles.actions}>
        {isHost ? (
          <Button
            label={room.index + 1 >= room.total_questions ? 'see results' : 'next question'}
            onPress={onNext}
            loading={busy}
            icon="arrow-forward"
          />
        ) : (
          <View style={styles.waiting}>
            <Ionicons name="hourglass-outline" size={16} color={colors.muted} />
            <Text style={styles.waitingText}>waiting for the host</Text>
          </View>
        )}
        <Button label="leaderboard" onPress={onSeeBoard} variant="secondary" />
      </View>
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
  result: {
    fontSize: typeScale.sm,
    fontWeight: weight.semibold,
  },
  good: {
    color: colors.success,
  },
  bad: {
    color: colors.danger,
  },
  neutral: {
    color: colors.muted,
  },
  prompt: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
    lineHeight: 28,
  },
  options: {
    gap: space.x2,
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsLabel: {
    color: colors.muted,
    fontSize: typeScale.sm,
  },
  points: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weight.semibold,
  },
  explanation: {
    color: colors.muted,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  distribution: {
    gap: space.x2,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actions: {
    gap: space.x2,
    marginTop: space.x2,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.x2,
    paddingVertical: space.x3,
  },
  waitingText: {
    color: colors.muted,
    fontSize: typeScale.sm,
  },
});
