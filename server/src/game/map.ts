import type { room_id, RoomNode } from '../../../shared/types';

export const ROOMS: Record<room_id, RoomNode> = {
    cafe: {
        id: 'cafe', label: 'Cafeteria',
        adjacent: ['weapons', 'med', 'storage', 'admin', 'engine_l', 'engine_r', 'o2'],
        ventTo: 'med',
        tasks: ['task_fix_wiring_cafe', 'task_empty_garbage'],
        x: 600, y: 80,
    },
    weapons: {
        id: 'weapons', label: 'Weapons',
        adjacent: ['cafe', 'nav', 'o2'],
        tasks: ['task_clear_asteroids'],
        x: 900, y: 80,
    },
    nav: {
        id: 'nav', label: 'Navigation',
        adjacent: ['weapons', 'shields'],
        ventTo: 'shields',
        tasks: ['task_stabilize_steering', 'task_chart_course'],
        x: 1100, y: 150,
    },
    shields: {
        id: 'shields', label: 'Shields',
        adjacent: ['nav', 'comms'],
        tasks: ['task_prime_shields'],
        x: 1050, y: 400,
    },
    comms: {
        id: 'comms', label: 'Communications',
        adjacent: ['shields', 'storage'],
        tasks: ['task_upload_data'],
        x: 800, y: 550,
    },
    storage: {
        id: 'storage', label: 'Storage',
        adjacent: ['cafe', 'comms', 'admin', 'elec'],
        ventTo: 'elec',
        tasks: ['task_fuel_engines_s'],
        x: 600, y: 480,
    },
    admin: {
        id: 'admin', label: 'Admin',
        adjacent: ['storage', 'cafe'],
        tasks: ['task_swipe_card'],
        x: 750, y: 300,
    },
    elec: {
        id: 'elec', label: 'Electrical',
        adjacent: ['storage', 'med', 'sec'],
        ventTo: 'sec',
        tasks: ['task_fix_wiring_elec', 'task_calibrate_distributor'],
        x: 300, y: 480,
    },
    sec: {
        id: 'sec', label: 'Security',
        adjacent: ['elec', 'reactor'],
        ventTo: 'reactor',
        tasks: ['task_fix_wiring_sec'],
        x: 150, y: 320,
    },
    med: {
        id: 'med', label: 'MedBay',
        adjacent: ['cafe', 'elec'],
        ventTo: 'cafe',
        tasks: ['task_submit_scan', 'task_inspect_sample'],
        x: 300, y: 200,
    },
    reactor: {
        id: 'reactor', label: 'Reactor',
        adjacent: ['sec', 'engine_l'],
        ventTo: 'sec',
        tasks: ['task_start_reactor', 'task_unlock_manifolds'],
        x: 100, y: 200,
    },
    engine_l: {
        id: 'engine_l', label: 'Engine Room (L)',
        adjacent: ['reactor', 'cafe'],
        ventTo: 'engine_r',
        tasks: ['task_align_engine_l', 'task_fuel_engines_l'],
        x: 100, y: 80,
    },
    engine_r: {
        id: 'engine_r', label: 'Engine Room (R)',
        adjacent: ['cafe'],
        ventTo: 'engine_l',
        tasks: ['task_align_engine_r', 'task_fuel_engines_r'],
        x: 450, y: 80,
    },
    o2: {
        id: 'o2', label: 'O2',
        adjacent: ['cafe', 'weapons'],
        tasks: ['task_clean_o2_filter', 'task_water_plants'],
        x: 750, y: 130,
    },
};

// pathfinding
export function shortestPath(from: room_id, to: room_id): room_id[] {
    if (from === to) return [];
    const queue: Array<{ room: room_id; path: room_id[] }> = [{ room: from, path: [] }];
    const visited = new Set<room_id>([from]);
    while (queue.length) {
        const { room, path } = queue.shift()!;
        for (const neighbor of ROOMS[room].adjacent) {
            if (neighbor === to) return [...path, room, to];
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push({ room: neighbor, path: [...path, room] });
            }
        }
    }
    return []; // disconnected (shouldn't happen w/ this graph)
}

export function nextRoomToward(from: room_id, to: room_id): room_id {
    const path = shortestPath(from, to);
    return path.length > 1 ? path[1] : from;
}

export function roomsAdjacentTo(room: room_id): room_id[] {
    return ROOMS[room].adjacent;
}