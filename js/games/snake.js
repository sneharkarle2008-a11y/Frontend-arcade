/**
 * ASTRA ARCADE — Snake
 * Grid-based snake with increasing speed, score, high score, pause & restart.
 * Controls: UP / DOWN / LEFT / RIGHT.
 */
window.ASTRA_GAMES = window.ASTRA_GAMES || {};

window.ASTRA_GAMES.snake = {
  meta: { title: 'SNAKE' },
  create(host) {
    const GRID = 18;
    let cols, rows, cell;
    let snake, dir, nextDir, food, score, stepTimer, stepInterval, alive;

    function layout() {
      cols = GRID;
      rows = Math.round(GRID * (host.height / host.width));
      cell = host.width / cols;
    }

    function reset() {
      layout();
      const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
      snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0;
      stepInterval = 150;
      stepTimer = 0;
      alive = true;
      placeFood();
      host.setScore(0);
    }

    function placeFood() {
      let fx, fy, collide;
      do {
        fx = Math.floor(Math.random() * cols);
        fy = Math.floor(Math.random() * rows);
        collide = snake.some((s) => s.x === fx && s.y === fy);
      } while (collide);
      food = { x: fx, y: fy };
    }

    function setDir(x, y) {
      // Prevent reversing directly into itself
      if (dir.x === -x && dir.y === -y) return;
      nextDir = { x, y };
    }

    function onStart() {
      reset();
      Input.onPress('UP', () => setDir(0, -1));
      Input.onPress('DOWN', () => setDir(0, 1));
      Input.onPress('LEFT', () => setDir(-1, 0));
      Input.onPress('RIGHT', () => setDir(1, 0));
    }

    function update(dt) {
      if (!alive) return;
      stepTimer += dt;
      if (stepTimer < stepInterval) return;
      stepTimer = 0;
      dir = nextDir;

      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        return die();
      }
      // Self collision
      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        return die();
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score += 10;
        host.setScore(score);
        stepInterval = Math.max(60, stepInterval - 3);
        placeFood();
      } else {
        snake.pop();
      }
    }

    function die() {
      alive = false;
      const best = host.setHighScore('snake', score);
      host.gameOver({ score, best, message: 'You crashed!' });
    }

    function render() {
      const ctx = host.ctx;
      ctx.clearRect(0, 0, host.width, host.height);

      // subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, rows * cell); ctx.stroke();
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(cols * cell, y * cell); ctx.stroke();
      }

      // food
      ctx.fillStyle = '#ff5fa3';
      ctx.shadowColor = '#ff5fa3';
      ctx.shadowBlur = 14;
      roundRect(ctx, food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4, 5);
      ctx.fill();
      ctx.shadowBlur = 0;

      // snake
      snake.forEach((s, i) => {
        const t = i / snake.length;
        ctx.fillStyle = i === 0 ? '#4deeea' : `rgba(160,107,255,${1 - t * 0.55})`;
        roundRect(ctx, s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2, 5);
        ctx.fill();
      });
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
