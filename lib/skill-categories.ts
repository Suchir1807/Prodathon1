export const SKILL_CATEGORIES = {
  Tech: ["Programming", "Data analysis", "Web development", "AI / ML", "Design tools"],
  Languages: ["English", "Spanish", "French", "Hindi", "Japanese"],
  Music: ["Guitar", "Piano", "Singing", "Music production"],
  Creative: ["Drawing", "Photography", "Writing", "Video editing", "Graphic design"],
  Fitness: ["Strength training", "Yoga", "Running", "Dance"],
  Cooking: ["Baking", "Meal prep", "Sourdough", "Knife skills"],
  Academics: ["Math", "Science", "Study skills", "Statistics"],
  Career: ["Interview practice", "Public speaking", "Resume writing", "Leadership"],
  "Life skills": ["Budgeting", "Gardening", "Organization", "First aid"],
  Other: [],
} as const;

export type SkillCategory = keyof typeof SKILL_CATEGORIES;
export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

export function normalizeSkill(value: string) {
  return value.trim().toLocaleLowerCase();
}
