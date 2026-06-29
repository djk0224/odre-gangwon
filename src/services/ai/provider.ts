import { getGeminiApiKey, getOpenAiApiKey } from "@/lib/serverEnv";
import type { AiProvider } from "@/services/ai/types";

export function getConfiguredAiProviders(): AiProvider[] {
  const list: AiProvider[] = ["rules"];
  if (getOpenAiApiKey()) list.unshift("openai");
  if (getGeminiApiKey()) list.unshift("gemini");
  return list;
}

export function parseJsonFromLlm<T>(text: string): T | null {
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const match = stripped.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

/** 데모 체감: 상위 Promise.race와 맞춰 provider fetch도 강제 중단 */
const LLM_FETCH_TIMEOUT_MS = 8_000;

async function fetchWithLlmTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`LLM fetch timeout (${LLM_FETCH_TIMEOUT_MS}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-3.1-flash-lite-preview",
].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

export async function completeJsonWithLlm<T>(options: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ data: T; provider: AiProvider } | null> {
  const openAi = await callOpenAiJson<T>(options);
  if (openAi) return openAi;

  const gemini = await callGeminiJson<T>(options);
  if (gemini) return gemini;

  return null;
}

async function callOpenAiJson<T>(options: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ data: T; provider: AiProvider } | null> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return null;

  const response = await fetchWithLlmTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: options.temperature ?? 0.35,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const data = parseJsonFromLlm<T>(content);
  if (!data) return null;
  return { data, provider: "openai" };
}

async function callGeminiJson<T>(options: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ data: T; provider: AiProvider } | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = `${options.system}\n\n${options.user}`;
  let lastError: string | null = null;

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const response = await fetchWithLlmTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.35,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      lastError = payload.error?.message ?? `Gemini ${response.status} (${model})`;
      if (response.status === 429 || response.status === 404) {
        continue;
      }
      throw new Error(lastError);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const data = parseJsonFromLlm<T>(text);
    if (data) return { data, provider: "gemini" };
    lastError = `Gemini JSON parse failed (${model})`;
  }

  if (lastError) {
    throw new Error(lastError);
  }

  return null;
}

/** Gemini SSE 토큰 스트림 (합성·채팅용) */
export async function* streamGeminiText(options: {
  system: string;
  user: string;
  temperature?: number;
}): AsyncGenerator<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return;

  const prompt = `${options.system}\n\n${options.user}`;
  let yielded = false;

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const response = await fetchWithLlmTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: options.temperature ?? 0.3 },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429 || response.status === 404) continue;
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(payload.error?.message ?? `Gemini stream ${response.status}`);
    }

    if (!response.body) continue;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n");
      buffer = events.pop() ?? "";

      for (const line of events) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonText = trimmed.slice(5).trim();
        if (!jsonText || jsonText === "[DONE]") continue;
        try {
          const payload = JSON.parse(jsonText) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const piece = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (piece) {
            yielded = true;
            yield piece;
          }
        } catch {
          /* partial SSE line */
        }
      }
    }

    if (yielded) return;
  }
}
