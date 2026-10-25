// Left to right as you face the Work platform: Project 01, then Project 02.
const PROJECTS = [
  { id: 'four-part-harmony', title: 'Four-Part Harmony', subtitle: 'Project 01 · Group Project 1', image: 'assets/cover-000.webp', side: -1 },
  { id: 'airsculpt', title: 'AirSculpt', subtitle: 'Project 02 · Group Project 2', image: 'assets/airsculpt/studio.webp', side: 1 },
];
const WIDTH = 6.4;
const HEIGHT = 4;

function makeCaptionTexture(THREE, project, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 200;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(14, 8, 30, .96)';
  context.beginPath();
  context.roundRect(0, 0, 1024, 200, 22);
  context.fill();
  context.fillStyle = color;
  context.fillRect(40, 48, 8, 104);
  context.fillStyle = '#ffffff';
  context.font = '700 72px Manrope, Arial, sans-serif';
  context.fillText(project.title, 78, 110);
  context.fillStyle = '#c9bfe6';
  context.font = '500 34px "DM Mono", monospace';
  context.fillText(`${project.subtitle.toUpperCase()}  ·  PRESS E TO OPEN`, 80, 164);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Screenshot billboards beside the Projects destination; each opens its case study. */
export function createBillboards(THREE, scene, gate, { anisotropy = 1 } = {}) {
  const loader = new THREE.TextureLoader();
  const color = `#${gate.color.getHexString()}`;
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x15102a, metalness: 0.5, roughness: 0.4 });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: gate.color });
  const tangentX = Math.cos(gate.angle + Math.PI / 2);
  const tangentZ = Math.sin(gate.angle + Math.PI / 2);

  return PROJECTS.map((project) => {
    const group = new THREE.Group();
    const x = Math.cos(gate.angle) * 35 + tangentX * project.side * 10;
    const z = Math.sin(gate.angle) * 35 + tangentZ * project.side * 10;
    group.position.set(x, 0, z);
    // Face a point between the arena centre and the Projects platform.
    group.rotation.y = Math.atan2(gate.pos.x * 0.55 - x, gate.pos.z * 0.55 - z);
    scene.add(group);

    const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x222034 });
    loader.load(project.image, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = anisotropy;
      // Fit the screenshot inside the frame at its own aspect ratio (no stretching).
      const aspect = texture.image.width / texture.image.height;
      if (aspect > WIDTH / HEIGHT) screen.scale.y = WIDTH / aspect / HEIGHT;
      else screen.scale.x = HEIGHT * aspect / WIDTH;
      screenMaterial.map = texture;
      screenMaterial.color.set(0xffffff);
      screenMaterial.needsUpdate = true;
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.36, HEIGHT + 0.36, 0.24), frameMaterial);
    frame.position.y = 2.6 + HEIGHT / 2;
    frame.castShadow = true;
    group.add(frame);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, HEIGHT), screenMaterial);
    screen.position.set(0, frame.position.y, 0.13);
    group.add(screen);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.5, 0.07, 0.3), glowMaterial);
    edge.position.y = 2.6 + HEIGHT + 0.22;
    group.add(edge);

    const caption = new THREE.Mesh(
      new THREE.PlaneGeometry(WIDTH, WIDTH * 200 / 1024),
      new THREE.MeshBasicMaterial({ map: makeCaptionTexture(THREE, project, color), transparent: true }),
    );
    caption.position.set(0, 1.85, 0.13);
    group.add(caption);

    for (const postX of [-WIDTH / 2 + 0.4, WIDTH / 2 - 0.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.6, 8), frameMaterial);
      post.position.set(postX, 1.3, 0);
      post.castShadow = true;
      group.add(post);
    }

    const spot = new THREE.PointLight(gate.color, 6, 10, 2);
    spot.position.set(0, 5, 2.5);
    group.add(spot);

    return { ...project, group, hitboxes: [screen, caption], pos: new THREE.Vector3(x, 0, z), spot };
  });
}
