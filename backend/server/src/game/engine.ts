import type {
  GameState, Config, Agent, role, Event,
  room_id, Action, Vote, BodyRep, game_phase
} from '../../../shared/types';
import { ROOMS } from './map.js';

// default config

export const DEFAULT_CONFIG: Config = {
    numImpostors: 2,
    numAgents: 8,
    tickMs: 2000,
    killCooldownTicks: 2,
    trialTicks: 15,
    votingTicks: 10,
};

const AGENT_NAMES = [
    'Red', 'Blue', 'Green', 'Purple', 'Yellow',
    'Black', 'White', 'Orange',
];
const AGENT_COLORS = [
    '#E84141', '#3B82F6', '#22C55E', '#A855F7', '#EAB308',
    '#1C1C1C', '#F8FAFC', '#F97316',
];

const ALL_TASKS = Object.values(ROOMS).flatMap(r =>
    r.tasks.map(tid => ({ id: tid, room: r.id, description: tid.replace(/_/g, ' '), duration: 2 }))
);

// game state machine

export class GameEngine {
    state: GameState;
    config: Config;
    private killCooldowns: Record<string, number> = {};
    private trialCountdown = 0;
    private votingCountdown = 0;

    constructor(config: Partial<Config> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.state = this.createInitialState();
    }

    private createInitialState(): GameState {
        const agents: Record<string, Agent> = {};
        const shuffledRoles: role[] = [
            ...Array(this.config.numImpostors).fill('imp'),
            ...Array(this.config.numAgents - this.config.numImpostors).fill('crew'),
        ].sort(() => Math.random() - 0.5) as role[];

        const startingRooms: room_id[] = ['cafe', 'cafe', 'cafe', 'cafe', 'cafe', 'cafe', 'cafe', 'cafe'];

        AGENT_NAMES.slice(0, this.config.numAgents).forEach((name, i) => {
            const id = `agent_${i}`; agents[id] = {
                id,
                name,
                color: AGENT_COLORS[i],
                role: shuffledRoles[i],
                room: startingRooms[i],
                alive: true,
                tasksCompleted: [],
                lastSeen: {},
            };
        });

        // task distribution
        const tasks = this.distributeTasks(agents);
        const totalTasksRequired = tasks.length;

        return {
            phase: 'lobby',
            tick: 0,
            agents,
            tasks,
            totalTasksRequired,
            completedTasks: 0,
            bodies: [],
            log: [],
        };
    }

    private distributeTasks(agents: Record<string, Agent>) {
        const crewmates = Object.values(agents).filter(a => a.role === 'crew');
        const shuffled = [...ALL_TASKS].sort(() => Math.random() - 0.5);
        const assigned: typeof ALL_TASKS = [];
        crewmates.forEach((agent, i) => {
            const agentTasks = shuffled.slice(i * 4, i * 4 + 4);
            agentTasks.forEach(t => { if (!assigned.find(a => a.id === t.id)) assigned.push(t); });
        });
        return assigned;
    }

// phase transitions

    startGame() {
        this.state.phase = 'play';
        this.logEvent({ type: 'PHASE', tick: this.state.tick, phase: 'play' });
        // init kill cooldowns
        Object.values(this.state.agents).filter(a => a.role === 'imp').forEach(a => { this.killCooldowns[a.id] = 0; });
    }

    triggerMeeting(callerId: string) {
        this.state.phase = 'trial';
        this.state.meetingCaller = callerId;
        this.state.currentVotes = { skip: [] };
        this.trialCountdown = this.config.trialTicks;
        this.logEvent({ type: 'MEETING', tick: this.state.tick, callerId });
        this.logEvent({ type: 'PHASE', tick: this.state.tick, phase: 'trial' });
    }

    advanceMeetingPhase() {
        if (this.state.phase === 'trial') {
            this.state.phase = 'voting';
            this.votingCountdown = this.config.votingTicks;
            this.logEvent({ type: 'PHASE', tick: this.state.tick, phase: 'voting' });
        } else if (this.state.phase === 'voting') {
            this.resolveVotes();
        }
    }

