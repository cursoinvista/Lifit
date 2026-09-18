// Digital twin pedagogico do elevador (doc, secao 3 "Maquina de estados do
// elevador"). Esta maquina e a UNICA autoridade sobre estado, porta e falha.
// Nenhum cliente (Quest ou console) escreve estado diretamente: eles enviam
// intencao (uma Action); o servidor aplica esta maquina e so entao publica
// o novo estado como evento e STATE_PATCH.
//
// Este simulador nunca deve ser ligado a um elevador real (ver secao 2,
// "Escopo funcional" / "Nao integrar"). Nao ha nenhum adaptador de I/O
// fisico neste pacote por desenho, nao apenas por configuracao.

export const LiftState = Object.freeze({
  INSPECTION: 'INSPECTION',
  READY: 'READY',
  MOVING_UP: 'MOVING_UP',
  MOVING_DOWN: 'MOVING_DOWN',
  STOPPED: 'STOPPED',
  EMERGENCY_STOP: 'EMERGENCY_STOP',
  FAULT_LOCKED: 'FAULT_LOCKED',
  EMERGENCY_DESCENT: 'EMERGENCY_DESCENT',
  EVACUATION_PREP: 'EVACUATION_PREP',
  PARKED: 'PARKED',
});

export const LiftAction = Object.freeze({
  COMPLETE_CHECKLIST: 'COMPLETE_CHECKLIST',
  START_MOVE_UP: 'START_MOVE_UP',
  START_MOVE_DOWN: 'START_MOVE_DOWN',
  STOP: 'STOP',
  BLOCK_BY_OBSTACLE: 'BLOCK_BY_OBSTACLE',
  TRIGGER_EMERGENCY_STOP: 'TRIGGER_EMERGENCY_STOP',
  RESET_FROM_EMERGENCY: 'RESET_FROM_EMERGENCY',
  LOCK_FOR_FAULT: 'LOCK_FOR_FAULT',
  CLEAR_FAULT: 'CLEAR_FAULT',
  RESUME: 'RESUME',
  START_EMERGENCY_DESCENT: 'START_EMERGENCY_DESCENT',
  ABORT_EMERGENCY_DESCENT: 'ABORT_EMERGENCY_DESCENT',
  COMPLETE_EMERGENCY_DESCENT: 'COMPLETE_EMERGENCY_DESCENT',
  START_EVACUATION_PREP: 'START_EVACUATION_PREP',
  COMPLETE_EVACUATION_PREP: 'COMPLETE_EVACUATION_PREP',
  PARK: 'PARK',
  RESTART_SESSION: 'RESTART_SESSION',
});

function defaultContext() {
  return {
    mandatoryChecklistDone: false,
    doorsClosed: false,
    gatesClosed: false,
    interlockEngaged: false,
    obstacleDetected: false,
    stopCause: null, // 'MANUAL' | 'OBSTACLE' | 'INTERLOCK' | 'FAULT'
    instructorConfirmedReset: false,
    instructorClearedFault: false,
    nonUseConditionActive: false,
    // Flags de falha pedagogica injetada pelo instrutor (doc, secao 3
    // "Injecao de falhas"); nunca setadas pelo cliente do aluno.
    powerLossActive: false,
    unstableObjectPresent: false,
  };
}

function moveGuard(ctx) {
  if (ctx.interlockEngaged) return 'interlock impede partida, bypass proibido';
  if (ctx.powerLossActive) return 'painel sem acionamento normal (perda de energia)';
  if (ctx.unstableObjectPresent) return 'objeto instavel: partida bloqueada no modo formativo';
  if (!ctx.doorsClosed || !ctx.gatesClosed) return 'portas ou gates abertos';
  return true;
}

