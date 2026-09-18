// Visao 3D do console (doc, tabela "Console do instrutor" / area "Visao
// 3D"): espectador nao-XR do mesmo estado do aluno. Geometria placeholder
// simplificada; ver apps/quest/src/scene/buildScene.js para o equivalente
// completo do lado do aluno.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function buildSpectatorScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e13);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 50);
  camera.position.set(3.2, 2.6, 3.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.6, 0);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x1a1a1a, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.3);
  dir.position.set(3, 6, 4);
  scene.add(dir);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(6, 32),
    new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 6, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x2b3542, transparent: true, opacity: 0.18 }),
  );
  tower.position.set(0, 3, 0);
  scene.add(tower);

  const cabinGroup = new THREE.Group();
  cabinGroup.position.set(0, 0.9, 0);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.8, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.6 }),
  );
  cabin.position.y = 0.9;
  cabinGroup.add(cabin);
  scene.add(cabinGroup);

  const studentAvatar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.9, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x4ad991 }),
  );
  studentAvatar.position.set(0.3, 1.1, 0.3);
  scene.add(studentAvatar);

  function resize() {
    const { clientWidth, clientHeight } = container;
    renderer.setSize(clientWidth, clientHeight);
    camera.aspect = clientWidth / Math.max(1, clientHeight);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  return { scene, camera, renderer, cabinGroup, studentAvatar, render, resize };
}
