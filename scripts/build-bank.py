#!/usr/bin/env python3
"""Turn data/question-bank.source.json into the importable shape from Part 4.

Correct answers are placed round-robin across a/b/c/d so the key never clusters on
one letter, and the distractors keep their relative order around them.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "question-bank.source.json"
OUT = ROOT / "data" / "question-bank.json"
LETTERS = ["a", "b", "c", "d"]


def main() -> int:
    src = json.loads(SRC.read_text())
    questions = src["questions"]
    out = []

    for i, q in enumerate(questions):
        correct = q["answer"]
        distractors = q["distractors"]
        if len(distractors) != 3:
            print(f"question {i + 1} needs exactly 3 distractors", file=sys.stderr)
            return 1

        slot = i % 4
        options = []
        d = 0
        for pos in range(4):
            if pos == slot:
                options.append(correct)
            else:
                options.append(distractors[d])
                d += 1

        out.append(
            {
                "position": i + 1,
                "prompt": q["prompt"],
                "options": [
                    {"id": LETTERS[pos], "text": text} for pos, text in enumerate(options)
                ],
                "correct_option_id": LETTERS[slot],
                "time_limit_ms": q.get("time_limit_ms", 20000),
                "points_base": q.get("points_base", 1000),
                "explanation": q["explanation"],
                "difficulty": q["difficulty"],
            }
        )

    prompts = [q["prompt"] for q in out]
    if len(set(prompts)) != len(prompts):
        print("duplicate prompts in the bank", file=sys.stderr)
        return 1

    spread = {L: sum(1 for q in out if q["correct_option_id"] == L) for L in LETTERS}
    difficulty = {d: sum(1 for q in out if q["difficulty"] == d) for d in ("easy", "medium", "hard")}

    payload = {
        "quiz": src["quiz"],
        "questions": [
            {k: v for k, v in q.items() if k != "difficulty"} for q in out
        ],
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

    print(f"wrote {OUT.relative_to(ROOT)}: {len(out)} questions")
    print(f"answer spread: {spread}")
    print(f"difficulty:    {difficulty}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
