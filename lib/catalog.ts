import type { Profile } from "@/lib/types";

export const SKILLS_I_HAVE = [
  "React",
  "Python",
  "UI/UX",
  "TypeScript",
  "Figma",
  "Swift",
  "Go",
  "SQL",
  "Next.js",
  "Node.js",
] as const;

export const SKILLS_I_WANT = [
  "Node.js",
  "MongoDB",
  "AI Agents",
  "Rust",
  "System Design",
  "GraphQL",
  "Docker",
  "Next.js",
  "Python",
  "React",
] as const;

export const DOMAIN_INTERESTS = [
  "EdTech",
  "FinTech",
  "Gaming",
  "HealthTech",
  "Climate",
  "Social",
  "DevTools",
  "Creator Economy",
] as const;

export const STARTER_PROFILE: Profile = {
  name: "Alex Rivera",
  canTeach: ["React", "Python", "UI/UX"],
  wantsToLearn: ["Node.js", "MongoDB", "AI Agents"],
  domains: ["EdTech", "FinTech"],
};

export const EMPTY_PROFILE: Profile = {
  name: "",
  canTeach: [],
  wantsToLearn: [],
  domains: [],
};
