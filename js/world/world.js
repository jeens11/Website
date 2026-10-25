import { createDestinations } from './destinations.js';
import { createMiniMap } from './minimap.js';
import { createCameraRig } from './camera-rig.js';
import { createCenterpiece, createOuterPillars, createSparks } from './decoration.js';
import { createPlayer } from './player.js';
import { createEffects } from './effects.js';
import { ARENA_RADIUS } from './drive-physics.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const INTERACTION_RANGE = 12;
const FOG_COLOR = 0x241046;

export async function startWorld({ sections, controls, driveState, openArea, audio }) {
  const THREE = await import(THREE_URL);
  return buildWorld(THREE, { sections, controls, driveState, openArea, audio });
}

function makeSkyTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#07041a');
  gradient.addColorStop(0.28, '#1b0c3d');
  gradient.addColorStop(0.46, '#3c2060');
  gradient.addColorStop(0.5, '#241046');
  gradient.addColorStop(1, '#0a0714');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 8, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGlowTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,.9)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function buildWorld(THREE, { sections, controls, driveState, openArea, audio }) {
  const canvas = document.getElementById('world');
  const scene = new THREE.Scene();
  scene.background = makeSkyTexture(THREE);
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0105);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
  const cameraRig = createCameraRig(THREE, camera);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene.add(new THREE.HemisphereLight(0xb98cff, 0x1a0b30, 1.0));
  const keyLight = new THREE.DirectionalLight(0xe9e2ff, 1.3);
  keyLight.position.set(-14, 24, 13);
  scene.add(keyLight);
  const centerLight = new THREE.PointLight(0x9a82d8, 80, 120, 2);
  centerLight.position.set(0, 11, 0);
  scene.add(centerLight);

  // Open floor: no road. A neon grid over a deep violet ground, with a soft
  // glow pool under the centerpiece.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({ color: 0x0c0620, roughness: 1, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.06;
  scene.add(floor);

  const grid = new THREE.GridHelper(260, 130, 0x9a82d8, 0x3a2a66);
  grid.position.y = 0;
  (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach((material) => {
    material.transparent = true;
    material.opacity = 0.38;
  });
  scene.add(grid);

  const glowTexture = makeGlowTexture(THREE);
  const glowPool = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 110),
    new THREE.MeshBasicMaterial({ map: glowTexture, color: 0x7f6bc0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glowPool.rotation.x = -Math.PI / 2;
  glowPool.position.y = 0.03;
  scene.add(glowPool);

  // Stars follow the camera so they always sit on the horizon.
  const starCount = 700;
  const starPositions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.92 + 0.04);
    starPositions[index * 3] = Math.sin(phi) * Math.cos(theta) * 230;
    starPositions[index * 3 + 1] = Math.cos(phi) * 230;
    starPositions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 230;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }));
  scene.add(stars);

  const centerpiece = createCenterpiece(THREE, scene);
  const pillars = createOuterPillars(THREE, scene);
  const sparks = createSparks(THREE, scene);
  const effects = createEffects(THREE, scene);
  const { gates, boostPads, radius } = createDestinations(THREE, scene, sections);
  const player = createPlayer(THREE, scene, driveState);
  const mapCanvas = document.getElementById('miniMap');
  const mapMarkers = document.getElementById('mapMarkers');
  const drawMiniMap = createMiniMap(mapCanvas, mapMarkers, gates, player, ARENA_RADIUS + 3);
  const prompt = document.getElementById('proximityPrompt');
  const promptTitle = document.getElementById('promptTitle');
  const promptDistance = document.getElementById('promptDistance');
  const openNearButton = document.getElementById('openNear');
  const worldCoordinate = document.getElementById('worldCoordinate');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clickableGates = gates.map((gate) => gate.hitbox);
  let nearestIndex = 0;
  let nearEnough = false;
  let lastTime = performance.now();
  let messageUntil = 0;
  let message = '';
  let animationFrame = 0;

  function openNearest() {
    if (nearEnough) {
      openArea(gates[nearestIndex].section.id);
      return;
    }
    message = `DRIVE CLOSER TO ${gates[nearestIndex].section.mapLabel}`;
    messageUntil = performance.now() + 1500;
  }

  function showNearest(index, distance, now) {
    nearestIndex = index;
    nearEnough = distance <= INTERACTION_RANGE;
    const gate = gates[index];
    prompt.classList.toggle('visible', nearEnough);
    prompt.setAttribute('aria-hidden', String(!nearEnough));
    prompt.inert = !nearEnough;
    openNearButton.disabled = !nearEnough;
    if (nearEnough) {
      promptTitle.textContent = gate.section.label;
      promptDistance.textContent = `DESTINATION ${gate.section.number} · PRESS E OR TAP OPEN`;
    }
    if (now < messageUntil) worldCoordinate.textContent = message;
    else worldCoordinate.textContent = `WORLD 00 / ${gate.section.number} ${gate.section.mapLabel} · ${Math.round(distance)}M`;
  }

  function handleWorldClick(event) {
    if (event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableGates, false);
    if (!hits.length) return;
    const gate = gates.find((item) => item.hitbox === hits[0].object);
    if (gate) openArea(gate.section.id);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function resetWorld() {
    player.reset();
    cameraRig.reset(player.car, driveState.start.heading);
    boostPads.forEach((pad) => { pad.cooldownUntil = 0; });
    controls.reset();
    messageUntil = 0;
  }

  const speedValue = document.getElementById('speedValue');
  const speedFill = document.getElementById('speedFill');
  const hudColor = new THREE.Color();
  let wasBoosting = false;
  let wasNear = false;
  let lastSpeedText = '';

  function animate(now) {
    animationFrame = window.requestAnimationFrame(animate);
    // rAF timestamps can precede the build time on the first frame, so clamp both ways.
    const delta = Math.max(0, Math.min((now - lastTime) / 1000, 0.045));
    lastTime = now;
    if (document.hidden || document.body.classList.contains('portfolio-mode')) return;
    if (driveState.resetRequested) {
      resetWorld();
      audio?.play('reset');
    }
    const movement = player.update({ delta, now, boostPads });
    const state = driveState.car;
    effects.emitFromCar(player.car, state, delta, movement.drifting, movement.boosting);
    effects.update(delta);

    let nearestDistance = Infinity;
    let nearest = 0;
    gates.forEach((gate, index) => {
      const distance = player.car.position.distanceTo(gate.pos);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    cameraRig.update({
      car: player.car,
      heading: state.heading,
      speed: state.speed,
      steer: state.steer,
      slip: state.slip,
      boosting: movement.boosting,
      drifting: movement.drifting && Math.abs(state.slip) > 0.4,
      destination: gates[nearest]?.pos,
      destinationDistance: nearestDistance,
      now,
      delta,
    });
    stars.position.copy(camera.position);

    // World animation
    centerpiece.sculpture.rotation.y += delta * 0.18;
    centerpiece.shell.rotation.y += delta * 0.05;
    centerpiece.rings.forEach((ring, index) => {
      ring.rotation.z += delta * (index % 2 ? -0.18 : 0.18);
      ring.rotation.x += delta * 0.03 * (index + 1);
    });
    // Slowly shift between violet, magenta and blue (never through green/yellow).
    const hueWave = Math.sin(now * 0.0004);
    centerLight.color.setHSL(0.74 + 0.05 * hueWave, 0.55, 0.62);
    glowPool.material.color.setHSL(0.74 + 0.05 * hueWave, 0.5, 0.45);
    pillars.update(now);
    sparks.update(delta, now);
    gates.forEach((gate) => {
      const near = gate.pos.distanceTo(player.car.position) < INTERACTION_RANGE + 6;
      gate.particles.rotation.y += delta * 0.4;
      gate.particles.rotation.x = Math.sin(now * 0.00035 + gate.phase) * 0.055;
      gate.landmark.rotation.y += delta * (near ? 1.2 : 0.45);
      gate.landmark.position.y = 0.35 + Math.sin(now * 0.002 + gate.phase) * 0.14;
      gate.halo.scale.setScalar(1 + 0.04 * Math.sin(now * 0.004 + gate.phase) + (near ? 0.05 : 0));
      gate.light.intensity = 12 + 5 * Math.sin(now * 0.003 + gate.phase) + (near ? 10 : 0);
    });
    boostPads.forEach((pad, index) => {
      pad.arrowMaterial.opacity = 0.55 + 0.4 * Math.sin(now * 0.008 - index);
    });

    showNearest(nearest, nearestDistance, now);
    drawMiniMap({ nearestIndex: nearest, near: nearEnough });

    // Audio cues
    if (movement.boosting && !wasBoosting) audio?.play('boost');
    wasBoosting = movement.boosting;
    if (nearEnough && !wasNear) audio?.play('near');
    wasNear = nearEnough;
    audio?.update({ speed: state.speed, slip: state.slip, boosting: movement.boosting, drifting: movement.drifting });

    // Speed HUD
    const kmh = Math.round(Math.abs(state.speed) * 8);
    const text = String(kmh);
    if (text !== lastSpeedText && speedValue) {
      speedValue.textContent = text;
      lastSpeedText = text;
    }
    if (speedFill) {
      const fraction = Math.min(1, Math.abs(state.speed) / 23);
      hudColor.setHSL(0.74, 0.7, 0.62 + fraction * 0.2);
      speedFill.style.transform = `scaleX(${fraction.toFixed(3)})`;
      speedFill.style.background = `#${hudColor.getHexString()}`;
    }

    renderer.render(scene, camera);
  }

  canvas.addEventListener('pointerdown', handleWorldClick);
  window.addEventListener('resize', resize);
  document.addEventListener('portfolio:open-nearest', openNearest);
  controls.setOpenNearest(openNearest);
  player.reset();
  cameraRig.reset(player.car, driveState.start.heading);
  resize();
  animationFrame = window.requestAnimationFrame(animate);

  return {
    reset: resetWorld,
    dispose() {
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('pointerdown', handleWorldClick);
      window.removeEventListener('resize', resize);
      document.removeEventListener('portfolio:open-nearest', openNearest);
      controls.dispose();
      renderer.dispose();
    },
  };
}
