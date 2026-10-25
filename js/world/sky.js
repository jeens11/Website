// One full dusk-to-midnight-and-back cycle. The world opens at midnight.
const CYCLE_MS = 180000;
const STOP_OFFSETS = [0, 0.28, 0.46, 0.5, 1];

const NIGHT = {
  stops: ['#07041a', '#1b0c3d', '#3c2060', '#241046', '#0a0714'],
  fog: '#241046',
  hemi: 1.0,
  key: 1.3,
  stars: 0.8,
};
const DUSK = {
  stops: ['#2a1a5e', '#5a3488', '#c7739e', '#6b3a78', '#160b2c'],
  fog: '#4a2a66',
  hemi: 1.35,
  key: 1.65,
  stars: 0.12,
};

const lerp = (a, b, t) => a + (b - a) * t;

/** Slow day-to-night sky: gradient, fog, light levels and star brightness. */
export function createSky(THREE, scene, { hemiLight, keyLight, stars, still = false }) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;

  const nightStops = NIGHT.stops.map((hex) => new THREE.Color(hex));
  const duskStops = DUSK.stops.map((hex) => new THREE.Color(hex));
  const nightFog = new THREE.Color(NIGHT.fog);
  const duskFog = new THREE.Color(DUSK.fog);
  const mixed = new THREE.Color();
  let lastDraw = -Infinity;

  function draw(night) {
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    STOP_OFFSETS.forEach((offset, index) => {
      mixed.lerpColors(duskStops[index], nightStops[index], night);
      gradient.addColorStop(offset, `#${mixed.getHexString()}`);
    });
    context.fillStyle = gradient;
    context.fillRect(0, 0, 8, 512);
    texture.needsUpdate = true;
    scene.fog?.color.lerpColors(duskFog, nightFog, night);
  }

  /** Returns how dark it is, from 0 (dusk) to 1 (midnight). */
  function update(elapsed) {
    const night = still ? 1 : 0.5 + 0.5 * Math.cos((elapsed / CYCLE_MS) * Math.PI * 2);
    hemiLight.intensity = lerp(DUSK.hemi, NIGHT.hemi, night);
    keyLight.intensity = lerp(DUSK.key, NIGHT.key, night);
    stars.material.opacity = lerp(DUSK.stars, NIGHT.stars, night);
    // The gradient only needs repainting a few times a second.
    if (elapsed - lastDraw > 200) {
      draw(night);
      lastDraw = elapsed;
    }
    return night;
  }

  draw(1);
  return { update };
}
