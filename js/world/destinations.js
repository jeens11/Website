function makeBeaconTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,.9)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(canvas);
}

export function makeLabelTexture(THREE, section, visited = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 340;
  const context = canvas.getContext('2d');
  context.scale(2, 2);
  const gradient = context.createLinearGradient(0, 0, 960, 0);
  gradient.addColorStop(0, 'rgba(18, 8, 38, .94)');
  gradient.addColorStop(1, 'rgba(38, 14, 62, .94)');
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(2, 2, 956, 166, 26);
  context.fill();
  context.strokeStyle = section.color;
  context.lineWidth = 6;
  context.shadowColor = section.color;
  context.shadowBlur = 18;
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = section.color;
  context.beginPath();
  context.roundRect(26, 34, 100, 102, 18);
  context.fill();
  context.fillStyle = '#12082a';
  context.font = '500 54px "DM Mono", monospace';
  context.textAlign = 'center';
  context.fillText(section.number, 76, 106);
  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  context.font = '800 64px Manrope, Arial, sans-serif';
  context.fillText(section.mapLabel, 156, 108);
  if (visited) {
    context.fillStyle = section.color;
    context.font = '800 54px Manrope, Arial, sans-serif';
    context.textAlign = 'right';
    context.fillText('✓', 920, 106);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function addLandmark(THREE, group, kind, colorHex) {
  const tint = new THREE.Color(colorHex);
  const blue = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.92 });
  const pale = new THREE.MeshBasicMaterial({ color: tint.clone().lerp(new THREE.Color(0xffffff), 0.75), transparent: true, opacity: 0.9 });
  const darkBlue = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.35), emissive: tint.clone().multiplyScalar(0.6), emissiveIntensity: 0.9, metalness: 0.35, roughness: 0.3 });
  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  if (kind === 'people') {
    for (const x of [-0.78, 0, 0.78]) {
      add(new THREE.CylinderGeometry(0.055, 0.085, 1.1, 8), darkBlue, x, 0.92, 0);
      add(new THREE.SphereGeometry(0.2, 12, 10), pale, x, 1.62, 0);
    }
    add(new THREE.TorusGeometry(1.8, 0.025, 5, 60), blue, 0, 0.12, 0).rotation.x = Math.PI / 2;
  } else if (kind === 'projects') {
    const frame = add(new THREE.BoxGeometry(1.4, 1.4, 1.4), blue, 0, 1.42, 0);
    frame.material = new THREE.MeshBasicMaterial({ color: tint, wireframe: true, transparent: true, opacity: 0.9 });
    add(new THREE.IcosahedronGeometry(0.46, 1), darkBlue, 0, 1.42, 0);
    for (const [x, y, z] of [[-0.95, 0.55, 0], [0.95, 0.55, 0], [0, 2.35, 0]]) {
      add(new THREE.BoxGeometry(0.25, 0.25, 0.25), pale, x, y, z);
    }
  } else if (kind === 'skills') {
    [-0.82, -0.28, 0.28, 0.82].forEach((x, index) => {
      const bar = add(new THREE.BoxGeometry(0.27, 0.8 + index * 0.35, 0.28), index % 2 ? pale : blue, x, 0.42 + (0.8 + index * 0.35) / 2, 0);
      bar.rotation.z = (index % 2 ? -1 : 1) * 0.045;
    });
    add(new THREE.TorusGeometry(1.42, 0.035, 5, 60), blue, 0, 0.08, 0).rotation.x = Math.PI / 2;
  } else if (kind === 'education') {
    const top = add(new THREE.BoxGeometry(1.62, 0.12, 1.62), blue, 0, 1.7, 0);
    top.rotation.y = Math.PI / 4;
    add(new THREE.BoxGeometry(0.78, 0.45, 0.78), darkBlue, 0, 1.38, 0);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.94, 5), pale, 0.55, 1.55, 0.2);
    add(new THREE.SphereGeometry(0.08, 8, 8), pale, 0.55, 1.05, 0.2);
  } else if (kind === 'philosophy') {
    // A faceted "idea" gem inside an open frame: values at the core, method around them.
    const frame = add(new THREE.OctahedronGeometry(1.05, 0), blue, 0, 1.55, 0);
    frame.material = new THREE.MeshBasicMaterial({ color: tint, wireframe: true, transparent: true, opacity: 0.85 });
    add(new THREE.OctahedronGeometry(0.42, 0), darkBlue, 0, 1.55, 0);
    add(new THREE.TorusGeometry(1.35, 0.03, 5, 64), pale, 0, 1.55, 0).rotation.x = Math.PI / 2.4;
    add(new THREE.TorusGeometry(1.5, 0.025, 5, 64), blue, 0, 0.1, 0).rotation.x = Math.PI / 2;
  } else {
    const outer = add(new THREE.TorusGeometry(0.82, 0.045, 7, 64), blue, 0, 1.32, 0);
    outer.rotation.x = Math.PI / 2;
    const inner = add(new THREE.TorusGeometry(0.43, 0.035, 7, 48), pale, 0, 1.32, 0);
    inner.rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.19, 12, 10), darkBlue, 0, 1.32, 0);
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      add(new THREE.SphereGeometry(0.075, 8, 8), pale, Math.cos(angle) * 1.2, 1.32, Math.sin(angle) * 1.2);
    }
  }

  const count = 220;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const white = new THREE.Color(0xffffff);
  const accent = tint.clone();
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.55 + Math.random() * 1.15;
    const height = 0.4 + Math.random() * 2.65;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = height;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
    const color = Math.random() < 0.55 ? accent : white;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  const particles = new THREE.BufferGeometry();
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const cloud = new THREE.Points(particles, new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 0.11,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  cloud.position.y = 0.15;
  group.add(cloud);
  return cloud;
}

