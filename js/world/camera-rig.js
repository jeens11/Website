const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const damp = (current, target, rate, delta) => current + (target - current) * (1 - Math.exp(-rate * delta));

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * Low, cinematic chase camera. It sits close behind the car, swings out in
 * turns and drifts, widens the field of view with speed, rolls slightly into
 * corners, and eases toward a destination when the car gets near one.
 */
export function createCameraRig(THREE, camera, {
  behind = 11.5,
  height = 4.6,
  lookAhead = 7,
  lookHeight = 1.3,
  baseFov = 58,
  maxRadius = 47,
  destinationFocusRange = 30,
  destinationFocusStrength = 0.42,
} = {}) {
  const cameraFocus = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let cameraHeading = 0;
  let distance = behind;
  let lift = height;
  let fov = baseFov;
  let roll = 0;
  let hasFocus = false;

  function reset(car, heading = car.rotation.y) {
    cameraHeading = heading;
    distance = behind;
    lift = height;
    fov = baseFov;
    roll = 0;
    hasFocus = false;
    update({ car, heading, delta: 0 });
  }

  function update({
    car, heading, speed = 0, steer = 0, slip = 0, boosting = false, drifting = false,
    destination = null, destinationDistance = Infinity, now = 0, delta,
  }) {
    const speedNorm = clamp(Math.abs(speed) / 20, 0, 1);
    let targetHeading = heading;
    let proximity = 0;

    if (destination && Number.isFinite(destinationDistance) && destinationDistance > 0.75) {
      proximity = clamp((destinationFocusRange - destinationDistance) / (destinationFocusRange - 6), 0, 1);
      const toX = destination.x - car.position.x;
      const toZ = destination.z - car.position.z;
      const destinationHeading = Math.atan2(-toX, -toZ);
      targetHeading += angleDelta(heading, destinationHeading) * proximity * proximity * destinationFocusStrength;
    }

    if (!hasFocus) cameraHeading = heading;
    else {
      // The camera trails the car's heading: loose while drifting so the car
      // visibly rotates in frame, tighter on a straight.
      const response = drifting ? 2.6 : 4.6;
      cameraHeading += angleDelta(cameraHeading, targetHeading) * (1 - Math.exp(-response * delta));
    }

    // Pull back and rise a little with speed, and again near a destination so
    // the whole landmark fits in view.
    const targetDistance = behind + speedNorm * 3.2 + (boosting ? 1.8 : 0) + proximity * 3.5;
    const targetLift = height + speedNorm * 0.9 + proximity * 2.4;
    distance = damp(distance, targetDistance, 3.2, delta || 0.016);
    lift = damp(lift, targetLift, 3.2, delta || 0.016);

    const forwardX = -Math.sin(cameraHeading);
    const forwardZ = -Math.cos(cameraHeading);
    const rightX = Math.cos(cameraHeading);
    const rightZ = -Math.sin(cameraHeading);
    // Swing the camera sideways opposite the slide so drifts feel dramatic.
    const sway = clamp(slip * 0.22, -2.2, 2.2) - steer * speedNorm * 0.6;

    let camX = car.position.x - forwardX * distance - rightX * sway;
    let camZ = car.position.z - forwardZ * distance - rightZ * sway;
    // Keep the camera inside the skyline pillars.
    const radial = Math.hypot(camX, camZ);
    if (radial > maxRadius) {
      camX *= maxRadius / radial;
      camZ *= maxRadius / radial;
    }
    const shake = boosting ? Math.sin(now * 0.09) * 0.05 : 0;
    camera.position.set(camX, car.position.y + lift + shake, camZ);

    lookTarget.set(
      car.position.x + forwardX * (lookAhead + speedNorm * 4),
      lookHeight,
      car.position.z + forwardZ * (lookAhead + speedNorm * 4),
    );
    if (!hasFocus) {
      cameraFocus.copy(lookTarget);
      hasFocus = true;
    } else {
      cameraFocus.lerp(lookTarget, 1 - Math.exp(-7 * delta));
    }
    camera.lookAt(cameraFocus);

    roll = damp(roll, -steer * speedNorm * 0.045 - clamp(slip, -4, 4) * 0.004, 4, delta || 0.016);
    camera.rotateZ(roll);

    const targetFov = baseFov + speedNorm * 9 + (boosting ? 9 : 0);
    fov = damp(fov, targetFov, 4, delta || 0.016);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  return { reset, update };
}
