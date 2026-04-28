import { spawn } from "node:child_process";
import { config } from "../config.js";
import type { LlmClient, LlmResult } from "../types.js";

export class LlamaCppClient implements LlmClient {
  async complete(prompt: string): Promise<LlmResult> {
    if (!config.llamaCppBin || !config.modelPath) {
      throw new Error(
        "Missing llama.cpp configuration. Set LLAMA_CPP_BIN and LLAMA_MODEL_PATH in your environment.",
      );
    }

    const args = [
      "-m",
      config.modelPath,
      "-c",
      String(config.contextSize),
      "-no-cnv",
      "-st",
      "--simple-io",
      "--log-disable",
      "--temp",
      String(config.temperature),
      "-p",
      prompt,
      "-n",
      String(config.maxTokens),
      "--no-display-prompt",
    ];

    const startedAt = Date.now();

    return new Promise<LlmResult>((resolve, reject) => {
      const child = spawn(config.llamaCppBin, args, {
        windowsHide: true,
        timeout: config.timeoutMs,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code === null) {
          reject(
            new Error(
              `llama.cpp timed out after ${config.timeoutMs}ms. Try lowering LLAMA_MAX_TOKENS or LLAMA_CONTEXT_SIZE.`,
            ),
          );
          return;
        }

        if (code !== 0) {
          reject(
            new Error(
              `llama.cpp exited with code ${code}. stderr: ${stderr.trim()}`,
            ),
          );
          return;
        }

        resolve({
          text: stdout.trim(),
          durationMs: Date.now() - startedAt,
        });
      });
    });
  }
}

export class MockLlmClient implements LlmClient {
  constructor(private readonly fixedText: string) {}

  async complete(_prompt: string): Promise<LlmResult> {
    return {
      text: this.fixedText,
      durationMs: 1,
    };
  }
}
