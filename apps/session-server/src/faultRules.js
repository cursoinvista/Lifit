// Liga o catalogo pedagogico de falhas (@lifit/curriculum) aos efeitos
// concretos na maquina de estados. Mantido no session-server (nao em
// curriculum) porque acopla conteudo normativo a mecanica do dominio.
import { LiftState, LiftAction } from '@lifit/lift-domain';

export const FaultEffect = Object.freeze({ LIFT_ACTION: 'lift_action', CONTEXT_FLAG: 'context_flag' });

export const FAULT_RULES = Object.freeze({
  power_loss: {
    appliesToStates: [LiftState.READY, LiftState.MOVING_UP, LiftState.MOVING_DOWN],
    effect: FaultEffect.CONTEXT_FLAG,
    flag: 'powerLossActive',
  },
  path_obstruction: {
    appliesToStates: [LiftState.MOVING_UP, LiftState.MOVING_DOWN],
    effect: FaultEffect.LIFT_ACTION,
    liftAction: LiftAction.BLOCK_BY_OBSTACLE,
  },
  gate_open: {
    appliesToStates: [LiftState.READY, LiftState.STOPPED],
    effect: FaultEffect.CONTEXT_FLAG,
    flag: 'interlockEngaged',
  },
  unstable_object: {
    appliesToStates: [LiftState.INSPECTION, LiftState.READY],
    effect: FaultEffect.CONTEXT_FLAG,
    flag: 'unstableObjectPresent',
  },
  non_use_condition: {
    appliesToStates: [LiftState.STOPPED],
    effect: FaultEffect.CONTEXT_FLAG,
    flag: 'nonUseConditionActive',
  },
});
