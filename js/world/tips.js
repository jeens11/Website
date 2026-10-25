const STORAGE_KEY = 'jns-world-tips';
const SHOW_MS = 5200;
const GAP_MS = 900;

/**
 * One tip at a time, shown in response to what the visitor is doing. Each tip
 * id shows once per browser; `flash` shows a one-off status message.
 */
export function createTips(element) {
  let seen;
  try {
    seen = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    seen = new Set();
  }
  const queue = [];
  let current = null;
  let hideAt = 0;
  let hiddenAt = 0;

  function remember(id) {
    seen.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
    } catch {
      // Private windows can block storage; the tip simply may show again.
    }
  }

  function show(tip, now) {
    current = tip;
    if (tip.id) remember(tip.id);
    // Tip markup comes only from strings in this codebase.
    element.innerHTML = tip.html;
    element.classList.add('visible');
    hideAt = now + (tip.ms || SHOW_MS);
  }

  function offer(id, html) {
    if (seen.has(id) || current?.id === id || queue.some((tip) => tip.id === id)) return;
    queue.push({ id, html });
  }

  function flash(html, ms = 3600) {
    show({ html, ms }, performance.now());
  }

  function hide() {
    if (!current) return;
    current = null;
    hiddenAt = performance.now();
    element.classList.remove('visible');
  }

  function update(now) {
    if (current && now > hideAt) hide();
    if (!current && queue.length && now - hiddenAt > GAP_MS) show(queue.shift(), now);
  }

  return { offer, flash, hide, update };
}
