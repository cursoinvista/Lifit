// Taxonomia GWO (doc, secao 5). Cada objetivo usa apenas verbos compativeis
// com o nivel necessario. O SLU cobre: Conhecimento basico/intermediario,
// Habilidades intermediarias, Capacidade basica/intermediaria. Verbos
// avancados nunca devem ser usados para elevar artificialmente o nivel.

export const Domain = Object.freeze({ KNOWLEDGE: 'K', SKILL: 'S', ABILITY: 'A' });
export const Level = Object.freeze({ BASICO: 'basico', INTERMEDIARIO: 'intermediario' });

const ALLOWED_VERBS = Object.freeze({
  [Domain.KNOWLEDGE]: {
    [Level.BASICO]: ['nomear', 'reconhecer', 'descrever'],
    [Level.INTERMEDIARIO]: ['explicar', 'discutir'],
  },
  [Domain.SKILL]: {
    [Level.BASICO]: ['copiar', 'repetir'],
    [Level.INTERMEDIARIO]: ['aplicar', 'distinguir', 'realizar'],
  },
  [Domain.ABILITY]: {
    [Level.BASICO]: ['mostrar interesse', 'resolver'],
    [Level.INTERMEDIARIO]: ['tomar iniciativa', 'assumir responsabilidade', 'agir de forma independente'],
  },
});

export function isVerbAllowed(domain, level, verb) {
  return (ALLOWED_VERBS[domain]?.[level] ?? []).includes(verb.toLowerCase());
}

/** Fabrica que valida o verbo contra a taxonomia antes de aceitar o objetivo. */
function objective({ id, domain, level, verb, description }) {
  if (!isVerbAllowed(domain, level, verb)) {
    throw new Error(`verbo "${verb}" nao e permitido para ${domain}/${level} no SLU`);
  }
  return Object.freeze({ id, domain, level, verb, description });
}

export const Objectives = Object.freeze({
  // Modulo 1 - Teoria, seguranca e conexao (60 min)
  'M1-K1': objective({ id: 'M1-K1', domain: Domain.KNOWLEDGE, level: Level.BASICO, verb: 'reconhecer',
    description: 'Reconhecer os procedimentos de emergencia, as instalacoes e os controles principais do lift.' }),
  'M1-K2': objective({ id: 'M1-K2', domain: Domain.KNOWLEDGE, level: Level.BASICO, verb: 'descrever',
    description: 'Descrever o PPE correto, as condicoes de aptidao e o proposito da inspecao antes do uso.' }),
  'M1-K3': objective({ id: 'M1-K3', domain: Domain.KNOWLEDGE, level: Level.INTERMEDIARIO, verb: 'explicar',
    description: 'Explicar como manuais, regras locais e fatores humanos afetam uma decisao segura.' }),
  'M1-S1': objective({ id: 'M1-S1', domain: Domain.SKILL, level: Level.INTERMEDIARIO, verb: 'realizar',
    description: 'Realizar testes de funcao e protecao conforme o manual e o checklist do modelo.' }),
  'M1-A1': objective({ id: 'M1-A1', domain: Domain.ABILITY, level: Level.INTERMEDIARIO, verb: 'assumir responsabilidade',
    description: 'Assumir responsabilidade pela inspecao e tomar iniciativa para buscar orientacao quando necessario.' }),

  // Modulo 2 - Operacao em realidade virtual (90 min)
  'M2-K1': objective({ id: 'M2-K1', domain: Domain.KNOWLEDGE, level: Level.INTERMEDIARIO, verb: 'explicar',
    description: 'Descrever as funcoes do lift e explicar consequencias de perigos, fatores externos, falhas e danos.' }),
  'M2-S1': objective({ id: 'M2-S1', domain: Domain.SKILL, level: Level.INTERMEDIARIO, verb: 'realizar',
    description: 'Realizar com seguranca a operacao de gates, portas, painel, subida, descida, parada e empty transfer.' }),
  'M2-S2': objective({ id: 'M2-S2', domain: Domain.SKILL, level: Level.INTERMEDIARIO, verb: 'distinguir',
    description: 'Distinguir condicao segura de condicao insegura na danger zone, no travel range e dentro da cabine.' }),
  'M2-A1': objective({ id: 'M2-A1', domain: Domain.ABILITY, level: Level.INTERMEDIARIO, verb: 'assumir responsabilidade',
    description: 'Assumir responsabilidade por PPE, objetos, ocupantes e sistemas de protecao.' }),
  'M2-A2': objective({ id: 'M2-A2', domain: Domain.ABILITY, level: Level.INTERMEDIARIO, verb: 'agir de forma independente',
    description: 'Agir de forma independente em um ciclo normal e deixar o lift estacionado e desligado conforme o manual.' }),

  // Modulo 3 - Emergencia e gestao de falhas (90 min)
  'M3-K1': objective({ id: 'M3-K1', domain: Domain.KNOWLEDGE, level: Level.INTERMEDIARIO, verb: 'explicar',
    description: 'Explicar as respostas a falhas e danos, as condicoes de nao uso e as acoes posteriores a descida de emergencia.' }),
  'M3-S1': objective({ id: 'M3-S1', domain: Domain.SKILL, level: Level.INTERMEDIARIO, verb: 'realizar',
    description: 'Realizar a operacao de portas em emergencia e a descida de emergencia conforme o manual aplicavel.' }),
  'M3-A1': objective({ id: 'M3-A1', domain: Domain.ABILITY, level: Level.INTERMEDIARIO, verb: 'assumir responsabilidade',
    description: 'Assumir responsabilidade, comunicar, estabelecer condicao segura e agir de forma independente dentro do escopo do usuario.' }),
  'M3-A2': objective({ id: 'M3-A2', domain: Domain.ABILITY, level: Level.BASICO, verb: 'mostrar interesse',
    description: 'Mostrar interesse em seguir o plano especifico de resgate e evacuacao e buscar orientacao ou treinamento adicional.' }),
});

export function listObjectivesByModule(modulePrefix) {
  return Object.values(Objectives).filter((o) => o.id.startsWith(modulePrefix));
}
