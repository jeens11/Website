const KEY_BINDINGS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'drift',
};

/** Keyboard and touch controls following the input contract from the supplied reference bundle. */
export function createControls({ driveState, onInteract, canDrive }) {
  const { input } = driveState;
  const stickBase = document.getElementById('stickBase');
  const stickKnob = document.getElementById('stickKnob');
  const driftButton = document.getElementById('mobileDrift');
  let stickPointer = null;
  let driftPointer = null;
  let onInteractCallback = onInteract;

  function setDrift(active) {
    if (active) input.keys.add('drift');
    else input.keys.delete('drift');
    driftButton?.setAttribute('aria-pressed', String(active));
  }

  function resetStick() {
    stickPointer = null;
    input.joyX = 0;
    input.joyY = 0;
    if (stickKnob) stickKnob.style.transform = '';
  }

  function reset() {
    input.keys.clear();
    resetStick();
    driftPointer = null;
    setDrift(false);
  }

  function updateStick(event) {
    const rect = stickBase.getBoundingClientRect();
    const radius = Math.min(52, rect.width * 0.39);
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(x, y);
    const scale = length > radius ? radius / length : 1;
    const limitedX = x * scale;
    const limitedY = y * scale;

    // Match the reference joystick convention: positive Y means forward.
    input.joyX = limitedX / radius;
    input.joyY = -limitedY / radius;
    stickKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
  }

  function handleKeyDown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey || !canDrive()) return;

    const focusedControl = event.target?.closest?.(
      'button, a, input, textarea, select, video, [contenteditable="true"]',
    );
    const isActivatingControl = focusedControl === document.activeElement
      && ['Enter', 'Space', 'KeyE'].includes(event.code);
    if (isActivatingControl) return;

    if (event.code === 'KeyR') {
      event.preventDefault();
      if (!event.repeat) driveState.resetRequested = true;
      return;
    }
    if (event.code === 'Enter' || event.code === 'KeyE') {
      event.preventDefault();
      if (!event.repeat) onInteractCallback?.();
      return;
    }

    const action = KEY_BINDINGS[event.code];
    if (action) {
      event.preventDefault();
      input.keys.add(action);
    }
  }

  function handleKeyUp(event) {
    const action = KEY_BINDINGS[event.code];
    if (action) input.keys.delete(action);
  }

  function startStick(event) {
    if (!canDrive() || !stickBase || !stickKnob) return;
    stickPointer = event.pointerId;
    stickBase.setPointerCapture(event.pointerId);
    updateStick(event);
    event.preventDefault();
  }

  function moveStick(event) {
    if (stickPointer === event.pointerId && canDrive()) updateStick(event);
  }

  function stopStick(event) {
    if (stickPointer === event.pointerId) resetStick();
  }

  function startDrift(event) {
    if (!canDrive() || !driftButton) return;
    driftPointer = event.pointerId;
    driftButton.setPointerCapture(event.pointerId);
    setDrift(true);
    event.preventDefault();
  }

  function stopDrift(event) {
    if (event && driftPointer !== event.pointerId) return;
    driftPointer = null;
    setDrift(false);
  }

  function handleVisibilityChange() {
    if (document.hidden) reset();
  }

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  stickBase?.addEventListener('pointerdown', startStick);
  stickBase?.addEventListener('pointermove', moveStick);
  stickBase?.addEventListener('pointerup', stopStick);
  stickBase?.addEventListener('pointercancel', stopStick);
  stickBase?.addEventListener('lostpointercapture', stopStick);
  driftButton?.addEventListener('pointerdown', startDrift);
  driftButton?.addEventListener('pointerup', stopDrift);
  driftButton?.addEventListener('pointercancel', stopDrift);
  driftButton?.addEventListener('pointerleave', stopDrift);
  driftButton?.addEventListener('lostpointercapture', stopDrift);

  return {
    input,
    reset,
    setOpenNearest(callback) { onInteractCallback = callback; },
    dispose() {
      reset();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', reset);
      stickBase?.removeEventListener('pointerdown', startStick);
      stickBase?.removeEventListener('pointermove', moveStick);
      stickBase?.removeEventListener('pointerup', stopStick);
      stickBase?.removeEventListener('pointercancel', stopStick);
      stickBase?.removeEventListener('lostpointercapture', stopStick);
      driftButton?.removeEventListener('pointerdown', startDrift);
      driftButton?.removeEventListener('pointerup', stopDrift);
      driftButton?.removeEventListener('pointercancel', stopDrift);
      driftButton?.removeEventListener('pointerleave', stopDrift);
      driftButton?.removeEventListener('lostpointercapture', stopDrift);
    },
  };
}
