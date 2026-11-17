// dominant element: the correct option
import { StyleSheet, View } from 'react-native';
import { T } from '../ui/T';
import { Button } from '../ui/Button';
import { OptionCard } from '../ui/OptionCard';
import { DistributionBars } from '../ui/DistributionBars';
import type { RoomState } from '@/lib/types';
import { colors, space } from '@/lib/tokens';

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
  const last = room.index + 1 >= room.total_questions;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View>
          <T variant="label">
            Question {room.index + 1} of {room.total_questions}
          </T>
          <T variant="meta" color={gotIt ? colors.ok : mine ? colors.bad : colors.muted} style={styles.result}>
            {gotIt ? 'Correct' : mine?.status === 'timeout' ? 'Too slow' : mine ? 'Not this time' : 'No answer'}
          </T>
        </View>
        <View style={styles.points}>
          <T variant="meta" numeric color={colors.accent}>
            +{points}
          </T>
        </View>
      </View>

      <T variant="h2" style={styles.prompt}>
        {question.prompt}
      </T>

      <View style={styles.options}>
        {question.options.map((option) => {
          const isCorrect = option.id === reveal.correct_option_id;
          const isMine = option.id === mine?.option_id;
          return (
            <OptionCard
              key={option.id}
              option={option}
              state={isCorrect ? 'correct' : isMine ? 'wrong' : 'dim'}
            />
          );
        })}
      </View>

      {question.explanation ? (
        <T variant="meta" style={styles.explanation}>
          {question.explanation}
        </T>
      ) : null}

      <View style={styles.bars}>
        <T variant="label" style={styles.barsLabel}>
          How the room answered
        </T>
        <DistributionBars
          options={question.options}
          distribution={reveal.distribution}
          correctOptionId={reveal.correct_option_id}
        />
      </View>

      <View style={styles.actions}>
        {isHost ? (
          <Button
            label={last ? 'See results' : 'Next question'}
            onPress={onNext}
            loading={busy}
          />
        ) : (
          <T variant="meta" center color={colors.faint} style={styles.waiting}>
            Waiting for the host
          </T>
        )}
        <Button label="Leaderboard" variant="secondary" onPress={onSeeBoard} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space.x4 },
  result: { marginTop: space.x1 },
  points: {
    height: 26,
    paddingHorizontal: space.x3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accentLine,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
  },
  prompt: { fontSize: 20, lineHeight: 27, marginBottom: space.x4 },
  options: { gap: space.x2 },
  explanation: { marginTop: space.x4, lineHeight: 19 },
  bars: { marginTop: space.x6, gap: space.x2 },
  barsLabel: { marginBottom: space.x1 },
  actions: { marginTop: 'auto', paddingTop: space.x6, gap: space.x2 },
  waiting: { paddingVertical: space.x3 },
});
