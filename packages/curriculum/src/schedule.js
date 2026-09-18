// Programa de quatro horas (doc, secao 6). Tres macroblocos: 60 + 90 + 90 min.
//
// NOTA CRITICA: o documento fonte descreve o objetivo de cada bloco de tempo
// em prosa, mas so formaliza 14 objectiveIds (5 em M1, 5 em M2, 4 em M3). O
// mapeamento bloco -> objectiveIds abaixo e a melhor correspondencia tematica
// possivel e DEVE ser revisado pelo instrutor/designer instrucional do
// provedor certificado antes de uso avaliativo; nao tratar como definitivo.
export const SCHEDULE = Object.freeze({
  M1: Object.freeze({
    title: 'Modulo 1 - Teoria, seguranca e conexao',
    totalMinutes: 60,
    blocks: [
      { start: 0, end: 10, activity: 'Identidade, consentimento, aptidao declarada, seguranca local e checagem de rede', objectiveIds: ['M1-A1'], evidence: 'Checklist e READY' },
      { start: 10, end: 20, activity: 'Legislacao, manuais, human factors e PPE', objectiveIds: ['M1-K2', 'M1-K3'], evidence: 'Perguntas e selecao de PPE' },
      { start: 20, end: 35, activity: 'Tour guiado por tipos, guias, controles e zonas', objectiveIds: ['M1-K1'], evidence: 'Identificacao em cena' },
      { start: 35, end: 50, activity: 'Inspecao pre use guiada externa e interna', objectiveIds: ['M1-S1'], evidence: 'Sequencia e itens' },
      { start: 50, end: 57, activity: 'Inspecao independente curta com um defeito', objectiveIds: ['M1-A1'], evidence: 'Decisao e consulta ao manual' },
      { start: 57, end: 60, activity: 'Reflexao e fechamento', objectiveIds: ['M1-K3'], evidence: 'Resposta oral' },
    ],
  }),
  M2: Object.freeze({
    title: 'Modulo 2 - Operacao em realidade virtual',
    totalMinutes: 90,
    blocks: [
      { start: 0, end: 10, activity: 'Briefing, PPE, buddy check e criterios de parada', objectiveIds: ['M2-A1'], evidence: 'Checklist' },
      { start: 10, end: 25, activity: 'Demonstracao e pratica assistida de portas, gates e painel', objectiveIds: ['M2-S1'], evidence: 'Eventos validados' },
      { start: 25, end: 50, activity: 'Ciclo completo de subida e descida', objectiveIds: ['M2-A2'], evidence: 'Sequencia sem pista' },
      { start: 50, end: 65, activity: 'Danger zone, travel range, objetos e dropped objects', objectiveIds: ['M2-S2'], evidence: 'Deteccao de riscos' },
      { start: 65, end: 77, activity: 'Falhas e danos nao criticos', objectiveIds: ['M2-K1'], evidence: 'Decisao e manual' },
      { start: 77, end: 85, activity: 'Empty transfer e variacao do cenario', objectiveIds: ['M2-A2'], evidence: 'Comando apropriado' },
      { start: 85, end: 90, activity: 'Estacionamento, shutdown e reflexao', objectiveIds: ['M2-A2'], evidence: 'Estado PARKED' },
    ],
  }),
  M3: Object.freeze({
    title: 'Modulo 3 - Emergencia e gestao de falhas',
    totalMinutes: 90,
    blocks: [
      { start: 0, end: 10, activity: 'Briefing de emergencia, comunicacao e limites', objectiveIds: ['M3-K1'], evidence: 'Resposta e selecao' },
      { start: 10, end: 30, activity: 'Pane eletrica injetada pelo console', objectiveIds: ['M3-A1'], evidence: 'Sequencia, tempo e comunicacao' },
      { start: 30, end: 48, activity: 'Obstrucao ou travamento no percurso', objectiveIds: ['M3-S1'], evidence: 'Nao forcar e escalar' },
      { start: 48, end: 62, activity: 'Porta fora do ponto de acesso e abertura de emergencia', objectiveIds: ['M3-S1'], evidence: 'Acao e protecao contra queda' },
      { start: 62, end: 72, activity: 'Plano de resgate e evacuacao', objectiveIds: ['M3-A2'], evidence: 'Consulta e discussao' },
      { start: 72, end: 85, activity: 'Cenario somativo com falha desconhecida entre as ja praticadas', objectiveIds: ['M3-A1'], evidence: 'Observacao Annex 1' },
      { start: 85, end: 90, activity: 'Debrief e compromisso de transferencia', objectiveIds: ['M3-K1'], evidence: 'Reflexao final' },
    ],
  }),
});

export function totalScheduleMinutes() {
  return Object.values(SCHEDULE).reduce((sum, m) => sum + m.totalMinutes, 0);
}
