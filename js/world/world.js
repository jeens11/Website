import { createDestinations, makeLabelTexture } from './destinations.js';
import { createMiniMap } from './minimap.js';
import { createCameraRig } from './camera-rig.js';
import { createCenterpiece, createOuterPillars, createSparks } from './decoration.js';
import { createPlayer } from './player.js';
import { createEffects } from './effects.js';
import { createBillboards } from './billboards.js';
import { createAutopilot } from './autopilot.js';
import { createSky } from './sky.js';
import { createSignpost } from './signpost.js';
import { createTips } from './tips.js';
import { ARENA_RADIUS } from './drive-physics.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const INTERACTION_RANGE = 12;
// The preview card appears from this far away; the section opens within INTERACTION_RANGE.
const PREVIEW_RANGE = 26;
const FOG_COLOR = 0x241046;
const BILLBOARD_RANGE = 7.5;

// Phones and low-core machines get fewer pixels and no shadow pass.
const LOW_POWER = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const MAX_PIXEL_RATIO = LOW_POWER ? 1.25 : 1.75;
const MIN_PIXEL_RATIO = 0.75;
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(pointer: coarse)').matches;
// How long the camera takes to glide from the home-screen orbit to the chase view.
const ORBIT_BLEND_MS = 1400;

export async function startWorld({ sections, controls, driveState, openArea, audio, onProgress }) {
  onProgress?.('Loading the 3D engine…');
  const [THREE] = await Promise.all([
    import(THREE_URL),
    // Canvas labels draw with the site fonts, so wait for them first.
    document.fonts?.load('700 62px Manrope').catch(() => {}),
  ]);
  onProgress?.('Building the world…');
  return buildWorld(THREE, { sections, controls, driveState, openArea, audio });
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

/** The name and title painted on the arena floor in front of the starting car. */
function makeFloorTitle(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.textAlign = 'center';
  context.shadowColor = '#b9a4ff';
  context.shadowBlur = 28;
  context.fillStyle = '#f2ecff';
  context.font = '800 168px Manrope, Arial, sans-serif';
  context.fillText('JAWAD NAHEEN SHAMIM', 1024, 230);
  context.shadowBlur = 12;
  context.fillStyle = '#c9b8ff';
  context.font = '500 64px "DM Mono", monospace';
  context.fillText('DESIGN PORTFOLIO  ·  CPSC 581  ·  DRIVE TO EXPLORE', 1024, 380);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 4.25),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  title.rotation.x = -Math.PI / 2;
  title.position.set(0, 0.05, 3.2);
  return title;
}

