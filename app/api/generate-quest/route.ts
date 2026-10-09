import { GoogleGenAI } from "@google/genai";

import {
  buildSampleMission,
  missionToQuest,
  normalizeGeminiMission,
  sharedDomain,
} from "@/lib/mission";
import { extractJson } from "@/lib/quest";
import { displayName, sanitizeProfile } from "@/lib/profile";
import type { QuestResponse } from "@/lib/types";

export const runtime = "nodejs";

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
];

const SYSTEM_PROMPT = `You are a brutal but brilliant Technical Product Manager. Two developers with complementary skills are doing a 72-hour hackathon sprint. Generate a micro-project for them. You MUST return your response as raw JSON matching this exact structure, with no markdown formatting:
{
  "questTitle": "Name of the app",
  "kanbanTasksStudentA": ["Task 1", "Task 2", "Task 3"],
  "kanbanTasksStudentB": ["Task 1", "Task 2", "Task 3"],
  "apiContractHint": "A 1-sentence hint on how their data should connect",
  "plannedCurveball": "A secret technical twist to inject at hour 36"
}`;

function readResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as { text?: string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON with studentA and studentB profiles." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const studentA = sanitizeProfile(record.studentA);
  const studentB = sanitizeProfile(record.studentB);
  const names = {
    studentA: displayName(studentA),
    studentB: studentB.name || "Partner",
  };
  const domain = sharedDomain(studentA, studentB);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const mission = buildSampleMission(studentA, studentB);
    const sample: QuestResponse = {
      source: "sample",
      mission,
      quest: missionToQuest(mission, names),
      notice:
        "GEMINI_API_KEY is not set. This is a structured sample so Mission Control still boots. Add the key to .env.local for a live quest.",
    };
    return Response.json(sample);
  }

  const userPrompt = `Student A profile:
${JSON.stringify({ ...studentA, name: names.studentA })}

Student B profile:
${JSON.stringify({ ...studentB, name: names.studentB })}

Shared domain focus: ${domain}

Bias Student A toward frontend delivery and Student B toward backend/API work. Keep the scope demo-ready in 72 hours.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    let text = "";
    let lastError = "Gemini is busy right now. Try the match again.";

    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
          },
        });
        text = readResponseText(response);
        if (text) break;
        lastError = `${model} returned an empty mission blueprint.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }

    if (!text) {
      const mission = buildSampleMission(studentA, studentB);
      const sample: QuestResponse = {
        source: "sample",
        mission,
        quest: missionToQuest(mission, names),
        notice: `Gemini unavailable (${lastError}). Loaded a mission blueprint so Mission Control can still boot.`,
      };
      return Response.json(sample);
    }

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      return Response.json({ error: "Could not parse Gemini JSON. Try again." }, { status: 502 });
    }

    const mission = normalizeGeminiMission(parsed);
    if (!mission) {
      return Response.json(
        { error: "The model response did not match the mission format. Try again." },
        { status: 502 },
      );
    }

    const result: QuestResponse = {
      source: "gemini",
      mission,
      quest: missionToQuest(mission, names),
    };
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quest generation failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
