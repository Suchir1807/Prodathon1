import type { Profile, Quest } from "@/lib/types";

export type GeminiMission = {
  questTitle: string;
  kanbanTasksStudentA: string[];
  kanbanTasksStudentB: string[];
  apiContractHint: string;
  plannedCurveball: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asTasks(value: unknown, max = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function normalizeGeminiMission(value: unknown): GeminiMission | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const questTitle = asString(data.questTitle);
  const kanbanTasksStudentA = asTasks(data.kanbanTasksStudentA, 6);
  const kanbanTasksStudentB = asTasks(data.kanbanTasksStudentB, 6);
  const apiContractHint = asString(data.apiContractHint);
  const plannedCurveball = asString(data.plannedCurveball);

  if (
    !questTitle ||
    kanbanTasksStudentA.length < 2 ||
    kanbanTasksStudentB.length < 2 ||
    !apiContractHint ||
    !plannedCurveball
  ) {
    return null;
  }

  return {
    questTitle: questTitle.slice(0, 80),
    kanbanTasksStudentA,
    kanbanTasksStudentB,
    apiContractHint: apiContractHint.slice(0, 280),
    plannedCurveball: plannedCurveball.slice(0, 280),
  };
}

export function sharedDomain(studentA: Profile, studentB: Profile) {
  const wanted = new Set(studentB.domains);
  return studentA.domains.find((domain) => wanted.has(domain)) ?? studentA.domains[0] ?? studentB.domains[0] ?? "EdTech";
}

export function missionToQuest(
  mission: GeminiMission,
  names: { studentA: string; studentB: string },
): Quest {
  return {
    title: mission.questTitle,
    tagline: mission.apiContractHint,
    difficulty: "Medium",
    timeline: "3 Days",
    summary: `72-hour sprint with a planned curveball at hour 36: ${mission.plannedCurveball}`,
    stack: ["Next.js", "Node.js", "Shared JSON contract"],
    studentA: {
      name: names.studentA,
      focus: "Frontend",
      tasks: mission.kanbanTasksStudentA,
    },
    studentB: {
      name: names.studentB,
      focus: "Backend",
      tasks: mission.kanbanTasksStudentB,
    },
    successCriteria: [
      "Kanban board reflects shipped tasks",
      "API contract matches live demo",
      "Team adapts when the curveball drops",
    ],
  };
}

export function buildSampleMission(studentA: Profile, studentB: Profile): GeminiMission {
  const domain = sharedDomain(studentA, studentB);
  const title =
    domain === "FinTech"
      ? "Real-Time Crypto Tracker"
      : domain === "EdTech"
        ? "Study Sprint Board"
        : `${domain} Micro-Ship`;

  return {
    questTitle: title,
    kanbanTasksStudentA: [
      "Scaffold dashboard shell and wallet cards",
      "Wire live price chart to the shared contract",
      "Polish loading, empty, and error states for demo",
    ],
    kanbanTasksStudentB: [
      "Stand up ingest service and Mongo schema",
      "Expose REST endpoints for wallets and prices",
      "Add health checks and seed data for demo",
    ],
    apiContractHint: `Student A renders UI from Student B's /prices/live and /wallets endpoints using one shared ${domain} JSON schema.`,
    plannedCurveball: "Swap REST polling for WebSockets at hour 36 and migrate the chart without breaking the contract.",
  };
}

export function missionApiSnippet(mission: GeminiMission) {
  return JSON.stringify(
    {
      mission: mission.questTitle,
      contractHint: mission.apiContractHint,
      endpoints: {
        "GET /api/wallets": "Wallet[]",
        "GET /api/prices/live": { symbols: "string[]" },
        "WS /api/stream/prices": { events: ["price.tick"] },
      },
      curveballAtHour36: mission.plannedCurveball,
    },
    null,
    2,
  );
}
