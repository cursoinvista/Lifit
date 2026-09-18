# SLU WebXR — Treinamento imersivo do modulo Service Lift User

Implementacao tecnica do programa de 4 horas descrito em
`Plano_Tecnico_Pedagogico_SLU_WebXR_GWO_V14`: cliente WebXR (Meta Quest 3 /
3S), console do instrutor e servidor autoritativo Node.js, cobrindo os tres
macroblocos (teoria/seguranca, operacao em RV, emergencia/falhas) e a
avaliacao digital baseada no Annex 1 do GWO Requirements for Training V14.

## Decisao de conformidade (leia antes de usar isto como treinamento real)

**Este sistema NAO e, por si so, um curso GWO certificado.** Ele e um
ambiente digital auditavel que *pode* apoiar um treinamento GWO se, e
somente se, todas as condicoes abaixo forem satisfeitas por um provedor
certificado:

- O treinamento e ministrado por um provedor certificado, em setting
  auditado para este modulo especifico.
- O instrutor mantem controle direto e humano sobre a avaliacao — o
  software nunca decide aprovacao/reprovacao por conta propria (ver
  `AnnexOneRubric.suggestedResult()` vs `finalize()` em
  `packages/curriculum/src/rubric.js`: a sugestao nunca e o resultado).
- Exigencias de identidade, consentimento, saude declarada, seguranca
  fisica e documentacao sao cumpridas fora do escopo deste software.
- **A edicao oficial vigente do Service Lift Training Standard e a V5,
  com 260 minutos de contato para o SLU.** O perfil de 240 minutos
  (`rt14-slu-240`) implementado aqui e **historico/legado** e nao deve ser
  usado como treinamento GWO vigente sem analise formal de versao e
  aprovacao do provedor e do organismo certificador. Ver
  `packages/curriculum/src/profiles.js`.

O sistema e um **simulador**. Ele nunca deve comandar um elevador real —
isso nao e uma configuracao a ser habilitada, e uma linha que este
codigo nao cruza: nao ha nenhum adaptador de I/O para hardware de
elevador em nenhum pacote.

## Arquitetura

```
apps/
  quest/                 cliente WebXR (Three.js) do aluno
  instructor-console/     console web (nao-XR) do instrutor
  session-server/         servidor Node.js + WebSocket, autoritativo
packages/
  protocol/               formato de mensagens e eventos versionados
  lift-domain/             LiftStateMachine (unica autoridade sobre estado/porta/falha)
  curriculum/              perfis, objetivos, cronograma, Annex 1, catalogo de falhas
```

Fluxo de autoridade: o Quest e o console **so enviam intencao**
(`ACTION_REQUEST`, `FAULT_REQUEST`, `ASSESSMENT_SCORE`); o `session-server`
valida contra `LiftStateMachine` e devolve `ACTION_ACK`/`ACTION_REJECTED` +
`STATE_PATCH`. Nenhum cliente escreve estado diretamente.

## Como rodar (ambiente de desenvolvimento)

```bash
npm install
npm run dev:server    # ws://localhost:8787
npm run dev:quest     # http://localhost:5173 (aluno)
npm run dev:console   # http://localhost:5174 (instrutor)
```

Abra as duas URLs com o mesmo parametro `?session=` (ex.: `?session=SLU-001`)
em abas/dispositivos separados. Sem headset, o cliente do aluno cai em modo
de depuracao desktop: clique nos objetos da cena para simular o raycast dos
joysticks Touch Plus. Em um Meta Quest 3/3S real, use o Meta Browser ou
Wolvic e o botao "Enter VR".

## Testes

```bash
npm test   # node --test em packages/* e apps/session-server (38 casos)
```

Cobertura atual: todas as transicoes e bloqueios do `LiftStateMachine`
(incluindo as tres falhas que atuam como guard de contexto), a regra de
pontuacao do Annex 1 (0-9 pass / 10-27 fail, comentario obrigatorio a
partir de 2, `anyScoreOfThreeFailsImmediately` como opt-in explicito),
validacao de perfil de curriculo, e um teste de integracao ponta a ponta
do servidor via cliente WebSocket real (HELLO -> checklist -> portas ->
subida -> falha -> FAULT_CLEAR -> retomada -> avaliacao). Os dois clientes
web (Quest e console) foram validados manualmente com Playwright headless
em um fluxo completo entre os dois papeis; nao ha teste automatizado de
regressao para a camada de renderizacao/DOM (ver limitacoes).

