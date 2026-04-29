import type {
  Agent, GameState, Action, Vote, Thought, room_id
} from '../../../shared/types';
import { ROOMS, shortestPath } from '../game/map.js';
import { OpenRouterClient } from '../ai/openServer.js';

const llm = new OpenRouterClient();

// context builder

function buildAgentContext(agent: Agent, state: GameState, killCooldown = 0): string {
    const room = ROOMS[agent.room];
    const roommates = Object.values(state.agents).filter(a => a.alive && a.id !== agent.id && a.room === agent.room);
    const bodies = state.bodies.filter(b => b.room === agent.room);

    const tasksHere = state.tasks.filter(t => t.room === agent.room && !agent.tasksCompleted.includes(t.id));
    const tasksRemaining = state.tasks.filter(t => !agent.tasksCompleted.includes(t.id) && agent.role !== 'imp');

    const recentObservations = Object.entries(agent.lastSeen)
        .filter(([, v]) => state.tick - v.tick < 5)
        .map(([id, v]) => `${state.agents[id]?.name ?? id} was in ${v.room} ${state.tick - v.tick} ticks ago`);

    const aliveAgents = Object.values(state.agents).filter(a => a.alive);
    const impostorAllies = agent.role === 'imp'
        ? Object.values(state.agents).filter(a => a.role === 'imp' && a.id !== agent.id && a.alive).map(a => a.name) : [];

    return `
CURRENT TICK: ${state.tick}
YOUR NAME: ${agent.name}
YOUR ROLE: ${agent.role.toUpperCase()}
YOUR ROOM: ${room.label} (id: ${room.id})
ADJACENT ROOMS: ${room.adjacent.map(r => `${ROOMS[r].label} (id: ${r})`).join(', ')}
${agent.role === 'imp' ? `VENT DESTINATION: ${room.ventTo ? `${ROOMS[room.ventTo].label} (id: ${room.ventTo})` : 'none'}` : ''}

PLAYERS IN THIS ROOM: ${roommates.length ? roommates.map(a => `${a.name} (id: ${a.id})`).join(', ') : 'nobody'}
BODIES IN THIS ROOM: ${bodies.length ? bodies.map(b => `${state.agents[b.victimId]?.name} (id: ${b.victimId})`).join(', ') : 'none'}

RECENT OBSERVATIONS:
${recentObservations.length ? recentObservations.join('\n') : 'Nothing notable recently.'}

${agent.role === 'crew' ? `
TASKS AVAILABLE IN THIS ROOM: ${tasksHere.map(t => `${t.id} (${t.description})`).join(', ') || 'none'}
TASKS REMAINING OVERALL: ${tasksRemaining.length}
TOTAL PROGRESS: ${state.completedTasks}/${state.totalTasksRequired} tasks done
` : `
YOUR IMPOSTOR ALLIES: ${impostorAllies.join(', ') || 'none alive'}
KILL COOLDOWN: ${killCooldown > 0 ? `${killCooldown} ticks remaining — do NOT kill yet` : 'READY — you may kill'}
TOTAL CREWMATES ALIVE: ${aliveAgents.filter(a => a.role === 'crew').length}
TOTAL PLAYERS ALIVE: ${aliveAgents.length}
`}
ALIVE PLAYERS: ${aliveAgents.map(a => `${a.name} (id: ${a.id}, room: ${a.room})`).join(', ')}
`.trim();
}

// prompts

const CREWMATE_SYSTEM = `You are playing Among Us as a CREWMATE. Your goal is to complete all tasks and identify the impostor(s).

PRIORITY RULES (follow in order):
1. If BODIES IN THIS ROOM lists any body, immediately report it using that body's id
2. If you have a task available in this room, do it
3. Otherwise move toward a room that has one of your remaining tasks

You must respond with a JSON object and NOTHING ELSE. Think step by step in the "reasoning" field first.

For gameplay actions use:
{"reasoning": "...", "action": "move", "targetRoom": "room_id"}
{"reasoning": "...", "action": "do_task", "taskId": "task_id"}
{"reasoning": "...", "action": "report", "victimId": "agent_id"}
{"reasoning": "...", "action": "call_meeting"}
{"reasoning": "...", "action": "wait"}`;

const IMPOSTOR_SYSTEM = `You are playing Among Us as an IMPOSTOR. Your goal is to kill crewmates and avoid being detected.

RULES:
- If KILL COOLDOWN is READY and there is exactly ONE crewmate in your room, kill them immediately
- After killing, move to another room
- If your cooldown is not ready, move around to find isolated crewmates
- Never kill your fellow impostors
- In meetings: deflect suspicion and accuse innocents

You must respond with a JSON object and NOTHING ELSE. Think step by step in the "reasoning" field first.

For gameplay actions use:
{"reasoning": "...", "action": "move", "targetRoom": "room_id"}
{"reasoning": "...", "action": "kill", "targetId": "agent_id"}
{"reasoning": "...", "action": "wait"}`;

