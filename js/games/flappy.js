/**
 * ASTRA ARCADE — Flappy (original, not affiliated with any existing game)
 * Controls: A = flap.
 */
window.ASTRA_GAMES = window.ASTRA_GAMES || {};

window.ASTRA_GAMES.flappy = {
  meta: { title: 'FLAPPY' },
  create(host) {
    let W, H;
    let bird, pipes, score, alive, gravity, flapPower, pipeGap, pipeW, spawnTimer, spawnInterval, speed, started;

    function layout() {
      W = host.width; H = host.height;
      gravity = H * 1.7;
      flapPower = -H * 0.62;
      pipeGap = H * 0.28;
      pipeW = W * 0.16;
      speed = W * 0.35;
    }

    function reset() {
      layout();
      bird = { x: W * 0.28, y: H / 2, vy: 0, r: W * 0.035 };
      pipes = [];
      score = 0;
      alive = true;
      started = false;
      spawnTimer = 0;
      spawnInterval = 1500;
      host.setScore(0);
    }

    function onStart() {
      reset();
      Input.onPress('A', flap);
    }

    function flap() {
      if (!alive) return;
      started = true;
      bird.vy = flapPower;
    }

    function spawnPipe() {
      const margin = H * 0.12;
      const centerY = margin + Math.random() * (H - margin * 2 - pipeGap) + pipeGap / 2;
      pipes.push({ x: W + pipeW, centerY, passed: false });
    }

    function update(dt) {
      if (!alive) return;
      const t = dt / 1000;

      if (!started) {
        bird.y = H / 2 + Math.sin(Date.now() / 300) * 8;
        return;
      }

      bird.vy += gravity * t;
      bird.y += bird.vy * t;

      spawnTimer += dt;
      if (spawnTimer > spawnInterval) { spawnTimer = 0; spawnPipe(); }

      const curSpeed = speed * (1 + Math.min(0.7, score * 0.02));
      pipes.forEach((p) => (p.x -= curSpeed * t));
      pipes = pipes.filter((p) => p.x > -pipeW * 2);

      pipes.forEach((p) => {
        if (!p.passed && p.x + pipeW < bird.x) {
          p.passed = true;
          score++;
          host.setScore(score);
        }
        const withinX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + pipeW;
        const withinGap = bird.y - bird.r > p.centerY - pipeGap / 2 && bird.y + bird.r < p.centerY + pipeGap / 2;
        if (withinX && !withinGap) die();
      });

      if (bird.y - bird.r < 0 || bird.y + bird.r > H) die();
    }

    function die() {
      if (!alive) return;
      alive = false;
      const best = host.setHighScore('flappy', score);
      host.gameOver({ score, best, message: 'You hit an obstacle!' });
    }

    function render() {
      const ctx = host.ctx;
      ctx.clearRect(0, 0, W, H);

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0a0e1f');
      grad.addColorStop(1, '#161033');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#4deeea';
      ctx.shadowColor = '#4deeea'; ctx.shadowBlur = 10;
      pipes.forEach((p) => {
        const topH = p.centerY - pipeGap / 2;
        ctx.fillRect(p.x, 0, pipeW, topH);
        ctx.fillRect(p.x, p.centerY + pipeGap / 2, pipeW, H - (p.centerY + pipeGap / 2));
      });
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.translate(bird.x, bird.y);
      const angle = Math.max(-0.5, Math.min(0.9, bird.vy / (H * 0.9)));
      ctx.rotate(angle);
      ctx.fillStyle = '#ffd54d';
      ctx.shadowColor = '#ffd54d'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5fa3';
      ctx.beginPath();
      ctx.moveTo(bird.r * 0.3, 0);
      ctx.lineTo(bird.r * 1.3, -bird.r * 0.3);
      ctx.lineTo(bird.r * 1.3, bird.r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;

      if (!started) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `${W * 0.05}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Press A to flap', W / 2, H * 0.75);
      }
    }

    return {
      onStart,
      update,
      render,
      onPause() {},
      onResume() {},
      onStop() {},
      onResize() { layout(); },
      restart: reset,
    };
  },
};
