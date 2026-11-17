import type { Option, QuestionDraft, QuizDraft } from './types';

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ImportResult {
  quiz: QuizDraft | null;
  issues: ImportIssue[];
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

/** Splits one CSV line, honouring double quotes and escaped quotes. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (line.charAt(i + 1) === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/**
 * CSV columns: prompt, option_a..option_f, correct, time_limit_ms, points_base,
 * explanation. Nothing is imported unless every row is valid — a half-imported
 * quiz is worse than a rejected one.
 */
export function parseCsvQuiz(csv: string, title: string): ImportResult {
  const issues: ImportIssue[] = [];
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { quiz: null, issues: [{ row: 0, message: 'the file is empty' }] };
  }

  const header = splitCsvLine(lines[0] ?? '').map((h) => h.toLowerCase());
  const col = (name: string): number => header.indexOf(name);

  const promptCol = col('prompt');
  const correctCol = col('correct');
  if (promptCol < 0 || correctCol < 0) {
    return {
      quiz: null,
      issues: [{ row: 1, message: 'the header needs at least "prompt" and "correct"' }],
    };
  }

  const questions: QuestionDraft[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const cells = splitCsvLine(lines[i] ?? '');
    const prompt = cells[promptCol] ?? '';
    if (prompt.length === 0) {
      issues.push({ row: rowNumber, message: 'prompt is empty' });
      continue;
    }

    const options: Option[] = [];
    for (const letter of LETTERS) {
      const index = col(`option_${letter}`);
      if (index < 0) continue;
      const text = cells[index] ?? '';
      if (text.length > 0) options.push({ id: letter, text });
    }

    if (options.length < 2) {
      issues.push({ row: rowNumber, message: 'needs at least two options' });
      continue;
    }

    const correct = (cells[correctCol] ?? '').toLowerCase();
    if (!options.some((option) => option.id === correct)) {
      issues.push({
        row: rowNumber,
        message: `correct must be one of ${options.map((o) => o.id).join(', ')}`,
      });
      continue;
    }

    const timeIndex = col('time_limit_ms');
    const pointsIndex = col('points_base');
    const explainIndex = col('explanation');

    questions.push({
      prompt,
      options,
      correct_option_id: correct,
      time_limit_ms: timeIndex >= 0 ? Number(cells[timeIndex] ?? 20000) || 20000 : 20000,
      points_base: pointsIndex >= 0 ? Number(cells[pointsIndex] ?? 1000) || 1000 : 1000,
      explanation: explainIndex >= 0 ? cells[explainIndex] ?? '' : '',
    });
  }

  if (issues.length > 0) return { quiz: null, issues };
  if (questions.length === 0) return { quiz: null, issues: [{ row: 0, message: 'no questions found' }] };

  return { quiz: { title, questions }, issues: [] };
}

/** JSON import: the Part 4 shape, or a bare array of questions. */
export function parseJsonQuiz(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { quiz: null, issues: [{ row: 0, message: 'that is not valid JSON' }] };
  }

  const issues: ImportIssue[] = [];
  const holder = parsed as { quiz?: Record<string, unknown>; questions?: unknown };

  const meta = holder.quiz ?? {};
  const list = Array.isArray(holder.questions)
    ? holder.questions
    : Array.isArray(parsed)
      ? parsed
      : null;

  if (!list) {
    return { quiz: null, issues: [{ row: 0, message: 'expected a "questions" array' }] };
  }

  const questions: QuestionDraft[] = [];

  list.forEach((item, index) => {
    const row = index + 1;
    const q = item as Record<string, unknown>;
    const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : '';
    if (prompt.length === 0) {
      issues.push({ row, message: 'prompt is empty' });
      return;
    }

    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const options: Option[] = rawOptions.map((opt, i) => {
      const o = opt as Record<string, unknown>;
      return {
        id: typeof o.id === 'string' && o.id.length > 0 ? o.id : (LETTERS[i] ?? String(i)),
        text: typeof o.text === 'string' ? o.text : String(o.text ?? ''),
      };
    });

    if (options.length < 2 || options.length > 6) {
      issues.push({ row, message: 'needs between two and six options' });
      return;
    }

    const correct = typeof q.correct_option_id === 'string' ? q.correct_option_id : '';
    if (!options.some((option) => option.id === correct)) {
      issues.push({ row, message: 'correct_option_id does not match any option id' });
      return;
    }

    questions.push({
      prompt,
      options,
      correct_option_id: correct,
      time_limit_ms: typeof q.time_limit_ms === 'number' ? q.time_limit_ms : 20000,
      points_base: typeof q.points_base === 'number' ? q.points_base : 1000,
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
    });
  });

  if (issues.length > 0) return { quiz: null, issues };
  if (questions.length === 0) return { quiz: null, issues: [{ row: 0, message: 'no questions found' }] };

  return {
    quiz: {
      title: typeof meta.title === 'string' ? meta.title : 'imported quiz',
      description: typeof meta.description === 'string' ? meta.description : '',
      cover_emoji: typeof meta.cover_emoji === 'string' ? meta.cover_emoji : '🎯',
      questions,
    },
    issues: [],
  };
}