export function createDestinations(THREE, scene, sections) {
  const radius = 32.5;
  const gates = [];
  const boostPads = [];
  const padBaseGeometry = new THREE.PlaneGeometry(3.4, 2.6);
  const beaconGeometry = new THREE.CylinderGeometry(0.55, 1.1, 46, 20, 1, true);
  const beaconTexture = makeBeaconTexture(THREE);

  sections.forEach((section, index) => {
    const tint = new THREE.Color(section.color);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: tint.clone().multiplyScalar(0.28), emissive: tint.clone().multiplyScalar(0.55),
      emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.3,
    });
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.95 });
    const haloMaterial = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.3 });
    const padMaterial = new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(0.55), transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.95 });
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / sections.length);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(-x, -z);
    scene.add(group);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(5.35, 5.6, 0.25, 48), platformMaterial);
    platform.position.y = 0.1;
    platform.receiveShadow = true;
    group.add(platform);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(5.42, 0.14, 6, 72), haloMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.23;
    group.add(halo);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.07, 6, 72), edgeMaterial);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.24;
    group.add(trim);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.035, 5, 72), edgeMaterial);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.25;
    group.add(innerRing);

    const landmark = new THREE.Group();
    landmark.position.set(0, 0.35, 0);
    group.add(landmark);
    const particles = addLandmark(THREE, landmark, section.landmark, section.color);
    const light = new THREE.PointLight(tint, 9, 20, 2);
    light.position.set(0, 2.2, 0);
    group.add(light);

    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeLabelTexture(THREE, section),
      transparent: true,
      depthTest: false,
    }));
    label.position.set(0, 4.15, 0);
    label.scale.set(7.3, 1.29, 1);
    group.add(label);

    // A tall light column so every platform can be found from anywhere in the arena.
    const beacon = new THREE.Mesh(beaconGeometry, new THREE.MeshBasicMaterial({
      color: tint, map: beaconTexture, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    beacon.position.y = 23;
    group.add(beacon);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 3.35, 6),
      new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.5 }),
    );
    beam.position.y = 1.9;
    group.add(beam);

    const hitbox = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 5.3),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    hitbox.position.set(0, 2.7, 0.04);
    group.add(hitbox);

    gates.push({
      section,
      group,
      particles,
      pos: new THREE.Vector3(x, 0, z),
      hitbox,
      angle,
      phase: index * 0.8,
      landmark,
      halo,
      light,
      label,
      beacon,
      visited: false,
      color: tint,
    });

    for (let step = 7; step < radius - 4; step += 2.1) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 + (step % 4) * 0.012, 6, 6),
        new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.4 + 0.2 * Math.sin(step + index) }),
      );
      dot.position.set(Math.cos(angle) * step, 0.045, Math.sin(angle) * step);
      scene.add(dot);
    }

    const padDistance = 15;
    const padX = Math.cos(angle) * padDistance;
    const padZ = Math.sin(angle) * padDistance;
    const padGroup = new THREE.Group();
    padGroup.position.set(padX, 0, padZ);
    padGroup.rotation.y = Math.atan2(Math.cos(angle), Math.sin(angle));
    scene.add(padGroup);
    const base = new THREE.Mesh(padBaseGeometry, padMaterial);
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.04;
    padGroup.add(base);
    for (const step of [-0.75, 0, 0.75]) {
      for (const side of [-1, 1]) {
        const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.76), arrowMaterial);
        arrow.position.set(side * 0.34, 0.08, step);
        arrow.rotation.y = side * 0.6;
        padGroup.add(arrow);
      }
    }
    boostPads.push({ position: new THREE.Vector3(padX, 0, padZ), cooldownUntil: 0, arrowMaterial });
  });

  return { gates, boostPads, radius };
}
