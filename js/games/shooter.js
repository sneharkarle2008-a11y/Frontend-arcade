/**
 * ASTRA ARCADE — Space Shooter
 * Vertical shooter. Controls: LEFT / RIGHT move, A = shoot, B = pause.
 * (B-pause is handled globally by app.js, so this module just plays.)
 */
window.ASTRA_GAMES = window.ASTRA_GAMES || {};

window.ASTRA_GAMES.shooter = {
  meta: { title: 'SPACE SHOOTER' },
  create(host) {
    let W, H;
    let player, bullets, enemyBullets, enemies, particles;
    let score, lives, alive, spawnTimer, spawnInterval, difficultyTimer, shootCooldown;
    let moveLeft = false, moveRight = false;

    function layout() {
      W = host.width; H = host.height;
    }

    function reset() {
      layout();
      player = { x: W / 2, y: H - H * 0.12, w: W * 0.09, h: W * 0.09, speed: W * 1.1 };
      bullets = [];
      enemyBullets = [];
      enemies = [];
      particles = [];
      score = 0;
      lives = 3;
      alive = true;
      spawnTimer = 0;
      spawnInterval = 1100;
      difficultyTimer = 0;
      shootCooldown = 0;
      host.setScore(0);
    }

    function onStart() {
      reset();
      Input.onPress('LEFT', () => (moveLeft = true));
      Input.onRelease('LEFT', () => (moveLeft = false));
      Input.onPress('RIGHT', () => (moveRight = true));
      Input.onRelease('RIGHT', () => (moveRight = false));
      Input.onPress('A', () => fire());
    }

    function fire() {
      if (!alive || shootCooldown > 0) return;
      bullets.push({ x: player.x, y: player.y - player.h / 2, r: W * 0.01, vy: -W * 1.4 });
      shootCooldown = 220;
    }

    function spawnEnemy() {
      const size = W * (0.07 + Math.random() * 0.03);
      enemies.push({
        x: size + Math.random() * (W - size * 2),
        y: -size,
        w: size, h: size,
        vy: H * (0.14 + Math.random() * 0.08) * difficultyMul(),
        hp: 1,
        shootTimer: 800 + Math.random() * 1500,
      });
    }

    function difficultyMul() {
      return 1 + Math.min(1.6, difficultyTimer / 40000);
    }

    function update(dt) {
      if (!alive) return;
      const t = dt / 1000;
      difficultyTimer += dt;
      shootCooldown = Math.max(0, shootCooldown - dt);

      if (moveLeft) player.x -= player.speed * t;
      if (moveRight) player.x += player.speed * t;
      player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

      spawnTimer += dt;
      const curInterval = Math.max(350, spawnInterval - difficultyTimer * 0.01);
      if (spawnTimer > curInterval) { spawnTimer = 0; spawnEnemy(); }

      bullets.forEach((b) => (b.y += b.vy * t));
      bullets = bullets.filter((b) => b.y > -20);

      enemyBullets.forEach((b) => (b.y += b.vy * t));
      enemyBullets = enemyBullets.filter((b) => b.y < H + 20);

      enemies.forEach((e) => {
        e.y += e.vy * t;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && e.y > 0 && e.y < H * 0.8) {
          e.shootTimer = 1200 + Math.random() * 1800;
          enemyBullets.push({ x: e.x, y: e.y + e.h / 2, r: W * 0.008, vy: H * 0.4 * difficultyMul() });
        }
      });

      // bullet vs enemy
      for (const e of enemies) {
        for (const b of bullets) {
          if (b.hit) continue;
          if (Math.abs(e.x - b.x) < e.w / 2 && Math.abs(e.y - b.y) < e.h / 2) {
            b.hit = true;
            e.hp -= 1;
            if (e.hp <= 0) {
              e.dead = true;
              score += 10;
              host.setScore(score);
              spawnParticles(e.x, e.y);
            }
          }
        }
      }
      bullets = bullets.filter((b) => !b.hit);
      enemies = enemies.filter((e) => {
        if (e.dead) return false;
        if (e.y > H + e.h) return true; // let it pass, no penalty
        return true;
      });

      // enemy reaching bottom / colliding with player
      enemies.forEach((e) => {
        const dx = Math.abs(e.x - player.x), dy = Math.abs(e.y - player.y);
        if (dx < (e.w + player.w) / 2.4 && dy < (e.h + player.h) / 2.4) {
          e.dead = true;
          hitPlayer();
        }
      });
      enemies = enemies.filter((e) => !e.dead);

      // enemy bullets vs player
      enemyBullets.forEach((b) => {
        const dx = Math.abs(b.x - player.x), dy = Math.abs(b.y - player.y);
        if (dx < player.w / 2.2 && dy < player.h / 2.2) {
          b.hit = true;
          hitPlayer();
        }
      });
      enemyBullets = enemyBullets.filter((b) => !b.hit);

      particles.forEach((p) => { p.x += p.vx * t; p.y += p.vy * t; p.life -= dt; });
      particles = particles.filter((p) => p.life > 0);
    }

    function spawnParticles(x, y) {
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({ x, y, vx: Math.cos(a) * W * 0.3, vy: Math.sin(a) * W * 0.3, life: 400, r: 3 });
      }
    }

    function hitPlayer() {
      lives -= 1;
      spawnParticles(player.x, player.y);
      if (lives <= 0) {
        alive = false;
        const best = host.setHighScore('shooter', score);
        host.gameOver({ score, best, message: 'Your ship was destroyed.' });
      }
    }

    function render() {
      const ctx = host.ctx;
      ctx.clearRect(0, 0, W, H);

      // starfield-ish backdrop dots
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 30; i++) {
        const x = (i * 97) % W;
        const y = (i * 53 + (difficultyTimer * 0.05)) % H;
        ctx.globalAlpha = 0.15 + (i % 3) * 0.1;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      // player
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.fillStyle = '#4deeea';
      ctx.shadowColor = '#4deeea'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -player.h / 2);
      ctx.lineTo(player.w / 2, player.h / 2);
      ctx.lineTo(0, player.h / 3);
      ctx.lineTo(-player.w / 2, player.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;

      // bullets
      ctx.fillStyle = '#ffffff';
      bullets.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); });

      ctx.fillStyle = '#ff5f6d';
      enemyBullets.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); });

      // enemies
      ctx.fillStyle = '#ff5fa3';
      ctx.shadowColor = '#ff5fa3'; ctx.shadowBlur = 10;
      enemies.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.beginPath();
        ctx.moveTo(0, e.h / 2);
        ctx.lineTo(e.w / 2, -e.h / 2);
        ctx.lineTo(-e.w / 2, -e.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.shadowBlur = 0;

      // particles
      particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life / 400);
        ctx.fillStyle = '#ffd54d';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // lives
      ctx.fillStyle = '#fff';
      ctx.font = `${W * 0.045}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('♥'.repeat(Math.max(0, lives)), 10, H * 0.06);
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
