// Beside the starting car, on the right of the opening view.
const POST_X = 6.5;
const POST_Z = 8;

function makeBoardTexture(THREE, section) {
  const canvas = document.createElement('canvas');
  canvas.width = 1040;
  canvas.height = 200;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(18, 8, 38, .95)';
  context.beginPath();
  context.roundRect(6, 6, 1028, 188, 30);
  context.fill();
  context.strokeStyle = section.color;
  context.lineWidth = 8;
  context.stroke();
  context.fillStyle = section.color;
  context.beginPath();
  context.roundRect(28, 32, 136, 136, 20);
  context.fill();
  context.fillStyle = '#12082a';
  context.font = '500 72px "DM Mono", monospace';
  context.textAlign = 'center';
  context.fillText(section.number, 96, 126);
  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  context.font = '800 84px Manrope, Arial, sans-serif';
  context.fillText(section.mapLabel, 196, 130);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A signpost by the start with one board per section, each turned toward its platform. */
export function createSignpost(THREE, scene, gates) {
  const group = new THREE.Group();
  group.position.set(POST_X, 0, POST_Z);
  scene.add(group);

  const postMaterial = new THREE.MeshStandardMaterial({ color: 0xe9e2ff, emissive: 0x3a2a66, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.35 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.7, 10), postMaterial);
  pole.position.y = 2.35;
  pole.castShadow = true;
  group.add(pole);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xb9a4ff }));
  cap.position.y = 4.78;
  group.add(cap);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.82, 40),
    new THREE.MeshBasicMaterial({ color: 0xb9a4ff, transparent: true, opacity: 0.6, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  const boardGeometry = new THREE.PlaneGeometry(2.6, 0.5);
  const boards = gates.map((gate, index) => {
    const pivot = new THREE.Group();
    pivot.position.y = 4.25 - index * 0.62;
    // Local +X points along the board, toward the platform.
    pivot.rotation.y = Math.atan2(-(gate.pos.z - POST_Z), gate.pos.x - POST_X);
    group.add(pivot);
    const material = new THREE.MeshBasicMaterial({ map: makeBoardTexture(THREE, gate.section), transparent: true });
    // Two single-sided faces so the text reads correctly from either side.
    const front = new THREE.Mesh(boardGeometry, material);
    front.position.set(1.42, 0, 0.012);
    const back = new THREE.Mesh(boardGeometry, material);
    back.position.set(1.42, 0, -0.012);
    back.rotation.y = Math.PI;
    pivot.add(front, back);
    return { gate, meshes: [front, back] };
  });

  return { boards, hitboxes: boards.flatMap((board) => board.meshes) };
}
