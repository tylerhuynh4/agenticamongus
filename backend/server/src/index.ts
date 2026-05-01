import Fastify from 'fastify';
import FastifyWebSocket from '@fastify/websocket';
import { GameEngine } from './game/engine.js';
import { runAgent, runDiscussionAgent, runVoteAgent } from './agents/runner.js';
import type { ServerMsg, ClientMsg, Thought } from '../../shared/types';
import 'dotenv/config';

// server setup

const fastify = Fastify({ logger: true });
fastify.register(FastifyWebSocket);

const PORT = Number(process.env.PORT ?? 3001);

// game loop orchestrator

class GameOrchestrator {
    private engine: GameEngine;
    private clients: Set<any> = new Set();
    private tickInterval: ReturnType<typeof setInterval> | null = null;
    private paused = false;
    private ticking = false;
    private tickMs: number;

    constructor() {
        this.engine = new GameEngine();
        this.tickMs = this.engine.config.tickMs;
    }

    addClient(ws: any) {
        this.clients.add(ws);
        this.broadcast({ type: 'STATE_SYNC', state: this.engine.toClientState(true) });
    }

    removeClient(ws: any) {
        this.clients.delete(ws);
    }

    broadcast(msg: ServerMsg) {
        const json = JSON.stringify(msg);
        this.clients.forEach(ws => {try { ws.send(json); } catch { /* disconnected */ }});
    }

    handleMessage(msg: ClientMsg) {
        switch (msg.type) {
            case 'START_GAME':
                this.startGame(msg.config);
                break;
            case 'PAUSE':
                this.paused = true;
                break;
            case 'RESUME':
                this.paused = false;
                break;
            case 'RESET':
                this.reset();
                break;
            case 'SET_SPEED':
                this.tickMs = msg.tickMs;
                if (this.tickInterval) {
                    this.stopLoop();
                    this.startLoop();
                }
                break;
        }
    }

    private startGame(config?: any) {
        this.engine = new GameEngine(config);
        this.engine.startGame();
        this.broadcast({ type: 'STATE_SYNC', state: this.engine.toClientState(true) });
        this.startLoop();
    }

    private reset() {
        this.stopLoop();
        this.engine = new GameEngine();
        this.broadcast({ type: 'STATE_SYNC', state: this.engine.toClientState(true) });
    }

    private startLoop() {
        this.tickInterval = setInterval(() => this.tick(), this.tickMs);
    }

    private stopLoop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    private async tick() {
        if (this.paused || this.ticking) return;
        this.ticking = true;
        try {
        // read phases fresh from engine & don't cache
        if (this.engine.state.phase === 'end' || this.engine.state.phase === 'lobby') return;

        // playing phase (all agents in parallel)
        if (this.engine.state.phase === 'play') {
            const aliveAgents = Object.values(this.engine.state.agents).filter(a => a.alive);

            const thoughts = await Promise.allSettled(aliveAgents.map(agent => runAgent(agent, this.engine.state, this.engine.getKillCooldown(agent.id))));

            for (let i = 0; i < aliveAgents.length; i++) {
                const result = thoughts[i];
                if (result.status !== 'fulfilled' || !result.value) continue;
                const thought = result.value as Thought;

                // broadcasts thoughts
                this.broadcast({ type: 'THOUGHT', thought });

                // apply the action
                const applied = this.engine.applyAction(thought.agentId, thought.action as any);
                if (!applied.ok) {
                    fastify.log.debug(`[${aliveAgents[i].name}] action rejected: ${applied.reason}`);
                }

                // if meeting triggered, stop processing other actions
                if ((this.engine.state.phase as string) === 'trial') break;
            }
        }

        // trial phase
        if (this.engine.state.phase === 'trial') {
            const aliveAgents = Object.values(this.engine.state.agents).filter(a => a.alive);
            const speeches: string[] = [];

            for (const agent of aliveAgents) {
                const result = await runDiscussionAgent(agent, this.engine.state);
                if (result) {
                    const line = `${agent.name}: ${result.speech}`;
                    speeches.push(line);
                    this.engine.recordSpeech(agent.id, result.speech);
                    this.broadcast({ type: 'STATE_SYNC', state: this.engine.toClientState(true) });
                }
            }

            // transition to voting
            this.engine.advanceMeetingPhase();

            // voting phase
            if ((this.engine.state.phase as string) === 'voting') {
                const votes = await Promise.allSettled(aliveAgents.map(agent => runVoteAgent(agent, this.engine.state, speeches)));

                for (let i = 0; i < aliveAgents.length; i++) {
                    const result = votes[i];
                    if (result.status === 'fulfilled' && result.value) {
                        this.engine.applyVote(aliveAgents[i].id, result.value);
                    }
                }

                // resolve
                this.engine.advanceMeetingPhase();
            }
        }

        // advance game clock
        const newEvents = this.engine.tick();
        this.broadcast({ type: 'TICK', tick: this.engine.state.tick, events: newEvents });
        this.broadcast({ type: 'STATE_SYNC', state: this.engine.toClientState(true) });

        if ((this.engine.state.phase as string) === 'end') {
            this.broadcast({
                type: 'GAME_OVER',
                winner: this.engine.state.winner!,
                reason: this.engine.state.winReason!,
            });
            this.stopLoop();
        }
        } finally {
            this.ticking = false;
        }
    }
}

// routes

const orchestrator = new GameOrchestrator();

fastify.register(async (f) => {
    f.get('/ws', { websocket: true }, (socket) => {
        orchestrator.addClient(socket);

        socket.on('message', (raw: Buffer) => {
            try {
                const msg: ClientMsg = JSON.parse(raw.toString());
                orchestrator.handleMessage(msg);
            } catch (e) {
                socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message' }));
            }
        });

        socket.on('close', () => orchestrator.removeClient(socket));
    });
});

fastify.get('/', async () => ({
    ok: true,
    service: 'agenticamongus-backend',
    websocket: '/ws',
    health: '/health',
}));

fastify.get('/health', async () => ({ ok: true }));

// boot

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
    if (err) { fastify.log.error(err); process.exit(1); }
    fastify.log.info(`🚀 Among Us server running on :${PORT}`);
});