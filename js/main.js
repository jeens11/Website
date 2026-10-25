import { portfolioSections } from './portfolio-data.js';
import { createControls } from './controls.js';
import { createNavigation } from './navigation.js';
import { createDriveState } from './world/drive-state.js';
import { startWorld } from './world/world.js';
import { createAudio } from './audio.js';

const view = document.getElementById('contentView');
const classic = document.getElementById('classicSite');
const driveState = createDriveState();
const audio = createAudio();
let worldReady = false;
let worldStart;
audio.setDrivingActive(false);

// Browsers only allow sound after a gesture: start on the first one.
const unlock = () => {
  if (!document.body.classList.contains('portfolio-mode')) audio.unlock();
};
['pointerdown', 'keydown', 'touchstart'].forEach((type) => {
  document.addEventListener(type, unlock, { passive: true });
});

const soundToggle = document.getElementById('soundToggle');
function paintSoundToggle() {
  const on = audio.isEnabled();
  soundToggle.setAttribute('aria-pressed', String(on));
  soundToggle.classList.toggle('is-on', on);
  soundToggle.querySelector('.sound-label').textContent = on ? 'Sound on' : 'Sound off';
}
soundToggle.addEventListener('click', () => audio.toggle());
audio.onChange(paintSoundToggle);
paintSoundToggle();

const controls = createControls({
  driveState,
  canDrive: () => worldReady && !view.classList.contains('open') && !classic.classList.contains('open'),
});
const navigation = createNavigation({ sections: portfolioSections, controls, audio });

const intro = document.getElementById('intro');
function dismissIntro() {
  if (!intro) return;
  intro.classList.add('done');
  intro.hidden = true;
}

document.addEventListener('portfolio:enter-world', async () => {
  if (worldReady) {
    window.dispatchEvent(new Event('resize'));
    document.getElementById('classicToggle').focus({ preventScroll: true });
    return;
  }
  intro.hidden = false;
  intro.classList.remove('done');
  if (worldStart) return;
  const introStatus = intro.querySelector('[role="status"]');
  worldStart = startWorld({
    sections: portfolioSections, controls, driveState, openArea: navigation.openArea, audio,
    onProgress: (text) => { introStatus.textContent = text; },
  });
  try {
    await worldStart;
    worldReady = true;
  } catch (error) {
    console.error('The optional 3D world could not start.', error);
    worldStart = null;
    const status = document.getElementById('portfolioStatus');
    status.textContent = 'The 3D world could not start on this device, so here is everything without it.';
    status.hidden = false;
    await navigation.openClassic();
  } finally {
    dismissIntro();
  }
});

document.getElementById('cancelWorld').addEventListener('click', () => {
  dismissIntro();
  navigation.openClassic();
});

// Number keys jump straight to a section while in the world (1 = Work … 6 = Contact).
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || document.body.classList.contains('portfolio-mode')) return;
  if (!document.getElementById('lightbox').hidden || event.target.closest?.('input, textarea, select')) return;
  const match = /^Digit([1-9])$/.exec(event.code);
  const section = match && portfolioSections[Number(match[1]) - 1];
  if (!section) return;
  event.preventDefault();
  navigation.openArea(section.id);
});

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

// The 3D world is the home screen. Links to a specific section open the
// non-3D view there, and devices without WebGL get it straight away.
const target = location.hash.slice(1);
if (document.body.classList.contains('portfolio-mode') || !supportsWebGL()) {
  dismissIntro();
  if (!supportsWebGL()) {
    const status = document.getElementById('portfolioStatus');
    status.textContent = 'This device cannot show the 3D world, so here is everything without it.';
    status.hidden = false;
  }
  await navigation.openClassic(target);
} else {
  navigation.closeClassic();
}
