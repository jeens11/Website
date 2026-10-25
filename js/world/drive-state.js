/**
 * Shared state contract adapted from the portfolio bundle the user provided:
 * `input.keys`, `input.joyX/joyY`, `car.x/z/heading/speed/slip/boost`,
 * `resetRequested`, and `moved`. Keeping it here makes controls and physics
 * easy to extend without coupling them to the renderer.
 */
export function createDriveState() {
  const start = { x: 0, z: 10, heading: 0 };

  return {
    input: {
      keys: new Set(),
      joyX: 0,
      joyY: 0,
    },
    car: {
      ...start,
      speed: 0,
      steer: 0,
      slip: 0,
      boost: 0,
    },
    start: { ...start },
    resetRequested: false,
    moved: false,
    // Set by the autopilot: { forward, brake, turn, throttle } while it drives.
    autoInput: null,
  };
}
