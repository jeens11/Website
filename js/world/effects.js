/** Soft additive particle pool used for drift smoke, sparks, and boost flames. */
export function createEffects(THREE, scene, max = 220) {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const base = new Float32Array(max * 3);
  const velocity = new Float32Array(max * 3);
  const life = new Float32Array(max);
  const decay = new Float32Array(max);
  let cursor = 0;

  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const ctx = sprite.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    map: new THREE.CanvasTexture(sprite),
    size: 0.75,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  points.frustumCulled = false;
  scene.add(points);

  const tmp = new THREE.Color();
  const worldPoint = new THREE.Vector3();

  function emit(x, y, z, vx, vy, vz, color, ttl = 0.6) {
    const i = cursor;
    cursor = (cursor + 1) % max;
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    velocity[i * 3] = vx; velocity[i * 3 + 1] = vy; velocity[i * 3 + 2] = vz;
    tmp.set(color);
    base[i * 3] = tmp.r; base[i * 3 + 1] = tmp.g; base[i * 3 + 2] = tmp.b;
    life[i] = 1;
    decay[i] = 1 / ttl;
  }

  /** Emit smoke/sparks/flames relative to the car for this frame. */
  function emitFromCar(car, state, delta, drifting, boosting) {
    const speed = Math.abs(state.speed);
    const rate = delta * 60;
    const wantSmoke = drifting && speed > 4 && Math.abs(state.slip) > 0.6;
    if (wantSmoke) {
      for (const side of [-1, 1]) {
        for (let n = 0; n < Math.ceil(rate); n += 1) {
          worldPoint.set(side * 0.95, 0.2, 1.2);
          car.localToWorld(worldPoint);
          emit(worldPoint.x, worldPoint.y, worldPoint.z,
            (Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 1.1, (Math.random() - 0.5) * 1.6,
            Math.random() < 0.25 ? '#f58fbf' : '#e9e2ff', 0.55);
        }
      }
    }
    if (boosting) {
      for (let n = 0; n < Math.ceil(rate * 2); n += 1) {
        worldPoint.set((Math.random() - 0.5) * 0.9, 0.55, 1.9);
        car.localToWorld(worldPoint);
        const back = 5 + Math.random() * 4;
        const dirX = Math.sin(car.rotation.y);
        const dirZ = Math.cos(car.rotation.y);
        emit(worldPoint.x, worldPoint.y, worldPoint.z,
          dirX * back, (Math.random() - 0.4) * 0.8, dirZ * back,
          Math.random() < 0.5 ? '#d9ccff' : '#f08a5d', 0.4);
      }
    }
  }

  function update(delta) {
    for (let i = 0; i < max; i += 1) {
      if (life[i] <= 0) {
        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0;
        continue;
      }
      life[i] -= decay[i] * delta;
      positions[i * 3] += velocity[i * 3] * delta;
      positions[i * 3 + 1] += velocity[i * 3 + 1] * delta;
      positions[i * 3 + 2] += velocity[i * 3 + 2] * delta;
      const fade = Math.max(0, life[i]);
      colors[i * 3] = base[i * 3] * fade;
      colors[i * 3 + 1] = base[i * 3 + 1] * fade;
      colors[i * 3 + 2] = base[i * 3 + 2] * fade;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  return { emit, emitFromCar, update };
}
