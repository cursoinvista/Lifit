import { LiftStateMachine, LiftAction } from '@lifit/lift-domain';
import { AnnexOneRubric } from '@lifit/curriculum';
import { makeEvent, EventType, Role, makeStatePatch, makeStateSnapshot } from '@lifit/protocol';
import { resolveAction } from './actionMap.js';
import { FAULT_RULES, FaultEffect } from './faultRules.js';
import { SessionChecklist } from './checklist.js';
import { getFault } from '@lifit/curriculum';

/**
 * Uma Room e uma sessao isolada (doc: "Sessoes isoladas por room"). E a
 * UNICA autoridade sobre o estado do lift. Clientes (Quest/console) so
 * enviam intencao; toda mutacao passa por applyStudentAction ou
 * applyFaultRequest, nunca por escrita direta no estado.
 */
export class Room {
  constructor({ sessionId, profileId, eventStore }) {
    this.sessionId = sessionId;
    this.profileId = profileId;
    this.eventStore = eventStore;
    this.lift = new LiftStateMachine();
    this.checklist = new SessionChecklist();
    this.stateVersion = 0;
    this.activeFault = null;
    this.connections = new Map(); // connId -> { ws, role, participantId }
    this.disconnectTimers = new Map(); // participantId -> Timeout
    this.assessments = new Map(); // participantId -> AnnexOneRubric
  }

  join(connId, { ws, role, participantId }) {
    this.connections.set(connId, { ws, role, participantId });
    const timer = this.disconnectTimers.get(participantId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(participantId);
      this.logEvent(EventType.RECONNECTED, participantId);
    }
  }

