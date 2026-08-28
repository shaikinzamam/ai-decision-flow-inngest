import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type { DecisionCondition } from "@/types/workflow";

const decisionSchema = z.enum(["YES", "NO"]);

export class DecisionError extends Error {
  constructor(message: string) { super(message); this.name = "DecisionError"; }
}

function normalizeDecision(raw: string): DecisionCondition {
  const normalized = raw.trim().toUpperCase();
  const parsed = decisionSchema.safeParse(normalized);
  if (!parsed.success) throw new DecisionError("The AI returned an invalid decision. Expected exactly YES or NO.");
  return parsed.data;
}

export async function evaluateDecision(input: string, prompt: string): Promise<DecisionCondition> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new DecisionError("GROQ_API_KEY is not configured on the server.");
  const model = process.env.GROQ_MODEL?.trim() || "groq/compound-mini";

  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 4,
      stream: false,
      messages: [
        { role: "system", content: "You are a binary decision engine. Return exactly one token: YES or NO. Do not explain. Do not add punctuation. Do not return markdown." },
        { role: "user", content: `User input:\n${input}\n\nDecision:\n${prompt}` },
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new DecisionError("The AI returned an empty decision.");
    return normalizeDecision(content);
  } catch (error) {
    if (error instanceof DecisionError) throw error;
    if (error instanceof OpenAI.APIError) {
      const status = error.status ? ` (HTTP ${error.status})` : "";
      const code = typeof error.code === "string" ? ` [${error.code}]` : "";
      throw new DecisionError(`Groq request failed${status}${code}: ${error.message}`);
    }
    throw new DecisionError("Groq request failed because of an unexpected provider error.");
  }
}
