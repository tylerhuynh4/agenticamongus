import dotenv from "dotenv";

dotenv.config();

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel:
    process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct",
  openRouterBaseUrl:
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  openRouterAppName:
    process.env.OPENROUTER_APP_NAME ?? "agenticamongus-backend",
  openRouterAppUrl: process.env.OPENROUTER_APP_URL ?? "",
  temperature: parseNumber(process.env.OPENROUTER_TEMPERATURE, 0.7),
  maxTokens: parseNumber(process.env.OPENROUTER_MAX_TOKENS, 300),
  timeoutMs: parseNumber(process.env.OPENROUTER_TIMEOUT_MS, 8000),
};
