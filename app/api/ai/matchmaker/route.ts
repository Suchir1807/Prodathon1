import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Technical skills the user requires in a developer.",
    },
    requireGreenGrid: {
      type: Type.BOOLEAN,
      description: "Whether the user requires sustainability or green energy.",
    },
    searchIntent: {
      type: Type.STRING,
      description: "A short summary of the developer the user wants to find.",
    },
  },
  required: ["skills", "requireGreenGrid", "searchIntent"],
  propertyOrdering: ["skills", "requireGreenGrid", "searchIntent"],
};

function isMatchmakerResult(value: unknown): value is {
  skills: string[];
  requireGreenGrid: boolean;
  searchIntent: string;
} {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    Array.isArray(result.skills) &&
    result.skills.every((skill) => typeof skill === "string" && skill.trim().length > 0) &&
    typeof result.requireGreenGrid === "boolean" &&
    typeof result.searchIntent === "string" &&
    result.searchIntent.trim().length > 0
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  const query =
    body && typeof body === "object" && "query" in body && typeof body.query === "string"
      ? body.query.trim()
      : "";
  if (!query || query.length > 500) {
    return Response.json(
      { error: "Query must be between 1 and 500 characters." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI matching is unavailable because GEMINI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: query,
      config: {
        systemInstruction:
          "Extract the user's developer search requirements. Include only relevant technical skills in skills. Set requireGreenGrid to true when they request sustainability, green energy, low-carbon energy, or a green grid. Return only data matching the provided response schema.",
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text;
    if (typeof text !== "string" || !text.trim()) {
      console.error("Gemini matchmaker returned an empty response.");
      return Response.json({ error: "AI matching returned an empty response." }, { status: 502 });
    }

    let result: unknown;
    try {
      result = JSON.parse(text);
    } catch {
      console.error("Gemini matchmaker returned invalid JSON.");
      return Response.json({ error: "AI matching returned invalid JSON." }, { status: 502 });
    }

    if (!isMatchmakerResult(result)) {
      console.error("Gemini matchmaker returned data outside the expected schema.");
      return Response.json(
        { error: "AI matching returned an unexpected response format." },
        { status: 502 },
      );
    }

    return Response.json({
      skills: result.skills.map((skill) => skill.trim()),
      requireGreenGrid: result.requireGreenGrid,
      searchIntent: result.searchIntent.trim(),
    });
  } catch (error) {
    console.error("Gemini matchmaker request failed:", error);
    return Response.json({ error: "AI matching failed. Please try again." }, { status: 502 });
  }
}
