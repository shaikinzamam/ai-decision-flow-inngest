import OpenAI from "openai";

const apiKey = process.env.GROQ_API_KEY?.trim();
const model = process.env.GROQ_MODEL?.trim() || "groq/compound-mini";
const baseURL = "https://api.groq.com/openai/v1";

if (!apiKey) {
  console.error("GROQ_API_KEY is not configured.");
  process.exitCode = 1;
} else {
  console.log(`GROQ_API_KEY present: ${Boolean(apiKey)}`);
  console.log(`GROQ_MODEL: ${model}`);

  const client = new OpenAI({ apiKey, baseURL });

  try {
    const response = await fetch(`${baseURL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await response.json();
    const modelIds = Array.isArray(body?.data) ? body.data.map((item) => item?.id).filter((id) => typeof id === "string") : [];
    console.log(`NATIVE_MODEL_LIST status=${response.status} configuredModelPresent=${modelIds.includes(model)} models=${JSON.stringify(modelIds)}`);
  } catch (error) {
    console.error(`NATIVE_MODEL_LIST status=FAIL error=${sanitizeError(error)}`);
  }

  try {
    const models = await client.models.list();
    console.log(`MODEL_LIST status=PASS configuredModelPresent=${models.data.some((item) => item.id === model)}`);
  } catch (error) {
    console.error(`MODEL_LIST status=FAIL error=${sanitizeError(error)}`);
  }

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Respond with exactly YES." }],
      temperature: 0,
      max_tokens: 4,
      stream: false,
    });
    console.log(`SDK_REQUEST status=PASS response=${JSON.stringify(response.choices[0]?.message?.content ?? "")}`);
  } catch (error) {
    console.error(`SDK_REQUEST status=FAIL error=${sanitizeError(error)}`);
  }

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Respond with exactly YES." }],
        temperature: 0,
        max_tokens: 4,
        stream: false,
      }),
    });
    const body = await response.text();
    console.log(`NATIVE_FETCH status=${response.status} contentType=${response.headers.get("content-type") ?? "unknown"} body=${sanitizeBody(body)}`);
  } catch (error) {
    console.error(`NATIVE_FETCH status=FAIL error=${sanitizeError(error)}`);
  }
}

function sanitizeError(error) {
  if (error instanceof OpenAI.APIError) {
    const status = error.status ? `HTTP ${error.status} ` : "";
    const code = typeof error.code === "string" ? `[${error.code}] ` : "";
    return `${status}${code}${error.message}`;
  }
  return error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";
}

function sanitizeBody(body) {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "error" in parsed) return JSON.stringify({ error: parsed.error });
    const content = parsed?.choices?.[0]?.message?.content;
    return JSON.stringify({ content: typeof content === "string" ? content : null });
  } catch {
    return JSON.stringify(body.slice(0, 500));
  }
}
