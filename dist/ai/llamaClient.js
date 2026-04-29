import { config } from "../config.js";
export class OpenRouterClient {
    async complete(prompt) {
        if (!config.openRouterApiKey) {
            throw new Error("Missing OpenRouter configuration. Set OPENROUTER_API_KEY in your environment.");
        }
        const startedAt = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
        try {
            const response = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
                method: "POST",
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${config.openRouterApiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": config.openRouterAppUrl,
                    "X-Title": config.openRouterAppName,
                },
                body: JSON.stringify({
                    model: config.openRouterModel,
                    temperature: config.temperature,
                    max_tokens: config.maxTokens,
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter request failed with status ${response.status}: ${errorText.trim()}`);
            }
            const data = (await response.json());
            const text = data.choices?.[0]?.message?.content?.trim() ?? "";
            return {
                text,
                durationMs: Date.now() - startedAt,
            };
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                throw new Error(`OpenRouter timed out after ${config.timeoutMs}ms.`);
            }
            throw error;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
export class MockLlmClient {
    fixedText;
    constructor(fixedText) {
        this.fixedText = fixedText;
    }
    async complete(_prompt) {
        return {
            text: this.fixedText,
            durationMs: 1,
        };
    }
}
