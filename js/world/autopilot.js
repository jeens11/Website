const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

// Braking deceleration in drive-physics.js is 18 units/s², so v² / 36 is the stopping distance.
const BRAKE_FACTOR = 36;
const GIVE_UP_MS = 25000;

/**
 * Drives the car to a point by writing the same throttle, brake and steering
 * a player would (`driveState.autoInput`), so the physics, effects and camera
 * behave exactly as they do under manual control.
 */
export function createAutopilot(driveState) {
  let target = null;
  let startedAt = 0;

  function start(destination, now = performance.now()) {
    target = destination;
    startedAt = now;
  }

  function cancel() {
    target = null;
    driveState.autoInput = null;
  }

  /** Steer toward the target; returns true on the frame the car arrives. */
  function update(now) {
    if (!target) return false;
    const { car } = driveState;
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const distance = Math.hypot(dx, dz);
    const stopRadius = target.stopRadius ?? 6;

    const arrived = distance < stopRadius + 1.5 && Math.abs(car.speed) < 1.2;
    if (arrived || now - startedAt > GIVE_UP_MS) {
      const done = target;
      cancel();
      done.onArrive?.();
      return true;
    }

    // Three.js headings face -Z, matching drive-physics.js.
    const turn = angleDelta(car.heading, Math.atan2(-dx, -dz));
    const stoppingDistance = car.speed > 0 ? (car.speed * car.speed) / BRAKE_FACTOR : 0;
    const brake = distance - stopRadius < stoppingDistance + 1;
    driveState.autoInput = {
      forward: !brake,
      brake: brake && car.speed > 0.3,
      // Positive steering turns right, which lowers the heading.
      turn: clamp(-turn * 2.2, -1, 1),
      // Ease off in sharp turns so the car does not circle its target.
      throttle: clamp(1 - Math.abs(turn) / 1.6, 0.35, 1),
    };
    return false;
  }

  return {
    start,
    cancel,
    update,
    get target() { return target; },
  };
}
