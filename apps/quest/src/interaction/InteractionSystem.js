// Raycast para selecionar botoes/checklist/manuais a distancia e zona de
// proximidade para agarrar objetos (doc, secao 3 "Joysticks Touch Plus e
// interacao"). Este sistema NUNCA decide o resultado da acao: ele apenas
// emite um pedido (onRequest) que o ReplicationClient envia ao servidor.
import * as THREE from 'three';

const GRAB_DISTANCE = 0.15;

export class InteractionSystem {
  constructor({ interactables, grabbables = [] }) {
    this.interactables = interactables;
    this.grabbables = grabbables;
    this.raycaster = new THREE.Raycaster();
    this.tempMatrix = new THREE.Matrix4();
    this.onRequest = null; // (action, entityId) => void, ligado pelo main.js
    this.heldByController = new Map(); // controller.uuid -> grabbedObject
  }

  pickWithController(controller) {
    this.tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    return hits.length > 0 ? hits[0] : null;
  }

  /** Fallback de depuracao em desktop (sem headset): raycast a partir do mouse. */
  handleMouseClick(ndc, camera) {
    this.raycaster.setFromCamera(ndc, camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    if (hits.length === 0) return;
    const entityId = hits[0].object.userData.entityId;
    if (entityId) this.onRequest?.('PRESS', entityId);
  }

  handleSelectStart(controller) {
    const hit = this.pickWithController(controller);
    if (!hit) return;
    const entityId = hit.object.userData.entityId;
    if (!entityId) return;
    this.onRequest?.('PRESS', entityId);
  }

  handleSelectEnd(_controller) {
    // Reservado: liberar estado visual de "pressionado" se necessario.
  }

  /** Zona de proximidade: agarra o objeto grabbable mais proximo da mao livre. */
  handleSqueezeStart(controller) {
    if (this.heldByController.has(controller.uuid)) return;
    const controllerPos = new THREE.Vector3();
    controller.getWorldPosition(controllerPos);
    let closest = null;
    let closestDist = GRAB_DISTANCE;
    for (const obj of this.grabbables) {
      const objPos = new THREE.Vector3();
      obj.getWorldPosition(objPos);
      const dist = controllerPos.distanceTo(objPos);
      if (dist <= closestDist) {
        closest = obj;
        closestDist = dist;
      }
    }
    if (closest) {
      this.heldByController.set(controller.uuid, closest);
      this.onRequest?.('GRAB', closest.userData.entityId);
    }
  }

  handleSqueezeEnd(controller) {
    const held = this.heldByController.get(controller.uuid);
    if (!held) return;
    this.heldByController.delete(controller.uuid);
    this.onRequest?.('RELEASE', held.userData.entityId);
  }
}
