import type { Quest, QuestSide } from "@/lib/types";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asList(value: unknown, max = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function asSide(value: unknown, name: string, focus: string): QuestSide | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const tasks = asList(data.tasks, 6);
  if (tasks.length < 2) return null;
  return {
    name: asString(data.name) || name,
    focus: asString(data.focus) || focus,
    tasks,
  };
}

export function normalizeQuest(
  value: unknown,
  names: { studentA: string; studentB: string },
): Quest | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const title = asString(data.title);
  const studentA = asSide(data.studentA, names.studentA, "Frontend");
  const studentB = asSide(data.studentB, names.studentB, "Backend");
  if (!title || !studentA || !studentB) return null;

  const difficulty = asString(data.difficulty);
  const safeDifficulty =
    difficulty === "Easy" || difficulty === "Medium" || difficulty === "Hard"
      ? difficulty
      : "Medium";

  return {
    title: title.slice(0, 80),
    tagline: asString(data.tagline).slice(0, 180),
    difficulty: safeDifficulty,
    timeline: asString(data.timeline).slice(0, 40) || "3 Days",
    summary: asString(data.summary).slice(0, 500),
    stack: asList(data.stack, 6),
    studentA: { ...studentA, name: names.studentA },
    studentB: { ...studentB, name: names.studentB },
    successCriteria: asList(data.successCriteria, 4),
  };
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(body);
}
