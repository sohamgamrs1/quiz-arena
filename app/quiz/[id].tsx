import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Monogram } from '@/components/ui/Monogram';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { api, friendlyError } from '@/lib/api';
import { parseCsvQuiz, parseJsonQuiz, type ImportIssue } from '@/lib/importQuiz';
import type { QuestionDraft, QuizDraft } from '@/lib/types';
import { colors, radius, space } from '@/lib/tokens';

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];
const TIME_CHOICES = [10000, 15000, 20000, 30000];

interface DraftQuestion {
  key: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  time_limit_ms: number;
  points_base: number;
  explanation: string;
}

interface Draft {
  id?: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  share_slug: string | null;
  questions: DraftQuestion[];
}

let counter = 0;
const newKey = (): string => {
  counter += 1;
  return `q${counter}`;
};

const blankQuestion = (): DraftQuestion => ({
  key: newKey(),
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  time_limit_ms: 20000,
  points_base: 1000,
  explanation: '',
});

const blankDraft = (): Draft => ({
  title: '',
  description: '',
  status: 'draft',
  share_slug: null,
  questions: [blankQuestion()],
});

function toDraft(record: QuizDraft & { status?: 'draft' | 'published'; share_slug?: string }): Draft {
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? '',
    status: record.status ?? 'draft',
    share_slug: record.share_slug ?? null,
    questions: record.questions.map((question) => {
      const index = question.options.findIndex((option) => option.id === question.correct_option_id);
      return {
        key: newKey(),
        prompt: question.prompt,
        options: question.options.map((option) => option.text),
        correctIndex: index < 0 ? 0 : index,
        time_limit_ms: question.time_limit_ms,
        points_base: question.points_base,
        explanation: question.explanation ?? '',
      };
    }),
  };
}

function toPayload(draft: Draft): QuizDraft {
  const questions: QuestionDraft[] = draft.questions.map((question) => ({
    prompt: question.prompt,
    options: question.options.map((text, index) => ({ id: LETTERS[index] ?? String(index), text })),
    correct_option_id: LETTERS[question.correctIndex] ?? 'a',
    time_limit_ms: question.time_limit_ms,
    points_base: question.points_base,
    explanation: question.explanation,
  }));

  return {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    questions,
  };
}

