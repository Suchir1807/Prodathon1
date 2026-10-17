import { NextResponse } from "next/server";

import { findAuthorizedWorkspace } from "@/lib/authorized-workspace";
import { generateGeminiJson } from "@/lib/ai/gemini";
import {
  assistantResponseSchemas,
  assistantSystemInstructions,
  sprintAssistantRequestSchema,
} from "@/lib/ai/sprint-assistant";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  const parsedRequest = sprintAssistantRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: parsedRequest.error.issues[0]?.message ?? "Invalid sprint assistant request." },
      { status: 400 },
    );
  }
  const { workspaceId, command, prompt } = parsedRequest.data;

  const access = await findAuthorizedWorkspace(workspaceId, true);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "AI acceleration is unavailable because GEMINI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  try {
    const generated = await generateGeminiJson(
      assistantSystemInstructions[command],
      JSON.stringify({ request: prompt }),
    );
    const result = assistantResponseSchemas[command].safeParse(generated);
    if (!result.success) {
      console.error("Sprint assistant returned an invalid result for command:", command);
      return NextResponse.json(
        { error: "The AI response did not match the requested format. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ command, result: result.data });
  } catch (error) {
    console.error("Sprint assistant generation failed:", error);
    return NextResponse.json(
      { error: "AI generation failed. Please try again." },
      { status: 502 },
    );
  }
}
