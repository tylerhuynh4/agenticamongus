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
  llamaCppBin: process.env.LLAMA_CPP_BIN ?? "",
  modelPath: process.env.LLAMA_MODEL_PATH ?? "",
  contextSize: parseNumber(process.env.LLAMA_CONTEXT_SIZE, 2048),
  temperature: parseNumber(process.env.LLAMA_TEMPERATURE, 0.2),
  maxTokens: parseNumber(process.env.LLAMA_MAX_TOKENS, 16),
  timeoutMs: parseNumber(process.env.LLAMA_TIMEOUT_MS, 120000),
};
