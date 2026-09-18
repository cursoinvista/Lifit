// Dirige o roteiro pedagogico do modulo ativo (doc, secao 6 "Programa de
// quatro horas"). Modo guiado mostra a atividade esperada; modo avaliacao
// nao mostra pistas de sequencia (doc, secao 3 "Modo guiado... modo
// avaliacao sem pistas"). Sem dependencia de DOM/Three.js: usado tanto pelo
// cliente do aluno quanto pelo console do instrutor.
import { SCHEDULE } from './schedule.js';
import { Objectives } from './objectives.js';

export class ScenarioEngine {
  constructor(moduleId, { guided = true } = {}) {
    if (!SCHEDULE[moduleId]) throw new Error(`modulo desconhecido: ${moduleId}`);
    this.moduleId = moduleId;
    this.module = SCHEDULE[moduleId];
    this.guided = guided;
    this.startedAt = null;
  }

  start() {
    this.startedAt = performance.now();
  }

  elapsedMinutes() {
    if (!this.startedAt) return 0;
    return (performance.now() - this.startedAt) / 60000;
  }

  currentBlock() {
    const elapsed = this.elapsedMinutes();
    return this.module.blocks.find((b) => elapsed >= b.start && elapsed < b.end) ?? null;
  }

  currentObjectives() {
    const block = this.currentBlock();
    if (!block) return [];
    return block.objectiveIds.map((id) => Objectives[id]);
  }

  hudText() {
    const block = this.currentBlock();
    if (!block) return `${this.module.title} - concluido ou nao iniciado`;
    if (!this.guided) return 'Modo avaliacao: execute a tarefa sem pistas de sequencia.';
    return `${this.module.title} | ${block.activity}`;
  }
}
