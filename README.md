# agenticamongus

## Team
- Tyler Huynh
- Duy Nguyen
- Daniel Lee

## Brief (Duy)
This is what I know so far and what I've done so far. The README can be edited/changed.

## AI/Agent Setup

This repository now includes a starter AI/Agent implementation in TypeScript.

### Stack
- Node.js + TypeScript
- OpenRouter chat-completions integration
- Fastify and WS dependencies aligned with project direction
- Vitest test workflow (compatible with Vite ecosystem)

### Prerequisites
1. Install Node.js 20+.
2. Create an OpenRouter account and generate an API key.
3. Use the OpenRouter model slug `meta-llama/llama-3.1-8b-instruct`

### Install
```bash
npm install
```

### Configure
1. Copy `.env.example` to `.env`.
2. Set:
	- `OPENROUTER_API_KEY` to your OpenRouter API key.
	- `OPENROUTER_MODEL` to the OpenRouter model slug, which defaults to `meta-llama/llama-3.1-8b-instruct`.
	- Optionally set `OPENROUTER_APP_URL` and `OPENROUTER_APP_NAME` for OpenRouter headers.

### Verify setup
```bash
npm run build
npm test
npm run dev
```

### Run tests
```bash
npm test
```

### Run AI smoke script
```bash
npm run dev
```

The smoke script loads a sample game state and asks the AI for one next action.

## Current Structure
- `src/ai/llamaClient.ts`: OpenRouter client and a mock client for tests.
- `src/agent/decision.ts`: prompt builder + action parsing/sanitizing.
- `src/types.ts`: shared game/action interfaces.
- `src/main.ts`: local smoke run entrypoint.
- `tests/decision.test.ts`: baseline parsing and fallback tests.
