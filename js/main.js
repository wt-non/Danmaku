"use strict";
{
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const START_TIMES = {
    circle: 0,
    line: 5,
    bounce: 10,
    aim: 15,
    star: 20,
    spiral: 25,
  };

  const TOUCH_OFFSET = 100; // 指より100px上
  /* =========================
         プレイヤー
      ========================= */
  const player = {
    x: 200,
    y: 500,
    size: 5,
    speed: 4,
    slowSpeed: 2,
  };

  /* =========================
         入力
      ========================= */
  const keys = {};
  document.addEventListener("keydown", (e) => (keys[e.key] = true));
  document.addEventListener("keyup", (e) => (keys[e.key] = false));

  /* =========================
         状態
      ========================= */
  let gameState = "waiting";
  const GAME_TIME = 30;
  let startTime = Date.now();
  let finalTime = GAME_TIME;

  /* =========================
         弾
      ========================= */

  // 経過時間を取得する関数
  function getElapsedTime() {
    return (Date.now() - startTime) / 1000;
  }

  let bullets = [];

  function spawnBullet(x, y, angle, speed, r, color) {
    bullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r,
      color,
    });
  }

  /* 音 */
  // AudioContextを作る
  const audioCtx = new AudioContext();

  // 音を読み込む（最初に1回だけ）
  let shotBuffer;

  fetch("/sounds/shot.mp3")
    .then((r) => r.arrayBuffer())
    .then((data) => audioCtx.decodeAudioData(data))
    .then((buffer) => {
      shotBuffer = buffer;
    });

  // 再生
  function playShotSound(rate = 1) {
    const source = audioCtx.createBufferSource();

    source.buffer = shotBuffer;
    source.playbackRate.value = rate; // 音程変更

    source.connect(audioCtx.destination);
    source.start();
  }

  const bgm = new Audio("/sounds/bgm.ogg");

  bgm.loop = true; // 繰り返し
  bgm.volume = 0.6; // 音量
  bgm.preload = "auto";
  bgm.load(); // ←追加

  /* 円形弾幕 */
  let angle = 0;
  function shootCircle() {
    if (gameState !== "playing") return;
    if (getElapsedTime() < START_TIMES.circle) return;

    const count = 24;
    for (let i = 0; i < count; i++) {
      const a = angle + (i * Math.PI * 2) / count;
      spawnBullet(canvas.width / 2, 100, a, 2, 3, "#00ffff");
    }
    angle += 0.1;
    playShotSound(1.3);
  }

  setInterval(shootCircle, 800);

  /* 左→右 3連弾 */
  let lineIndex = 0;

  function shootLineTriplet() {
    if (gameState !== "playing") return;
    if (getElapsedTime() < START_TIMES.line) return;

    // 下寄りの3段
    const ys = [
      canvas.height * (9 / 12), // 上段
      canvas.height * (10 / 12), // 中段
      canvas.height * (11 / 12), // 下段
    ];

    const y = ys[lineIndex];

    // 横並び3発
    for (let i = 0; i < 3; i++) {
      spawnBullet(
        10 - i * 10, // 横に並べる
        y,
        0, // 右向き
        5,
        3,
        "#3399FF",
      );
    }

    lineIndex++;

    if (lineIndex >= ys.length) {
      lineIndex = 0;
    }

    playShotSound(1.0);
  }

  setInterval(shootLineTriplet, 1000);

  // 反射弾（右上）
  function shootBounceBullet() {
    if (gameState !== "playing") return;
    if (getElapsedTime() < START_TIMES.bounce) return;

    bullets.push({
      x: canvas.width - 10,
      y: 10,

      vx: -4,
      vy: 4,

      r: 6,
      color: "	#00FF66",

      bounce: true,
    });

    playShotSound(0.8);
  }

  setInterval(shootBounceBullet, 1500);
  /* 中央上 自機狙い3連 */
  function shootAimTriplet() {
    if (gameState !== "playing") return;
    if (getElapsedTime() < START_TIMES.aim) return;

    const centerX = canvas.width / 2;
    const centerY = 20;

    const angle = Math.atan2(player.y - centerY, player.x - centerX);

    const speed = 4;
    const spacing = 20;

    for (let i = -1; i <= 1; i++) {
      // 元は縦並び
      const localX = i * spacing;
      const localY = 0;

      // 回転
      const offsetX = localX * Math.cos(angle) - localY * Math.sin(angle);

      const offsetY = localX * Math.sin(angle) + localY * Math.cos(angle);

      spawnBullet(
        centerX + offsetX,
        centerY + offsetY,
        angle,
        speed,
        5,
        "#FF4040",
      );
    }

    playShotSound(1.6);
  }

  setInterval(shootAimTriplet, 1200);

  /* =========================
     星描画弾幕
========================= */

  let starRotation = 0;
  const starOrder = [0, 2, 4, 1, 3, 0];

  function shootStarTrace() {
    if (gameState !== "playing") return;
    if (getElapsedTime() < START_TIMES.star) return;

    const cx = canvas.width / 2;
    const cy = 100; // ←120を100に変更
    const radius = 50;

    const points = [];
    // 五芒星の頂点

    for (let i = 0; i < 5; i++) {
      const angle = starRotation + -Math.PI / 2 + (i * Math.PI * 2) / 5;

      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }
    starRotation += Math.PI / 10;

    const starBullets = [];

    let segment = 0;
    let step = 0;

    const timer = setInterval(() => {
      if (gameState !== "playing") {
        clearInterval(timer);
        return;
      }

      const p1 = points[starOrder[segment]];
      const p2 = points[starOrder[segment + 1]];

      const t = step / 15;

      const bullet = {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,

        vx: 0,
        vy: 0,

        r: 2,
        color: "#FFD700",

        star: true,
      };

      bullets.push(bullet);
      starBullets.push(bullet);

      step++;

      if (step > 15) {
        step = 0;
        segment++;

        if (segment >= starOrder.length - 1) {
          clearInterval(timer);

          // 星完成後に少し待って爆散
          setTimeout(() => {
            starBullets.forEach((b) => {
              const angle = Math.atan2(b.y - cy, b.x - cx);

              const speed = 3;

              b.vx = Math.cos(angle) * speed;
              b.vy = Math.sin(angle) * speed;
            });
          }, 500);
        }
      }
    }, 20);

    playShotSound(2.0);
  }

  setInterval(shootStarTrace, 3000);

  /* 中央渦巻弾幕 */
  let spiralAngle = 0;

  function shootSpiral() {
    if (gameState !== "playing") return;
    if (getElapsedTime() < START_TIMES.spiral) return;

    spawnBullet(
      canvas.width / 2,
      canvas.height / 2,
      spiralAngle,
      3,
      4,
      "#AA00FF",
    );

    spawnBullet(
      canvas.width / 2,
      canvas.height / 2,
      spiralAngle + Math.PI,
      3,
      4,
      "#CC66FF",
    );

    spiralAngle += 0.2;

    // playShotSound();
  }

  setInterval(shootSpiral, 50);

  /* =========================
         更新
      ========================= */
  function update() {
    if (gameState !== "playing") return;

    /* プレイヤー移動 */
    const moveSpeed =
      keys["Shift"] || slowMode ? player.slowSpeed : player.speed;

    let moveX = 0;
    let moveY = 0;

    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
      moveX -= 1;
    }
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
      moveX += 1;
    }
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
      moveY -= 1;
    }
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
      moveY += 1;
    }

    // 斜め移動の速度を調整
    const length = Math.hypot(moveX, moveY);

    if (length > 0) {
      player.x += (moveX / length) * moveSpeed;
      player.y += (moveY / length) * moveSpeed;
    }

    /* タッチ中だけ動かす */
    if (isTouching) {
      const dx = targetX - player.x;
      const dy = targetY - player.y;

      const length = Math.hypot(dx, dy);

      if (length > moveSpeed) {
        player.x += (dx / length) * moveSpeed;
        player.y += (dy / length) * moveSpeed;
      } else {
        player.x = targetX;
        player.y = targetY;
      }
    }

    /* 画面内制限 */
    player.x = Math.max(
      player.size,
      Math.min(canvas.width - player.size, player.x),
    );
    player.y = Math.max(
      player.size,
      Math.min(canvas.height - player.size, player.y),
    );

    /* 弾更新 */
    bullets.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;

      /* =========================
       反射処理
      ========================= */
      if (b.bounce) {
        // 左右反射
        if (b.x - b.r <= 0 || b.x + b.r >= canvas.width) {
          b.vx *= -1;
        }

        // 上下反射
        if (b.y - b.r <= 0 || b.y + b.r >= canvas.height) {
          b.vy *= -1;
        }
      }
    });

    /* 画面外削除 */
    bullets = bullets.filter((b) => {
      // 反射弾は消さない
      if (b.bounce) return true;

      return (
        b.x > -10 &&
        b.x < canvas.width + 10 &&
        b.y > -10 &&
        b.y < canvas.height + 10
      );
    });

    /* 時間計算（ここで1回だけやる） */
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, GAME_TIME - elapsed);

    /* 当たり判定 */
    for (let b of bullets) {
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < player.size + b.r) {
        bgm.pause();
        finalTime = remaining; // ★ここが重要
        gameState = "gameover";
        return;
      }
    }

    /* クリア判定 */
    if (remaining <= 0) {
      bgm.pause();
      finalTime = 0; // ★クリアは0で固定
      gameState = "clear";
    }
  }

  /* =========================
         描画
      ========================= */
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* プレイヤー */
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    /* 弾 */
    bullets.forEach((b) => {
      ctx.fillStyle = b.color;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    /* 状態表示 */
    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";

    let displayTime;

    if (gameState === "playing") {
      const elapsed = (Date.now() - startTime) / 1000;
      displayTime = Math.max(0, GAME_TIME - elapsed);
    } else {
      displayTime = finalTime; // ★ここが修正ポイント
    }

    ctx.fillText(`TIME: ${displayTime.toFixed(1)}`, 10, 30);

    if (gameState === "waiting") {
      ctx.fillText("ENTER / TAP TO START", 45, 300);
    }

    if (gameState === "gameover") {
      ctx.fillText("GAME OVER (R / TAP TO RESTART)", 60, 300);
    }

    if (gameState === "clear") {
      ctx.fillText("CLEAR! (R / TAP TO RESTART)", 80, 300);
    }
  }

  /* =========================
         リスタート
      ========================= */
  function reset() {
    player.x = 200;
    player.y = 500;
    bullets = [];
    spiralAngle = 0;

    startTime = Date.now();
    finalTime = GAME_TIME;
    gameState = "playing";

    bgm.currentTime = 0;
    bgm.play();
  }

  document.addEventListener("keydown", (e) => {
    // ゲーム開始
    if (e.key === "Enter" && gameState === "waiting") {
      audioCtx.resume();

      startTime = Date.now();
      gameState = "playing";
      audioCtx.resume(); // 効果音
      bgm.play(); // BGM
      {
        once: true;
      }
      bgm.currentTime = 0;
      bgm.play();
    }

    // リスタート
    if (e.key === "r" && gameState !== "playing") {
      reset();
    }
  });

  /* =========================
         ループ
      ========================= */
  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();

  let targetX = player.x;
  let targetY = player.y;

  let isTouching = false;

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();

    isTouching = true;

    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    targetX = (t.clientX - rect.left) * scaleX;
    targetY = (t.clientY - rect.top) * scaleY - TOUCH_OFFSET;

    if (gameState === "waiting") {
      reset();
    } else if (gameState !== "playing") {
      reset();
    }
  });

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!isTouching) return;

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      targetX = (t.clientX - rect.left) * scaleX;
      targetY = (t.clientY - rect.top) * scaleY - TOUCH_OFFSET;
    },
    { passive: false },
  );

  document.addEventListener("touchend", () => {
    isTouching = false;
  });

  let slowMode = false;
  const slowBtn = document.getElementById("slowBtn");
  slowBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();

    slowMode = !slowMode;

    if (slowMode) {
      slowBtn.textContent = "低速ON";
      slowBtn.style.background = "#4caf50";
    } else {
      slowBtn.textContent = "低速OFF";
      slowBtn.style.background = "rgba(255,255,255,0.3)";
    }
  });
}
