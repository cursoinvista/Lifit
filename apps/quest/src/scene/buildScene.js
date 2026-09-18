// Geometria procedural de placeholder (torre, cabine, painel, portas, gate).
// PRODUCAO: substituir por GLTFLoader + KTX2Loader carregando o modelo do
// lift aprovado pelo manual do fabricante (doc, secao 3 "Camada Quest"),
// com iluminacao baked e orcamento de draw calls medido no Quest 3/3S.
import * as THREE from 'three';

const COLORS = {
  tower: 0x2b3542,
  cabin: 0x3a4a5c,
  door: 0x8899aa,
  gate: 0xd08b2c,
  panelBody: 0x1a1f26,
  buttonIdle: 0x4a90d9,
  buttonDanger: 0xd94a4a,
  floor: 0x11151a,
  dangerZone: 0xd94a4a,
};

function makeButton({ entityId, label, color = COLORS.buttonIdle, position }) {
  const geo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.copy(position);
  mesh.userData.entityId = entityId;
  mesh.userData.label = label;
  mesh.userData.baseColor = color;
  return mesh;
}

export function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e13);
  scene.fog = new THREE.Fog(0x0a0e13, 8, 30);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x1a1a1a, 1.1);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(3, 6, 4);
  scene.add(dir);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(6, 32),
    new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Torre / guias verticais.
  const towerGroup = new THREE.Group();
  const towerGeo = new THREE.BoxGeometry(1.4, 6, 1.4);
  const towerMat = new THREE.MeshStandardMaterial({ color: COLORS.tower, wireframe: false, transparent: true, opacity: 0.18 });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.set(0, 3, 0);
  towerGroup.add(tower);
  scene.add(towerGroup);

  // Cabine (grupo que sera movido verticalmente pelo LiftView conforme
  // estado autoritativo do servidor, nunca por intencao local do cliente).
  const cabinGroup = new THREE.Group();
  cabinGroup.position.set(0, 0.9, 0);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.8, 1.1),
    new THREE.MeshStandardMaterial({ color: COLORS.cabin, roughness: 0.6 }),
  );
  cabin.position.y = 0.9;
  cabinGroup.add(cabin);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.6, 0.05),
    new THREE.MeshStandardMaterial({ color: COLORS.door, roughness: 0.4, metalness: 0.3 }),
  );
  door.position.set(-0.3, 0.85, 0.55);
  door.userData.entityId = 'door.main';
  door.userData.isDoor = true;
  cabinGroup.add(door);
  scene.add(cabinGroup);

  // Gate de acesso ao pavimento terreo.
  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.4, 0.08),
    new THREE.MeshStandardMaterial({ color: COLORS.gate, roughness: 0.5 }),
  );
  gate.position.set(0, 0.7, 1.1);
  gate.userData.entityId = 'gate.main';
  gate.userData.isGate = true;
  scene.add(gate);

  // Painel de controle (botoes tageados com entityId, consumidos pelo
  // InteractionSystem/InputSystem via raycast).
  const panel = new THREE.Group();
  panel.position.set(0.85, 1.1, 0.5);
  panel.rotation.y = -0.5;
  const panelBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.34, 0.03),
    new THREE.MeshStandardMaterial({ color: COLORS.panelBody }),
  );
  panel.add(panelBody);

  const buttonSpecs = [
    { entityId: 'panel.up', label: 'SUBIR', dy: 0.11, color: COLORS.buttonIdle },
    { entityId: 'panel.down', label: 'DESCER', dy: 0.055, color: COLORS.buttonIdle },
    { entityId: 'panel.stop', label: 'PARAR', dy: 0, color: 0xd9c14a },
    { entityId: 'panel.emergency_stop', label: 'EMERGENCIA', dy: -0.055, color: COLORS.buttonDanger },
    { entityId: 'panel.resume', label: 'RETOMAR', dy: -0.11, color: COLORS.buttonIdle },
    { entityId: 'panel.emergency_descent', label: 'DESCIDA EMERG.', dy: -0.165, color: COLORS.buttonDanger },
  ];
  const buttons = buttonSpecs.map((spec) =>
    makeButton({ entityId: spec.entityId, label: spec.label, color: spec.color, position: new THREE.Vector3(0, spec.dy, 0.02) }),
  );
  buttons.forEach((b) => panel.add(b));
  scene.add(panel);

  // Prancheta de checklist (item de inspecao pre-uso).
  const checklist = makeButton({
    entityId: 'checklist.complete',
    label: 'CHECKLIST',
    color: 0x4ad991,
    position: new THREE.Vector3(-0.9, 1.0, 0.6),
  });
  checklist.geometry = new THREE.BoxGeometry(0.18, 0.24, 0.02);
  scene.add(checklist);

  // Zona de risco (marcacao de piso, apenas visual/pedagogica).
  const dangerZone = new THREE.Mesh(
    new THREE.RingGeometry(1.3, 1.5, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.dangerZone, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }),
  );
  dangerZone.rotation.x = -Math.PI / 2;
  dangerZone.position.y = 0.01;
  scene.add(dangerZone);

  const interactables = [...buttons, checklist, door, gate];

  return { scene, interactables, cabinGroup, door, gate };
}
