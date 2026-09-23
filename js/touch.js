/**
 * ASTRA ARCADE — Touch Controls
 * -------------------------------
 * Renders the on-screen D-pad + A/B buttons and feeds the exact same
 * Input.press / Input.release API used by the ESP32 controller. Games
 * cannot tell the difference between the two sources.
 *
 * Uses pointerdown / pointerup / pointercancel so it works consistently
 * across touch, mouse, and stylus, and supports multi-touch (holding a
 * direction while tapping A, for example).
 */

const TouchControls = (() => {
  let container = null;
  let visible = false;
  // Tracks which pointerId is currently holding which button, so a
  // pointercancel/leave only releases the button it actually owned.
  const activePointers = new Map();

  function init() {
    container = document.getElementById('touchControls');
    const buttons = container.querySelectorAll('.tbtn');

    buttons.forEach((btn) => {
      const buttonName = btn.dataset.btn;

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        activePointers.set(e.pointerId, buttonName);
        btn.classList.add('active-touch');
        Input.press(buttonName);
      }, { passive: false });

      const release = (e) => {
        if (activePointers.get(e.pointerId) !== buttonName) return;
        activePointers.delete(e.pointerId);
        btn.classList.remove('active-touch');
        Input.release(buttonName);
      };

      btn.addEventListener('pointerup', (e) => { e.preventDefault(); release(e); }, { passive: false });
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', (e) => {
        // Only release on leave if the pointer isn't actively captured
        // (avoids accidental release while dragging finger slightly off).
        if (btn.hasPointerCapture?.(e.pointerId)) return;
        release(e);
      });
    });

    // Prevent iOS/Android rubber-band scrolling & long-press menus while
    // the touch controls are in use.
    container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function show() {
    visible = true;
    container.classList.remove('hidden');
  }

  function hide() {
    visible = false;
    container.classList.add('hidden');
    // Release any buttons still logically held to avoid stuck input.
    Input.releaseAll();
    activePointers.clear();
    container.querySelectorAll('.tbtn').forEach((b) => b.classList.remove('active-touch'));
  }

  function isVisible() {
    return visible;
  }

  // Adjust which buttons are shown per game. All games use the same
  // physical layout (D-pad + A/B); some just don't use every button,
  // which is fine to leave visible for consistency and muscle memory.
  function setLayout(_gameId) {
    // Reserved for future per-game layout tweaks (e.g., hide D and U for
    // a left/right-only game). Currently all games share the full pad.
  }

  return { init, show, hide, isVisible, setLayout };
})();
