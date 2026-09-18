// Servidor autoritativo Node.js + WebSocket (doc, secao 3 "Servidor e
// persistencia"). TLS deve ser terminado por um proxy reverso em producao;
// este processo fala WS puro (ws:// local) por simplicidade de
// desenvolvimento e teste.
//
// Este processo NUNCA deve ganhar um adaptador de I/O para hardware real de
// elevador (ver doc, secao 2, "Nao integrar"). Se algum dia isso for
// cogitado, e um projeto e uma decisao de seguranca inteiramente diferentes,
// fora do escopo deste simulador.
import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import { MessageType, validateMessage, Role, isValidRole, makeActionAck, makeActionRejected, makeStatePatch, EventType } from '@lifit/protocol';
import { assertProfileMatches } from '@lifit/curriculum';
import { EventStore } from './eventStore.js';
import { RoomManager } from './roomManager.js';

const PORT = Number(process.env.PORT ?? 8787);

const eventStore = new EventStore();
const rooms = new RoomManager({ eventStore });

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('lifit-session-server ok');
});

const wss = new WebSocketServer({ server: httpServer });

function broadcastFactory(room) {
  return (msg) => {
    const payload = JSON.stringify(msg);
    for (const { ws } of room.connections.values()) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  };
}

wss.on('connection', (ws) => {
  const connId = crypto.randomUUID();
  let room = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'BAD_JSON', message: 'mensagem nao e JSON valido' }));
      return;
    }

    const validation = validateMessage(msg);
    if (!validation.ok) {
      ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'INVALID_MESSAGE', message: validation.error }));
      return;
    }

    if (msg.type === MessageType.HELLO) {
      if (!isValidRole(msg.role)) {
        ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'INVALID_ROLE', message: `papel invalido: ${msg.role}` }));
        return;
      }
      const manifest = msg.manifest ?? { contentVersion: msg.profileId, checklistApproved: true, liftModelApproved: true };
      const check = assertProfileMatches(msg.profileId, manifest);
      if (!check.ok) {
        ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'PROFILE_MISMATCH', message: check.mismatches.join('; ') }));
        ws.close();
        return;
      }
      room = rooms.getOrCreate(msg.sessionId, msg.profileId);
      room.join(connId, { ws, role: msg.role, participantId: msg.participantId });
      ws.send(JSON.stringify(room.snapshotMessage()));
      return;
    }

    if (!room) {
      ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'NOT_JOINED', message: 'envie HELLO antes de qualquer outra mensagem' }));
      return;
    }

    switch (msg.type) {
      case MessageType.ACTION_REQUEST: {
        const result = room.applyClientAction(connId, msg.payload);
        if (result.ok) {
          ws.send(JSON.stringify(makeActionAck({ sessionId: room.sessionId, seq: msg.seq })));
          broadcastFactory(room)(makeStatePatch({ stateVersion: room.stateVersion, patch: room.patchPayload() }));
        } else {
          ws.send(JSON.stringify(makeActionRejected({ sessionId: room.sessionId, seq: msg.seq, reason: result.reason })));
        }
        break;
      }
      case MessageType.FAULT_REQUEST: {
        const result = room.applyFaultRequest(connId, msg, broadcastFactory(room));
        if (!result.ok) ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'FAULT_REJECTED', message: result.reason }));
        break;
      }
      case MessageType.FAULT_CLEAR: {
        const result = room.clearActiveFault(connId, broadcastFactory(room));
        if (!result.ok) ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'FAULT_CLEAR_REJECTED', message: result.reason }));
        break;
      }
      case MessageType.CHECKLIST_UPDATE: {
        room.completeChecklistItem(msg.itemId);
        broadcastFactory(room)(room.snapshotMessage());
        break;
      }
      case MessageType.ASSESSMENT_SCORE: {
        const conn = room.connections.get(connId);
        if (conn?.role !== Role.INSTRUCTOR) {
          ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'FORBIDDEN', message: 'somente o instrutor pontua a avaliacao' }));
          break;
        }
        try {
          const rubric = room.getOrCreateAssessment(msg.participantId, msg.assessorId);
          rubric.score(msg.criterion, { score: msg.score, comment: msg.comment, eventRefs: msg.eventRefs, objectiveIds: msg.objectiveIds });
          room.logEvent(EventType.ASSESSMENT_SCORED, msg.assessorId, { participantId: msg.participantId, criterion: msg.criterion, score: msg.score });
        } catch (err) {
          ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'ASSESSMENT_ERROR', message: err.message }));
        }
        break;
      }
      case MessageType.ASSESSMENT_FINALIZE: {
        const conn = room.connections.get(connId);
        if (conn?.role !== Role.INSTRUCTOR) {
          ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'FORBIDDEN', message: 'somente o instrutor finaliza a avaliacao' }));
          break;
        }
        try {
          const rubric = room.getOrCreateAssessment(msg.participantId, msg.assessorId);
          const record = rubric.finalize({ confirmedBy: msg.assessorId, confirmedResult: msg.confirmedResult });
          room.logEvent(EventType.ASSESSMENT_FINALIZED, msg.assessorId, record);
          ws.send(JSON.stringify({ type: 'ASSESSMENT_RECORD', record }));
        } catch (err) {
          ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'ASSESSMENT_ERROR', message: err.message }));
        }
        break;
      }
      case MessageType.POSE_UPDATE:
      case MessageType.TELEMETRY_BATCH: {
        // Retransmissao de baixa garantia: pose e telemetria nao passam pela
        // maquina de estados, apenas sao relayadas para o console.
        broadcastFactory(room)({ ...msg, relayedFrom: connId });
        break;
      }
      default:
        ws.send(JSON.stringify({ type: MessageType.ERROR, code: 'UNHANDLED_TYPE', message: `tipo nao tratado pelo servidor: ${msg.type}` }));
    }
  });

  ws.on('close', () => {
    if (room) room.leave(connId, { onSafetyStop: broadcastFactory(room) });
  });
});

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`lifit-session-server escutando em ws://localhost:${PORT}`);
  });
}

export { httpServer, wss, rooms, eventStore };
