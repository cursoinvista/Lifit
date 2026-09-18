// Mapeamento dos dois joysticks Meta Quest Touch Plus (doc, tabela
// "Entrada / Uso / Regra"): selectstart/selectend, squeezestart/squeezeend,
// thumbstick esquerdo (teleporte controlado) e direito (rotacao por
// passos), e hapticActuator como confirmacao, nunca como unico canal.
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

export class InputSystem {
  constructor({ renderer, scene, interactionSystem, cabinGroup }) {
    this.renderer = renderer;
    this.interactionSystem = interactionSystem;
    this.cabinGroup = cabinGroup;
    this.teleportEnabled = true; // desabilitado dentro da cabine quando 1:1 for exigido
    this.rotationStepRad = Math.PI / 8;
    this.controllers = [];
    this.controllerGrips = [];
    this.modelFactory = new XRControllerModelFactory();

    for (let i = 0; i < 2; i += 1) {
      const controller = renderer.xr.getController(i);
      controller.addEventListener('selectstart', () => this.interactionSystem.handleSelectStart(controller));
      controller.addEventListener('selectend', () => this.interactionSystem.handleSelectEnd(controller));
      controller.addEventListener('squeezestart', () => this.interactionSystem.handleSqueezeStart(controller));
      controller.addEventListener('squeezeend', () => this.interactionSystem.handleSqueezeEnd(controller));
      controller.addEventListener('connected', (event) => {
        controller.userData.gamepad = event.data.gamepad;
        controller.userData.handedness = event.data.handedness;
      });
      scene.add(controller);
      this.controllers.push(controller);

      const grip = renderer.xr.getControllerGrip(i);
      grip.add(this.modelFactory.createControllerModel(grip));
      scene.add(grip);
      this.controllerGrips.push(grip);
    }
  }

  pulse(controller, ms = 70, strength = 0.55) {
    controller.userData.gamepad?.hapticActuators?.[0]?.pulse(strength, ms);
  }

  pulseAll(ms, strength) {
    for (const c of this.controllers) this.pulse(c, ms, strength);
  }

  /** Le os thumbsticks a cada frame (teleporte esquerdo, rotacao direita). */
  update(_dt, xrCamera) {
    for (const controller of this.controllers) {
      const gp = controller.userData.gamepad;
      if (!gp) continue;
      const [, , x = 0, y = 0] = gp.axes;
      if (controller.userData.handedness === 'left' && this.teleportEnabled) {
        this._handleTeleportAxis(y);
      }
      if (controller.userData.handedness === 'right') {
        this._handleRotationAxis(x, xrCamera);
      }
    }
  }

  _handleTeleportAxis(y) {
    // Implementacao completa de teleporte (raycast ao piso + marcador) fica
    // fora do escopo deste MVP; o hook existe para a fase de protótipo.
    if (Math.abs(y) < 0.9) this._teleportArmed = false;
  }

  _handleRotationAxis(x, xrCamera) {
    if (Math.abs(x) < 0.85) {
      this._rotationArmed = false;
      return;
    }
    if (this._rotationArmed) return;
    this._rotationArmed = true;
    if (xrCamera) {
      xrCamera.rotation.y -= Math.sign(x) * this.rotationStepRad;
    }
  }

  setTeleportEnabled(enabled) {
    this.teleportEnabled = enabled;
  }
}
