# agenticamongus

An autonomous Among Us simulation where every player is an AI agent powered by an LLM via the OpenRouter API. The server runs the game engine and queries the LLM for each agent's decision every tick. The frontend watches the game unfold in real time over WebSocket.

## Team
- Tyler Huynh
- Duy Nguyen
- Daniel Lee

## Project Structure

```
agenticamongus/
├── backend/
│   ├── server/          # Fastify + WebSocket game server
│   │   ├── src/
│   │   │   ├── agents/  # LLM prompt building and agent runner
│   │   │   ├── ai/      # OpenRouter client and config
│   │   │   ├── game/    # Game engine and map
│   │   │   └── index.ts # Server entrypoint
│   │   ├── .env.example
│   │   └── package.json
│   └── shared/
│       └── types.ts     # Shared types between server and frontend
└── Among_Us_Frontend/   # Vite + TypeScript frontend
    ├── src/
    │   ├── ui/          # Dashboard, map, player list, event log
    │   ├── network/     # WebSocket client
    │   ├── state/       # Game state
    │   └── app.ts
    └── package.json
```

## Tech Stack

- **Backend**: Node.js, TypeScript, Fastify, `@fastify/websocket`, OpenRouter API
- **Frontend**: Vite, TypeScript (no framework)
- **Shared**: TypeScript types consumed by both sides

## Prerequisites

- Node.js 20+
- An [OpenRouter](https://openrouter.ai) account and API key
- A model slug from OpenRouter (the team default is `meta-llama/llama-3.1-8b-instruct`)

## Setup

### Backend

```bash
cd backend/server
npm install
cp .env.example .env
```

Edit `.env` and fill in:

```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct
```

Start the server:

```bash
npm run dev
```

The server runs on port `3001` by default. The WebSocket endpoint is `ws://localhost:3001/ws`.

### Frontend

```bash
cd Among_Us_Frontend
npm install
npm run dev
```

Open the URL printed by Vite in your browser. The frontend will connect to the backend automatically.

## How It Works

1. The frontend sends a `START_GAME` message over WebSocket to begin.
2. The server creates 8 agents (6 crewmates, 2 impostors) and starts the game loop.
3. Every tick (default 2 seconds), each alive agent queries the LLM with their current context — room, adjacent rooms, nearby players, tasks, observations — and receives a JSON action in response.
4. The game engine validates and applies each action, then broadcasts the updated state to the frontend.
5. When a body is reported or a meeting is called, agents enter a trial phase (each speaks), then a voting phase (each votes), and the result is applied.
6. The game ends when crewmates finish all tasks, an impostor is ejected, impostors outnumber crew, or time runs out.
