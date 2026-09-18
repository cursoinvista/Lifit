// Cliente WebXR do aluno (Meta Quest 3 / 3S). Loop de renderizacao segue o
// padrao do doc (secao 3 "Loop de renderizacao"): renderer.setAnimationLoop,
// entrada/interacao/feedback local antes da renderizacao, rede desacoplada
// da taxa grafica. Este arquivo NUNCA fala com hardware de elevador real.
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { buildScene } from './scene/buildScene.js';
import { InteractionSystem } from './interaction/InteractionSystem.js';
import { InputSystem } from './input/InputSystem.js';
import { ReplicationClient } from './net/ReplicationClient.js';
import { LiftView } from './lift/LiftView.js';
import { ScenarioEngine, MANDATORY_CHECKLIST_ITEMS } from '@lifit/curriculum';
import { TelemetryClient } from './telemetry/TelemetryClient.js';

const hud = document.getElementById('hud');
const fallbackNote = document.getElementById('fallback-note');
const enterVrPlaceholder = document.getElementById('enter-vr');

const params = new URLSearchParams(location.search);
const sessionId = params.get('session') ?? 'SLU-DEV-0001';
const participantId = params.get('participant') ?? 'P-DEV';
const profileId = params.get('profile') ?? 'rt14-slu-240';
const moduleId = params.get('module') ?? 'M2';
const wsUrl = params.get('server') ?? `ws://${location.hostname}:8787`;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 50);
camera.position.set(0, 1.6, 2.5);

const { scene, interactables, cabinGroup, door, gate } = buildScene();

const interactionSystem = new InteractionSystem({ interactables });
const inputSystem = new InputSystem({ renderer, scene, interactionSystem, cabinGroup });
const liftView = new LiftView({ cabinGroup, door, gate });
const scenario = new ScenarioEngine(moduleId, { guided: params.get('mode') !== 'eval' });
scenario.start();

const net = new ReplicationClient({
  url: wsUrl,
  sessionId,
  role: 'STUDENT',
  participantId,
  profileId,
  manifest: { contentVersion: profileId, checklistApproved: true, liftModelApproved: true },
});
const telemetry = new TelemetryClient({ replicationClient: net });

interactionSystem.onRequest = (action, entityId) => {
  // A prancheta representa a inspecao pre-uso guiada como um todo (doc,
  // modulo 1, blocos 20-57); uma UI item-a-item fica fora deste MVP, mas o
  // servidor continua sendo quem decide se READY e liberado.
  if (entityId === 'checklist.complete' && action === 'PRESS') {
    for (const itemId of MANDATORY_CHECKLIST_ITEMS) net.sendChecklistUpdate(itemId);
  }
  net.sendAction(entityId, action);
  inputSystem.pulseAll(70, 0.55);
};

net.on('snapshot', (msg) => liftView.applyAuthoritativeState(msg.state.lift));
net.on('patch', (msg) => liftView.applyAuthoritativeState(msg.patch.lift));
net.on('error', (msg) => {
  hud.textContent = `Erro: ${msg.message}`;
});
net.connect();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Fallback de depuracao em desktop (sem headset): clique do mouse equivale
// ao selectstart de um controller. Nunca ativo durante uma sessao XR real.
renderer.domElement.addEventListener('click', (event) => {
  if (renderer.xr.isPresenting) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  interactionSystem.handleMouseClick(ndc, camera);
});

if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
    if (supported) {
      enterVrPlaceholder.remove();
      document.body.appendChild(VRButton.createButton(renderer));
    } else {
      enterVrPlaceholder.textContent = 'WebXR imersivo nao suportado neste navegador';
      fallbackNote.textContent = 'Modo desktop de depuracao (sem headset): clique nos botoes da cena. Use Meta Quest Browser ou Wolvic no Quest 3/3S para a sessao real.';
    }
  });
} else {
  enterVrPlaceholder.textContent = 'WebXR indisponivel';
  fallbackNote.textContent = 'Este navegador nao expoe navigator.xr. Modo desktop de depuracao: clique nos botoes da cena.';
}

// Hook de teste/QA (nunca usado pela UI real): permite disparar ACTION_REQUEST
// sem depender de pixel-picking do mouse ou de um headset fisico.
if (params.get('debug') === '1') {
  window.__lifitDebug = {
    net,
    triggerAction: (entityId, action = 'PRESS') => interactionSystem.onRequest(action, entityId),
  };
}

const clock = new THREE.Clock();
renderer.setAnimationLoop((time) => {
  const dt = clock.getDelta();
  inputSystem.update(dt, camera);
  liftView.update(dt);
  telemetry.sampleIfDue(time, { camPos: camera.position.toArray(), liftState: liftView.lastState });
  net.sendPoseIfDue(time, { head: camera.matrixWorld.toArray() });
  hud.textContent = `${scenario.hudText()} | estado do lift: ${liftView.lastState}`;
  renderer.render(scene, camera);
});