const DISCUSSION_SYSTEM = `You are in an Among Us MEETING. Share what you know concisely in 1-2 sentences. Be specific about locations and who you saw where.

Respond ONLY with: {"reasoning": "...", "speech": "your statement here"}`;

const VOTING_SYSTEM = `You are voting in Among Us. Based on the discussion, decide who to eject or skip.

Respond ONLY with: {"reasoning": "...", "vote": "agent_id_or_skip"}`;

// agent runner (processes agent by tick)

export async function runAgent(agent: Agent, state: GameState, killCooldown = 0): Promise<Thought | null> {
    if (!agent.alive) return null;

    const context = buildAgentContext(agent, state, killCooldown);
    const systemPrompt = agent.role === 'imp' ? IMPOSTOR_SYSTEM : CREWMATE_SYSTEM;

    try {
        const raw = (await llm.complete(context, systemPrompt)).text;
        const parsed = JSON.parse(raw);
        const action = extractAction(parsed, agent, state);

        return {
            agentId: agent.id,
            reasoning: parsed.reasoning ?? raw,
            action,
            tick: state.tick,
        };
    } catch (e) {
        console.warn(`[agent ${agent.name}] LLM error:`, e);
        // fallback (crewmates move toward a task, impostors wait)
        return {
            agentId: agent.id,
            reasoning: 'LLM unavailable — using fallback',
            action: getFallbackAction(agent, state),
            tick: state.tick,
        };
    }
}

export async function runDiscussionAgent(agent: Agent, state: GameState): Promise<{ speech: string } | null> {
    if (!agent.alive) return null;
    const context = buildAgentContext(agent, state);
    try {
        const raw = (await llm.complete(context, DISCUSSION_SYSTEM)).text;
        const parsed = JSON.parse(raw);
        return { speech: parsed.speech ?? 'I have nothing to add.' };
    } catch {
        return { speech: getDefaultSpeech(agent, state) };
    }
}

export async function runVoteAgent(agent: Agent, state: GameState, discussion: string[]): Promise<Vote | null> {
    if (!agent.alive) return null;
    const context = `${buildAgentContext(agent, state)}\n\nDISCUSSION SO FAR:\n${discussion.join('\n')}`;
    try {
        const raw = (await llm.complete(context, VOTING_SYSTEM)).text;
        const parsed = JSON.parse(raw);
        const voteTarget = parsed.vote;
        const aliveIds = Object.values(state.agents).filter(a => a.alive).map(a => a.id);
        if (voteTarget === 'skip' || aliveIds.includes(voteTarget)) {
            return { vote: voteTarget };
        }
        return { vote: 'skip' };
    } catch {
        return { vote: 'skip' };
    }
}

// extract actions + fallbacks

function extractAction(parsed: any, agent: Agent, state: GameState): Action {
    const { action } = parsed;
    if (!action) return { action: 'wait' };

    switch (action) {
        case 'move': {
            const targetRoom = parsed.targetRoom as room_id;
            if (ROOMS[agent.room].adjacent.includes(targetRoom)) return { action: 'move', targetRoom };
            // if invalid, move toward it
            const path = shortestPath(agent.room, targetRoom);
            if (path.length > 1) return { action: 'move', targetRoom: path[1] };
            return { action: 'wait' };
        }
        case 'do_task': return { action: 'do_task', taskId: parsed.taskId };
        case 'kill': return { action: 'kill', targetId: parsed.targetId };
        case 'report': return { action: 'report', victimId: parsed.victimId };
        case 'call_meeting': return { action: 'call_meeting' };
        default: return { action: 'wait' };
    }
}

function getFallbackAction(agent: Agent, state: GameState): Action {
    if (agent.role === 'crew') {
        const nextTask = state.tasks.find(t => !agent.tasksCompleted.includes(t.id));
        if (nextTask) {
            if (nextTask.room === agent.room) return { action: 'do_task', taskId: nextTask.id };
            const path = shortestPath(agent.room, nextTask.room);
            if (path.length > 1) return { action: 'move', targetRoom: path[1] };
        }
    }
    return { action: 'wait' };
}

function getDefaultSpeech(agent: Agent, state: GameState): string {
    const seen = Object.entries(agent.lastSeen).slice(0, 2);
    if (seen.length) {
        const [id, { room }] = seen[0];
        return `I saw ${state.agents[id]?.name ?? 'someone'} in ${ROOMS[room]?.label ?? room}.`;
    }
    return 'I was working on tasks. Nothing suspicious to report.';
}