import { displayName } from "@/lib/profile";
import type { Profile, Quest } from "@/lib/types";

const TITLES: Record<string, string> = {
  FinTech: "Real-time Crypto Tracker",
  EdTech: "Study Sprint Board",
  Gaming: "Co-op Puzzle Prototype",
  HealthTech: "Habit Pulse Check-in",
  Climate: "Neighborhood Carbon Log",
  Social: "Campus Skill Swap",
  DevTools: "Pair-Debug Recorder",
  "Creator Economy": "Launch-Week Desk",
};

function shared(left: string[], right: string[]) {
  const wanted = new Set(right);
  return left.filter((item) => wanted.has(item));
}

export function buildSampleQuest(studentA: Profile, studentB: Profile): Quest {
  const domain =
    shared(studentA.domains, studentB.domains)[0] ??
    studentA.domains[0] ??
    studentB.domains[0] ??
    "EdTech";
  const aLearn = studentA.wantsToLearn[0] ?? "Node.js";
  const bLearn = studentB.wantsToLearn[0] ?? "React";
  const aTeach = studentA.canTeach[0] ?? "React";
  const bTeach = studentB.canTeach[0] ?? "Node.js";
  const nameA = displayName(studentA);
  const nameB = studentB.name || "Partner";

  return {
    title: TITLES[domain] ?? `${domain} Sprint`,
    tagline: `A 72-hour ${domain} build where ${nameA} practices ${aLearn} and ${nameB} practices ${bLearn}.`,
    difficulty: "Medium",
    timeline: "3 Days",
    summary: `Ship a small ${domain.toLowerCase()} product with a shared data contract on day one, a working core loop on day two, and a demo on day three. Each person teaches the skill they already have and practices the one they want.`,
    stack: Array.from(new Set([aTeach, bTeach, aLearn, bLearn, "Git"])).slice(0, 5),
    studentA: {
      name: nameA,
      focus: "Frontend",
      tasks: [
        `Day 1: Scaffold the UI in ${aTeach} and agree on the JSON contract ${nameB} will serve.`,
        `Day 2: Build the main screen and wire it to live data while practicing ${aLearn}.`,
        `Day 3: Polish empty, loading, and error states, then record a 2-minute demo.`,
      ],
    },
    studentB: {
      name: nameB,
      focus: "Backend",
      tasks: [
        `Day 1: Stand up a ${bTeach} service with one seed dataset and a documented endpoint.`,
        `Day 2: Add the write path and persistence, using the sprint to practice ${bLearn}.`,
        `Day 3: Add basic validation, a health check, and notes for how to run the demo.`,
      ],
    },
    successCriteria: [
      "Both people can run the demo from a fresh clone in under 10 minutes.",
      "The core loop works end to end without hardcoded fake clicks.",
      "Each person can explain the part they learned, not only the part they already knew.",
    ],
  };
}
