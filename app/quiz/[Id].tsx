import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { api, friendlyError } from '@/lib/api';
import { parseCsvQuiz, parseJsonQuiz, type ImportIssue } from '@/lib/importQuiz';
import type { QuestionDraft, QuizDraft } from '@/lib/types';
import { colors, radius, space, type as typeScale, weight } from '@/lib/tokens';

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];
const TIME_CHOICES = [10000, 15000, 20000, 30000];
const EMOJI = ['🎯', '🧠', '🌍', '🔬', '🏏', '🎬', '🎵', '📚'];

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
  cover_emoji: string;
  status: 'draft' | 'published';
  share_slug: string | null;
  questions: DraftQuestion[];
}

let counter = 0;
function newKey(): string {
  counter += 1;
  return `q${counter}`;
}

function blankQuestion(): DraftQuestion {
  return {
    key: newKey(),
    prompt: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    time_limit_ms: 20000,
    points_base: 1000,
    explanation: '',
  };
}

function blankDraft(): Draft {
  return {
    title: '',
    description: '',
    cover_emoji: '🎯',
    status: 'draft',
    share_slug: null,
    questions: [blankQuestion()],
  };
}

function toDraft(record: QuizDraft & { status?: 'draft' | 'published'; share_slug?: string }): Draft {
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? '',
    cover_emoji: record.cover_emoji ?? '🎯',
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
    cover_emoji: draft.cover_emoji,
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

  const questionCount = draft.questions.length;
  const filled = useMemo(
    () => draft.questions.filter((question) => question.prompt.trim().length > 0).length,
    [draft.questions],
  );

  function patchQuestion(index: number, patch: Partial<DraftQuestion>): void {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    }));
  }

  function move(index: number, direction: -1 | 1): void {
    setDraft((prev) => {
      const next = [...prev.questions];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
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
    if (!result.quiz) return;

    setDraft((prev) => ({
      ...toDraft({ ...result.quiz, status: prev.status, share_slug: prev.share_slug ?? undefined }),
      id: prev.id,
    }));
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
        <Text style={styles.title}>{draft.id ? 'edit quiz' : 'new quiz'}</Text>
        <Pill label={draft.status} tone={draft.status === 'published' ? 'success' : 'neutral'} />
      </View>

      <Card style={styles.metaCard}>
        <View style={styles.emojiRow}>
          {EMOJI.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`cover ${option}`}
              onPress={() => setDraft((prev) => ({ ...prev, cover_emoji: option }))}
              style={[
                styles.emojiButton,
                draft.cover_emoji === option ? styles.emojiButtonOn : null,
              ]}
            >
              <Text style={styles.emoji}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="title"
          value={draft.title}
          onChangeText={(text) => setDraft((prev) => ({ ...prev, title: text }))}
          placeholder="friday pub quiz"
          maxLength={120}
        />
        <Input
          label="description"
          value={draft.description}
          onChangeText={(text) => setDraft((prev) => ({ ...prev, description: text }))}
          placeholder="optional, one line"
          maxLength={200}
        />
      </Card>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            questions · {filled}/{questionCount} filled
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="import questions"
            onPress={() => setShowImport((prev) => !prev)}
            style={styles.iconButton}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {showImport ? (
          <Card style={styles.importCard}>
            <View style={styles.segment}>
              {(['json', 'csv'] as const).map((format) => (
                <Pressable
                  key={format}
                  accessibilityRole="button"
                  accessibilityLabel={`import ${format}`}
                  onPress={() => setImportFormat(format)}
                  style={[styles.segmentItem, importFormat === format ? styles.segmentItemOn : null]}
                >
                  <Text style={styles.segmentText}>{format.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <Input
              label={importFormat === 'json' ? 'paste json' : 'paste csv'}
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
                  <Text key={index} style={styles.issue}>
                    row {issue.row}: {issue.message}
                  </Text>
                ))}
                <Text style={styles.issue}>nothing was imported — fix the rows and try again</Text>
              </View>
            ) : null}

            <Button label="import" onPress={runImport} variant="secondary" />
          </Card>
        ) : null}

        {draft.questions.map((question, index) => (
          <Card key={question.key} style={styles.questionCard}>
            <View style={styles.questionHead}>
              <Text style={styles.questionNumber}>{index + 1}</Text>
              <View style={styles.questionTools}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="move up"
                  onPress={() => move(index, -1)}
                  style={styles.iconButton}
                >
                  <Ionicons name="chevron-up" size={18} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="move down"
                  onPress={() => move(index, 1)}
                  style={styles.iconButton}
                >
                  <Ionicons name="chevron-down" size={18} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="delete question"
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      questions: prev.questions.filter((_, i) => i !== index),
                    }))
                  }
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>

            <Input
              value={question.prompt}
              onChangeText={(text) => patchQuestion(index, { prompt: text })}
              placeholder="the question"
              multiline
              maxLength={500}
            />

            <View style={styles.options}>
              {question.options.map((option, optionIndex) => (
                <View key={optionIndex} style={styles.optionRow}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`mark option ${LETTERS[optionIndex]} correct`}
                    accessibilityState={{ checked: question.correctIndex === optionIndex }}
                    onPress={() => patchQuestion(index, { correctIndex: optionIndex })}
                    style={styles.radio}
                  >
                    <View
                      style={[
                        styles.radioDot,
                        question.correctIndex === optionIndex ? styles.radioDotOn : null,
                      ]}
                    >
                      {question.correctIndex === optionIndex ? (
                        <Ionicons name="checkmark" size={12} color={colors.bg} />
                      ) : null}
                    </View>
                    <Text style={styles.radioLabel}>{(LETTERS[optionIndex] ?? '').toUpperCase()}</Text>
                  </Pressable>

                  <View style={styles.optionInput}>
                    <Input
                      value={option}
                      onChangeText={(text) =>
                        patchQuestion(index, {
                          options: question.options.map((value, i) => (i === optionIndex ? text : value)),
                        })
                      }
                      placeholder={`option ${LETTERS[optionIndex]}`}
                      maxLength={120}
                    />
                  </View>

                  {question.options.length > 2 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="remove option"
                      onPress={() => {
                        const nextOptions = question.options.filter((_, i) => i !== optionIndex);
                        const nextCorrect =
                          question.correctIndex === optionIndex
                            ? 0
                            : question.correctIndex > optionIndex
                              ? question.correctIndex - 1
                              : question.correctIndex;
                        patchQuestion(index, {
                          options: nextOptions,
                          correctIndex: nextCorrect,
                        });
                      }}
                      style={styles.iconButton}
                    >
                      <Ionicons name="close" size={16} color={colors.muted} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.questionFooter}>
              {question.options.length < 6 ? (
                <Button
                  label="add option"
                  variant="ghost"
                  onPress={() =>
                    patchQuestion(index, { options: [...question.options, ''] })
                  }
                  icon="add"
                />
              ) : null}

              <View style={styles.timeRow}>
                <Text style={styles.label}>time</Text>
                {TIME_CHOICES.map((ms) => (
                  <Pressable
                    key={ms}
                    accessibilityRole="button"
                    accessibilityLabel={`${ms / 1000} seconds`}
                    onPress={() => patchQuestion(index, { time_limit_ms: ms })}
                    style={[styles.chip, question.time_limit_ms === ms ? styles.chipOn : null]}
                  >
                    <Text style={styles.chipText}>{ms / 1000}s</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Input
              label="explanation"
              value={question.explanation}
              onChangeText={(text) => patchQuestion(index, { explanation: text })}
              placeholder="one sentence, shown on the reveal"
              maxLength={200}
            />
          </Card>
        ))}

        <Button
          label="add question"
          variant="secondary"
          icon="add"
          onPress={() =>
            setDraft((prev) => ({ ...prev, questions: [...prev.questions, blankQuestion()] }))
          }
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="save draft"
          variant="secondary"
          onPress={() => void save()}
          loading={busy === 'save'}
        />
        <Button
          label={draft.status === 'published' ? 'publish again' : 'publish'}
          onPress={() => void saveAndPublish()}
          loading={busy === 'publish'}
        />
        {draft.status === 'published' ? (
          <Button
            label="host this quiz"
            icon="play"
            onPress={() => void host()}
            loading={busy === 'host'}
          />
        ) : null}
        {draft.share_slug ? (
          <Button
            label="share the challenge link"
            variant="ghost"
            icon="share-outline"
            onPress={() => {
              void Share.share({
                message: `play ${draft.title} at your own pace: quizarena://c/${draft.share_slug}`,
              });
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  metaCard: {
    gap: space.x4,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.x2,
  },
  emojiButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emojiButtonOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  emoji: {
    fontSize: 20,
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
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importCard: {
    gap: space.x3,
  },
  segment: {
    flexDirection: 'row',
    gap: space.x2,
  },
  segmentItem: {
    paddingHorizontal: space.x3,
    paddingVertical: space.x2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItemOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  segmentText: {
    color: colors.text,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
  },
  importInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  issues: {
    gap: space.x1,
  },
  issue: {
    color: colors.danger,
    fontSize: typeScale.xs,
  },
  questionCard: {
    gap: space.x3,
  },
  questionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionNumber: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
  },
  questionTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  options: {
    gap: space.x2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x2,
  },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x1,
    minWidth: 56,
    minHeight: 44,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  radioLabel: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
  },
  optionInput: {
    flex: 1,
  },
  questionFooter: {
    gap: space.x2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.x2,
    flexWrap: 'wrap',
  },
  label: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chip: {
    paddingHorizontal: space.x3,
    paddingVertical: space.x2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    color: colors.text,
    fontSize: typeScale.xs,
  },
  error: {
    color: colors.danger,
    fontSize: typeScale.sm,
    marginTop: space.x4,
  },
  actions: {
    gap: space.x2,
    marginTop: space.x6,
  },
});