  leave(connId, { onSafetyStop } = {}) {
    const conn = this.connections.get(connId);
    if (!conn) return;
    this.connections.delete(connId);
    this.logEvent(EventType.DISCONNECTED, conn.participantId);
    if (conn.role !== Role.STUDENT) return;

    // Doc, "Tratamento de desconexao": perda > 3s durante operacao entra em
    // STOPPED (STOPPED_SAFE); nenhum sucesso/falha e inferido sem telemetria.
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(conn.participantId);
      if (this.lift.state === 'MOVING_UP' || this.lift.state === 'MOVING_DOWN') {
        this.lift.apply(LiftAction.STOP);
        this.lift.context.stopCause = 'DISCONNECT';
        this.bumpAndBroadcast(onSafetyStop);
        this.logEvent(EventType.STATE_TRANSITION, conn.participantId, { reason: 'safety_stop_on_disconnect' });
      }
    }, 3000);
    this.disconnectTimers.set(conn.participantId, timer);
  }

  logEvent(type, actorId, data = {}, objectiveIds = []) {
    return this.eventStore.append(this.sessionId, makeEvent({ type, sessionId: this.sessionId, actorId, data, objectiveIds }));
  }

  patchPayload() {
    return { lift: this.lift.snapshot(), activeFault: this.activeFault };
  }

  bumpAndBroadcast(broadcastFn) {
    this.stateVersion += 1;
    if (broadcastFn) {
      broadcastFn(makeStatePatch({ stateVersion: this.stateVersion, patch: this.patchPayload() }));
    }
  }

  bumpVersion() {
    this.stateVersion += 1;
  }

  snapshotMessage() {
    return makeStateSnapshot({
      stateVersion: this.stateVersion,
      state: { lift: this.lift.snapshot(), checklist: this.checklist.status(), activeFault: this.activeFault },
    });
  }

  completeChecklistItem(itemId) {
    const done = this.checklist.complete(itemId);
    if (done) this.lift.context.mandatoryChecklistDone = true;
    this.logEvent(EventType.CHECKLIST_ITEM_COMPLETED, 'system', { itemId, allDone: done });
    return done;
  }

  /**
   * Aplica a intencao de um cliente. Retorna { ok, reason?, patch? }.
   * Nunca lanca para uma acao invalida do usuario (auditavel, nao excecao).
   */
  // Nao faz broadcast internamente: o chamador (server.js) decide a ordem
  // entre a resposta direta (ACK/REJECTED) e o STATE_PATCH difundido, para
  // que o cliente que originou a acao receba as duas em ordem previsivel.
  applyClientAction(connId, { entityId, action }) {
    const conn = this.connections.get(connId);
    if (!conn) return { ok: false, reason: 'conexao desconhecida' };

    const entry = resolveAction(entityId);
    if (!entry) return { ok: false, reason: `entidade sem acao mapeada: ${entityId}` };
    if (entry.role && entry.role !== conn.role) {
      return { ok: false, reason: `papel ${conn.role} nao autorizado para ${entityId}` };
    }

    if (entry.toggleContext) {
      this.lift.context[entry.toggleContext] = !this.lift.context[entry.toggleContext];
      this.bumpVersion();
      this.logEvent(EventType.ACTION_ACCEPTED, conn.participantId, { entityId, action, toggled: entry.toggleContext });
      return { ok: true };
    }

    const result = this.lift.apply(entry.liftAction, { patchContext: entry.patch });
    if (!result.ok) {
      this.logEvent(EventType.ACTION_REJECTED, conn.participantId, { entityId, action, reason: result.reason });
      return { ok: false, reason: result.reason };
    }
    this.bumpVersion();
    this.logEvent(EventType.ACTION_ACCEPTED, conn.participantId, { entityId, action, from: result.from, to: result.to });
    this.logEvent(EventType.STATE_TRANSITION, conn.participantId, { from: result.from, to: result.to });
    return { ok: true, from: result.from, to: result.to };
  }

  /**
   * Falhas so podem ser armadas pelo instrutor e apenas quando as
   * pre-condicoes do catalogo permitirem (doc, "Injecao de falhas").
   */
  applyFaultRequest(connId, { faultId, justification }, broadcastFn) {
    const conn = this.connections.get(connId);
    if (!conn || conn.role !== Role.INSTRUCTOR) return { ok: false, reason: 'somente o instrutor pode armar falhas' };

    const fault = getFault(faultId);
    const rule = FAULT_RULES[faultId];
    if (!rule.appliesToStates.includes(this.lift.state)) {
      return { ok: false, reason: `falha ${faultId} nao se aplica ao estado atual ${this.lift.state}` };
    }

    if (rule.effect === FaultEffect.LIFT_ACTION) {
      const result = this.lift.apply(rule.liftAction);
      if (!result.ok) return { ok: false, reason: result.reason };
    } else {
      this.lift.context[rule.flag] = true;
    }
    this.activeFault = { id: faultId, armedBy: conn.participantId, armedAt: Date.now(), justification: justification ?? null };
    this.bumpAndBroadcast(broadcastFn);
    this.logEvent(EventType.FAULT_ARMED, conn.participantId, { faultId, justification, signal: fault.studentSignal });
    return { ok: true, fault };
  }

  clearActiveFault(connId, broadcastFn) {
    const conn = this.connections.get(connId);
    if (!conn || conn.role !== Role.INSTRUCTOR) return { ok: false, reason: 'somente o instrutor pode cancelar falhas' };
    if (!this.activeFault) return { ok: false, reason: 'nenhuma falha ativa' };

    const rule = FAULT_RULES[this.activeFault.id];
    if (rule.effect === FaultEffect.CONTEXT_FLAG) {
      this.lift.context[rule.flag] = false;
    } else if (rule.liftAction === LiftAction.BLOCK_BY_OBSTACLE) {
      this.lift.context.obstacleDetected = false;
    }
    this.logEvent(EventType.FAULT_CANCELLED, conn.participantId, { faultId: this.activeFault.id });
    this.activeFault = null;
    this.bumpAndBroadcast(broadcastFn);
    return { ok: true };
  }

  getOrCreateAssessment(participantId, assessorId) {
    if (!this.assessments.has(participantId)) {
      this.assessments.set(
        participantId,
        new AnnexOneRubric({
          assessmentId: `A-${this.sessionId}-${participantId}`,
          participantId,
          curriculumProfile: this.profileId,
          assessorId,
        }),
      );
    }
    return this.assessments.get(participantId);
  }
}