## Simplificacoes conhecidas e o que falta para uso real

Isto e uma base tecnica funcional, nao um produto pronto para auditoria
GWO. Lacunas deliberadas, para nao superestimar o que foi entregue:

1. **Checklist digital e um placeholder de 7 itens**
   (`packages/curriculum/src/checklist.js`), nao a lista oficial do
   provedor. O que importa manter e o *bloqueio de fluxo* (sem checklist
   completo, sem `READY`), nao os itens especificos.
2. **Mapeamento bloco de tempo -> objectiveId em `schedule.js` e uma
   aproximacao pedagogica**, porque o documento fonte descreve 6-7
   atividades por modulo em prosa mas so formaliza 14 objectiveIds no
   total. Precisa de revisao por um instrutor/designer instrucional antes
   de uso avaliativo.
3. **Geometria 3D e procedural (caixas/cilindros)**, nao os assets GLB do
   manual do fabricante do lift alvo. Suficiente para validar mecanica e
   fluxo, insuficiente para "alta fidelidade ao ambiente de turbina"
   exigida pela clausula 7.2.14.
4. **Sem RBAC forte nem MFA.** O papel (`STUDENT`/`INSTRUCTOR`) e
   declarado no `HELLO` e confiado pelo servidor; nao ha verificacao
   criptografica de identidade. Adequado para prototipo, nao para
   producao com dados de avaliacao reais.
5. **TLS nao esta implementado neste processo.** O servidor fala WS puro;
   em producao isso exige um proxy reverso terminando TLS antes deste
   processo, como o proprio documento fonte assume implicitamente.
6. **Persistencia e um event store JSONL local (`data/events/*.jsonl`)**,
   nao um banco relacional. Funciona para um piloto de sessao unica; nao
   escala para multiplas turmas/instrutores concorrentes nem tem backup/
   replicacao.
7. **Uma sala = um aluno.** Nao ha suporte a multiplos alunos simultaneos
   na mesma sessao, nem interpolacao de avatares remotos (mencionada no
   documento fonte, nao implementada aqui).
8. **Replay e telemetria sao retransmitidos, nao persistidos com scrubber
   de video/estado.** O console mostra um log cronologico; nao ha "voltar
   e reproduzir" um trecho gravado.
9. **Reconexao envia sempre um snapshot completo**, nao a lista precisa de
   eventos perdidos desde o ultimo ACK que o documento fonte descreve.
   Funcionalmente correto (o cliente nunca fica com estado divergente),
   mas mais bruto do que o ideal.
10. **Sem hardware Quest real no ambiente de build**: a validacao cobriu
    renderizacao, logica de rede e integracao entre os dois clientes via
    Playwright headless (sem WebXR real) e via um hook de teste
    (`?debug=1`) que dispara acoes sem depender de picking de mouse ou
    controller fisico. Comportamento de haptica, tracking de maos e
    performance em 72Hz+ no dispositivo alvo **nao foram e nao podem ser
    validados neste ambiente**.

## Antes de qualquer uso comercial como treinamento GWO

- Decidir formalmente entre o perfil legado de 240 min (`rt14-slu-240`) e
  o perfil vigente de 260 min (`slt-v5-slu-260`, hoje marcado
  `vigente_pendente_auditoria`) com o organismo certificador.
- Substituir o checklist placeholder pelo checklist oficial do provedor.
- Substituir a geometria procedural pelos assets GLB aprovados do manual
  do fabricante do lift alvo, com KTX2/LOD conforme a meta de desempenho.
- Validar o mapeamento objetivo-atividade com um instrutor SLU
  qualificado (item 2 acima).
- Testes de rede com RTT/jitter/perda conforme a lista do documento fonte
  (50/100/200/400 ms), hoje nao automatizados.
- Revisao de seguranca antes de expor o `session-server` fora de uma rede
  local controlada (TLS, autenticacao real, rate limiting).
