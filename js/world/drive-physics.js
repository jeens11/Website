export const ARENA_RADIUS = 41;
const damp = (current, target, amount) => current + (target - current) * amount;

/** Advance the shared vehicle state by one frame, independent of Three.js. */
export function stepDrive(state, { delta, now, boostPads = [] }) {
  const { input, car } = state;
  const { keys, joyX, joyY } = input;

  const left = keys.has('left') || joyX < -0.17;
  const right = keys.has('right') || joyX > 0.17;
  const forward = keys.has('up') || joyY > 0.17;
  const reverse = keys.has('down') || joyY < -0.22;
  const drifting = keys.has('drift');
  const turnInput = Number(right) - Number(left);

  let boosting = car.boost > 0;
  if (!boosting && Math.abs(car.speed) > 0.3) {
    const pad = boostPads.find((item) => now > item.cooldownUntil
      && Math.hypot(car.x - item.position.x, car.z - item.position.z) < 1.9);
    if (pad) {
      pad.cooldownUntil = now + 3200;
      car.boost = 1.3;
      car.speed = Math.sign(car.speed) * Math.min(21, Math.abs(car.speed) + 5.5);
      boosting = true;
    }
  }

  const acceleration = boosting ? 15 : (drifting ? 12.5 : 9.5);
  const maxForward = boosting ? 23 : (drifting ? 19 : 15);
  if (forward) car.speed = Math.min(maxForward, car.speed + acceleration * delta);
  else if (reverse) {
    if (car.speed > 0.25) car.speed = Math.max(0, car.speed - 18 * delta);
    else car.speed = Math.max(-5.5, car.speed - 8.5 * delta);
  } else {
    car.speed *= Math.exp(-(drifting ? 0.2 : 0.52) * delta);
  }
  if (Math.abs(car.speed) < 0.035) car.speed = 0;

  car.steer = damp(car.steer, turnInput, Math.min(1, delta * 8));
  car.heading -= car.steer
    * (drifting ? 1.75 : 1.28)
    * delta
    * Math.min(1, Math.abs(car.speed) / 2.5)
    * (car.speed < 0 ? -1 : 1);

  const slideTarget = drifting ? turnInput * Math.abs(car.speed) * 0.24 : 0;
  car.slip = damp(car.slip, slideTarget, Math.min(1, delta * (drifting ? 4.2 : 8)));

  // Three.js car models face local -Z; a right turn therefore decreases Y heading.
  const headingX = -Math.sin(car.heading);
  const headingZ = -Math.cos(car.heading);
  const rightX = Math.cos(car.heading);
  const rightZ = -Math.sin(car.heading);
  const previousX = car.x;
  const previousZ = car.z;

  car.x += (headingX * car.speed + rightX * car.slip) * delta;
  car.z += (headingZ * car.speed + rightZ * car.slip) * delta;
  car.boost = Math.max(0, car.boost - delta);
  state.moved ||= Math.hypot(car.x - previousX, car.z - previousZ) > 0.001;

  // Soft arena edge: keep the car inside the skyline pillars and let it slide
  // along the boundary instead of stopping dead.
  const reach = Math.hypot(car.x, car.z);
  if (reach > ARENA_RADIUS) {
    car.x *= ARENA_RADIUS / reach;
    car.z *= ARENA_RADIUS / reach;
    car.speed *= Math.exp(-2.4 * delta);
  }

  return { headingX, headingZ, speed: car.speed, boosting };
}
