/**
 * ASTRA ARCADE — WebSocket Client (Browser side)
 * ------------------------------------------------
 * Talks to the relay server to pair with an ESP32 controllerId + pairing
 * code, then forwards every "input" message it receives straight into the
 * unified Input system (Input.press / Input.release). Games never see
 * this file directly.
 */

const AstraSocket = (() => {
  let ws = null;
  let serverUrl = '';
  let controllerId = '';
  let pairingCode = '';
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let manuallyClosed = false;

  const listeners = {
    pairResult: [],
    controllerStatus: [],
    open: [],
    close: [],
  };

  function on(event, cb) {
    listeners[event]?.push(cb);
  }

  function emit(event, data) {
    listeners[event]?.forEach((cb) => cb(data));
  }

  function normalizeUrl(url) {
    url = url.trim();
    if (!/^wss?:\/\//i.test(url)) {
      // Default to secure if the user forgot the scheme.
      url = 'wss://' + url;
    }
    return url.replace(/\/+$/, '');
  }

  function connect(inputServerUrl, inputControllerId, inputPairingCode) {
    manuallyClosed = false;
    serverUrl = normalizeUrl(inputServerUrl);
    controllerId = inputControllerId.trim().toUpperCase();
    pairingCode = inputPairingCode.trim();
    reconnectAttempts = 0;
    openSocket();
  }

  function openSocket() {
    try {
      ws = new WebSocket(serverUrl);
    } catch (err) {
      emit('pairResult', { success: false, reason: 'bad_url' });
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      ws.send(JSON.stringify({
        type: 'browser_pair',
        controllerId,
        pairingCode,
      }));
      emit('open');
    };

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch (_) { return; }
      handleMessage(msg);
    };

    ws.onclose = () => {
      emit('close');
      emit('controllerStatus', { connected: false });
      if (!manuallyClosed) scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose fires right after in most browsers; nothing extra needed.
    };
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.6, reconnectAttempts), 15000);
    reconnectTimer = setTimeout(() => {
      if (!manuallyClosed) openSocket();
    }, delay);
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'pair_result':
        emit('pairResult', msg);
        break;
      case 'controller_status':
        emit('controllerStatus', msg);
        break;
      case 'input':
        if (msg.state === 'pressed') Input.press(msg.button);
        else if (msg.state === 'released') Input.release(msg.button);
        break;
      case 'paired':
        emit('controllerStatus', { connected: true });
        break;
      case 'unpaired':
        emit('controllerStatus', { connected: false, reason: 'unpaired' });
        break;
      default:
        break;
    }
  }

  function disconnect() {
    manuallyClosed = true;
    clearTimeout(reconnectTimer);
    if (ws) {
      try {
        ws.send(JSON.stringify({ type: 'browser_unpair' }));
      } catch (_) {}
      ws.close();
    }
  }

  function reconnect() {
    manuallyClosed = false;
    reconnectAttempts = 0;
    if (ws) { try { ws.close(); } catch (_) {} }
    openSocket();
  }

  function isConnected() {
    return !!ws && ws.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, reconnect, on, isConnected };
})();