    tickTrial() {
        if (this.state.phase === 'trial') {
            this.trialCountdown--;
            if (this.trialCountdown <= 0) this.advanceMeetingPhase();
        } else if (this.state.phase === 'voting') {
            this.votingCountdown--;
            if (this.votingCountdown <= 0) this.resolveVotes();
        }
    }

    private resolveVotes() {
        const votes = this.state.currentVotes!;
        const tallies: Record<string, number> = {};
        Object.entries(votes).forEach(([target, voters]) => {tallies[target] = voters.length;});
        const maxVotes = Math.max(...Object.values(tallies));
        const leaders = Object.keys(tallies).filter(k => tallies[k] === maxVotes);
        const ejected = leaders.length === 1 && leaders[0] !== 'skip' ? leaders[0] : null;

        this.state.ejectedThisRound = ejected;
        if (ejected && this.state.agents[ejected]) {
            this.state.agents[ejected].alive = false;
            const role = this.state.agents[ejected].role;
            this.logEvent({ type: 'EJECT', tick: this.state.tick, agentId: ejected, role });
        }

        // clear bodies after meeting
        this.state.bodies = [];
        this.state.phase = 'play';
        this.logEvent({ type: 'PHASE', tick: this.state.tick, phase: 'play' });
        this.checkWinConditions();
    }

// actions

    applyAction(agentId: string, action: Action): { ok: boolean; reason?: string } {
        const agent = this.state.agents[agentId];
        if (!agent || !agent.alive) return { ok: false, reason: 'agent dead or missing' };
        if (this.state.phase !== 'play') return { ok: false, reason: 'not in playing phase' };

        switch (action.action) {
            case 'move': return this.doMove(agent, action.targetRoom);
            case 'do_task': return this.doTask(agent, action.taskId);
            case 'kill': return this.doKill(agent, action.targetId);
            case 'report': return this.doReport(agent, action.victimId);
            case 'call_meeting': return this.doCallMeeting(agent);
            case 'wait': return { ok: true };
            default: return { ok: false, reason: 'unknown action' };
        }
    }

    private doMove(agent: Agent, targetRoom: room_id): { ok: boolean; reason?: string } {
        if (!ROOMS[agent.room].adjacent.includes(targetRoom)) {
            return { ok: false, reason: `${targetRoom} not adjacent to ${agent.room}` };
        }
        const from = agent.room;
        agent.room = targetRoom;
        // update observations (agents in both rooms see this agent)
        this.updateObservations(agent.id);
        this.logEvent({ type: 'MOVE', tick: this.state.tick, agentId: agent.id, from, to: targetRoom });
        return { ok: true };
    }

    private doTask(agent: Agent, taskId: string): { ok: boolean; reason?: string } {
        if (agent.role === 'imp') return { ok: false, reason: 'impostors cannot do tasks' };
        const task = this.state.tasks.find(t => t.id === taskId && t.room === agent.room);
        if (!task) return { ok: false, reason: 'task not in this room' };
        if (agent.tasksCompleted.includes(taskId)) return { ok: false, reason: 'already done' };
        agent.tasksCompleted.push(taskId);
        this.state.completedTasks++;
        this.logEvent({ type: 'TASK', tick: this.state.tick, agentId: agent.id, taskId, room: agent.room });
        this.checkWinConditions();
        return { ok: true };
    }

    private doKill(agent: Agent, targetId: string): { ok: boolean; reason?: string } {
        if (agent.role !== 'imp') return { ok: false, reason: 'only impostors can kill' };
        const cooldown = this.killCooldowns[agent.id] ?? 0;
        if (cooldown > 0) return { ok: false, reason: `kill on cooldown (${cooldown} ticks)` };
        const target = this.state.agents[targetId];
        if (!target || !target.alive) return { ok: false, reason: 'target not alive' };
        if (target.room !== agent.room) return { ok: false, reason: 'target not in same room' };
        if (target.role === 'imp') return { ok: false, reason: 'cannot kill fellow impostor' };

        target.alive = false;
        this.state.bodies.push({ victimId: targetId, room: agent.room, reportedBy: '', tick: this.state.tick });
        this.killCooldowns[agent.id] = this.config.killCooldownTicks;
        this.logEvent({ type: 'KILL', tick: this.state.tick, killerId: agent.id, victimId: targetId, room: agent.room });
        this.checkWinConditions();
        return { ok: true };
    }

