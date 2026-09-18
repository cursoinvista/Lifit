// Console do instrutor (doc, secao 3 "Console do instrutor"). O sistema
// registra; o instrutor decide. Nenhum botao aqui aplica estado
// diretamente - tudo passa pelo servidor autoritativo via InstructorClient.
import { AnnexOneRubric, ScenarioEngine } from '@lifit/curriculum';
import { InstructorClient } from './net/InstructorClient.js';
import { buildSpectatorScene } from './scene/spectatorScene.js';
import { initFaultPanel } from './panels/FaultPanel.js';
import { renderObjectives } from './panels/ObjectivesPanel.js';
import { initAnnexOnePanel } from './panels/AnnexOnePanel.js';
import { createLogPanel } from './panels/LogPanel.js';

const params = new URLSearchParams(location.search);
const sessionId = params.get('session') ?? 'SLU-DEV-0001';
const instructorId = params.get('instructor') ?? 'I-DEV';
const studentId = params.get('participant') ?? 'P-DEV';
const profileId = params.get('profile') ?? 'rt14-slu-240';
const moduleId = params.get('module') ?? 'M2';
const wsUrl = params.get('server') ?? `ws://${location.hostname}:8787`;

const el = (id) => document.getElementById(id);

const spectator = buildSpectatorScene(el('viewport'));
const scenario = new ScenarioEngine(moduleId, { guided: true });
scenario.start();

// Rubrica local espelha o que o servidor persiste; a fonte de verdade e o
// event store do servidor (ver AssessmentService no session-server).
const localRubric = new AnnexOneRubric({
  assessmentId: `A-${sessionId}-${studentId}`,
  participantId: studentId,
  curriculumProfile: profileId,
  assessorId: instructorId,
});

const telemetryLog = createLogPanel(el('telemetry-log'));
const replayLog = createLogPanel(el('replay-log'));

const client = new InstructorClient({ url: wsUrl, sessionId, participantId: instructorId, profileId, manifest: { contentVersion: profileId, checklistApproved: true, liftModelApproved: true } });

function applyLiftState(liftSnapshot) {
  el('status-lift-state').textContent = liftSnapshot.state;
  replayLog.append(`estado do lift -> ${liftSnapshot.state}`);
}

function applyActiveFault(activeFault) {
  el('status-fault').textContent = activeFault ? activeFault.id : 'nenhuma';
}

client.on('snapshot', (msg) => {
  el('status-session').textContent = sessionId;
  el('status-profile').textContent = profileId;
  applyLiftState(msg.state.lift);
  applyActiveFault(msg.state.activeFault);
  const done = msg.state.checklist.filter((i) => i.done).length;
  el('status-checklist').textContent = `${done}/${msg.state.checklist.length}`;
});

client.on('patch', (msg) => {
  applyLiftState(msg.patch.lift);
  applyActiveFault(msg.patch.activeFault);
});

client.on('error', (msg) => {
  telemetryLog.append(`ERRO: ${msg.message}`);
});

client.on('telemetry', (msg) => {
  telemetryLog.append(`telemetria de ${msg.relayedFrom ?? '?'}: ${msg.samples.length} amostra(s)`);
});

client.connect();

initFaultPanel({
  container: el('fault-buttons'),
  clearButton: el('clear-fault-btn'),
  onArm: (faultId) => {
    client.armFault(faultId, `armada pelo instrutor ${instructorId}`);
    replayLog.append(`falha armada: ${faultId}`);
  },
  onClear: () => {
    client.clearFault();
    replayLog.append('falha cancelada pelo instrutor');
  },
});

const annexPanel = initAnnexOnePanel({
  formContainer: el('annex1-form'),
  totalLabel: el('annex-total'),
  finalizeButton: el('finalize-btn'),
  onScore: (criterionId, score, comment) => {
    try {
      localRubric.score(criterionId, { score, comment });
      client.scoreAssessment({ participantId: studentId, criterion: criterionId, score, comment });
      const suggestion = localRubric.suggestedResult();
      annexPanel.updateTotal(localRubric.total(), suggestion.ready ? suggestion.suggestion : 'incompleto');
    } catch (err) {
      telemetryLog.append(`erro ao pontuar ${criterionId}: ${err.message}`);
    }
  },
  onFinalize: (confirmedResult) => {
    try {
      localRubric.finalize({ confirmedBy: instructorId, confirmedResult });
      client.finalizeAssessment({ participantId: studentId, confirmedResult });
      replayLog.append(`avaliacao finalizada: ${confirmedResult}`);
    } catch (err) {
      telemetryLog.append(`erro ao finalizar: ${err.message}`);
    }
  },
});
annexPanel.updateTotal(0, null);

function refreshObjectives() {
  renderObjectives(el('objectives-list'), scenario.currentObjectives());
}
setInterval(refreshObjectives, 5000);
refreshObjectives();

function loop() {
  spectator.render();
  requestAnimationFrame(loop);
}
loop();
