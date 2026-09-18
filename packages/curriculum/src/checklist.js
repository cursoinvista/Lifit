// Itens do checklist digital pre-sessao (doc, clausula 7.1.2 / fluxo
// "Servidor libera READY somente quando os checklists digital e fisico
// estiverem completos"). Compartilhado entre o cliente do aluno (que
// confirma os itens) e o servidor (que os valida e bloqueia READY).
//
// NOTA CRITICA: o documento fonte nao lista os itens exatos do checklist
// digital. Esta lista e um placeholder minimo e DEVE ser substituida pelo
// checklist oficial aprovado do provedor certificado antes de qualquer uso
// avaliativo real; o bloqueio de fluxo (nao liberar READY sem completude)
// e o que importa manter, nao os itens especificos abaixo.
export const MANDATORY_CHECKLIST_ITEMS = Object.freeze([
  'identity_verified',
  'consent_recorded',
  'declared_fitness',
  'ppe_selected',
  'physical_area_clear',
  'network_check_passed',
  'pre_use_inspection_completed',
]);