    private doReport(agent: Agent, victimId: string): { ok: boolean; reason?: string } {
        const body = this.state.bodies.find(b => b.victimId === victimId && b.room === agent.room);
        if (!body) return { ok: false, reason: 'no body here' };
        body.reportedBy = agent.id;
        this.logEvent({ type: 'REPORT', tick: this.state.tick, reporterId: agent.id, victimId, room: agent.room });
        this.triggerMeeting(agent.id);
        return { ok: true };
    }

    private doCallMeeting(agent: Agent): { ok: boolean; reason?: string } {
        // emergency button in cafe
        if (agent.room !== 'cafe') return { ok: false, reason: 'emergency button only in cafeteria' };
        this.triggerMeeting(agent.id);
        return { ok: true };
    }

    applyVote(agentId: string, voteAction: Vote): void {
        if (this.state.phase !== 'voting') return;
        const { currentVotes } = this.state;
        if (!currentVotes) return;
        const target = voteAction.vote === 'skip' ? 'skip' : voteAction.vote;
        if (!currentVotes[target]) currentVotes[target] = [];
        if (!currentVotes[target].includes(agentId)) {
            currentVotes[target].push(agentId);
        }
        this.logEvent({ type: 'VOTE', tick: this.state.tick, voterId: agentId, targetId: target });
    }

    recordSpeech(agentId: string, text: string) {
        this.logEvent({ type: 'SPEAK', tick: this.state.tick, agentId, text });
    }

// agent observations

    private updateObservations(movingAgentId: string) {
        const agent = this.state.agents[movingAgentId];
        const roommates = this.getAgentsInRoom(agent.room);
        // moving agent sees all roommates
        roommates.forEach(r => {agent.lastSeen[r.id] = { room: r.room, tick: this.state.tick };});
        // all roommates see this agent
        roommates.forEach(r => {r.lastSeen[movingAgentId] = { room: agent.room, tick: this.state.tick };});
    }

    getKillCooldown(agentId: string): number {
        return this.killCooldowns[agentId] ?? 0;
    }

    getAgentsInRoom(room: room_id): Agent[] {
        return Object.values(this.state.agents).filter(a => a.alive && a.room === room);
    }

    getBodiesInRoom(room: room_id): BodyRep[] {
        return this.state.bodies.filter(b => b.room === room);
    }

// win conditions

    private checkWinConditions() {
        const alive = Object.values(this.state.agents).filter(a => a.alive);
        const aliveImpostors = alive.filter(a => a.role === 'imp');
        const aliveCrewmates = alive.filter(a => a.role === 'crew');

        if (aliveImpostors.length === 0) {
            this.endGame('crew', 'imp_eject');
        } else if (aliveImpostors.length >= aliveCrewmates.length) {
            this.endGame('imp', 'crew_outnum');
        } else if (this.state.completedTasks >= this.state.totalTasksRequired) {
            this.endGame('crew', 'tasks_done');
        }
    }

    private endGame(winner: role, reason: any) {
        this.state.phase = 'end';
        this.state.winner = winner;
        this.state.winReason = reason;
        this.logEvent({ type: 'WIN', tick: this.state.tick, winner, reason });
        this.logEvent({ type: 'PHASE', tick: this.state.tick, phase: 'end' });
    }

    // ticks
    tick(): Event[] {
        this.state.tick++;
        const eventsBefore = this.state.log.length;

        // decrement kill cooldowns
        Object.keys(this.killCooldowns).forEach(id => {
            if (this.killCooldowns[id] > 0) this.killCooldowns[id]--;
        });

        if (this.state.phase === 'trial' || this.state.phase === 'voting') {
            this.tickTrial();
        }

        return this.state.log.slice(eventsBefore);
    }

    private logEvent(event: Event) {
        this.state.log.push(event);
    }

    // serialize for client (strip impostor roles from non-debug view)
    toClientState(debug = false): GameState {
        if (debug) return this.state;
        const agents = Object.fromEntries(
            Object.entries(this.state.agents).map(([id, a]) => [
                id, { ...a, role: a.alive ? 'crew' as role : a.role }
            ])
        );
        return { ...this.state, agents };
    }
}