/**
 * ASTRA ARCADE — Pong
 * Single player vs. simple AI. Controls: UP / DOWN move the left paddle.
 */
window.ASTRA_GAMES = window.ASTRA_GAMES || {};

window.ASTRA_GAMES.pong = {
  meta: { title: 'PONG' },
  create(host) {
    let W, H;
    let playerY, aiY, paddleW, paddleH, paddleSpeed;
    let ball, ballSpeed, aiSpeed, playerScore, aiScore, alive;
    let moveUp = false, moveDown = false;

    function layout() {
      W = host.width; H = host.height;
      paddleW = W * 0.025;
      paddleH = H * 0.16;
      paddleSpeed = H * 0.9;
    }

    function reset() {
      layout();
      playerY = H / 2 - paddleH / 2;
      aiY = H / 2 - paddleH / 2;
      playerScore = 0;
      aiScore = 0;
      aiSpeed = H * 0.45;
      alive = true;
      host.setScore(0);
      serve(Math.random() > 0.5 ? 1 : -1);
    }

    function serve(dir) {
      ballSpeed = W * 0.45;
      ball = {
        x: W / 2, y: H / 2,
        vx: dir * ballSpeed,
        vy: (Math.random() * 2 - 1) * ballSpeed * 0.6,
        r: W * 0.018,
      };
    }

    function onStart() {
      reset();
      Input.onPress('UP', () => (moveUp = true));
      Input.onRelease('UP', () => (moveUp = false));
      Input.onPress('DOWN', () => (moveDown = true));
      Input.onRelease('DOWN', () => (moveDown = false));
    }

    function update(dt) {
      if (!alive) return;
      const t = dt / 1000;

      if (moveUp) playerY -= paddleSpeed * t;
      if (moveDown) playerY += paddleSpeed * t;
      playerY = clamp(playerY, 0, H - paddleH);

      // AI tracks ball with capped speed + slight imperfection
      const aiCenter = aiY + paddleH / 2;
      const target = ball.y + (Math.random() - 0.5) * 20;
      if (aiCenter < target - 8) aiY += aiSpeed * t;
      else if (aiCenter > target + 8) aiY -= aiSpeed * t;
      aiY = clamp(aiY, 0, H - paddleH);

      ball.x += ball.vx * t;
      ball.y += ball.vy * t;

      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }
      if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy *= -1; }

      // Player paddle (left)
      if (ball.vx < 0 && ball.x - ball.r < paddleW && ball.x - ball.r > 0 &&
          ball.y > playerY && ball.y < playerY + paddleH) {
        ball.x = paddleW + ball.r;
        ball.vx *= -1.06;
        ball.vy += (ball.y - (playerY + paddleH / 2)) * 4;
      }

      // AI paddle (right)
      if (ball.vx > 0 && ball.x + ball.r > W - paddleW && ball.x + ball.r < W &&
          ball.y > aiY && ball.y < aiY + paddleH) {
        ball.x = W - paddleW - ball.r;
        ball.vx *= -1.06;
        ball.vy += (ball.y - (aiY + paddleH / 2)) * 4;
      }

      if (ball.x < -30) { aiScore++; aiSpeed += H * 0.02; serve(1); }
      if (ball.x > W + 30) { playerScore++; host.setScore(playerScore); aiSpeed += H * 0.015; serve(-1); }

      if (playerScore >= 7 || aiScore >= 7) {
        alive = false;
        const won = playerScore > aiScore;
        const best = host.setHighScore('pong', playerScore);
        host.gameOver({
          score: playerScore,
          best,
          message: won ? `You win ${playerScore}-${aiScore}!` : `AI wins ${aiScore}-${playerScore}.`,
        });
      }
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function render() {
      const ctx = host.ctx;
      ctx.clearRect(0, 0, W, H);

      // center line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // scores
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${W * 0.08}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(playerScore, W * 0.28, H * 0.14);
      ctx.fillText(aiScore, W * 0.72, H * 0.14);

      // paddles
      ctx.fillStyle = '#4deeea';
      ctx.shadowColor = '#4deeea'; ctx.shadowBlur = 12;
      ctx.fillRect(0, playerY, paddleW, paddleH);
      ctx.fillStyle = '#a06bff';
      ctx.shadowColor = '#a06bff';
      ctx.fillRect(W - paddleW, aiY, paddleW, paddleH);
      ctx.shadowBlur = 0;

      // ball
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
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
