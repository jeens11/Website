// Mostly lilac and white, with a touch of pink, so the skyline stays calm.
export const PALETTE = [0xb9a4ff, 0xe9e2ff, 0xb9a4ff, 0xf58fbf, 0xd9ccff];

export function createCenterpiece(THREE, scene) {
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const part = Math.random();
    let x = 0;
    let y = 0;
    let z = 0;
    if (part < 0.17) {
      const u = Math.random() * 2 - 1;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.88 * Math.cbrt(Math.random());
      const spread = Math.sqrt(1 - u * u);
      x = Math.cos(angle) * spread * radius;
      y = 3.35 + u * radius;
      z = Math.sin(angle) * spread * radius;
    } else if (part < 0.48) {
      const t = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random());
      const width = 0.72 + 0.28 * Math.sin(t * Math.PI);
      x = Math.cos(angle) * radius * width;
      y = 0.55 + t * 2.25;
      z = Math.sin(angle) * radius * 0.5;
    } else if (part < 0.7) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const t = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.27 * Math.sqrt(Math.random());
      x = side * (0.9 + t * 1.15) + Math.cos(angle) * radius;
      y = 2.45 - t * 2.1 + Math.sin(angle) * radius;
      z = Math.sin(angle) * radius * 0.75;
    } else if (part < 0.93) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const t = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.31 * Math.sqrt(Math.random());
      x = side * (0.43 + t * 0.2) + Math.cos(angle) * radius;
      y = 0.62 - t * 3.05 + Math.sin(angle) * radius;
      z = Math.sin(angle) * radius * 0.75;
    } else {
      const side = Math.random() < 0.5 ? -1 : 1;
      const t = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.25 * Math.sqrt(Math.random());
      x = side * (0.56 + t * 0.47) + Math.cos(angle) * radius;
      y = -2.48 + Math.sin(angle) * radius * 0.6;
      z = -0.04 + t * 0.55 + Math.sin(angle) * radius;
    }

    positions[index * 3] = x;
    positions[index * 3 + 1] = 9.6 + y;
    positions[index * 3 + 2] = z;
    const color = new THREE.Color(PALETTE[Math.floor(Math.random() * PALETTE.length)]).lerp(new THREE.Color(0xffffff), Math.random() < 0.35 ? 0.65 : 0.1);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sculpture = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 0.085,
    transparent: true,
    opacity: 0.86,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  scene.add(sculpture);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(4.9, 24, 20),
    new THREE.MeshBasicMaterial({ color: 0x7a4bd0, wireframe: true, transparent: true, opacity: 0.09 }),
  );
  shell.position.y = 9.6;
  scene.add(shell);

  const rings = [];
    for (let index = 0; index < 3; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.8 + index * 0.46, 0.03, 4, 100), new THREE.MeshBasicMaterial({ color: [0xb9a4ff, 0xe9e2ff, 0xf58fbf][index], transparent: true, opacity: 0.28 }));
    ring.position.y = 9.6;
    ring.rotation.x = Math.PI / 2 + index * 0.18;
    ring.rotation.z = index * 0.52;
    scene.add(ring);
    rings.push(ring);
  }

  return { sculpture, shell, rings };
}

export function createOuterPillars(THREE, scene) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x120b24, metalness: 0.5, roughness: 0.6, emissive: 0x08041a });
  const glowMaterials = PALETTE.map((color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  const pillars = [];
  const count = 36;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 51 + (index % 4) * 2.8;
    const height = 3.5 + (index % 5) * 2.1 + (index % 3);
    const tint = index % PALETTE.length;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, height, 1.4), bodyMaterial);
    pillar.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
    pillar.rotation.y = Math.PI / 2 - angle;
    group.add(pillar);
    // Glowing neon strips on the outward face and a bright cap.
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, height * 0.86, 0.06), glowMaterials[tint]);
    strip.position.set(0, 0, -0.72);
    pillar.add(strip);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.5), glowMaterials[tint]);
    cap.position.y = height / 2;
    pillar.add(cap);
    pillars.push({ pillar, height, phase: index * 0.55, strip });
  }
  scene.add(group);
  return {
    group,
    update(now) {
      pillars.forEach(({ strip, phase }) => {
        strip.material.opacity = 0.55 + 0.4 * Math.sin(now * 0.002 + phase);
      });
    },
  };
}

/** Drifting colored fireflies that fill the arena with motion. */
export function createSparks(THREE, scene, count = 420) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const tint = new THREE.Color();
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 56;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = Math.random() * 24;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
    tint.set(PALETTE[index % PALETTE.length]);
    colors[index * 3] = tint.r; colors[index * 3 + 1] = tint.g; colors[index * 3 + 2] = tint.b;
    seeds[index] = Math.random() * 100;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.14, vertexColors: true, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(points);
  return {
    points,
    update(delta, now) {
      for (let index = 0; index < count; index += 1) {
        const seed = seeds[index];
        positions[index * 3] += Math.sin(now * 0.0004 + seed) * delta * 0.7;
        positions[index * 3 + 1] += delta * (0.35 + (seed % 1) * 0.6);
        positions[index * 3 + 2] += Math.cos(now * 0.0004 + seed * 1.3) * delta * 0.7;
        if (positions[index * 3 + 1] > 24) positions[index * 3 + 1] = 0.2;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}
