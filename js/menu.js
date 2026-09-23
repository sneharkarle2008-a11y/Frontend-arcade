/**
 * ASTRA ARCADE — Game Menu
 * Navigable with UP/DOWN, select with A, back with B — using the same
 * unified Input system as everything else.
 */
const GameMenu = (() => {
  let items = [];
  let selectedIndex = 0;
  let onSelectCb = null;
  let onBackCb = null;
  let active = false;

  function init(onSelect, onBack) {
    items = Array.from(document.querySelectorAll('#gameMenuList .menu-item'));
    onSelectCb = onSelect;
    onBackCb = onBack;

    items.forEach((el, idx) => {
      el.addEventListener('click', () => {
        selectedIndex = idx;
        highlight();
        select();
      });
    });
  }

  function highlight() {
    items.forEach((el, idx) => el.classList.toggle('selected', idx === selectedIndex));
  }

  function move(delta) {
    selectedIndex = (selectedIndex + delta + items.length) % items.length;
    highlight();
  }

  function select() {
    const gameId = items[selectedIndex].dataset.game;
    onSelectCb?.(gameId);
  }

  function activate() {
    if (active) return;
    active = true;
    selectedIndex = 0;
    highlight();
    Input.onPress('UP', () => move(-1));
    Input.onPress('DOWN', () => move(1));
    Input.onPress('A', () => select());
    Input.onPress('B', () => onBackCb?.());
  }

  function deactivate() {
    active = false;
    Input.resetListeners();
  }

  return { init, activate, deactivate };
})();
