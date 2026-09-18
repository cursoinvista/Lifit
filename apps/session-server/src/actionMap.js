// Traduz a intencao do cliente (entityId + action, ver doc "Joysticks Touch
// Plus e interacao") em uma LiftAction validada pela maquina de estados.
// O papel exigido impede que o aluno decida por si so acoes reservadas ao
// instrutor (reset apos parada de emergencia, liberacao de falha etc.).
import { LiftAction } from '@lifit/lift-domain';
import { Role } from '@lifit/protocol';

export const ENTITY_ACTIONS = Object.freeze({
  'panel.up': { liftAction: LiftAction.START_MOVE_UP, role: Role.STUDENT },
  'panel.down': { liftAction: LiftAction.START_MOVE_DOWN, role: Role.STUDENT },
  'panel.stop': { liftAction: LiftAction.STOP, role: Role.STUDENT },
  'panel.emergency_stop': { liftAction: LiftAction.TRIGGER_EMERGENCY_STOP, role: Role.STUDENT },
  'panel.resume': { liftAction: LiftAction.RESUME, role: Role.STUDENT },
  'panel.park': { liftAction: LiftAction.PARK, role: Role.STUDENT },
  'panel.emergency_descent': { liftAction: LiftAction.START_EMERGENCY_DESCENT, role: Role.STUDENT },
  'panel.abort_descent': { liftAction: LiftAction.ABORT_EMERGENCY_DESCENT, role: Role.STUDENT },
  'panel.complete_descent': { liftAction: LiftAction.COMPLETE_EMERGENCY_DESCENT, role: Role.STUDENT },
  'panel.complete_evacuation': { liftAction: LiftAction.COMPLETE_EVACUATION_PREP, role: Role.STUDENT },
  'checklist.complete': { liftAction: LiftAction.COMPLETE_CHECKLIST, role: Role.STUDENT },
  // Reservado ao instrutor: nunca reset ou liberacao remota silenciosa (doc, secao 3).
  'console.reset_emergency': { liftAction: LiftAction.RESET_FROM_EMERGENCY, role: Role.INSTRUCTOR, patch: { instructorConfirmedReset: true } },
  'console.clear_fault': { liftAction: LiftAction.CLEAR_FAULT, role: Role.INSTRUCTOR, patch: { instructorClearedFault: true } },
  'console.start_evacuation_prep': { liftAction: LiftAction.START_EVACUATION_PREP, role: Role.INSTRUCTOR },
  'console.restart_session': { liftAction: LiftAction.RESTART_SESSION, role: Role.INSTRUCTOR },
  // Portas/gates nao sao estados formais da maquina, apenas pre-condicoes;
  // toggles simples aplicados ao contexto antes de qualquer guard.
  'door.main': { toggleContext: 'doorsClosed', role: Role.STUDENT },
  'gate.main': { toggleContext: 'gatesClosed', role: Role.STUDENT },
});

export function resolveAction(entityId) {
  return ENTITY_ACTIONS[entityId] ?? null;
}
