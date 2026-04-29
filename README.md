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
- llama.cpp integration (via CLI process)
- Fastify and WS dependencies aligned with project direction
- Vitest test workflow (compatible with Vite ecosystem)

### Prerequisites
1. Install Node.js 20+.
2. Install llama.cpp and build/download a llama executable (recommended on Windows: `llama-completion.exe`).
3. Download the Qwen2.5-3B-Instruct GGUF model (recommended: `Q4_K_M` quantization).

### GGUF Model Download
This is the model I'm using if you need to download it:

1. Open: `https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF`
2. Download: `Qwen2.5-3B-Instruct-Q4_K_M.gguf`
3. Save it somewhere local, for example: `C:/Users/Awsom/Programs/CPSC 481/llama.cpp/models/qwen2.5-3b-instruct-q4_k_m.gguf`
4. Set `LLAMA_MODEL_PATH` in your local `.env` to that file path.

Notes:
- `Q4_K_M` is a good quality/speed balance for CPU laptops.
- Do not commit the model file to git (it is large and machine-local).

### Install
```bash
npm install
```

### Configure
1. Copy `.env.example` to `.env`.
2. Set:
	- `LLAMA_CPP_BIN` to your llama executable path (recommended on Windows: `llama-completion.exe`).
	- `LLAMA_MODEL_PATH` to your GGUF model path.

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
- `src/ai/llamaClient.ts`: llama.cpp client and a mock client for tests.
- `src/agent/decision.ts`: prompt builder + action parsing/sanitizing.
- `src/types.ts`: shared game/action interfaces.
- `src/main.ts`: local smoke run entrypoint.
- `tests/decision.test.ts`: baseline parsing and fallback tests.
