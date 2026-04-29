// shared types between server, client, & AI

export type room_id =
    | 'cafe' | 'weapons' | 'nav' | 'o2' | 'shields'
    | 'storage' | 'reactor' | 'sec' | 'elec' | 'med'
    | 'admin' | 'comms' | 'engine_l' | 'engine_r';

export type role = 'crew' | 'imp';
export type game_phase = 'lobby' | 'play' | 'trial' | 'voting' | 'end';
export type win_cond = 'tasks_done' | 'imp_eject' | 'crew_outnum' | 'timeout';

export interface Task {
    id: string;
    room: room_id;
    description: string;
    duration: number; // ticks to complete
}

export interface Agent {
    id: string;
    name: string;
    color: string;       // hex for PixiJS rendering
    role: role;
    room: room_id;
    alive: boolean;
    tasksCompleted: string[];
    lastSeen: Record<string, { room: room_id; tick: number }>; // what this agent has observed
}

export interface BodyRep {
    victimId: string;
    room: room_id;
    reportedBy: string;
    tick: number;
}

export interface Tally {
    [targetId: string]: string[]; // targetId -> array of voter IDs
    skip: string[];
}

export interface GameState {
    phase: game_phase;
    tick: number;
    agents: Record<string, Agent>;
    tasks: Task[];
    totalTasksRequired: number;
    completedTasks: number;
    bodies: BodyRep[];
    meetingCaller?: string;
    currentVotes?: Tally;
    ejectedThisRound?: string | null;
    winner?: role | 'draw';
    winReason?: win_cond;
    log: Event[];
}

// game events

export type Event =
    | { type: 'MOVE';     tick: number; agentId: string; from: room_id; to: room_id }
    | { type: 'TASK';     tick: number; agentId: string; taskId: string; room: room_id }
    | { type: 'KILL';     tick: number; killerId: string; victimId: string; room: room_id }
    | { type: 'REPORT';   tick: number; reporterId: string; victimId: string; room: room_id }
    | { type: 'MEETING';  tick: number; callerId: string }
    | { type: 'SPEAK';    tick: number; agentId: string; text: string }
    | { type: 'VOTE';     tick: number; voterId: string; targetId: string | 'skip' }
    | { type: 'EJECT';    tick: number; agentId: string; role: role }
    | { type: 'WIN';      tick: number; winner: role | 'draw'; reason: win_cond }
    | { type: 'PHASE';    tick: number; phase: game_phase };

// game actions

export type Action =
    | { action: 'move';    targetRoom: room_id }
    | { action: 'do_task'; taskId: string }
    | { action: 'kill';    targetId: string }
    | { action: 'report';  victimId: string }
    | { action: 'call_meeting' }
    | { action: 'wait' };

export type Vote =
    | { vote: string }    // agent ID
    | { vote: 'skip' };

export interface Thought {
    agentId: string;
    reasoning: string;   // raw LLM output b4 JSON extraction
    action: Action | Vote;
    tick: number;
}

// ws

export type ServerMsg =
    | { type: 'STATE_SYNC';    state: GameState }
    | { type: 'TICK';          tick: number; events: Event[] }
    | { type: 'THOUGHT';       thought: Thought }
    | { type: 'GAME_OVER';     winner: role | 'draw'; reason: win_cond }
    | { type: 'ERROR';         message: string };

export type ClientMsg =
    | { type: 'START_GAME';    config?: Partial<Config> }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'RESET' }
    | { type: 'SET_SPEED';     tickMs: number };

export interface Config {
    numImpostors: number;     // default 2
    numAgents: number;        // default 8
    tickMs: number;           // ms between ticks, default 2000
    killCooldownTicks: number;
    trialTicks: number;
    votingTicks: number;
}

// map

export interface RoomNode {
  id: room_id;
  label: string;
  adjacent: room_id[];
  ventTo?: room_id;          // impostor vents
  tasks: string[];          // task IDs assigned to this room
  // pixel position for PixiJS rendering
  x: number;
  y: number;
}