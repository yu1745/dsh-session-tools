import { z } from 'zod';

// The registry owns replay and checkpointing. Never infer work from role:'user':
// DSH also stores background notices and context snapshots with that role.
export const notificationInput = {
  key: 'local/task-bell/notification-input',
  stateVersion: 1,
  stateSchema: z.object({ turn: z.number().nullable(), actionable: z.boolean() }),
  init: () => ({ turn: null, actionable: false }),
  apply(state, event) {
    if (event.type === 'turn/start') return { turn: event.data.turn, actionable: false };
    if (event.type !== 'user/message' || state.turn === null || state.actionable) return state;
    const source = event.data.source;
    if (!source || source.kind === 'tool-jobs' || ['snapshot', 'catalog', 'instructions'].includes(source.form) || ['runtime-context', 'time-context', 'skill-catalog', 'agent-instructions'].includes(source.kind)) return state;
    // Human requests, scheduled tasks, goal rounds and delegated-result
    // continuations remain eligible; a job notice alone cannot re-arm a turn.
    return { ...state, actionable: true };
  },
};

export function notificationEligible(state, event) {
  return event.type === 'turn/end' && state.turn === event.data.turn && state.actionable;
}
