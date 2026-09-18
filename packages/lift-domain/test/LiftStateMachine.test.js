import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiftStateMachine, LiftState, LiftAction } from '../src/LiftStateMachine.js';

test('INSPECTION -> READY somente apos checklist obrigatorio', () => {
  const m = new LiftStateMachine();
  const blocked = m.apply(LiftAction.COMPLETE_CHECKLIST);
  assert.equal(blocked.ok, false);
  assert.equal(m.state, LiftState.INSPECTION);

  const ok = m.apply(LiftAction.COMPLETE_CHECKLIST, { patchContext: { mandatoryChecklistDone: true } });
  assert.equal(ok.ok, true);
  assert.equal(m.state, LiftState.READY);
});

test('READY -> MOVING exige portas e gates fechados', () => {
  const m = new LiftStateMachine({ initialState: LiftState.READY });
  const blocked = m.apply(LiftAction.START_MOVE_UP);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /portas ou gates/);

  const ok = m.apply(LiftAction.START_MOVE_UP, { patchContext: { doorsClosed: true, gatesClosed: true } });
  assert.equal(ok.ok, true);
  assert.equal(m.state, LiftState.MOVING_UP);
});

test('MOVING bloqueia por obstaculo e nao retoma sem remocao', () => {
  const m = new LiftStateMachine({ initialState: LiftState.MOVING_UP });
  const stopped = m.apply(LiftAction.BLOCK_BY_OBSTACLE);
  assert.equal(stopped.to, LiftState.STOPPED);

  const resumeBlocked = m.apply(LiftAction.RESUME);
  assert.equal(resumeBlocked.ok, false);

  const resumeOk = m.apply(LiftAction.RESUME, { patchContext: { obstacleDetected: false } });
  assert.equal(resumeOk.ok, true);
  assert.equal(m.state, LiftState.READY);
});

test('EMERGENCY_STOP nunca reseta sem confirmacao explicita do instrutor', () => {
  const m = new LiftStateMachine({ initialState: LiftState.EMERGENCY_STOP });
  const silent = m.apply(LiftAction.RESET_FROM_EMERGENCY);
  assert.equal(silent.ok, false);
  assert.match(silent.reason, /confirmacao do instrutor/);

  const confirmed = m.apply(LiftAction.RESET_FROM_EMERGENCY, { patchContext: { instructorConfirmedReset: true } });
  assert.equal(confirmed.ok, true);
  assert.equal(m.state, LiftState.STOPPED);
});

test('FAULT_LOCKED bloqueia movimento normal ate liberacao do instrutor', () => {
  const m = new LiftStateMachine({ initialState: LiftState.FAULT_LOCKED });
  assert.equal(m.apply(LiftAction.CLEAR_FAULT).ok, false);
  const cleared = m.apply(LiftAction.CLEAR_FAULT, { patchContext: { instructorClearedFault: true } });
  assert.equal(cleared.ok, true);
  assert.equal(m.state, LiftState.STOPPED);
});

test('descida de emergencia e rejeitada sob condicao de nao uso ativa', () => {
  const m = new LiftStateMachine({ initialState: LiftState.STOPPED, context: { nonUseConditionActive: true } });
  const rejected = m.apply(LiftAction.START_EMERGENCY_DESCENT);
  assert.equal(rejected.ok, false);
  assert.match(rejected.reason, /nao uso ativa/);
});

test('interlock aberto (gate) bloqueia retomada e proibe bypass', () => {
  const m = new LiftStateMachine({
    initialState: LiftState.STOPPED,
    context: { stopCause: 'INTERLOCK', interlockEngaged: true },
  });
  const blocked = m.apply(LiftAction.RESUME);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /bypass proibido/);
});

test('evacuation prep e emergency descent terminam em PARKED, nunca em movimento normal', () => {
  const evac = new LiftStateMachine({ initialState: LiftState.EVACUATION_PREP });
  assert.equal(evac.apply(LiftAction.COMPLETE_EVACUATION_PREP).to, LiftState.PARKED);

  const descent = new LiftStateMachine({ initialState: LiftState.EMERGENCY_DESCENT });
  assert.equal(descent.apply(LiftAction.COMPLETE_EMERGENCY_DESCENT).to, LiftState.PARKED);
});

test('falha de perda de energia bloqueia partida (painel sem acionamento)', () => {
  const m = new LiftStateMachine({ initialState: LiftState.READY, context: { doorsClosed: true, gatesClosed: true, powerLossActive: true } });
  const blocked = m.apply(LiftAction.START_MOVE_UP);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /perda de energia/);
});

test('objeto instavel bloqueia partida no modo formativo', () => {
  const m = new LiftStateMachine({ initialState: LiftState.READY, context: { doorsClosed: true, gatesClosed: true, unstableObjectPresent: true } });
  const blocked = m.apply(LiftAction.START_MOVE_UP);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /objeto instavel/);
});

test('gate aberto (interlock) impede partida mesmo com portas fechadas', () => {
  const m = new LiftStateMachine({ initialState: LiftState.READY, context: { doorsClosed: true, gatesClosed: true, interlockEngaged: true } });
  const blocked = m.apply(LiftAction.START_MOVE_UP);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /bypass proibido/);
});

test('acao fora de contexto e bloqueada e auditavel (nao lanca excecao)', () => {
  const m = new LiftStateMachine({ initialState: LiftState.PARKED });
  const result = m.apply(LiftAction.START_MOVE_UP);
  assert.equal(result.ok, false);
  assert.equal(m.state, LiftState.PARKED);
});

test('historico de transicoes registra apenas mudancas aceitas', () => {
  const m = new LiftStateMachine();
  m.apply(LiftAction.COMPLETE_CHECKLIST); // rejeitada, nao entra no historico
  m.apply(LiftAction.COMPLETE_CHECKLIST, { patchContext: { mandatoryChecklistDone: true } });
  assert.equal(m.history.length, 1);
  assert.equal(m.history[0].to, LiftState.READY);
});
