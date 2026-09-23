/**
 * ASTRA ARCADE — App Orchestrator
 * ---------------------------------
 * Wires together screens, the pairing flow, the unified Input system,
 * touch controls, and the per-game canvas loop. This is the only file
 * that knows about DOM screens; games only ever talk to the small
 * "host" API defined in startGame().
 */
(function () {
  const DEFAULT_SERVER_URL = 'wss://astra-arcade-server.onrender.com';

  const screens = {
    start: document.getElementById('screen-start'),
    pairing: document.getElementById('screen-pairing'),
    menu: document.getElementById('screen-menu'),
    game: document.getElementById('screen-game'),
  };

  const statusPill = document.getElementById('controllerStatus');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const gameOverlay = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySubtitle = document.getElementById('overlaySubtitle');
  const overlayPrimaryBtn = document.getElementById('overlayPrimaryBtn');
  const controllerLostOverlay = document.getElementById('controllerLostOverlay');
  const gameTitleEl = document.getElementById('gameTitle');
  const gameScoreEl = document.getElementById('gameScore');

  let appMode = null; // 'esp32' | 'touch'
  let currentGameId = null;
  let currentGame = null;
  let rafId = null;
  let lastTime = 0;
  let paused = false;
  let gameOver = false;
  let dpr = Math.min(2, window.devicePixelRatio || 1);

  const GAMES_WITH_OWN_B = new Set(['racing']); // racing uses B for brake itself

  // ---------------- Screen management ----------------
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // ---------------- Controller status pill ----------------
  function setStatusPill(connected) {
    statusPill.classList.toggle('status-online', connected);
    statusPill.classList.toggle('status-offline', !connected);
    statusPill.innerHTML = connected
      ? '<span class="dot"></span> ESP32 CONNECTED'
      : '<span class="dot"></span> NO CONTROLLER';
  }

  // ---------------- High scores (localStorage) ----------------
  function getHighScore(key) {
    return parseInt(localStorage.getItem('astra_hs_' + key) || '0', 10);
  }
  function setHighScore(key, score) {
    const best = Math.max(getHighScore(key), score);
    localStorage.setItem('astra_hs_' + key, String(best));
    return best;
  }

  // ---------------- Start screen ----------------
  document.getElementById('btnEsp32Mode').addEventListener('click', () => {
    appMode = 'esp32';
    document.getElementById('serverUrlInput').value = localStorage.getItem('astra_server_url') || DEFAULT_SERVER_URL;
    document.getElementById('controllerIdInput').value = localStorage.getItem('astra_controller_id') || '';
    showScreen('pairing');
  });

  document.getElementById('btnTouchMode').addEventListener('click', () => {
    appMode = 'touch';
    TouchControls.show();
    enterMenu();
  });

  // ---------------- Pairing screen ----------------
  const pairingStatusEl = document.getElementById('pairingStatus');
  const pairingStatusText = document.getElementById('pairingStatusText');

  function setPairingStatus(text, kind) {
    pairingStatusText.textContent = text;
    pairingStatusEl.classList.remove('success', 'error');
    if (kind) pairingStatusEl.classList.add(kind);
  }

  document.getElementById('btnConnectController').addEventListener('click', () => {
    const serverUrl = document.getElementById('serverUrlInput').value.trim();
    const controllerId = document.getElementById('controllerIdInput').value.trim().toUpperCase();
    const pairingCode = document.getElementById('pairingCodeInput').value.trim();

    if (!serverUrl || !controllerId || !/^[0-9]{6}$/.test(pairingCode)) {
      setPairingStatus('Please fill in a valid server URL, controller ID, and 6-digit code.', 'error');
      return;
    }

    localStorage.setItem('astra_server_url', serverUrl);
    localStorage.setItem('astra_controller_id', controllerId);

    setPairingStatus('Connecting…');
    AstraSocket.connect(serverUrl, controllerId, pairingCode);
  });

  document.getElementById('btnBackFromPairing').addEventListener('click', () => showScreen('start'));

  AstraSocket.on('pairResult', (msg) => {
    if (msg.success) {
      setPairingStatus(`Paired with ${msg.controllerId}!`, 'success');
      setTimeout(() => {
        TouchControls.hide();
        enterMenu();
      }, 500);
    } else {
      const reasons = {
        controller_not_found: 'Controller ID not found. Check the ID and make sure the ESP32 is powered on.',
        wrong_code: 'Incorrect pairing code. Check the Serial Monitor / display and try again.',
        invalid_format: 'Controller ID or code format looks wrong.',
        bad_url: 'Could not reach that server URL.',
      };
      setPairingStatus(reasons[msg.reason] || 'Could not pair. Please try again.', 'error');
    }
  });

  AstraSocket.on('controllerStatus', (msg) => {
    setStatusPill(!!msg.connected);
    if (!msg.connected && screens.game.classList.contains('active') && appMode === 'esp32') {
      pauseLoop();
      controllerLostOverlay.classList.remove('hidden');
    } else if (msg.connected) {
      controllerLostOverlay.classList.add('hidden');
    }
  });

  document.getElementById('btnReconnectController').addEventListener('click', () => {
    AstraSocket.reconnect();
    setStatusPill(false);
  });

  document.getElementById('btnSwitchToTouch').addEventListener('click', () => {
    appMode = 'touch';
    TouchControls.show();
    controllerLostOverlay.classList.add('hidden');
    resumeLoop();
  });

  // ---------------- Menu screen ----------------
  function enterMenu() {
    showScreen('menu');
    if (appMode === 'touch') TouchControls.show();
    GameMenu.deactivate();
    GameMenu.activate();
  }

  GameMenu.init(
    (gameId) => startGame(gameId),
    () => {
      GameMenu.deactivate();
      TouchControls.hide();
      showScreen('start');
    }
  );

  // ---------------- Game screen / host API ----------------
  function resizeCanvas() {
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (currentGame) {
      hostWidth = rect.width;
      hostHeight = rect.height;
      currentGame.onResize?.();
    }
  }

  let hostWidth = 0, hostHeight = 0;

  const host = {
    get canvas() { return canvas; },
    get ctx() { return ctx; },
    get width() { return hostWidth; },
    get height() { return hostHeight; },
    setScore(n) { gameScoreEl.textContent = `SCORE ${n}`; },
    getHighScore,
    setHighScore,
    gameOver({ score, best, message }) {
      gameOver = true;
      pauseLoop();
      overlayTitle.textContent = 'GAME OVER';
      overlaySubtitle.textContent = `${message || ''} Score: ${score}${best ? ` · Best: ${best}` : ''}`;
      overlayPrimaryBtn.textContent = 'Play Again';
      gameOverlay.classList.remove('hidden');
    },
  };

  function startGame(gameId) {
    const def = window.ASTRA_GAMES[gameId];
    if (!def) return;

    GameMenu.deactivate();
    Input.resetListeners();
    Input.releaseAll();

    currentGameId = gameId;
    gameTitleEl.textContent = def.meta.title;
    showScreen('game');
    if (appMode === 'touch') TouchControls.show(); else TouchControls.hide();

    resizeCanvas();
    currentGame = def.create(host);
    paused = false;
    gameOver = false;
    gameOverlay.classList.add('hidden');
    controllerLostOverlay.classList.add('hidden');

    currentGame.onStart();

    if (!GAMES_WITH_OWN_B.has(gameId)) {
      Input.onPress('B', togglePause);
    }
    // "MENU" button always works regardless of game
    Input.onPress('*', () => {}); // ensure anyListeners array exists (no-op)

    lastTime = performance.now();
    resumeLoop();
  }

  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    if (paused) {
      pauseLoop();
      overlayTitle.textContent = 'PAUSED';
      overlaySubtitle.textContent = 'Take a breath. Press Resume when ready.';
      overlayPrimaryBtn.textContent = 'Resume';
      gameOverlay.classList.remove('hidden');
      currentGame.onPause?.();
    } else {
      gameOverlay.classList.add('hidden');
      currentGame.onResume?.();
      lastTime = performance.now();
      resumeLoop();
    }
  }

  overlayPrimaryBtn.addEventListener('click', () => {
    if (gameOver) {
      gameOver = false;
      gameOverlay.classList.add('hidden');
      currentGame.restart();
      lastTime = performance.now();
      resumeLoop();
    } else {
      togglePause();
    }
  });

  document.getElementById('btnGameBack').addEventListener('click', () => backToMenuFromGame());

  function backToMenuFromGame() {
    pauseLoop();
    currentGame?.onStop?.();
    currentGame = null;
    currentGameId = null;
    Input.resetListeners();
    Input.releaseAll();
    gameOverlay.classList.add('hidden');
    controllerLostOverlay.classList.add('hidden');
    enterMenu();
  }

  function loop(now) {
    const dt = Math.min(50, now - lastTime); // clamp to avoid huge jumps (tab switch etc.)
    lastTime = now;
    if (!paused && !gameOver && currentGame) {
      currentGame.update(dt);
      currentGame.render();
    }
    rafId = requestAnimationFrame(loop);
  }

  function pauseLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }
  function resumeLoop() {
    if (!rafId) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  window.addEventListener('resize', () => { if (currentGame) resizeCanvas(); });
  window.addEventListener('orientationchange', () => { if (currentGame) setTimeout(resizeCanvas, 200); });

  // Prevent iOS Safari bounce/scroll while playing
  document.addEventListener('touchmove', (e) => {
    if (screens.game.classList.contains('active')) e.preventDefault();
  }, { passive: false });

  // ---------------- Init ----------------
  TouchControls.init();
  showScreen('start');
  setStatusPill(false);
})();
