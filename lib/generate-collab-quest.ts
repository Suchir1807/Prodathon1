import { GoogleGenAI } from "@google/genai";

import { generatedQuestSchema, type GeneratedQuestValues } from "@/lib/validation/schemas";
import type { Profile } from "@/lib/types";
import { sharedDomain } from "@/lib/mission";

type QuestGeneration = { quest: GeneratedQuestValues; source: "gemini" | "sample" };

function fallbackQuest(a: Profile, b: Profile): GeneratedQuestValues {
  const domain = sharedDomain(a, b);
  const skillA = a.canTeach[0] ?? a.wantsToLearn[0] ?? "frontend";
  const skillB = b.canTeach[0] ?? b.wantsToLearn[0] ?? "backend";
  return {
    title: `${domain} Builder Exchange`,
    brief: `Build a small, demo-ready ${domain.toLowerCase()} experience that helps a real user complete one focused task. Pair ${skillA} with ${skillB}; keep the scope testable and shippable in three days.`,
    roles: {
      A: `Own the user-facing experience, using ${skillA} and pairing with your partner on the integration.`,
      B: `Own the data flow and application behavior, using ${skillB} and pairing on the integration.`,
    },
    skillsUsed: [...new Set([skillA, skillB, ...a.wantsToLearn.slice(0, 2), ...b.wantsToLearn.slice(0, 2)])].slice(0, 8),
    tasks: [
      { title: "Agree on one user problem and a clear demo outcome", role: "shared", priority: 1 },
      { title: `Sketch the core flow using ${skillA}`, role: "A", priority: 2 },
      { title: `Define the data shape and success states with ${skillB}`, role: "B", priority: 2 },
      { title: "Build the first usable screen and connect it to the shared flow", role: "A", priority: 3 },
      { title: "Implement the core behavior and representative data", role: "B", priority: 3 },
      { title: "Integrate both sides and test the primary user journey", role: "shared", priority: 4 },
      { title: "Polish the demo, document setup, and capture the outcome", role: "shared", priority: 5 },
    ],
    sharedSpec: `# ${domain} Builder Exchange\n\n## User problem\nWho is this for, and what one task should become easier?\n\n## Shared contract\nAgree on the input, output, and error states before integration.\n\n## Demo acceptance\n- The primary journey works end to end.\n- Both collaborators can explain their contribution.\n- The demo can be run from the project README.\n`,
    curveball: {
      text: "Swap one assumed input for a realistic edge case, then adapt the shared contract without breaking the core journey.",
      unlockHour: 36,
    },
    stretchGoal: "Add one accessibility or performance improvement and explain its impact in the project write-up.",
  };
}

function promptFor(a: Profile, b: Profile, retry: boolean) {
  return `${retry ? "Return valid JSON only. Do not include markdown or extra keys.\n" : ""}Create a balanced, demo-ready 72-hour quest for two student builders.
Student A: ${JSON.stringify(a)}
Student B: ${JSON.stringify(b)}
Use each person's skills, learning goals, and domains. Return exactly this JSON shape:
{"title":"4-120 chars","brief":"clear project brief","roles":{"A":"responsibility","B":"responsibility"},"skillsUsed":["skill A","skill B"],"tasks":[{"title":"task","role":"A|B|shared","priority":1}],"sharedSpec":"markdown starter spec","curveball":{"text":"hidden mid-quest challenge","unlockHour":36},"stretchGoal":"optional stretch"}
Include 6-8 tasks, mix roles A/B/shared, and use integer priority 1-5. No additional properties.`;
}

export async function generateCollaborativeQuest(a: Profile, b: Profile): Promise<QuestGeneration> {
  const fallback = fallbackQuest(a, b);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { quest: fallback, source: "sample" };

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: promptFor(a, b, attempt > 0),
        config: { responseMimeType: "application/json" },
      });
      const parsed = generatedQuestSchema.safeParse(JSON.parse(response.text ?? ""));
      if (parsed.success) return { quest: parsed.data, source: "gemini" };
      lastError = parsed.error;
    } catch (error) {
      lastError = error;
    }
  }
  console.error("Quest generation failed; using the built-in fallback.", lastError);
  return { quest: fallback, source: "sample" };
}
