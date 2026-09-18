// Envelope de mensagens do canal WebSocket seguro entre Quest, console e
// servidor autoritativo (ver doc "Sincronizacao multiplayer" e exemplo JSON).
// O servidor e a UNICA autoridade sobre transicoes do elevador: estas
// fabricas nunca aplicam estado, apenas descrevem a forma da mensagem.

export const PROTOCOL_VERSION = 1;

export const MessageType = Object.freeze({
  HELLO: 'HELLO',
  ACTION_REQUEST: 'ACTION_REQUEST',
  ACTION_ACK: 'ACTION_ACK',
  ACTION_REJECTED: 'ACTION_REJECTED',
  STATE_PATCH: 'STATE_PATCH',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  FAULT_REQUEST: 'FAULT_REQUEST',
  FAULT_CLEAR: 'FAULT_CLEAR',
  FAULT_EVENT: 'FAULT_EVENT',
  POSE_UPDATE: 'POSE_UPDATE',
  AVATAR_UPDATE: 'AVATAR_UPDATE',
  TELEMETRY_BATCH: 'TELEMETRY_BATCH',
  ASSESSMENT_SCORE: 'ASSESSMENT_SCORE',
  ASSESSMENT_FINALIZE: 'ASSESSMENT_FINALIZE',
  CHECKLIST_UPDATE: 'CHECKLIST_UPDATE',
  ERROR: 'ERROR',
});

const REQUIRED_FIELDS = Object.freeze({
  [MessageType.HELLO]: ['sessionId', 'role', 'participantId'],
  [MessageType.ACTION_REQUEST]: ['sessionId', 'seq', 'clientTime', 'payload'],
  [MessageType.ACTION_ACK]: ['sessionId', 'seq', 'serverTime'],
  [MessageType.ACTION_REJECTED]: ['sessionId', 'seq', 'serverTime', 'reason'],
  [MessageType.STATE_PATCH]: ['serverTime', 'stateVersion', 'patch'],
  [MessageType.STATE_SNAPSHOT]: ['serverTime', 'stateVersion', 'state'],
  [MessageType.FAULT_REQUEST]: ['sessionId', 'faultId'],
  [MessageType.FAULT_CLEAR]: ['sessionId'],
  [MessageType.FAULT_EVENT]: ['serverTime', 'faultId', 'signal'],
  [MessageType.POSE_UPDATE]: ['sessionId', 'seq', 'clientTime', 'pose'],
  [MessageType.AVATAR_UPDATE]: ['serverTime', 'pose'],
  [MessageType.TELEMETRY_BATCH]: ['sessionId', 'samples'],
  [MessageType.ASSESSMENT_SCORE]: ['sessionId', 'criterion', 'score', 'assessorId'],
  [MessageType.ASSESSMENT_FINALIZE]: ['sessionId', 'assessorId'],
  [MessageType.CHECKLIST_UPDATE]: ['sessionId', 'itemId', 'status'],
  [MessageType.ERROR]: ['code', 'message'],
});

export function validateMessage(msg) {
  if (!msg || typeof msg !== 'object') {
    return { ok: false, error: 'mensagem nao e um objeto' };
  }
  if (msg.v !== undefined && msg.v !== PROTOCOL_VERSION) {
    return { ok: false, error: `versao de protocolo incompativel: ${msg.v}` };
  }
  const required = REQUIRED_FIELDS[msg.type];
  if (!required) {
    return { ok: false, error: `tipo de mensagem desconhecido: ${msg.type}` };
  }
  for (const field of required) {
    if (msg[field] === undefined) {
      return { ok: false, error: `campo obrigatorio ausente: ${field}` };
    }
  }
  return { ok: true };
}

export function makeActionRequest({ sessionId, seq, payload, clientTime = Date.now() }) {
  return { v: PROTOCOL_VERSION, type: MessageType.ACTION_REQUEST, sessionId, seq, clientTime, payload };
}

export function makeStatePatch({ stateVersion, patch, serverTime = Date.now() }) {
  return { v: PROTOCOL_VERSION, type: MessageType.STATE_PATCH, serverTime, stateVersion, patch };
}

export function makeStateSnapshot({ stateVersion, state, serverTime = Date.now() }) {
  return { v: PROTOCOL_VERSION, type: MessageType.STATE_SNAPSHOT, serverTime, stateVersion, state };
}

export function makeFaultRequest({ sessionId, faultId, justification }) {
  return { v: PROTOCOL_VERSION, type: MessageType.FAULT_REQUEST, sessionId, faultId, justification };
}

export function makeActionRejected({ sessionId, seq, reason, serverTime = Date.now() }) {
  return { v: PROTOCOL_VERSION, type: MessageType.ACTION_REJECTED, sessionId, seq, serverTime, reason };
}

export function makeActionAck({ sessionId, seq, serverTime = Date.now() }) {
  return { v: PROTOCOL_VERSION, type: MessageType.ACTION_ACK, sessionId, seq, serverTime };
}
