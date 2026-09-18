// Tipos de evento do event store append-only (trilha de auditoria).
// Nunca remover ou reescrever um evento publicado; correcoes geram novo evento.

export const EventType = Object.freeze({
  SESSION_CREATED: 'SESSION_CREATED',
  CHECKLIST_ITEM_COMPLETED: 'CHECKLIST_ITEM_COMPLETED',
  READY_GRANTED: 'READY_GRANTED',
  ACTION_ACCEPTED: 'ACTION_ACCEPTED',
  ACTION_REJECTED: 'ACTION_REJECTED',
  STATE_TRANSITION: 'STATE_TRANSITION',
  FAULT_ARMED: 'FAULT_ARMED',
  FAULT_TRIGGERED: 'FAULT_TRIGGERED',
  FAULT_CANCELLED: 'FAULT_CANCELLED',
  INSTRUCTOR_INTERVENTION: 'INSTRUCTOR_INTERVENTION',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTED: 'RECONNECTED',
  ASSESSMENT_SCORED: 'ASSESSMENT_SCORED',
  ASSESSMENT_FINALIZED: 'ASSESSMENT_FINALIZED',
  SESSION_CLOSED: 'SESSION_CLOSED',
});

/**
 * Cria um registro de evento imutavel para o event store.
 * objectiveIds liga o evento a matriz objetivo-evento exigida pela clausula 9.1.5.
 */
export function makeEvent({ type, sessionId, actorId, objectiveIds = [], data = {}, serverTime = Date.now() }) {
  if (!Object.values(EventType).includes(type)) {
    throw new Error(`tipo de evento desconhecido: ${type}`);
  }
  return Object.freeze({
    id: `evt-${serverTime.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    sessionId,
    actorId,
    objectiveIds,
    data,
    serverTime,
  });
}
