// Pagina de visualizacao (nao operacional): mostra o avatar do aluno
// dentro da cabine operando o painel e subindo/descendo pela torre, com a
// subida dirigida pelo mesmo servidor autoritativo (session-server) do
// resto do sistema - nao e uma animacao pre-roteirizada desconectada da
// maquina de estados real. As acoes do braco/porta sao gestos visuais
// tocados no mesmo instante em que a ACTION_REQUEST correspondente e
// enviada; o estado do lift em si so muda quando o servidor confirma.
import * as THREE from 'three';
import { buildCinematicScene } from './cinematicScene.js';
import { MANDATORY_CHECKLIST_ITEMS } from '@lifit/curriculum';

const params = new URLSearchParams(location.search);
const sessionId = params.get('session') ?? 'SLU-CINE-0001';
const profileId = params.get('profile') ?? 'rt14-slu-240';
const wsUrl = params.get('server') ?? `ws://${location.hostname}:8787`;

const el = (id) => document.getElementById(id);
const {
  scene, camera, renderer, cabinGroup, shoulderR, buttons, doorLeafLeft, doorLeafRight,
  rig, GROUND_Y, TOP_Y, ARM_REST_ROTATION, ARM_PRESS_ROTATION,
} = buildCinematicScene(el('viewport'));

let targetY = GROUND_Y;
let liftState = 'INSPECTION';
let doorsClosed = false;

function applyState(liftSnapshot) {
  if (!liftSnapshot) return;
  liftState = liftSnapshot.state;
  doorsClosed = !!liftSnapshot.context.doorsClosed;
  if (liftState === 'MOVING_UP') targetY = TOP_Y;
  else if (liftState === 'MOVING_DOWN') targetY = GROUND_Y;
  el('caption').textContent = captionFor(liftState);
  refreshButtonEmissive();
}

// Reflete o estado atual do lift nos botoes (aceso enquanto o movimento
// correspondente estiver em curso). Chamado tanto em cada STATE_PATCH
// quanto ao final do flash de toque, para o brilho "em movimento" nunca
// ser apagado por engano pelo timeout do gesto de pressionar.
function refreshButtonEmissive() {
  for (const [id, btn] of Object.entries(buttons)) {
    const active = (id === 'up' && liftState === 'MOVING_UP') || (id === 'down' && liftState === 'MOVING_DOWN');
    btn.material.emissive.setHex(active ? btn.material.color.getHex() : 0x000000);
    btn.material.emissiveIntensity = active ? 1.2 : 0;
  }
}

function captionFor(state) {
  const map = {
    INSPECTION: 'Inspecao pre-uso e checklist digital',
    READY: 'Checklist completo - pronto para operar',
    MOVING_UP: 'Subida guiada pelo estado autoritativo do servidor',
    MOVING_DOWN: 'Descida controlada',
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

// --- Gesto visual: braco alcanca o botao e volta. So estetico; a ACTION_
// REQUEST real (enviada por action()) e quem decide se o servidor aceita.
let gesture = null; // { startedAt, duration }
function pressButton(buttonId) {
  gesture = { startedAt: performance.now(), duration: 900 };
  const btn = buttons[buttonId];
  if (btn) {
    btn.material.emissive.setHex(0xffffff);
    btn.material.emissiveIntensity = 1.5;
    setTimeout(refreshButtonEmissive, 900);
  }
}

function pressAndSend(buttonId, entityId) {
  pressButton(buttonId);
  setTimeout(() => action(entityId), 350); // toque chega ao pico antes de enviar a intencao
}

// Sequencia auto-conduzida (ainda validada acao a acao pelo servidor real,
// incluindo a regra da maquina de estados de que STOPPED so retoma via
// RESUME->READY antes de aceitar um novo sentido de movimento):
// checklist -> fechar porta -> subir -> parar -> retomar -> descer -> parar -> estacionar.
setTimeout(() => { for (const item of MANDATORY_CHECKLIST_ITEMS) send({ type: 'CHECKLIST_UPDATE', sessionId, itemId: item, status: 'done' }); action('checklist.complete'); }, 1200);
setTimeout(() => action('door.main'), 2800);
setTimeout(() => action('gate.main'), 3600);
setTimeout(() => pressAndSend('up', 'panel.up'), 4800);
setTimeout(() => pressAndSend('stop', 'panel.stop'), 11400);
setTimeout(() => pressAndSend('resume', 'panel.resume'), 12800);
setTimeout(() => pressAndSend('down', 'panel.down'), 14200);
setTimeout(() => pressAndSend('stop', 'panel.stop'), 20800);
setTimeout(() => pressAndSend('park', 'panel.park'), 22200);

let angle = 0.5;
let doorOpen = 1; // comeca aberta (aluno acaba de entrar)
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  const dy = targetY - cabinGroup.position.y;
  cabinGroup.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 0.6 * dt);

  const doorTarget = doorsClosed ? 0 : 1;
  doorOpen += (doorTarget - doorOpen) * Math.min(1, dt * 2.5);
  doorLeafLeft.position.x = -0.265 - doorOpen * 0.45;
  doorLeafRight.position.x = 0.265 + doorOpen * 0.45;

  // Gesto do braco: sobe rapido, segura, volta - curva suave (ease in/out).
  let armT = 0;
  if (gesture) {
    const elapsed = now - gesture.startedAt;
    if (elapsed >= gesture.duration) {
      gesture = null;
    } else {
      const p = elapsed / gesture.duration;
      armT = p < 0.4 ? smoothstep(p / 0.4) : p < 0.65 ? 1 : smoothstep(1 - (p - 0.65) / 0.35);
    }
  }
  shoulderR.rotation.x = THREE.MathUtils.lerp(ARM_REST_ROTATION, ARM_PRESS_ROTATION, armT);

  // Camera: orbita oscilando no lado onde fica o painel (o avatar opera de
  // frente para ele, de costas para a porta). Durante o gesto de apertar o
  // botao, a camera converge para o angulo de frente ao painel e aproxima,
  // garantindo que o toque seja sempre visivel independente de onde a
  // orbita estava.
  const panelFacingAngle = Math.PI + 0.75;
  const oscillatingAngle = panelFacingAngle + Math.sin(now * 0.00016) * 0.55;
  const focusPush = gesture ? smoothstep(Math.min(1, (now - gesture.startedAt) / 300)) : 0;
  angle = THREE.MathUtils.lerp(oscillatingAngle, panelFacingAngle, focusPush);
  const radius = THREE.MathUtils.lerp(3.0, 2.1, focusPush);
  const focusY = cabinGroup.position.y + THREE.MathUtils.lerp(0.95, 1.05, focusPush);
  camera.position.set(Math.sin(angle) * radius, focusY + THREE.MathUtils.lerp(0.55, 0.35, focusPush), Math.cos(angle) * radius);
  camera.lookAt(0, focusY, 0);
  rig.position.copy(camera.position);

  renderer.render(scene, camera);
  window.__cineState = { liftState, gesturing: !!gesture, cabinY: cabinGroup.position.y };
  requestAnimationFrame(loop);
}
function smoothstep(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}
requestAnimationFrame(loop);
