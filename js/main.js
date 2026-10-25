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
  document.getElementById('cancelWorld').focus({ preventScroll: true });
  if (worldStart) return;
  worldStart = startWorld({ sections: portfolioSections, controls, driveState, openArea: navigation.openArea, audio });
  try {
    await worldStart;
    worldReady = true;
    if (!classic.classList.contains('open')) document.getElementById('classicToggle').focus({ preventScroll: true });
  } catch (error) {
    console.error('The optional 3D world could not start.', error);
    worldStart = null;
    const status = document.getElementById('portfolioStatus');
    status.textContent = 'The 3D experience is unavailable on this device right now. You can explore all of my work below.';
    status.hidden = false;
    await navigation.openClassic();
  } finally {
    dismissIntro();
  }
});

// Reading the portfolio never waits for a 3D library, a camera, or a sound gesture.
document.getElementById('cancelWorld').addEventListener('click', () => {
  dismissIntro();
  navigation.openClassic();
});

await navigation.openClassic(location.hash.slice(1));
