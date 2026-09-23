/**
 * ASTRA ARCADE — Racing
 * Top-down scrolling racer. Controls: LEFT/RIGHT steer, A = accelerate,
 * B = brake (B also doubles as the global pause button via app.js — the
 * brake behavior below only applies while actively racing).
 */
window.ASTRA_GAMES = window.ASTRA_GAMES || {};

window.ASTRA_GAMES.racing = {
  meta: { title: 'RACING' },
  create(host) {
    let W, H;
    let roadW, laneCount;
    let player, enemies, distance, alive, baseSpeed, speed, spawnTimer, spawnInterval, dashOffset;
    let steerLeft = false, steerRight = false, accelerating = false, braking = false;

    function layout() {
      W = host.width; H = host.height;
      roadW = W * 0.7;
      laneCount = 3;
    }

    function roadLeft() { return (W - roadW) / 2; }

    function reset() {
      layout();
      player = { x: W / 2, y: H * 0.82, w: W * 0.11, h: H * 0.09 };
      enemies = [];
      distance = 0;
      alive = true;
      baseSpeed = H * 0.35;
      speed = baseSpeed;
      spawnTimer = 0;
      spawnInterval = 1100;
      dashOffset = 0;
      host.setScore(0);
    }

    function onStart() {
      reset();
      Input.onPress('LEFT', () => (steerLeft = true));
      Input.onRelease('LEFT', () => (steerLeft = false));
      Input.onPress('RIGHT', () => (steerRight = true));
      Input.onRelease('RIGHT', () => (steerRight = false));
      Input.onPress('A', () => (accelerating = true));
      Input.onRelease('A', () => (accelerating = false));
      Input.onPress('B', () => (braking = true));
      Input.onRelease('B', () => (braking = false));
    }

    function laneX(lane) {
      const laneW = roadW / laneCount;
      return roadLeft() + laneW * (lane + 0.5);
    }

    function spawnEnemy() {
      const lane = Math.floor(Math.random() * laneCount);
      enemies.push({ x: laneX(lane), y: -H * 0.15, w: W * 0.11, h: H * 0.09, hue: Math.random() * 360 });
    }

    function update(dt) {
      if (!alive) return;
      const t = dt / 1000;

      const targetSpeed = braking ? baseSpeed * 0.4 : accelerating ? baseSpeed * 1.7 : baseSpeed;
      speed += (targetSpeed - speed) * Math.min(1, t * 3);
      speed += t * 4; // gradual natural ramp-up over time for difficulty

      distance += speed * t * 0.05;
      host.setScore(Math.floor(distance));
      dashOffset = (dashOffset + speed * t) % (H * 0.12);

      const steerSpeed = W * 0.9;
      if (steerLeft) player.x -= steerSpeed * t;
      if (steerRight) player.x += steerSpeed * t;
      player.x = Math.max(roadLeft() + player.w / 2, Math.min(roadLeft() + roadW - player.w / 2, player.x));

      spawnTimer += dt;
      const curInterval = Math.max(450, spawnInterval - distance * 0.5);
      if (spawnTimer > curInterval) { spawnTimer = 0; spawnEnemy(); }

      enemies.forEach((e) => (e.y += speed * t));
      enemies = enemies.filter((e) => e.y < H + e.h);

      enemies.forEach((e) => {
        const dx = Math.abs(e.x - player.x), dy = Math.abs(e.y - player.y);
        if (dx < (e.w + player.w) / 2.3 && dy < (e.h + player.h) / 2.3) {
          crash();
        }
      });
    }

    function crash() {
      if (!alive) return;
      alive = false;
      const finalScore = Math.floor(distance);
      const best = host.setHighScore('racing', finalScore);
      host.gameOver({ score: finalScore, best, message: 'You crashed into traffic!' });
    }

    function render() {
      const ctx = host.ctx;
      ctx.clearRect(0, 0, W, H);

      // grass
      ctx.fillStyle = '#0d1a12';
      ctx.fillRect(0, 0, W, H);

      // road
      ctx.fillStyle = '#171a26';
      ctx.fillRect(roadLeft(), 0, roadW, H);

      // road edges
      ctx.fillStyle = '#4deeea';
      ctx.fillRect(roadLeft() - 4, 0, 4, H);
      ctx.fillRect(roadLeft() + roadW, 0, 4, H);

      // lane dashes
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 4;
      ctx.setLineDash([H * 0.06, H * 0.06]);
      ctx.lineDashOffset = -dashOffset;
      for (let i = 1; i < laneCount; i++) {
        const x = roadLeft() + (roadW / laneCount) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // enemy cars
      enemies.forEach((e) => {
        ctx.fillStyle = `hsl(${e.hue}, 70%, 60%)`;
        roundRect(ctx, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h, 6);
        ctx.fill();
      });

      // player car
      ctx.fillStyle = '#4deeea';
      ctx.shadowColor = '#4deeea'; ctx.shadowBlur = 12;
      roundRect(ctx, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
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
