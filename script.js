(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===== 1. Tách chữ thành từng ký tự để làm hiệu ứng ===== */
  const title = document.getElementById('title');
  let idx = 0;
  title.querySelectorAll('.line').forEach(line => {
    const text = line.dataset.text.normalize('NFC');
    for (const ch of Array.from(text)) {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      if (ch === ' ') {
        span.className = 'ch space';
        span.textContent = '\u00A0';
      } else {
        span.className = 'ch';
        span.textContent = ch;
      }
      span.style.setProperty('--i', idx++);
      line.appendChild(span);
    }
  });

  /* Báo lỗi nếu chưa có ảnh */
  const img = document.getElementById('bouquet');
  img.addEventListener('error', () => {
    document.getElementById('hint').textContent = 'Không tìm thấy bohoa.png — hãy để ảnh cùng thư mục với index.html';
  });

  /* ===== 2. Parallax theo chuột / ngón tay (tạo chiều sâu 3D) ===== */
  const titleWrap = document.getElementById('titleWrap');
  const bouquetWrap = document.getElementById('bouquetWrap');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  let opened = false;

  addEventListener('pointermove', e => {
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
  });
  addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  /* Nghiêng điện thoại cũng tạo parallax */
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    tx = Math.max(-1, Math.min(1, e.gamma / 30));
    ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  });

  function updateParallax() {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    // Chữ ở xa: di chuyển ngược + xoay nhẹ; bó hoa ở gần: di chuyển cùng chiều
    titleWrap.style.transform =
      `translate3d(${-cx * 20}px, ${-cy * 12}px, -40px) rotateY(${cx * 7}deg) rotateX(${-cy * 5}deg)`;
    bouquetWrap.style.transform =
      `translate3d(${cx * 24}px, ${cy * 10}px, 0) rotateY(${cx * 3}deg)`;
  }

  /* ===== 3. Canvas: cánh hoa rơi, lấp lánh, trái tim ===== */
  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  const PETAL_COLORS = ['#ffc1d6', '#ffb3cb', '#ffd9e6', '#ff9fbf', '#fff0f5', '#ffe08a', '#f7a8c4'];
  const HEART_COLORS = ['#ff5c8d', '#ff7aa2', '#ff9ebb', '#ffffff', '#ff3f7a', '#ffc2d6'];

  const petals = [];
  const sparkles = [];
  const particles = [];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const petalCount = reduceMotion ? 10 : Math.round(Math.min(60, (W * H) / 22000));
    while (petals.length < petalCount) petals.push(makePetal(true));
    petals.length = petalCount;

    const sparkleCount = reduceMotion ? 10 : Math.round(Math.min(45, (W * H) / 30000));
    sparkles.length = 0;
    for (let i = 0; i < sparkleCount; i++) {
      sparkles.push({
        x: rand(0, W), y: rand(0, H),
        r: rand(2, 6), phase: rand(0, Math.PI * 2), speed: rand(0.02, 0.05)
      });
    }
  }

  function makePetal(anywhere) {
    return {
      x: rand(-50, W + 50),
      y: anywhere ? rand(-H, H) : rand(-120, -20),
      size: rand(6, 14),
      vy: rand(0.5, 1.4),
      vx: rand(-0.3, 0.4),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.02, 0.02),
      flip: rand(0, Math.PI * 2),
      vflip: rand(0.02, 0.06),
      swing: rand(0.6, 1.6),
      phase: rand(0, Math.PI * 2),
      color: pick(PETAL_COLORS),
      alpha: rand(0.65, 0.95)
    };
  }

  function drawPetalShape(s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.7, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.9, -s * 0.6, 0, -s);
    ctx.closePath();
  }

  function drawHeartShape(s) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.25);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.8, -s * 1.15, -s * 0.1, 0, s * 0.7);
    ctx.bezierCurveTo(s * 1.15, -s * 0.1, s * 0.5, -s * 0.8, 0, -s * 0.25);
    ctx.closePath();
  }

  function drawStar(x, y, r, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = r * 3;
    ctx.beginPath();
    ctx.moveTo(0, -r * 2);
    ctx.quadraticCurveTo(0, 0, r * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, r * 2);
    ctx.quadraticCurveTo(0, 0, -r * 2, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Bùng nổ tim + lấp lánh tại 1 điểm */
  function burst(x, y, count = 18, power = 1) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
      const speed = rand(2, 6) * power;
      particles.push({
        type: Math.random() < 0.7 ? 'heart' : (Math.random() < 0.5 ? 'star' : 'petal'),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(0.5, 2),
        size: rand(7, 16) * (power > 1 ? 1.2 : 1),
        rot: rand(-0.5, 0.5),
        vr: rand(-0.06, 0.06),
        life: 0,
        max: rand(70, 120),
        color: pick(HEART_COLORS)
      });
    }
  }

  /* Tim nhỏ bay lên từ dưới */
  function spawnRisingHeart() {
    particles.push({
      type: 'heart',
      x: rand(W * 0.05, W * 0.95),
      y: H + 20,
      vx: rand(-0.3, 0.3),
      vy: rand(-1.8, -0.9),
      size: rand(6, 12),
      rot: rand(-0.3, 0.3),
      vr: rand(-0.01, 0.01),
      life: 0,
      max: rand(260, 420),
      color: pick(HEART_COLORS),
      rising: true
    });
  }

  let t = 0;
  function frame() {
    t++;
    updateParallax();
    ctx.clearRect(0, 0, W, H);

    // Lấp lánh
    for (const s of sparkles) {
      s.phase += s.speed;
      const a = Math.max(0, Math.sin(s.phase)) * 0.9;
      if (a > 0.02) drawStar(s.x, s.y, s.r * (0.6 + a * 0.6), a);
    }

    // Cánh hoa rơi
    for (const p of petals) {
      p.phase += 0.015;
      p.flip += p.vflip;
      p.rot += p.vr;
      p.x += p.vx + Math.sin(p.phase) * p.swing * 0.6;
      p.y += p.vy;
      if (p.y > H + 40 || p.x < -80 || p.x > W + 80) Object.assign(p, makePetal(false));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(Math.cos(p.flip), 1);   // hiệu ứng lật cánh hoa
      ctx.globalAlpha = p.alpha;
      const g = ctx.createLinearGradient(0, -p.size, 0, p.size);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, p.color);
      ctx.fillStyle = g;
      drawPetalShape(p.size);
      ctx.fill();
      ctx.restore();
    }

    // Hạt tim / sao
    if (opened && !reduceMotion && t % 40 === 0) spawnRisingHeart();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      if (p.rising) {
        p.x += p.vx + Math.sin(p.life * 0.04) * 0.6;
        p.y += p.vy;
      } else {
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 - 0.03;     // chậm lại rồi bay lên nhẹ
        p.x += p.vx;
        p.y += p.vy;
      }
      p.rot += p.vr;

      const k = p.life / p.max;
      const alpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.5) / 0.5);
      if (p.life >= p.max) { particles.splice(i, 1); continue; }

      if (p.type === 'star') {
        drawStar(p.x, p.y, p.size * 0.35, alpha);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha * (p.rising ? 0.75 : 1);
      ctx.fillStyle = p.color;
      ctx.shadowColor = 'rgba(255,60,120,.45)';
      ctx.shadowBlur = 8;
      if (p.type === 'heart') drawHeartShape(p.size);
      else drawPetalShape(p.size * 0.7);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  /* ===== 4. Tương tác ===== */
  addEventListener('pointerdown', e => {
    if (!opened || e.target.closest('.music-btn')) return;
    burst(e.clientX, e.clientY, 18, 1);
  });
  addEventListener('resize', resize);

  resize();
  requestAnimationFrame(frame);

  /* ===== 5. Mở quà + nhạc nền ===== */
  const gate = document.getElementById('gate');
  const bgm = document.getElementById('bgm');
  const musicBtn = document.getElementById('musicBtn');
  const hint = document.getElementById('hint');
  const TARGET_VOLUME = 0.8;

  bgm.addEventListener('error', () => {
    hint.textContent = 'Không tìm thấy chucmung.mp4 — hãy để file nhạc cùng thư mục với index.html';
  });

  function fadeVolume(to, ms = 1500) {
    const from = bgm.volume;
    const start = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - start) / ms);
      bgm.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }

  function playMusic() {
    bgm.volume = 0;
    return bgm.play().then(() => {
      fadeVolume(TARGET_VOLUME);
      musicBtn.classList.add('is-playing');
    });
  }

  function openGift() {
    if (opened) return;
    opened = true;
    gate.classList.add('is-hidden');
    document.body.classList.add('is-open');
    if (bgm.paused) playMusic().catch(() => {});

    /* Khoảnh khắc "nở hoa" khi bó hoa vừa xuất hiện */
    if (!reduceMotion) {
      setTimeout(() => burst(W / 2, H * 0.42, 34, 1.6), 1500);
      setTimeout(() => {
        burst(W * 0.25, H * 0.35, 14, 1);
        burst(W * 0.75, H * 0.35, 14, 1);
      }, 2600);
    }
  }

  gate.addEventListener('click', openGift);
  gate.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGift(); }
  });

  musicBtn.addEventListener('click', () => {
    if (bgm.paused) {
      playMusic().catch(() => {});
      musicBtn.classList.remove('is-muted');
      musicBtn.setAttribute('aria-label', 'Tắt nhạc');
    } else {
      bgm.pause();
      musicBtn.classList.remove('is-playing');
      musicBtn.classList.add('is-muted');
      musicBtn.setAttribute('aria-label', 'Bật nhạc');
    }
  });

  /* Thử tự phát nhạc ngay khi mở trang.
     Nếu trình duyệt cho phép → bỏ qua màn hình mở quà.
     Nếu bị chặn (đa số trường hợp) → chờ em chạm vào màn hình. */
  playMusic().then(openGift).catch(() => {});
})();