// Aplica o estado autoritativo (vindo do servidor) a cabine da visao 3D do
// console. Versao reduzida da equivalente em apps/quest/src/lift/LiftView.js
// (mesma constante de posicao/velocidade, sem porta/gate porque a cena do
// espectador nao modela esses objetos - ver spectatorScene.js). Duplicada em
// vez de compartilhada por ser puramente estetica; se as constantes de
// posicao mudarem em um lado, atualizar o outro.
const GROUND_Y = 0.9;
const TOP_Y = 4.5;
const MOVE_SPEED = 0.6; // m/s, igual ao cliente do aluno para manter sincronia visual

export class LiftView {
  constructor({ cabinGroup }) {
    this.cabinGroup = cabinGroup;
    this.targetY = GROUND_Y;
    this.lastState = 'INSPECTION';
  }

  applyAuthoritativeState(liftSnapshot) {
    if (!liftSnapshot) return;
    this.lastState = liftSnapshot.state;
    if (liftSnapshot.state === 'MOVING_UP') this.targetY = TOP_Y;
    else if (liftSnapshot.state === 'MOVING_DOWN') this.targetY = GROUND_Y;
  }

  update(dt) {
    const dy = this.targetY - this.cabinGroup.position.y;
    const step = Math.sign(dy) * Math.min(Math.abs(dy), MOVE_SPEED * dt);
    this.cabinGroup.position.y += step;
  }
}
