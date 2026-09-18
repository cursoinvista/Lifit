// Formulario digital Annex 1 (doc, secao 7). O SISTEMA REGISTRA; O
// INSTRUTOR DECIDE. Esta classe nunca calcula uma aprovacao "final" sem
// confirmacao humana explicita (finalize()).

export const AnnexOneGroup = Object.freeze({
  SCENARIO_ORGANISATION: 'scenario_organisation',
  SCENARIO_MANAGEMENT: 'scenario_management',
  KNOWLEDGE: 'knowledge',
});

// As nove medidas do Annex 1 do V14.
export const AnnexOneCriteria = Object.freeze([
  { id: 'personal_group_safety', group: AnnexOneGroup.SCENARIO_ORGANISATION, label: 'Seguranca pessoal e do grupo' },
  { id: 'correct_equipment', group: AnnexOneGroup.SCENARIO_ORGANISATION, label: 'Equipamento correto' },
  { id: 'people_group_organisation', group: AnnexOneGroup.SCENARIO_ORGANISATION, label: 'Organizacao de pessoas e grupos' },
  { id: 'scenario_control', group: AnnexOneGroup.SCENARIO_MANAGEMENT, label: 'Controle do cenario' },
  { id: 'full_participation', group: AnnexOneGroup.SCENARIO_MANAGEMENT, label: 'Participacao plena' },
  { id: 'follows_instructor', group: AnnexOneGroup.SCENARIO_MANAGEMENT, label: 'Segue o instrutor quando necessario' },
  { id: 'manual_handling', group: AnnexOneGroup.SCENARIO_MANAGEMENT, label: 'Manual handling correto e seguro' },
  { id: 'applies_knowledge', group: AnnexOneGroup.KNOWLEDGE, label: 'Aplica conhecimento corretamente' },
  { id: 'demonstrates_understanding', group: AnnexOneGroup.KNOWLEDGE, label: 'Demonstra compreensao' },
]);

const CRITERIA_IDS = new Set(AnnexOneCriteria.map((c) => c.id));

/** 0 e 1 aceitam comentario opcional; 2 e 3 exigem comentario. */
export function commentRequired(score) {
  return score >= 2;
}

/**
 * Regra oficial do Annex 1 V14: por medida, 0-2 = passed, 3 = failed.
 * Total: 0-9 = pass, 10-27 = fail. anyScoreOfThreeFailsImmediately e uma
 * configuracao explicita do provedor (doc: "deve ser configurada e
 * documentada"), NAO um comportamento implicito desta biblioteca.
 */
export class AnnexOneRubric {
  constructor({ assessmentId, participantId, curriculumProfile, assessorId, anyScoreOfThreeFailsImmediately = false }) {
    this.assessmentId = assessmentId;
    this.participantId = participantId;
    this.curriculumProfile = curriculumProfile;
    this.assessorId = assessorId;
    this.anyScoreOfThreeFailsImmediately = anyScoreOfThreeFailsImmediately;
    this.scores = new Map(); // criterionId -> { score, comment, eventRefs, objectiveIds, version }
    this.finalized = false;
  }

  score(criterionId, { score, comment = '', eventRefs = [], objectiveIds = [] }) {
    if (this.finalized) throw new Error('avaliacao ja finalizada e assinada; nova versao requer nova sessao de correcao');
    if (!CRITERIA_IDS.has(criterionId)) throw new Error(`criterio Annex 1 desconhecido: ${criterionId}`);
    if (![0, 1, 2, 3].includes(score)) throw new Error('nota deve estar entre 0 e 3');
    if (commentRequired(score) && !comment.trim()) {
      throw new Error(`nota ${score} exige comentario`);
    }
    const prior = this.scores.get(criterionId);
    const version = (prior?.version ?? 0) + 1;
    this.scores.set(criterionId, { score, comment, eventRefs, objectiveIds, version, at: Date.now() });
    return { criterionId, version };
  }

  total() {
    let sum = 0;
    for (const { score } of this.scores.values()) sum += score;
    return sum;
  }

  isComplete() {
    return CRITERIA_IDS.size === this.scores.size;
  }

  /**
   * Resultado sugerido pelo sistema. O instrutor SEMPRE confirma via
   * finalize(); este metodo nunca grava decisao.
   */
  suggestedResult() {
    if (!this.isComplete()) return { ready: false };
    const anyThree = [...this.scores.values()].some((s) => s.score === 3);
    if (this.anyScoreOfThreeFailsImmediately && anyThree) {
      return { ready: true, total: this.total(), suggestion: 'fail', reason: 'nota 3 em ao menos um criterio (regra do provedor)' };
    }
    const total = this.total();
    const suggestion = total <= 9 ? 'pass' : 'fail';
    return { ready: true, total, suggestion };
  }

  finalize({ confirmedBy, confirmedResult }) {
    if (!this.isComplete()) throw new Error('todas as nove medidas devem ser pontuadas antes de finalizar');
    if (!confirmedBy) throw new Error('finalizacao exige assessorId humano que confirma o resultado');
    if (!['pass', 'fail'].includes(confirmedResult)) throw new Error('resultado confirmado deve ser pass ou fail');
    this.finalized = true;
    this.finalizedBy = confirmedBy;
    this.result = confirmedResult;
    this.finalizedAt = Date.now();
    return this.toRecord();
  }

  toRecord() {
    return {
      assessmentId: this.assessmentId,
      participantId: this.participantId,
      curriculumProfile: this.curriculumProfile,
      assessorId: this.assessorId,
      scores: Object.fromEntries(this.scores),
      total: this.total(),
      finalized: this.finalized,
      result: this.result ?? null,
      finalizedBy: this.finalizedBy ?? null,
      finalizedAt: this.finalizedAt ?? null,
    };
  }
}
