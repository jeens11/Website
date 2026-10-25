import { stepDrive } from './drive-physics.js';

const WHEEL_RADIUS = 0.36;
const MAX_STEER_ANGLE = 0.55; // radians the front wheels can turn

export function createPlayer(THREE, scene, driveState) {
  const car = new THREE.Group();
  car.name = 'portfolio-car';
  car.scale.setScalar(1.12);
  scene.add(car);

  // `chassis` leans and pitches; wheels stay planted on the ground.
  const chassis = new THREE.Group();
  car.add(chassis);

  const body = new THREE.MeshStandardMaterial({ color: 0xe9e2ff, emissive: 0x1d1a30, emissiveIntensity: 0.3, metalness: 0.55, roughness: 0.28 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f1ff, emissive: 0x201a3a, emissiveIntensity: 0.3, metalness: 0.3, roughness: 0.3 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0xb9a4ff, emissive: 0xb9a4ff, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a1030, metalness: 0.6, roughness: 0.15, emissive: 0x2b1763, emissiveIntensity: 0.5 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x0a0812, roughness: 0.9 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xcfc6ee, emissive: 0x3a3358, emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.25 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff4c8 });
  const brakeLamp = new THREE.MeshBasicMaterial({ color: 0xff2d55 });

  function box(width, height, depth, material, x, y, z, parent = chassis) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  // Forward is local -Z. The nose carries the headlights.
  box(2, 0.5, 3.6, body, 0, 0.62, 0);
  box(1.8, 0.2, 0.9, body, 0, 0.82, -1.25).rotation.x = 0.18;           // sloped hood
  box(1.5, 0.6, 1.65, glass, 0, 1.12, 0.2);                              // cabin
  box(1.62, 0.09, 1.78, white, 0, 1.46, 0.2);                            // roof
  box(0.14, 0.02, 3.4, white, 0, 0.9, 0).position.y = 0.885;             // center stripe
  box(2.1, 0.12, 3.3, cyan, 0, 0.36, 0);                                 // glowing skirt
  box(1.9, 0.12, 0.28, white, 0, 0.4, -1.85);                            // front splitter
  // Spoiler
  box(1.9, 0.09, 0.5, white, 0, 1.24, 1.72);
  box(0.1, 0.4, 0.1, white, -0.7, 1.02, 1.7);
  box(0.1, 0.4, 0.1, white, 0.7, 1.02, 1.7);
  // Lights
  box(0.4, 0.15, 0.08, lamp, -0.65, 0.78, -1.81);
  box(0.4, 0.15, 0.08, lamp, 0.65, 0.78, -1.81);
  const tailL = box(0.5, 0.14, 0.08, brakeLamp, -0.62, 0.74, 1.81);
  const tailR = box(0.5, 0.14, 0.08, brakeLamp, 0.62, 0.74, 1.81);

  // Wheels: pivot (steers) > spinner (rolls). Front pivots turn, rear stay straight.
  const wheels = [];
  for (const x of [-1.05, 1.05]) {
    for (const z of [-1.2, 1.2]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, WHEEL_RADIUS, z);
      car.add(pivot);
      const spinner = new THREE.Group();
      pivot.add(spinner);

      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.3, 24), tire);
      tyre.rotation.z = Math.PI / 2;
      spinner.add(tyre);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_RADIUS * 0.68, WHEEL_RADIUS * 0.68, 0.32, 20), rim);
      disc.rotation.z = Math.PI / 2;
      spinner.add(disc);
      // Spokes make the rolling visible.
      for (let s = 0; s < 3; s += 1) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, WHEEL_RADIUS * 1.25, 0.06), tire);
        spoke.rotation.x = (s / 3) * Math.PI;
        spoke.position.x = Math.sign(x) * 0.01;
        spinner.add(spoke);
      }
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.1), cyan);
      tread.position.set(0, WHEEL_RADIUS - 0.02, 0);
      spinner.add(tread);

      wheels.push({ pivot, spinner, front: z < 0 });
    }
  }

  // Headlight
  const headlight = new THREE.SpotLight(0xfff0d0, 90, 38, 0.55, 0.6, 1.5);
  headlight.position.set(0, 0.9, -1.6);
  headlight.target.position.set(0, 0, -14);
  chassis.add(headlight, headlight.target);

  car.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });

  // Visible headlight beams (added after the shadow pass setup so they cast none).
  // They fade in as the sky darkens; see setNight().
  const beamCanvas = document.createElement('canvas');
  beamCanvas.width = 4;
  beamCanvas.height = 128;
  const beamContext = beamCanvas.getContext('2d');
  const beamGradient = beamContext.createLinearGradient(0, 0, 0, 128);
  beamGradient.addColorStop(0, 'rgba(255,255,255,.9)');
  beamGradient.addColorStop(1, 'rgba(255,255,255,0)');
  beamContext.fillStyle = beamGradient;
  beamContext.fillRect(0, 0, 4, 128);
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff1cf, map: new THREE.CanvasTexture(beamCanvas), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const beamLength = 10;
  const beamGeometry = new THREE.ConeGeometry(1.5, beamLength, 20, 1, true);
  for (const x of [-0.65, 0.65]) {
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    // Apex at the lamp, opening forward (-Z) and tilting slightly toward the ground.
    beam.rotation.x = Math.PI / 2 - 0.07;
    beam.position.set(x, 0.72, -1.85 - beamLength / 2);
    chassis.add(beam);
  }

  /** 0 = dusk, 1 = midnight: headlights matter more in the dark. */
  function setNight(night) {
    beamMaterial.opacity = 0.03 + 0.13 * night;
    headlight.intensity = 50 + 70 * night;
  }

  const underglow = new THREE.PointLight(0xb9a4ff, 5, 8, 2);
  underglow.position.set(0, 0.2, 0);
  car.add(underglow);
  const glowColor = new THREE.Color();

  let roll = 0;
  let pitch = 0;
  let spin = 0;
  let steerAngle = 0;
  let lastSpeed = 0;
  let bounce = 0;

  function reset() {
    const { start, car: state } = driveState;
    Object.assign(state, { x: start.x, z: start.z, heading: start.heading, speed: 0, steer: 0, slip: 0, boost: 0 });
    driveState.moved = false;
    driveState.resetRequested = false;
    car.position.set(start.x, 0, start.z);
    car.rotation.set(0, start.heading, 0);
    chassis.rotation.set(0, 0, 0);
    roll = pitch = spin = steerAngle = lastSpeed = 0;
    wheels.forEach(({ pivot, spinner }) => { pivot.rotation.y = 0; spinner.rotation.x = 0; });
    document.body.classList.remove('is-driving', 'is-boosting');
  }

  function update({ delta, now, boostPads = [] }) {
    const movement = stepDrive(driveState, { delta, now, boostPads });
    const { car: state, input } = driveState;
    const drifting = input.keys.has('drift');
    car.position.x = state.x;
    car.position.z = state.z;
    car.rotation.y = state.heading;

    // Front wheels visibly turn toward the steering input (right turn = negative Y).
    const targetSteer = -state.steer * MAX_STEER_ANGLE * (drifting ? 1.25 : 1);
    steerAngle += (targetSteer - steerAngle) * (1 - Math.exp(-14 * delta));

    // Rolling: wheel angular speed = ground speed / radius. Forward is -Z, so
    // a positive speed rotates the wheel negatively about X.
    spin -= (state.speed / WHEEL_RADIUS) * delta;
    wheels.forEach(({ pivot, spinner, front }) => {
      pivot.rotation.y = front ? steerAngle : 0;
      spinner.rotation.x = spin;
    });

    // Body roll into turns, pitch under acceleration/braking, small road bounce.
    const accel = delta > 0 ? (state.speed - lastSpeed) / delta : 0;
    lastSpeed = state.speed;
    const speedNorm = Math.min(1, Math.abs(state.speed) / 15);
    const targetRoll = state.steer * speedNorm * 0.075 + state.slip * 0.012;
    const targetPitch = Math.max(-0.05, Math.min(0.05, accel * 0.004));
    roll += (targetRoll - roll) * (1 - Math.exp(-8 * delta));
    pitch += (targetPitch - pitch) * (1 - Math.exp(-8 * delta));
    bounce = Math.abs(state.speed) > 0.3 ? Math.sin(now * 0.02) * 0.012 * speedNorm : 0;
    chassis.rotation.z = roll;
    chassis.rotation.x = pitch;
    // Slide angle: the car body yaws a little off its travel line in a drift.
    chassis.rotation.y = -state.slip * 0.045;
    chassis.position.y = bounce;

    // Brake lights flare when braking or reversing.
    const braking = input.keys.has('down') || input.joyY < -0.22 || Boolean(driveState.autoInput?.brake);
    brakeLamp.color.setHex(braking ? 0xff6b86 : 0xc2183a);
    tailL.scale.y = tailR.scale.y = braking ? 1.6 : 1;

    // Underglow shifts color with the driving mode.
    glowColor.set(movement.boosting ? 0xf08a5d : (drifting && Math.abs(state.slip) > 0.5 ? 0xf58fbf : 0xb9a4ff));
    underglow.color.lerp(glowColor, 1 - Math.exp(-10 * delta));
    cyan.emissive.copy(underglow.color);
    cyan.color.copy(underglow.color);
    underglow.intensity = movement.boosting ? 14 : 6;

    const driving = Math.abs(state.speed) > 0.08 || inputIsActive(input);
    document.body.classList.toggle('is-driving', driving);
    document.body.classList.toggle('is-boosting', movement.boosting);
    return { ...movement, drifting, braking };
  }

  return { car, update, reset, setNight };
}

function inputIsActive(input) {
  return input.keys.size > 0 || Math.abs(input.joyX) > 0.08 || Math.abs(input.joyY) > 0.08;
}
