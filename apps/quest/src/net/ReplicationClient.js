// Cliente de replicacao (doc, secao "Sincronizacao multiplayer"). O Quest
// nunca aplica uma transicao de estado por conta propria: envia intencao
// (ACTION_REQUEST), recebe confirmacao (ACTION_ACK/REJECTED) e estado
// autoritativo (STATE_PATCH/STATE_SNAPSHOT). Pose e telemetria sao
// enviadas com frequencia limitada, nunca a taxa grafica.
export class ReplicationClient {
  constructor({ url, sessionId, role, participantId, profileId, manifest }) {
    this.url = url;
    this.sessionId = sessionId;
    this.role = role;
    this.participantId = participantId;
    this.profileId = profileId;
    this.manifest = manifest;
    this.ws = null;
    this.seq = 0;
    this.stateVersion = 0;
    this.connected = false;
    this.lastPoseSentAt = 0;
    this.poseIntervalMs = 1000 / 25; // 20-30 Hz (doc, tabela de sincronizacao)

    this.handlers = {
      snapshot: [],
      patch: [],
      error: [],
      faultEvent: [],
      avatarUpdate: [],
    };
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
      this.connected = true;
      this._send({
        type: 'HELLO',
        sessionId: this.sessionId,
        role: this.role,
        participantId: this.participantId,
        profileId: this.profileId,
        manifest: this.manifest,
      });
    });
    this.ws.addEventListener('message', (event) => this._onMessage(event));
    this.ws.addEventListener('close', () => {
      this.connected = false;
      this._scheduleReconnect();
    });
    this.ws.addEventListener('error', () => {
      // 'close' tambem dispara apos erro de socket; reconexao tratada la.
    });
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
    switch (msg.type) {
      case 'STATE_SNAPSHOT':
        this.stateVersion = msg.stateVersion;
        this._emit('snapshot', msg);
        break;
      case 'STATE_PATCH':
        this.stateVersion = msg.stateVersion;
        this._emit('patch', msg);
        break;
      case 'ERROR':
        this._emit('error', msg);
        break;
      case 'FAULT_EVENT':
        this._emit('faultEvent', msg);
        break;
      case 'AVATAR_UPDATE':
        this._emit('avatarUpdate', msg);
        break;
      default:
        break;
    }
  }

  _send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  sendAction(entityId, action) {
    this.seq += 1;
    this._send({
      v: 1,
      type: 'ACTION_REQUEST',
      sessionId: this.sessionId,
      seq: this.seq,
      clientTime: Date.now(),
      payload: { entityId, action },
    });
  }

  sendChecklistUpdate(itemId, status = 'done') {
    this._send({ type: 'CHECKLIST_UPDATE', sessionId: this.sessionId, itemId, status });
  }

  sendTelemetryBatch(samples) {
    this._send({ type: 'TELEMETRY_BATCH', sessionId: this.sessionId, samples });
  }

  sendPoseIfDue(now, pose) {
    if (now - this.lastPoseSentAt < this.poseIntervalMs) return;
    this.lastPoseSentAt = now;
    this.seq += 1;
    this._send({ v: 1, type: 'POSE_UPDATE', sessionId: this.sessionId, seq: this.seq, clientTime: Date.now(), pose });
  }
}
