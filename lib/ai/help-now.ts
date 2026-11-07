import { z } from "zod";

import { generateGeminiJson } from "@/lib/ai/gemini";
import { SKILL_CATEGORIES } from "@/lib/skill-categories";

const triageSchema = z.object({
  category: z.enum([
    "Tech",
    "Languages",
    "Music",
    "Creative",
    "Fitness",
    "Cooking",
    "Academics",
    "Career",
    "Life skills",
    "Other",
  ]),
  skill: z.string().trim().min(1).max(80),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  brief: z.string().trim().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(40)).length(3),
});

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(1200),
});

export type HelpTriage = z.infer<typeof triageSchema>;

export function sanitizeHelpText(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[contact removed]")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link removed]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone removed]")
    .replace(/@[a-z0-9_]{2,}/gi, "[handle removed]")
    .trim();
}

function fallbackTriage(problem: string): HelpTriage {
  const text = problem.toLocaleLowerCase();
  const fallbacks: Array<[keyof typeof SKILL_CATEGORIES, string[]]> = [
    ["Cooking", ["cook", "bake", "bread", "sourdough", "recipe"]],
    ["Languages", ["translate", "pronounce", "language", "grammar", "spanish", "english"]],
    ["Music", ["guitar", "piano", "song", "music", "sing"]],
    ["Fitness", ["workout", "exercise", "running", "yoga", "fitness"]],
    ["Academics", ["math", "study", "homework", "science", "statistics"]],
    ["Career", ["interview", "resume", "career", "job", "presentation"]],
    ["Creative", ["draw", "photo", "write", "design", "video"]],
    ["Tech", ["code", "error", "python", "data", "app", "computer"]],
    ["Life skills", ["budget", "garden", "organize", "repair"]],
  ];
  const match = fallbacks.find(([, words]) => words.some((word) => text.includes(word)));
  const category = match?.[0] ?? "Other";
  const skill = match?.[1][0] === "code" ? "Programming" : (match?.[1][0] ?? category);
  return {
    category,
    skill,
    difficulty: "Beginner",
    brief: `Help the learner make progress with: ${problem.slice(0, 360)}`,
    tags: [category.toLocaleLowerCase(), skill.toLocaleLowerCase(), "quick-help"],
  };
}

export async function triageHelpRequest(problem: string) {
  const cleanProblem = sanitizeHelpText(problem);
  try {
    const raw = await generateGeminiJson(
      "Classify an everyday help request into one listed skill category. Return only JSON with category, specific skill, difficulty, one-line helper brief, and exactly three short search tags. Do not reproduce contact details.",
      `Categories: ${Object.keys(SKILL_CATEGORIES).join(", ")}\nProblem: ${cleanProblem}`,
    );
    const parsed = triageSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Gemini triage did not match the required schema.");
    return parsed.data;
  } catch (error) {
    console.warn("Help Now triage fallback used:", error);
    return fallbackTriage(cleanProblem);
  }
}

export async function quickAnswer(problem: string, triage: HelpTriage) {
  const cleanProblem = sanitizeHelpText(problem);
  try {
    const raw = await generateGeminiJson(
      "Give one brief, safe, practical first response to an everyday skill question. Keep it under 120 words. Avoid personal contact details, risky medical/legal instructions, and claims of certainty. Return JSON with an answer string.",
      `Category: ${triage.category}\nSkill: ${triage.skill}\nQuestion: ${cleanProblem}`,
    );
    const parsed = answerSchema.safeParse(raw);
    if (parsed.success) return parsed.data.answer;
  } catch (error) {
    console.warn("Help Now quick-answer fallback used:", error);
  }
  return `A useful first step for ${triage.skill.toLocaleLowerCase()}: describe what you tried, note what happened, and change one variable at a time.`;
}

export async function createPracticeRecap(problem: string, notes: string, brief: string) {
  const schema = z.object({
    recap: z.string().trim().min(1).max(1200),
    practiceSteps: z.array(z.string().trim().min(1).max(180)).length(3),
  });
  try {
    const raw = await generateGeminiJson(
      "Summarize a peer micro-session and provide exactly three specific practice steps. Do not include personal contact information. Return JSON with recap and practiceSteps.",
      `Problem: ${sanitizeHelpText(problem)}\nHelper brief: ${sanitizeHelpText(brief)}\nShared notes: ${sanitizeHelpText(notes).slice(0, 5000)}`,
    );
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
  } catch (error) {
    console.warn("Help Now recap fallback used:", error);
  }
  return {
    recap: "You worked through the request together and identified a practical next step.",
    practiceSteps: [
      "Repeat the key technique once without looking at the notes.",
      "Try a slightly different example and note the result.",
      "Review the shared notes and choose one improvement for next time.",
    ],
  };
}
