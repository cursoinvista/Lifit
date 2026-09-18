// Catalogo aprovado de falhas pedagogicas (doc, secao 3 "Injecao de falhas").
// Falhas sao scripts aprovados, nunca comandos de hardware real: o aluno so
// recebe sinais coerentes com o equipamento simulado.

export const FaultCatalog = Object.freeze({
  power_loss: Object.freeze({
    id: 'power_loss',
    label: 'Perda de energia',
    studentSignal: 'Painel sem acionamento normal',
    expectedResponse: 'Parar, comunicar, consultar manual e executar acao autorizada',
    lockout: 'Sem reinicio espontaneo',
    liftAction: 'LOCK_FOR_FAULT',
  }),
  path_obstruction: Object.freeze({
    id: 'path_obstruction',
    label: 'Obstrucao no percurso',
    studentSignal: 'Parada e indicacao coerente',
    expectedResponse: 'Nao forcar; proteger area; informar e seguir procedimento',
    lockout: 'Movimento bloqueado',
    liftAction: 'BLOCK_BY_OBSTACLE',
  }),
  gate_open: Object.freeze({
    id: 'gate_open',
    label: 'Gate aberto',
    studentSignal: 'Interlock impede partida',
    expectedResponse: 'Identificar causa e corrigir com seguranca',
    lockout: 'Bypass proibido',
    liftAction: null, // interlock impede a transicao READY->MOVING via guard, nao ha acao de "travar"
  }),
  unstable_object: Object.freeze({
    id: 'unstable_object',
    label: 'Objeto instavel',
    studentSignal: 'Risco visual e alerta de buddy check',
    expectedResponse: 'Fixar ou remover antes do movimento',
    lockout: 'Partida bloqueada no modo formativo',
    liftAction: null,
  }),
  non_use_condition: Object.freeze({
    id: 'non_use_condition',
    label: 'Condicao de nao descida',
    studentSignal: 'Indicio definido pelo manual',
    expectedResponse: 'Nao iniciar descida; escolher alternativa',
    lockout: 'Comando de descida rejeitado',
    liftAction: null, // ver LiftStateMachine: guard nonUseConditionActive rejeita START_EMERGENCY_DESCENT
  }),
});

export function getFault(faultId) {
  const fault = FaultCatalog[faultId];
  if (!fault) throw new Error(`falha desconhecida no catalogo: ${faultId}`);
  return fault;
}