function buildWorld(THREE, { sections, controls, driveState, openArea, audio }) {
  const canvas = document.getElementById('world');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0105);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
  const cameraRig = createCameraRig(THREE, camera);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_POWER, alpha: false, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = !LOW_POWER;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hemiLight = new THREE.HemisphereLight(0xb98cff, 0x1a0b30, 1.0);
  scene.add(hemiLight);
  const keyLight = new THREE.DirectionalLight(0xe9e2ff, 1.3);
  keyLight.position.set(-14, 24, 13);
  keyLight.castShadow = !LOW_POWER;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0006;
  keyLight.shadow.normalBias = 0.02;
  Object.assign(keyLight.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 90 });
  keyLight.shadow.camera.updateProjectionMatrix();
  scene.add(keyLight);
  const centerLight = new THREE.PointLight(0x9a82d8, 80, 120, 2);
  centerLight.position.set(0, 11, 0);
  scene.add(centerLight);

  // Open floor: no road. A neon grid over a deep violet ground, with a soft
  // glow pool under the centerpiece.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({ color: 0x150b30, roughness: 0.92, metalness: 0.08 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.06;
  floor.receiveShadow = true;
  scene.add(floor);

  // Glowing rings: through the boost pads, through the destinations, and at the arena edge.
  for (const [ringRadius, opacity] of [[15, 0.32], [32.5, 0.22], [ARENA_RADIUS + 0.6, 0.5]]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius - 0.09, ringRadius + 0.09, 160),
      new THREE.MeshBasicMaterial({ color: 0xb9a4ff, transparent: true, opacity, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
  }

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
  const starCount = LOW_POWER ? 400 : 900;
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
  const sky = createSky(THREE, scene, { hemiLight, keyLight, stars, still: REDUCED_MOTION });

  scene.add(makeFloorTitle(THREE));

  const centerpiece = createCenterpiece(THREE, scene);
  const pillars = createOuterPillars(THREE, scene);
  const sparks = createSparks(THREE, scene);
  // Room for the drift/boost particles plus the exploration fireworks.
  const effects = createEffects(THREE, scene, 640);
  const { gates, boostPads, radius } = createDestinations(THREE, scene, sections);
  const player = createPlayer(THREE, scene, driveState);
  const projectGate = gates.find((gate) => gate.section.id === 'projects');
  const billboards = projectGate
    ? createBillboards(THREE, scene, projectGate, { anisotropy: renderer.capabilities.getMaxAnisotropy() })
    : [];
  const signpost = createSignpost(THREE, scene, gates);
  const autopilot = createAutopilot(driveState);
  const tips = createTips(document.getElementById('worldTip'));
  const contentView = document.getElementById('contentView');
  const mapCanvas = document.getElementById('miniMap');
  const mapMarkers = document.getElementById('mapMarkers');
  const drawMiniMap = createMiniMap(mapCanvas, mapMarkers, gates, player, ARENA_RADIUS + 3);
  const prompt = document.getElementById('proximityPrompt');
  const promptTitle = document.getElementById('promptTitle');
  const promptDistance = document.getElementById('promptDistance');
  const promptPreview = document.getElementById('promptPreview');
  const homeButton = document.getElementById('worldHome');
  const reward = document.getElementById('worldReward');
  const openNearButton = document.getElementById('openNear');
  const worldCoordinate = document.getElementById('worldCoordinate');
  const worldProgress = document.getElementById('worldProgress');
  const worldProgressCount = document.getElementById('worldProgressCount');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clickableGates = [
    ...gates.map((gate) => gate.hitbox),
    ...billboards.flatMap((board) => board.hitboxes),
    ...signpost.hitboxes,
  ];
  let nearestIndex = 0;
  let nearEnough = false;
  let nearBillboard = null;
  let frameTimes = 0;
  let frameCount = 0;
  let lastTime = performance.now();
  let messageUntil = 0;
  let message = '';
  let animationFrame = 0;
  let lastPromptKey = '';
  let celebratePending = false;
  let fireworks = [];
  let fastSince = 0;
  let visitedCount = 0;
  const startedAt = performance.now();
  // Home-screen orbit: the camera circles the arena until the visitor starts driving.
  let orbiting = !REDUCED_MOTION;
  let orbitEndedAt = 0;
  const orbitPosition = new THREE.Vector3();
  const orbitQuaternion = new THREE.Quaternion();

  function markVisited(id) {
    const gate = gates.find((item) => item.section.id === id);
    if (!gate || gate.visited) return;
    gate.visited = true;
    gate.label.material.map.dispose();
    gate.label.material.map = makeLabelTexture(THREE, gate.section, true);
    gate.label.material.needsUpdate = true;
    mapMarkers.querySelector(`[data-area="${CSS.escape(id)}"]`)?.classList.add('visited');
    const count = gates.filter((item) => item.visited).length;
    worldProgressCount.textContent = `${count}/${gates.length}`;
    worldProgress.hidden = false;
    worldProgress.classList.toggle('complete', count === gates.length);
    visitedCount = count;
    if (count === gates.length) celebratePending = true;
  }
  const onSectionOpened = (event) => {
    // Opening a section any other way (keys 1-6, the menu) ends an auto-drive.
    autopilot.cancel();
    markVisited(event.detail.id);
  };

  /** Auto-drive to a platform, then open it. Any drive input takes back control. */
  function driveTo(gate) {
    reward.hidden = true;
    autopilot.start({
      x: gate.pos.x,
      z: gate.pos.z,
      // Platforms are 5.35 wide, so this parks the car on the platform.
      stopRadius: 3.5,
      gate,
      onArrive: () => openArea(gate.section.id),
    });
    const takeOver = TOUCH ? 'Touch the joystick' : 'Press any drive key';
    tips.flash(`Driving to <b>${gate.section.number} · ${gate.section.label}</b>. ${takeOver} to take over.`);
  }

  function driveHome() {
    autopilot.start({ x: driveState.start.x, z: driveState.start.z, stopRadius: 1.5 });
    tips.flash('Heading back to the start.');
  }

  function handleMarkerClick(event) {
    const marker = event.target.closest('[data-area]');
    const gate = marker && gates.find((item) => item.section.id === marker.dataset.area);
    if (!gate) return;
    // Handled here instead of by the navigation's direct open.
    event.preventDefault();
    event.stopPropagation();
    audio?.play('click');
    driveTo(gate);
  }

  function celebrate(now) {
    celebratePending = false;
    reward.hidden = false;
    audio?.play('open');
    gates.forEach((gate, index) => {
      for (let wave = 0; wave < 3; wave += 1) fireworks.push({ at: now + index * 160 + wave * 700, gate });
    });
  }

  function burst(gate) {
    const color = `#${gate.color.getHexString()}`;
    const height = 9 + Math.random() * 5;
    for (let n = 0; n < 34; n += 1) {
      const u = Math.random() * 2 - 1;
      const angle = Math.random() * Math.PI * 2;
      const ring = Math.sqrt(1 - u * u);
      const speed = 4 + Math.random() * 3;
      effects.emit(gate.pos.x, height, gate.pos.z,
        Math.cos(angle) * ring * speed, u * speed, Math.sin(angle) * ring * speed,
        Math.random() < 0.3 ? '#ffffff' : color, 1.3);
    }
  }

  function closeReward() {
    reward.hidden = true;
  }

  function cancelOnEscape(event) {
    if (event.code === 'Escape' && autopilot.target) autopilot.cancel();
  }

  function goHome() {
    resetWorld();
    orbiting = !REDUCED_MOTION;
  }

  function openNearest() {
    if (nearBillboard) {
      openArea('projects', nearBillboard.id);
      return;
    }
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
    const canOpen = nearEnough || Boolean(nearBillboard);
    // Previews start once the visitor drives, and wait while auto-driving.
    const visible = canOpen || (distance <= PREVIEW_RANGE && driveState.moved && !autopilot.target);
    const away = Math.max(1, Math.round(distance - INTERACTION_RANGE));
    const promptKey = `${visible}|${driveState.moved}|${nearBillboard?.id || index}|${canOpen || away}|${Boolean(autopilot.target)}`;
    if (promptKey !== lastPromptKey) {
      lastPromptKey = promptKey;
      prompt.classList.toggle('visible', visible);
      prompt.classList.toggle('is-far', !canOpen);
      prompt.setAttribute('aria-hidden', String(!visible));
      prompt.inert = !visible;
      openNearButton.disabled = !canOpen;
      openNearButton.textContent = canOpen ? 'Open' : `${away}M`;
      if (nearBillboard) {
        promptTitle.textContent = nearBillboard.title;
        promptDistance.textContent = `${nearBillboard.subtitle} · case study`;
        promptPreview.textContent = '';
        prompt.style.removeProperty('--accent');
      } else {
        promptTitle.textContent = `${gate.section.number} · ${gate.section.label}`;
        promptDistance.textContent = gate.section.summary;
        promptPreview.textContent = gate.section.preview || '';
        prompt.style.setProperty('--accent', gate.section.color);
      }
    }
    const heading = autopilot.target;
    if (heading) {
      const left = Math.hypot(heading.x - player.car.position.x, heading.z - player.car.position.z);
      const name = heading.gate ? `${heading.gate.section.number} ${heading.gate.section.mapLabel}` : 'START';
      worldCoordinate.textContent = `AUTO-DRIVING / ${name} · ${Math.round(left)}M`;
    }
    else if (now < messageUntil) worldCoordinate.textContent = message;
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
    const sign = signpost.boards.find((item) => item.meshes.includes(hits[0].object));
    if (sign) {
      driveTo(sign.gate);
      return;
    }
    const board = billboards.find((item) => item.hitboxes.includes(hits[0].object));
    if (board) {
      openArea('projects', board.id);
      return;
    }
    const gate = gates.find((item) => item.hitbox === hits[0].object);
    if (gate) openArea(gate.section.id);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function resetWorld() {
    player.reset();
    cameraRig.reset(player.car, driveState.start.heading);
    boostPads.forEach((pad) => { pad.cooldownUntil = 0; });
    autopilot.cancel();
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
    // The section overlay is nearly opaque, so the world pauses behind it too.
    if (document.hidden || document.body.classList.contains('portfolio-mode') || contentView.classList.contains('open')) return;
    if (driveState.resetRequested) {
      resetWorld();
      audio?.play('reset');
    }
    const userDriving = driveState.input.keys.size > 0
      || Math.abs(driveState.input.joyX) > 0.08 || Math.abs(driveState.input.joyY) > 0.08;
    if (autopilot.target && userDriving) {
      autopilot.cancel();
      tips.flash('You’re driving.', 1800);
    }
    autopilot.update(now);
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
    // While orbiting, circle the arena; once driving starts, glide into the chase view.
    const inputActive = driveState.moved || driveState.input.keys.size > 0
      || Math.abs(driveState.input.joyX) > 0.08 || Math.abs(driveState.input.joyY) > 0.08;
    if (orbiting && inputActive) {
      orbiting = false;
      orbitEndedAt = now;
    }
    if (orbiting) {
      const angle = now * 0.00007;
      camera.position.set(Math.sin(angle) * 30, 13 + Math.sin(now * 0.0003) * 1.5, Math.cos(angle) * 30);
      camera.fov = 58;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 3.2, 0);
      orbitPosition.copy(camera.position);
      orbitQuaternion.copy(camera.quaternion);
    } else if (orbitEndedAt && now - orbitEndedAt < ORBIT_BLEND_MS) {
      const t = (now - orbitEndedAt) / ORBIT_BLEND_MS;
      const ease = t * t * (3 - 2 * t);
      camera.position.lerpVectors(orbitPosition, camera.position, ease);
      camera.quaternion.slerpQuaternions(orbitQuaternion, camera.quaternion, ease);
    }
    stars.position.copy(camera.position);
    player.setNight(sky.update(now - startedAt));

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
      // Unvisited beacons pulse brightly; visited ones settle down.
      gate.beacon.material.opacity = gate.visited ? 0.16 : 0.42 + 0.14 * Math.sin(now * 0.0025 + gate.phase);
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

    nearBillboard = null;
    let billboardDistance = BILLBOARD_RANGE;
    billboards.forEach((board) => {
      const distance = player.car.position.distanceTo(board.pos);
      if (distance < billboardDistance) {
        billboardDistance = distance;
        nearBillboard = board;
      }
      board.spot.intensity = 6 + (board === nearBillboard ? 8 : 0);
    });

    showNearest(nearest, nearestDistance, now);
    drawMiniMap({ nearestIndex: nearest, near: nearEnough });

    // Audio cues
    if (movement.boosting && !wasBoosting) {
      audio?.play('boost');
      if (!REDUCED_MOTION) cameraRig.kick(1);
    }
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

    if (driveState.moved) document.body.classList.add('has-driven');
    const farFromStart = Math.hypot(state.x - driveState.start.x, state.z - driveState.start.z) > 18;
    homeButton.hidden = !farFromStart || Boolean(autopilot.target);

    if (celebratePending) celebrate(now);
    if (fireworks.length) {
      fireworks = fireworks.filter((item) => {
        if (now < item.at) return true;
        burst(item.gate);
        return false;
      });
    }

    offerTips(now, state, movement, nearestDistance);
    tips.update(now);

    renderer.render(scene, camera);
    adaptResolution(delta);
  }

  /** Tips respond to what the visitor is doing; each shows once per browser. */
  function offerTips(now, state, movement, nearestDistance) {
    if (autopilot.target) return;
    if (!driveState.moved && now - startedAt > 9000) {
      tips.offer('autodrive', `Not sure where to go? ${TOUCH ? 'Tap' : 'Click'} a number on the map and the car drives itself there.`);
    }
    const speed = Math.abs(state.speed);
    if (speed > 9 && !movement.drifting && !movement.boosting) {
      fastSince ||= now;
      if (now - fastSince > 1500) {
        tips.offer('drift', TOUCH ? 'Hold <b>Drift</b> while steering to slide round corners.' : 'Hold <kbd>Space</kbd> while turning to drift.');
      }
    } else {
      fastSince = 0;
    }
    if (speed > 2 && boostPads.some((pad) => Math.hypot(state.x - pad.position.x, state.z - pad.position.z) < 9)) {
      tips.offer('boost', 'Drive over the glowing chevrons for a speed boost.');
    }
    if (driveState.moved && nearestDistance <= PREVIEW_RANGE && !nearEnough) {
      tips.offer('preview', 'Each platform tells you what’s inside as you drive up. Get closer to open it.');
    }
    if (nearEnough) {
      tips.offer('open', TOUCH ? 'Tap <b>Open</b> to see this section.' : 'Press <kbd>E</kbd> or <kbd>Enter</kbd> to open this section.');
    }
    if (Math.hypot(state.x, state.z) > ARENA_RADIUS - 0.5) {
      tips.offer('edge', TOUCH ? 'That’s the edge. Tap <b>Back to start</b> to return.' : 'That’s the edge. Press <kbd>R</kbd> to reset the car, or use <b>Back to start</b>.');
    }
    if (visitedCount >= 2 && !TOUCH) {
      tips.offer('numbers', 'Press <kbd>1</kbd> to <kbd>6</kbd> to jump straight to a section.');
    }
    if (visitedCount >= 1) {
      tips.offer('autodrive', `${TOUCH ? 'Tap' : 'Click'} a map number, or a board on the signpost, and the car drives you there.`);
    }
  }

  // Lower the pixel ratio when frames run long, and raise it again when there is headroom.
  function adaptResolution(delta) {
    frameTimes += delta;
    frameCount += 1;
    if (frameCount < 90) return;
    const average = frameTimes / frameCount;
    frameTimes = 0;
    frameCount = 0;
    const ceiling = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    let next = pixelRatio;
    if (average > 1 / 45) next = Math.max(MIN_PIXEL_RATIO, pixelRatio - 0.15);
    else if (average < 1 / 58) next = Math.min(ceiling, pixelRatio + 0.1);
    if (Math.abs(next - pixelRatio) > 0.01) {
      pixelRatio = next;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  canvas.addEventListener('pointerdown', handleWorldClick);
  window.addEventListener('resize', resize);
  document.addEventListener('portfolio:open-nearest', openNearest);
  document.addEventListener('portfolio:section-opened', onSectionOpened);
  document.addEventListener('portfolio:world-home', goHome);
  document.addEventListener('keydown', cancelOnEscape);
  mapMarkers.addEventListener('click', handleMarkerClick);
  homeButton.addEventListener('click', driveHome);
  document.getElementById('worldRewardClose').addEventListener('click', closeReward);
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
      document.removeEventListener('portfolio:section-opened', onSectionOpened);
      document.removeEventListener('portfolio:world-home', goHome);
      document.removeEventListener('keydown', cancelOnEscape);
      mapMarkers.removeEventListener('click', handleMarkerClick);
      homeButton.removeEventListener('click', driveHome);
      document.getElementById('worldRewardClose').removeEventListener('click', closeReward);
      controls.dispose();
      renderer.dispose();
    },
  };
}