export default function QuizEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [loading, setLoading] = useState(id !== 'new');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .getQuizForEdit(id)
      .then((record) => {
        if (!cancelled) setDraft(toDraft(record));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(friendlyError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function patchQuestion(index: number, patch: Partial<DraftQuestion>): void {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    }));
  }

  function move(index: number, direction: -1 | 1): void {
    setDraft((prev) => {
      const next = [...prev.questions];
      const target = index + direction;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return { ...prev, questions: next };
    });
  }

  async function save(): Promise<string | null> {
    setBusy('save');
    setError(null);
    try {
      const result = await api.saveQuiz(toPayload(draft));
      setDraft((prev) => ({ ...prev, id: result.quiz_id }));
      return result.quiz_id;
    } catch (err) {
      setError(friendlyError(err));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function saveAndPublish(): Promise<string | null> {
    const quizId = await save();
    if (!quizId) return null;
    setBusy('publish');
    try {
      await api.publishQuiz(quizId);
      setDraft((prev) => ({ ...prev, status: 'published' }));
      return quizId;
    } catch (err) {
      setError(friendlyError(err));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function host(): Promise<void> {
    const quizId = await saveAndPublish();
    if (!quizId) return;
    setBusy('host');
    try {
      const room = await api.createRoom(quizId);
      router.push({ pathname: '/room/[code]', params: { code: room.code } });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }

  function runImport(): void {
    const result =
      importFormat === 'json'
        ? parseJsonQuiz(importText)
        : parseCsvQuiz(importText, draft.title || 'imported quiz');

    setIssues(result.issues);
    const imported = result.quiz;
    if (!imported) return;

    setDraft((prev) =>
      toDraft({
        id: prev.id,
        title: imported.title,
        description: imported.description ?? '',
        questions: imported.questions,
        status: prev.status,
        share_slug: prev.share_slug ?? undefined,
      }),
    );
    setImportText('');
    setShowImport(false);
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.centre}>
          <ActivityIndicator color={colors.muted} />
        </View>
      </Screen>
    );
  }

  const filled = draft.questions.filter((question) => question.prompt.trim().length > 0).length;

  return (
    <Screen scroll>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <T variant="row" style={styles.topTitle}>
          {draft.id ? 'Edit quiz' : 'New quiz'}
        </T>
        <T variant="label" color={draft.status === 'published' ? colors.ok : colors.faint}>
          {draft.status.toUpperCase()}
        </T>
      </View>

      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Monogram name={draft.title || 'quiz'} size={46} square single />
          <View style={styles.titleField}>
            <Input
              label="Title"
              value={draft.title}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, title: text }))}
              placeholder="Friday pub quiz"
              maxLength={120}
            />
          </View>
        </View>
        <Input
          label="Description"
          value={draft.description}
          onChangeText={(text) => setDraft((prev) => ({ ...prev, description: text }))}
          placeholder="Optional, one line"
          maxLength={200}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <T variant="label">
            Questions · {filled}/{draft.questions.length}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Import questions"
            onPress={() => setShowImport((prev) => !prev)}
            style={styles.iconHit}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {showImport ? (
          <View style={styles.importCard}>
            <View style={styles.segment}>
              {(['json', 'csv'] as const).map((format) => (
                <Pressable
                  key={format}
                  accessibilityRole="button"
                  accessibilityLabel={`Import ${format}`}
                  onPress={() => setImportFormat(format)}
                  style={[styles.segmentItem, importFormat === format ? styles.segmentOn : null]}
                >
                  <T variant="label" color={importFormat === format ? colors.text : colors.faint}>
                    {format.toUpperCase()}
                  </T>
                </Pressable>
              ))}
            </View>

            <Input
              value={importText}
              onChangeText={setImportText}
              placeholder={
                importFormat === 'json'
                  ? '{ "quiz": { "title": "…" }, "questions": [ … ] }'
                  : 'prompt,option_a,option_b,option_c,option_d,correct,time_limit_ms,points_base,explanation'
              }
              multiline
              numberOfLines={6}
              style={styles.importInput}
            />

            {issues.length > 0 ? (
              <View style={styles.issues}>
                {issues.slice(0, 6).map((issue, index) => (
                  <T key={index} variant="meta" color={colors.bad}>
                    Row {issue.row}: {issue.message}
                  </T>
                ))}
                <T variant="meta" color={colors.bad}>
                  Nothing was imported — fix the rows and try again
                </T>
              </View>
            ) : null}

            <Button label="Import" variant="quiet" onPress={runImport} />
          </View>
        ) : null}

        {draft.questions.map((question, index) => (
          <View key={question.key} style={styles.questionCard}>
            <View style={styles.questionHead}>
              <T variant="label">Question {index + 1}</T>
              <View style={styles.tools}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move up"
                  onPress={() => move(index, -1)}
                  style={styles.iconHit}
                >
                  <Ionicons name="chevron-up" size={16} color={colors.faint} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move down"
                  onPress={() => move(index, 1)}
                  style={styles.iconHit}
                >
                  <Ionicons name="chevron-down" size={16} color={colors.faint} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete question"
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      questions: prev.questions.filter((_, i) => i !== index),
                    }))
                  }
                  style={styles.iconHit}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.bad} />
                </Pressable>
              </View>
            </View>

            <Input
              value={question.prompt}
              onChangeText={(text) => patchQuestion(index, { prompt: text })}
              placeholder="The question"
              multiline
              maxLength={500}
            />

            <View style={styles.options}>
              {question.options.map((option, optionIndex) => (
                <View key={optionIndex} style={styles.optionRow}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`Mark option ${LETTERS[optionIndex]} correct`}
                    accessibilityState={{ checked: question.correctIndex === optionIndex }}
                    onPress={() => patchQuestion(index, { correctIndex: optionIndex })}
                    style={styles.radio}
                  >
                    <View
                      style={[
                        styles.radioDot,
                        question.correctIndex === optionIndex ? styles.radioDotOn : null,
                      ]}
                    />
                    <T variant="label" color={colors.muted}>
                      {(LETTERS[optionIndex] ?? '').toUpperCase()}
                    </T>
                  </Pressable>

                  <View style={styles.optionField}>
                    <Input
                      value={option}
                      onChangeText={(text) =>
                        patchQuestion(index, {
                          options: question.options.map((value, i) => (i === optionIndex ? text : value)),
                        })
                      }
                      placeholder={`Option ${LETTERS[optionIndex]}`}
                      maxLength={120}
                    />
                  </View>

                  {question.options.length > 2 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove option"
                      onPress={() => {
                        const nextOptions = question.options.filter((_, i) => i !== optionIndex);
                        const nextCorrect =
                          question.correctIndex === optionIndex
                            ? 0
                            : question.correctIndex > optionIndex
                              ? question.correctIndex - 1
                              : question.correctIndex;
                        patchQuestion(index, { options: nextOptions, correctIndex: nextCorrect });
                      }}
                      style={styles.iconHit}
                    >
                      <Ionicons name="close" size={15} color={colors.faint} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            {question.options.length < 6 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add option"
                onPress={() => patchQuestion(index, { options: [...question.options, ''] })}
                style={styles.addOption}
              >
                <Ionicons name="add" size={14} color={colors.muted} />
                <T variant="meta" color={colors.muted}>
                  Add option
                </T>
              </Pressable>
            ) : null}

            <View style={styles.timeRow}>
              <T variant="label">Time</T>
              {TIME_CHOICES.map((ms) => (
                <Pressable
                  key={ms}
                  accessibilityRole="button"
                  accessibilityLabel={`${ms / 1000} seconds`}
                  onPress={() => patchQuestion(index, { time_limit_ms: ms })}
                  style={[styles.chip, question.time_limit_ms === ms ? styles.chipOn : null]}
                >
                  <T variant="meta" color={question.time_limit_ms === ms ? colors.text : colors.muted}>
                    {ms / 1000}s
                  </T>
                </Pressable>
              ))}
            </View>

            <Input
              label="Explanation"
              value={question.explanation}
              onChangeText={(text) => patchQuestion(index, { explanation: text })}
              placeholder="One sentence, shown on the reveal"
              maxLength={200}
            />
          </View>
        ))}

        <Button
          label="Add question"
          variant="secondary"
          onPress={() => setDraft((prev) => ({ ...prev, questions: [...prev.questions, blankQuestion()] }))}
        />
      </View>

      {error ? <Notice message={error} /> : null}

      <View style={styles.actions}>
        <Button label="Save draft" variant="secondary" onPress={() => void save()} loading={busy === 'save'} />
        <Button
          label={draft.status === 'published' ? 'Publish again' : 'Publish'}
          onPress={() => void saveAndPublish()}
          loading={busy === 'publish'}
        />
        {draft.status === 'published' ? (
          <Button label="Host this quiz" variant="quiet" onPress={() => void host()} loading={busy === 'host'} />
        ) : null}
        {draft.share_slug ? (
          <Button
            label="Share challenge link"
            variant="secondary"
            onPress={() => {
              void Share.share({
                message: `Play ${draft.title} at your own pace: quizarena://c/${draft.share_slug}`,
              });
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.x2, marginBottom: space.x6 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -space.x3 },
  topTitle: { flex: 1 },
  meta: { gap: space.x4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.x3 },
  titleField: { flex: 1 },
  section: { marginTop: space.x8, gap: space.x3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  importCard: {
    gap: space.x3,
    padding: space.x4,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segment: { flexDirection: 'row', gap: space.x2 },
  segmentItem: {
    height: 34,
    paddingHorizontal: space.x3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  segmentOn: { borderColor: colors.accentLine, backgroundColor: colors.accentSoft },
  importInput: { minHeight: 120, textAlignVertical: 'top' },
  issues: { gap: space.x1 },
  questionCard: {
    gap: space.x3,
    padding: space.x4,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  questionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tools: { flexDirection: 'row', alignItems: 'center' },
  options: { gap: space.x2 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: space.x2 },
  radio: { flexDirection: 'row', alignItems: 'center', gap: space.x2, minWidth: 52, height: 44 },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  radioDotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  optionField: { flex: 1 },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: space.x2, height: 36 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.x2, flexWrap: 'wrap' },
  chip: {
    height: 34,
    paddingHorizontal: space.x3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  chipOn: { borderColor: colors.accentLine, backgroundColor: colors.accentSoft },
  actions: { marginTop: space.x8, gap: space.x2 },
});
