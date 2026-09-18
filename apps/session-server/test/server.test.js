import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';

const { httpServer, rooms, eventStore } = await import('../src/server.js');

let baseUrl;

before(async () => {
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address();
  baseUrl = `ws://localhost:${port}`;
});

after(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.join(__dirname, '..', 'data', 'events');
  for (const f of fs.readdirSync(dataDir)) {
    if (f.startsWith('TEST-')) fs.unlinkSync(path.join(dataDir, f));
  }
});

function connect() {
  return new WebSocket(baseUrl);
}

function waitMessage(ws) {
  return new Promise((resolve) => ws.once('message', (raw) => resolve(JSON.parse(raw.toString()))));
}

// Uma ACTION_REQUEST aceita gera tanto um STATE_PATCH (broadcast) quanto um
// ACTION_ACK (resposta direta); a ordem entre os dois nao e garantida.
function waitMessageOfType(ws, type) {
  return new Promise((resolve) => {
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === type) {
        ws.off('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

test('HELLO ingressa na sala e recebe um STATE_SNAPSHOT', async () => {
  const sessionId = 'TEST-hello';
  const ws = connect();
  await new Promise((resolve) => ws.once('open', resolve));
  send(ws, { type: 'HELLO', sessionId, role: 'STUDENT', participantId: 'P-1', profileId: 'rt14-slu-240' });
  const snapshot = await waitMessage(ws);
  assert.equal(snapshot.type, 'STATE_SNAPSHOT');
  assert.equal(snapshot.state.lift.state, 'INSPECTION');
  ws.close();
});

test('aluno nao pode mover o lift antes do checklist e das portas fechadas', async () => {
  const sessionId = 'TEST-blocked-move';
  const ws = connect();
  await new Promise((resolve) => ws.once('open', resolve));
  send(ws, { type: 'HELLO', sessionId, role: 'STUDENT', participantId: 'P-1', profileId: 'rt14-slu-240' });
  await waitMessage(ws);

  send(ws, { type: 'ACTION_REQUEST', sessionId, seq: 1, clientTime: Date.now(), payload: { entityId: 'panel.up', action: 'PRESS' } });
  const rejected = await waitMessage(ws);
  assert.equal(rejected.type, 'ACTION_REJECTED');
  ws.close();
});

test('fluxo completo: checklist, portas, subida e parada', async () => {
  const sessionId = 'TEST-full-flow';
  const ws = connect();
  await new Promise((resolve) => ws.once('open', resolve));
  send(ws, { type: 'HELLO', sessionId, role: 'STUDENT', participantId: 'P-1', profileId: 'rt14-slu-240' });
  await waitMessage(ws);

  const room = rooms.get(sessionId);
  for (const item of room.checklist.items) room.completeChecklistItem(item);
  assert.equal(room.lift.context.mandatoryChecklistDone, true);

  send(ws, { type: 'ACTION_REQUEST', sessionId, seq: 1, clientTime: Date.now(), payload: { entityId: 'checklist.complete', action: 'PRESS' } });
  await waitMessageOfType(ws, 'ACTION_ACK');
  assert.equal(room.lift.state, 'READY');

  send(ws, { type: 'ACTION_REQUEST', sessionId, seq: 2, clientTime: Date.now(), payload: { entityId: 'door.main', action: 'PRESS' } });
  await waitMessageOfType(ws, 'ACTION_ACK');
  send(ws, { type: 'ACTION_REQUEST', sessionId, seq: 3, clientTime: Date.now(), payload: { entityId: 'gate.main', action: 'PRESS' } });
  await waitMessageOfType(ws, 'ACTION_ACK');

  send(ws, { type: 'ACTION_REQUEST', sessionId, seq: 4, clientTime: Date.now(), payload: { entityId: 'panel.up', action: 'PRESS' } });
  await waitMessageOfType(ws, 'ACTION_ACK');
  assert.equal(room.lift.state, 'MOVING_UP');

  send(ws, { type: 'ACTION_REQUEST', sessionId, seq: 5, clientTime: Date.now(), payload: { entityId: 'panel.stop', action: 'PRESS' } });
  await waitMessageOfType(ws, 'ACTION_ACK');
  assert.equal(room.lift.state, 'STOPPED');
  ws.close();
});

test('somente instrutor pode armar falha; falha aplica-se apenas no estado correto', async () => {
  const sessionId = 'TEST-fault';
  const student = connect();
  await new Promise((resolve) => student.once('open', resolve));
  send(student, { type: 'HELLO', sessionId, role: 'STUDENT', participantId: 'P-1', profileId: 'rt14-slu-240' });
  await waitMessage(student);

  const instructor = connect();
  await new Promise((resolve) => instructor.once('open', resolve));
  send(instructor, { type: 'HELLO', sessionId, role: 'INSTRUCTOR', participantId: 'I-1', profileId: 'rt14-slu-240' });
  await waitMessage(instructor);

  send(student, { type: 'FAULT_REQUEST', sessionId, faultId: 'power_loss' });
  const forbidden = await waitMessage(student);
  assert.equal(forbidden.type, 'ERROR');

  const room = rooms.get(sessionId);
  assert.equal(room.lift.state, 'INSPECTION');
  send(instructor, { type: 'FAULT_REQUEST', sessionId, faultId: 'power_loss' });
  const err = await waitMessage(instructor);
  assert.equal(err.type, 'ERROR'); // power_loss nao se aplica a INSPECTION
  assert.equal(room.activeFault, null);

  student.close();
  instructor.close();
});

test('FAULT_CLEAR remove a falha ativa e destrava o guard correspondente', async () => {
  const sessionId = 'TEST-fault-clear';
  const student = connect();
  await new Promise((resolve) => student.once('open', resolve));
  send(student, { type: 'HELLO', sessionId, role: 'STUDENT', participantId: 'P-1', profileId: 'rt14-slu-240' });
  await waitMessage(student);

  const instructor = connect();
  await new Promise((resolve) => instructor.once('open', resolve));
  send(instructor, { type: 'HELLO', sessionId, role: 'INSTRUCTOR', participantId: 'I-1', profileId: 'rt14-slu-240' });
  await waitMessage(instructor);

  const room = rooms.get(sessionId);
  for (const item of room.checklist.items) room.completeChecklistItem(item);
  send(student, { type: 'ACTION_REQUEST', sessionId, seq: 1, clientTime: Date.now(), payload: { entityId: 'checklist.complete', action: 'PRESS' } });
  await waitMessageOfType(student, 'ACTION_ACK');
  room.lift.context.doorsClosed = true;
  room.lift.context.gatesClosed = true;

  send(instructor, { type: 'FAULT_REQUEST', sessionId, faultId: 'gate_open' });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(room.activeFault.id, 'gate_open');

  send(student, { type: 'ACTION_REQUEST', sessionId, seq: 2, clientTime: Date.now(), payload: { entityId: 'panel.up', action: 'PRESS' } });
  const rejected = await waitMessageOfType(student, 'ACTION_REJECTED');
  assert.match(rejected.reason, /bypass proibido/);

  send(instructor, { type: 'FAULT_CLEAR', sessionId });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(room.activeFault, null);

  send(student, { type: 'ACTION_REQUEST', sessionId, seq: 3, clientTime: Date.now(), payload: { entityId: 'panel.up', action: 'PRESS' } });
  await waitMessageOfType(student, 'ACTION_ACK');
  assert.equal(room.lift.state, 'MOVING_UP');

  student.close();
  instructor.close();
});

test('avaliacao Annex 1 exige instrutor e persiste no event store', async () => {
  const sessionId = 'TEST-assessment';
  const instructor = connect();
  await new Promise((resolve) => instructor.once('open', resolve));
  send(instructor, { type: 'HELLO', sessionId, role: 'INSTRUCTOR', participantId: 'I-1', profileId: 'rt14-slu-240' });
  await waitMessage(instructor);

  send(instructor, {
    type: 'ASSESSMENT_SCORE', sessionId, participantId: 'P-1', assessorId: 'I-1',
    criterion: 'personal_group_safety', score: 1, comment: 'ok',
  });
  await new Promise((r) => setTimeout(r, 20));

  const events = eventStore.readAll(sessionId);
  assert.ok(events.some((e) => e.type === 'ASSESSMENT_SCORED'));
  instructor.close();
});
