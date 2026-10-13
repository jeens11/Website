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

// Browsers only allow sound after a gesture: start on the first one.
const unlock = () => audio.unlock();
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
  canDrive: () => !view.classList.contains('open') && !classic.classList.contains('open'),
});
const navigation = createNavigation({ sections: portfolioSections, controls, audio });

const intro = document.getElementById('intro');
function dismissIntro() {
  if (!intro) return;
  intro.classList.add('done');
  window.setTimeout(() => intro.remove(), 900);
}

try {
  await startWorld({
    sections: portfolioSections,
    controls,
    driveState,
    openArea: navigation.openArea,
    audio,
  });
} catch (error) {
  console.error('The 3D world could not start.', error);
  const loadError = document.getElementById('loadError');
  loadError.hidden = false;
}
// Let the intro play for a moment even when the world loads instantly.
window.setTimeout(dismissIntro, 900);
