// Controle de versao obrigatorio (doc, secao 1). Um curriculumProfile
// identifica Requirements for Training, Service Lift Standard, edicao do
// manual do fabricante, idioma e data de vigencia. A sessao deve ser
// bloqueada se conteudo, checklist ou modelo 3D nao corresponderem ao
// perfil aprovado (ver assertProfileMatches).

export const ProfileStatus = Object.freeze({
  LEGADO: 'legado', // historico, so para o escopo de 240 min solicitado
  VIGENTE_PENDENTE_AUDITORIA: 'vigente_pendente_auditoria',
});

export const CurriculumProfiles = Object.freeze({
  'rt14-slu-240': Object.freeze({
    id: 'rt14-slu-240',
    requirementsForTraining: 'GWO Requirements for Training V14 (2023-12-04)',
    serviceLiftStandard: null,
    totalContactMinutes: 240,
    status: ProfileStatus.LEGADO,
    notes:
      'Perfil historico solicitado no escopo do projeto. NAO corresponde ao Service ' +
      'Lift Training Standard atualmente publicado (V5, 260 minutos). Requer analise ' +
      'formal de versao do provedor antes de qualquer uso comercial como treinamento ' +
      'GWO vigente.',
  }),
  'slt-v5-slu-260': Object.freeze({
    id: 'slt-v5-slu-260',
    requirementsForTraining: 'GWO Requirements for Training V14 (2023-12-04)',
    serviceLiftStandard: 'GWO Service Lift Training Standard V5 (2025-05-02)',
    totalContactMinutes: 260,
    status: ProfileStatus.VIGENTE_PENDENTE_AUDITORIA,
    notes:
      'Amplia revisao e feedback de 5 para 25 minutos (mantendo os 240 min de teoria e ' +
      'pratica dos tres macroblocos). Liberacao depende da matriz completa do padrao ' +
      'vigente e da auditoria do provedor certificado.',
  }),
});

export function getProfile(profileId) {
  const profile = CurriculumProfiles[profileId];
  if (!profile) throw new Error(`curriculumProfile desconhecido: ${profileId}`);
  return profile;
}

/**
 * Bloqueia o inicio de sessao se o manifesto de build/conteudo/checklist/
 * modelo 3D nao corresponder ao perfil aprovado (clausula 7.2.13).
 */
export function assertProfileMatches(profileId, sessionManifest) {
  const profile = getProfile(profileId);
  const mismatches = [];
  if (sessionManifest.contentVersion !== profileId) {
    mismatches.push(`contentVersion (${sessionManifest.contentVersion}) difere do perfil (${profileId})`);
  }
  if (!sessionManifest.checklistApproved) {
    mismatches.push('checklist nao aprovado para este perfil');
  }
  if (!sessionManifest.liftModelApproved) {
    mismatches.push('modelo 3D do lift nao aprovado para este perfil');
  }
  if (mismatches.length > 0) {
    return { ok: false, profile, mismatches };
  }
  return { ok: true, profile };
}
