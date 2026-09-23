/**
 * ASTRA ARCADE — Unified Input System
 * ------------------------------------
 * Games never talk to the ESP32 or touch controls directly. Every input
 * source (WebSocket/ESP32, on-screen touch, keyboard for desktop testing)
 * funnels through this single object, and games only ever read from here.
 *
 *   Input.press("UP");
 *   Input.release("UP");
 *   Input.isDown("A");
 *   Input.onPress("A", callback);
 *   Input.onRelease("A", callback);
 */

const Input = (() => {
  const BUTTONS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B'];

  const state = Object.fromEntries(BUTTONS.map((b) => [b, false]));
  const pressListeners = Object.fromEntries(BUTTONS.map((b) => [b, []]));
  const releaseListeners = Object.fromEntries(BUTTONS.map((b) => [b, []]));
  const anyListeners = { press: [], release: [] };

  function press(button) {
    button = button.toUpperCase();
    if (!BUTTONS.includes(button)) return;
    if (state[button]) return; // already down, ignore repeats
    state[button] = true;
    pressListeners[button].forEach((cb) => cb(button));
    anyListeners.press.forEach((cb) => cb(button));
  }

  function release(button) {
    button = button.toUpperCase();
    if (!BUTTONS.includes(button)) return;
    if (!state[button]) return;
    state[button] = false;
    releaseListeners[button].forEach((cb) => cb(button));
    anyListeners.release.forEach((cb) => cb(button));
  }

  function isDown(button) {
    return !!state[button.toUpperCase()];
  }

  function onPress(button, cb) {
    if (button === '*') { anyListeners.press.push(cb); return; }
    pressListeners[button.toUpperCase()]?.push(cb);
  }

  function onRelease(button, cb) {
    if (button === '*') { anyListeners.release.push(cb); return; }
    releaseListeners[button.toUpperCase()]?.push(cb);
  }

  // Clears all listeners registered by a game when leaving it, but keeps
  // the core press/release plumbing intact for the next game.
  function resetListeners() {
    BUTTONS.forEach((b) => {
      pressListeners[b].length = 0;
      releaseListeners[b].length = 0;
    });
    anyListeners.press.length = 0;
    anyListeners.release.length = 0;
  }

  function releaseAll() {
    BUTTONS.forEach((b) => release(b));
  }

  // ---- Desktop keyboard fallback (handy for testing without touch/ESP32) ----
  const KEY_MAP = {
    ArrowUp: 'UP', w: 'UP', W: 'UP',
    ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
    ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
    ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
    ' ': 'A', Enter: 'A', z: 'A', Z: 'A',
    Backspace: 'B', Escape: 'B', x: 'B', X: 'B',
  };

  window.addEventListener('keydown', (e) => {
    const b = KEY_MAP[e.key];
    if (b) { press(b); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const b = KEY_MAP[e.key];
    if (b) { release(b); e.preventDefault(); }
  });

  return { BUTTONS, press, release, isDown, onPress, onRelease, resetListeners, releaseAll };
})();
