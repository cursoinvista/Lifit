// Visualizacao cinematografica do aluno dentro da cabine subindo pelo
// interior da torre. NAO faz parte do console operacional do instrutor -
// e uma cena separada, so para demonstracao visual (terceira pessoa,
// camera nao controlada pelo usuario). Geometria procedural, mesmo
// espirito de placeholder de apps/quest/src/scene/buildScene.js.
import * as THREE from 'three';

const TOWER_RADIUS = 4.5;
const TOWER_HEIGHT = 8;
const GROUND_Y = 0.9;
const TOP_Y = 4.5;

function buildAvatar() {
  const avatar = new THREE.Group();

  const legMat = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.75, 10), legMat);
    leg.position.set(side * 0.09, 0.375, 0);
    avatar.add(leg);
  }

  const torsoMat = new THREE.MeshStandardMaterial({ color: 0x1f4d8f, roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 4, 10), torsoMat);
  torso.position.set(0, 0.98, 0);
  avatar.add(torso);

  const harnessMat = new THREE.MeshStandardMaterial({ color: 0xff8c1a, roughness: 0.5 });
  for (const rot of [0.6, -0.6]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.05), harnessMat);
    strap.position.set(0, 0.98, 0.1);
    strap.rotation.z = rot;
    avatar.add(strap);
  }
  const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.06), harnessMat);
  beltBuckle.position.set(0, 0.78, 0.14);
  avatar.add(beltBuckle);

  const armMat = torsoMat;
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8), armMat);
    arm.position.set(side * 0.26, 0.88, 0.03);
    arm.rotation.x = -0.12;
    avatar.add(arm);
  }

  const headMat = new THREE.MeshStandardMaterial({ color: 0xd9b38c, roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), headMat);
  head.position.set(0, 1.48, 0);
  avatar.add(head);

  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.1 });
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7), helmetMat);
  helmet.position.set(0, 1.52, 0);
  avatar.add(helmet);

  return avatar;
}

function buildCabin() {
  const cabinGroup = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.06, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.9 }),
  );
  floor.position.set(0, 0.03, 0);
  cabinGroup.add(floor);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x8f9aa6, roughness: 0.4, metalness: 0.5 });
  for (const [x, z] of [[-0.53, -0.53], [0.53, -0.53], [-0.53, 0.53], [0.53, 0.53]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), postMat);
    post.position.set(x, 0.9, z);
    cabinGroup.add(post);
  }

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a5c, roughness: 0.5, metalness: 0.2, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
  });
  const wallGeoLR = new THREE.PlaneGeometry(1.06, 1.8);
  const wallGeoFB = new THREE.PlaneGeometry(1.06, 1.8);
  const left = new THREE.Mesh(wallGeoLR, wallMat); left.position.set(-0.53, 0.9, 0); left.rotation.y = Math.PI / 2; cabinGroup.add(left);
  const right = new THREE.Mesh(wallGeoLR, wallMat); right.position.set(0.53, 0.9, 0); right.rotation.y = Math.PI / 2; cabinGroup.add(right);
  const back = new THREE.Mesh(wallGeoFB, wallMat); back.position.set(0, 0.9, -0.53); cabinGroup.add(back);
  const front = new THREE.Mesh(wallGeoFB, wallMat); front.position.set(0, 0.9, 0.53); cabinGroup.add(front);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x14181d }),
  );
  panel.position.set(0.45, 1.15, -0.5);
  cabinGroup.add(panel);
  const btnColors = [0x4a90d9, 0xd9c14a, 0xd94a4a];
  btnColors.forEach((c, i) => {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: c }),
    );
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0.45, 1.24 - i * 0.08, -0.47);
    cabinGroup.add(btn);
  });

  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6), cableMat);
  cable.position.set(0, 2.6, 0);
  cabinGroup.add(cable);

  const avatar = buildAvatar();
  avatar.position.set(0, 0, 0.05);
  cabinGroup.add(avatar);

  cabinGroup.position.set(0, GROUND_Y, 0);
  return { cabinGroup, avatar };
}

function buildTower() {
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b3542, roughness: 0.85, side: THREE.BackSide });
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(TOWER_RADIUS, TOWER_RADIUS, TOWER_HEIGHT, 28, 1, true),
    wallMat,
  );
  wall.position.y = TOWER_HEIGHT / 2 - 0.5;
  group.add(wall);

  const ringMat = new THREE.MeshStandardMaterial({ color: 0x3f4c5c, roughness: 0.6, metalness: 0.3 });
  for (let y = 0.2; y < TOWER_HEIGHT; y += 1.2) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(TOWER_RADIUS - 0.02, 0.03, 6, 28),
      ringMat,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }

  const rungMat = new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.4, metalness: 0.6 });
  const railMat = rungMat;
  const ladderTheta = 0.95; // posicao angular fixa contra a parede interna
  const ladderRadius = TOWER_RADIUS - 0.2;
  const ladderBaseX = ladderRadius * Math.cos(ladderTheta);
  const ladderBaseZ = ladderRadius * Math.sin(ladderTheta);
  const tangentX = -Math.sin(ladderTheta);
  const tangentZ = Math.cos(ladderTheta);
  for (const side of [-0.14, 0.14]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, TOWER_HEIGHT - 1, 6), railMat);
    rail.position.set(ladderBaseX + side * tangentX, TOWER_HEIGHT / 2 - 0.5, ladderBaseZ + side * tangentZ);
    group.add(rail);
  }
  for (let y = 0.2; y < TOWER_HEIGHT - 0.6; y += 0.3) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), rungMat);
    rung.rotation.z = Math.PI / 2;
    rung.rotation.y = ladderTheta;
    rung.position.set(ladderBaseX, y, ladderBaseZ);
    group.add(rung);
  }

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(TOWER_RADIUS - 0.05, 28),
    new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  group.add(floor);

  return group;
}

export function buildCinematicScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f16);
  scene.fog = new THREE.Fog(0x0a0f16, 5, 15);

  scene.add(buildTower());
  const { cabinGroup, avatar } = buildCabin();
  scene.add(cabinGroup);

  scene.add(new THREE.HemisphereLight(0x9fbbdd, 0x1a1f26, 0.9));
  scene.add(new THREE.AmbientLight(0x33465c, 0.5));
  const rig = new THREE.PointLight(0xfff2d9, 8, 7, 2);
  scene.add(rig);
  const topGlow = new THREE.PointLight(0x9fd0ff, 4, 12, 2);
  topGlow.position.set(0, TOWER_HEIGHT - 1, 0);
  scene.add(topGlow);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 40);

  function resize() {
    const { clientWidth, clientHeight } = container;
    renderer.setSize(clientWidth, clientHeight);
    camera.aspect = clientWidth / Math.max(1, clientHeight);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { scene, camera, renderer, cabinGroup, avatar, rig, resize, GROUND_Y, TOP_Y };
}
