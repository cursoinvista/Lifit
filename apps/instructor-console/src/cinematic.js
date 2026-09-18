// Pagina de visualizacao (nao operacional): mostra o avatar do aluno
// dentro da cabine subindo pela torre, com a subida dirigida pelo mesmo
// servidor autoritativo (session-server) do resto do sistema - nao e uma
// animacao pre-roteirizada desconectada da maquina de estados real.
import { buildCinematicScene } from './cinematicScene.js';
import { MANDATORY_CHECKLIST_ITEMS } from '@lifit/curriculum';

const params = new URLSearchParams(location.search);
const sessionId = params.get('session') ?? 'SLU-CINE-0001';
const profileId = params.get('profile') ?? 'rt14-slu-240';
const wsUrl = params.get('server') ?? `ws://${location.hostname}:8787`;

const el = (id) => document.getElementById(id);
const { scene, camera, renderer, cabinGroup, rig, GROUND_Y, TOP_Y } = buildCinematicScene(el('viewport'));

let targetY = GROUND_Y;
let liftState = 'INSPECTION';

function applyState(liftSnapshot) {
  if (!liftSnapshot) return;
  liftState = liftSnapshot.state;
  if (liftState === 'MOVING_UP') targetY = TOP_Y;
  else if (liftState === 'MOVING_DOWN') targetY = GROUND_Y;
  el('caption').textContent = captionFor(liftState);
}

function captionFor(state) {
  const map = {
    INSPECTION: 'Inspecao pre-uso e checklist digital',
    READY: 'Checklist completo - pronto para operar',
    MOVING_UP: 'Subida guiada pelo estado autoritativo do servidor',
    STOPPED: 'Parada segura',
    PARKED: 'Estacionado - fim do trajeto',
  };
  return map[state] ?? state;
}

let seq = 1;
const ws = new WebSocket(wsUrl);
function send(obj) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }
function action(entityId) {
  seq += 1;
  send({ v: 1, type: 'ACTION_REQUEST', sessionId, seq, clientTime: Date.now(), payload: { entityId, action: 'PRESS' } });
}

ws.addEventListener('open', () => {
  send({ type: 'HELLO', sessionId, role: 'STUDENT', participantId: 'P-CINE', profileId, manifest: { contentVersion: profileId, checklistApproved: true, liftModelApproved: true } });
});

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'STATE_SNAPSHOT') applyState(msg.state.lift);
  else if (msg.type === 'STATE_PATCH') applyState(msg.patch.lift);
});

// Sequencia auto-conduzida (ainda validada acao a acao pelo servidor real):
// checklist -> portas/gate -> subida -> parada -> estacionamento.
setTimeout(() => { for (const item of MANDATORY_CHECKLIST_ITEMS) send({ type: 'CHECKLIST_UPDATE', sessionId, itemId: item, status: 'done' }); action('checklist.complete'); }, 1200);
setTimeout(() => action('door.main'), 2600);
setTimeout(() => action('gate.main'), 3400);
setTimeout(() => action('panel.up'), 4400);
setTimeout(() => action('panel.stop'), 10700);
setTimeout(() => action('panel.park'), 12500);

let angle = 0.4;
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  const dy = targetY - cabinGroup.position.y;
  cabinGroup.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 0.6 * dt);

  angle += dt * 0.1;
  const focusY = cabinGroup.position.y + 0.95;
  const radius = 3.0;
  camera.position.set(Math.sin(angle) * radius, focusY + 0.55, Math.cos(angle) * radius);
  camera.lookAt(0, focusY, 0);
  rig.position.copy(camera.position);

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