// guard(ctx, payload) -> true | string(motivo do bloqueio)
const TRANSITIONS = {
  [LiftState.INSPECTION]: {
    [LiftAction.COMPLETE_CHECKLIST]: {
      to: LiftState.READY,
      guard: (ctx) => ctx.mandatoryChecklistDone || 'itens obrigatorios do checklist pendentes',
    },
  },
  [LiftState.READY]: {
    [LiftAction.START_MOVE_UP]: { to: LiftState.MOVING_UP, guard: moveGuard },
    [LiftAction.START_MOVE_DOWN]: { to: LiftState.MOVING_DOWN, guard: moveGuard },
    [LiftAction.RESTART_SESSION]: { to: LiftState.INSPECTION, guard: () => true },
  },
  [LiftState.MOVING_UP]: {
    [LiftAction.STOP]: { to: LiftState.STOPPED, guard: (ctx) => { ctx.stopCause = 'MANUAL'; return true; } },
    [LiftAction.BLOCK_BY_OBSTACLE]: { to: LiftState.STOPPED, guard: (ctx) => { ctx.stopCause = 'OBSTACLE'; ctx.obstacleDetected = true; return true; } },
    [LiftAction.TRIGGER_EMERGENCY_STOP]: { to: LiftState.EMERGENCY_STOP, guard: () => true },
  },
  [LiftState.MOVING_DOWN]: {
    [LiftAction.STOP]: { to: LiftState.STOPPED, guard: (ctx) => { ctx.stopCause = 'MANUAL'; return true; } },
    [LiftAction.BLOCK_BY_OBSTACLE]: { to: LiftState.STOPPED, guard: (ctx) => { ctx.stopCause = 'OBSTACLE'; ctx.obstacleDetected = true; return true; } },
    [LiftAction.TRIGGER_EMERGENCY_STOP]: { to: LiftState.EMERGENCY_STOP, guard: () => true },
  },
  [LiftState.STOPPED]: {
    // saida depende da causa da parada (tabela do doc)
    [LiftAction.RESUME]: {
      to: LiftState.READY,
      guard: (ctx) => {
        if (ctx.stopCause === 'OBSTACLE' && ctx.obstacleDetected) return 'obstaculo nao removido';
        if (ctx.stopCause === 'INTERLOCK' && ctx.interlockEngaged) return 'interlock ainda ativo, bypass proibido';
        return true;
      },
    },
    [LiftAction.LOCK_FOR_FAULT]: { to: LiftState.FAULT_LOCKED, guard: (ctx) => { ctx.stopCause = 'FAULT'; return true; } },
    [LiftAction.PARK]: { to: LiftState.PARKED, guard: () => true },
    [LiftAction.START_EMERGENCY_DESCENT]: {
      to: LiftState.EMERGENCY_DESCENT,
      guard: (ctx) => (!ctx.nonUseConditionActive) || 'condicao de nao uso ativa: descida de emergencia rejeitada',
    },
    [LiftAction.START_EVACUATION_PREP]: { to: LiftState.EVACUATION_PREP, guard: () => true },
  },
  [LiftState.EMERGENCY_STOP]: {
    [LiftAction.RESET_FROM_EMERGENCY]: {
      to: LiftState.STOPPED,
      // "Sem reset remoto silencioso": exige confirmacao explicita do instrutor
      guard: (ctx) => ctx.instructorConfirmedReset || 'reset requer confirmacao do instrutor, nunca automatico',
    },
    [LiftAction.LOCK_FOR_FAULT]: { to: LiftState.FAULT_LOCKED, guard: (ctx) => { ctx.stopCause = 'FAULT'; return true; } },
  },
  [LiftState.FAULT_LOCKED]: {
    [LiftAction.CLEAR_FAULT]: {
      to: LiftState.STOPPED,
      guard: (ctx) => ctx.instructorClearedFault || 'movimento normal bloqueado ate consulta ao manual e liberacao do instrutor',
    },
  },
  [LiftState.EMERGENCY_DESCENT]: {
    [LiftAction.ABORT_EMERGENCY_DESCENT]: { to: LiftState.STOPPED, guard: () => true },
    [LiftAction.COMPLETE_EMERGENCY_DESCENT]: { to: LiftState.PARKED, guard: () => true },
  },
  [LiftState.EVACUATION_PREP]: {
    // Pratica completa de evacuacao fica fora do escopo generico deste modulo.
    [LiftAction.COMPLETE_EVACUATION_PREP]: { to: LiftState.PARKED, guard: () => true },
  },
  [LiftState.PARKED]: {
    [LiftAction.RESTART_SESSION]: { to: LiftState.INSPECTION, guard: () => true },
  },
};

export class LiftStateMachine {
  constructor({ initialState = LiftState.INSPECTION, context } = {}) {
    this.state = initialState;
    this.context = { ...defaultContext(), ...context };
    this.history = [];
  }

  can(action) {
    const entry = TRANSITIONS[this.state]?.[action];
    if (!entry) return { ok: false, reason: `acao ${action} nao permitida em ${this.state}` };
    const result = entry.guard(this.context);
    if (result !== true) return { ok: false, reason: result };
    return { ok: true, to: entry.to };
  }

  /**
   * Aplica uma acao. Retorna { ok, from, to, reason }. Nunca lanca para uma
   * transicao invalida: bloqueio explicito e o comportamento esperado
   * (auditavel), nao uma excecao de programa.
   */
  apply(action, { patchContext } = {}) {
    const from = this.state;
    const entry = TRANSITIONS[from]?.[action];
    if (!entry) {
      return { ok: false, from, to: from, reason: `acao ${action} nao permitida em ${from}` };
    }
    if (patchContext) Object.assign(this.context, patchContext);
    const guardResult = entry.guard(this.context);
    if (guardResult !== true) {
      return { ok: false, from, to: from, reason: guardResult };
    }
    this.state = entry.to;
    this.history.push({ from, to: entry.to, action, at: Date.now() });
    return { ok: true, from, to: entry.to, action };
  }

  snapshot() {
    return { state: this.state, context: { ...this.context } };
  }
}
