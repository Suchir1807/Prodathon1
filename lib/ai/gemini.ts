import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export async function generateGeminiJson(
  systemInstruction: string,
  prompt: string,
): Promise<unknown> {
  const response = await getClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }
}
