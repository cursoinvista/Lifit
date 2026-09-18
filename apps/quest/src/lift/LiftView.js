// Aplica o estado autoritativo (vindo do servidor) a representacao visual.
// O Quest NUNCA decide a posicao do lift: apenas interpola visualmente rumo
// ao alvo implicado pelo ultimo STATE_PATCH recebido.
const GROUND_Y = 0.9;
const TOP_Y = 4.5;
const MOVE_SPEED = 0.6; // m/s, apenas estetico

export class LiftView {
  constructor({ cabinGroup, door, gate }) {
    this.cabinGroup = cabinGroup;
    this.door = door;
    this.gate = gate;
    this.targetY = GROUND_Y;
    this.doorOpenAmount = 0; // 0 = fechada, 1 = aberta
    this.gateOpenAmount = 0;
    this.lastState = 'INSPECTION';
  }

  applyAuthoritativeState(liftSnapshot) {
    if (!liftSnapshot) return;
    const { state, context } = liftSnapshot;
    this.lastState = state;
    if (state === 'MOVING_UP') this.targetY = TOP_Y;
    else if (state === 'MOVING_DOWN') this.targetY = GROUND_Y;
    // Em qualquer outro estado a cabine mantem a posicao atual (congela).

    this._doorShouldOpen = !context.doorsClosed;
    this._gateShouldOpen = !context.gatesClosed;
    this.currentContext = context;
  }

  update(dt) {
    const dy = this.targetY - this.cabinGroup.position.y;
    const step = Math.sign(dy) * Math.min(Math.abs(dy), MOVE_SPEED * dt);
    this.cabinGroup.position.y += step;

    const doorTarget = this._doorShouldOpen ? 1 : 0;
    this.doorOpenAmount += (doorTarget - this.doorOpenAmount) * Math.min(1, dt * 4);
    this.door.position.x = -0.3 - this.doorOpenAmount * 0.4;

    const gateTarget = this._gateShouldOpen ? 1 : 0;
    this.gateOpenAmount += (gateTarget - this.gateOpenAmount) * Math.min(1, dt * 4);
    this.gate.rotation.y = this.gateOpenAmount * (Math.PI / 2);
  }
}
