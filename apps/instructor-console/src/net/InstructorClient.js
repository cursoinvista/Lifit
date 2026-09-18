// Cliente WS do console do instrutor. Compartilha o mesmo protocolo do
// Quest (packages/protocol), mas so envia mensagens reservadas ao papel
// INSTRUCTOR (falhas, avaliacao, checklist) alem de observar telemetria e
// estado. O servidor, nao este cliente, decide o que e permitido.
export class InstructorClient {
  constructor({ url, sessionId, participantId, profileId, manifest }) {
    this.url = url;
    this.sessionId = sessionId;
    this.participantId = participantId;
    this.profileId = profileId;
    this.manifest = manifest;
    this.ws = null;
    this.handlers = { snapshot: [], patch: [], error: [], telemetry: [], avatarUpdate: [], pose: [] };
  }

  on(event, cb) {
    this.handlers[event]?.push(cb);
  }

  _emit(event, payload) {
    for (const cb of this.handlers[event] ?? []) cb(payload);
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener('open', () => {
      this._send({ type: 'HELLO', sessionId: this.sessionId, role: 'INSTRUCTOR', participantId: this.participantId, profileId: this.profileId, manifest: this.manifest });
    });
    this.ws.addEventListener('message', (event) => this._onMessage(event));
    this.ws.addEventListener('close', () => this._scheduleReconnect());
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
    }, 1500);
  }

  _onMessage(event) {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type === 'STATE_SNAPSHOT') this._emit('snapshot', msg);
    else if (msg.type === 'STATE_PATCH') this._emit('patch', msg);
    else if (msg.type === 'ERROR') this._emit('error', msg);
    else if (msg.type === 'TELEMETRY_BATCH') this._emit('telemetry', msg);
    else if (msg.type === 'AVATAR_UPDATE') this._emit('avatarUpdate', msg);
    else if (msg.type === 'POSE_UPDATE') this._emit('pose', msg);
  }

  _send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  armFault(faultId, justification) {
    this._send({ type: 'FAULT_REQUEST', sessionId: this.sessionId, faultId, justification });
  }

  clearFault() {
    this._send({ type: 'FAULT_CLEAR', sessionId: this.sessionId });
  }

  scoreAssessment({ participantId, criterion, score, comment, eventRefs = [], objectiveIds = [] }) {
    this._send({ type: 'ASSESSMENT_SCORE', sessionId: this.sessionId, participantId, assessorId: this.participantId, criterion, score, comment, eventRefs, objectiveIds });
  }

  finalizeAssessment({ participantId, confirmedResult }) {
    this._send({ type: 'ASSESSMENT_FINALIZE', sessionId: this.sessionId, participantId, assessorId: this.participantId, confirmedResult });
  }

  restartSession() {
    this._send({ type: 'ACTION_REQUEST', sessionId: this.sessionId, seq: Date.now(), clientTime: Date.now(), payload: { entityId: 'console.restart_session', action: 'PRESS' } });
  }
}
