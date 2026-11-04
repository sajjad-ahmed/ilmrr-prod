(() => {
  const canvas = document.getElementById("sand");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const mouse = { x: -9999, y: -9999 };
  const grains = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let running = true;
  let frame = 0;
  let time = 0;
  let resizeTimer = 0;

  const root = document.documentElement;

  function targetCount() {
    if (reduce) return 70;
    const area = window.innerWidth * window.innerHeight;
    const density = window.innerWidth < 760 ? 4200 : 2600;
    const count = Math.round(area / density);
    return Math.max(140, Math.min(count, window.innerWidth < 760 ? 380 : 980));
  }

  function makeGrain(randomY) {
    const spark = Math.random();
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -8,
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.15 + Math.random() * 0.35,
      r: spark > 0.94 ? 1.7 + Math.random() * 1.1 : 0.45 + Math.random() * 1.15,
      kind: spark > 0.9 ? 2 : spark > 0.55 ? 1 : 0,
      seed: Math.random() * Math.PI * 2
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, width < 760 || reduce ? 1.15 : 1.5);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const next = targetCount();
    while (grains.length < next) grains.push(makeGrain(true));
    if (grains.length > next) grains.length = next;
  }

  function paint() {
    ctx.clearRect(0, 0, width, height);
    const radius = 150;
    const radiusSq = radius * radius;
    for (let i = 0; i < grains.length; i += 1) {
      const grain = grains[i];
      if (!reduce) {
        grain.vx += Math.sin(grain.y * 0.008 + time + grain.seed) * 0.018;
        grain.vy += 0.01 + Math.cos(grain.x * 0.006 - time * 0.8) * 0.006;
        if (fine && mouse.x > -1000) {
          const dx = grain.x - mouse.x;
          const dy = grain.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / radius) * 2.15;
            grain.vx += (dx / dist) * force;
            grain.vy += (dy / dist) * force * 0.55;
          }
        }
        const speed = Math.hypot(grain.vx, grain.vy);
        if (speed > 3.6) {
          grain.vx = (grain.vx / speed) * 3.6;
          grain.vy = (grain.vy / speed) * 3.6;
        }
        grain.vx *= 0.975;
        grain.vy *= 0.985;
        grain.x += grain.vx;
        grain.y += grain.vy;
        if (grain.x < -12) grain.x = width + 12;
        if (grain.x > width + 12) grain.x = -12;
        if (grain.y > height + 8) {
          grain.y = -8;
          grain.x = Math.random() * width;
          grain.vx *= 0.2;
          grain.vy = 0.2 + Math.random() * 0.3;
        }
      }
      ctx.fillStyle = grain.kind === 2
        ? "rgba(62, 231, 255, 0.9)"
        : grain.kind === 1
          ? "rgba(86, 150, 255, 0.55)"
          : "rgba(170, 198, 226, 0.32)";
      ctx.fillRect(grain.x, grain.y, grain.r, grain.r);
    }
  }

  function loop() {
    if (!running) return;
    time += 0.016;
    if (fine && mouse.x > -1000) {
      root.style.setProperty("--mx", mouse.x + "px");
      root.style.setProperty("--my", mouse.y + "px");
    }
    paint();
    frame = window.requestAnimationFrame(loop);
  }

  window.addEventListener("pointermove", (event) => {
    if (!fine || event.pointerType === "touch") return;
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      window.cancelAnimationFrame(frame);
      return;
    }
    if (!reduce) {
      running = true;
      loop();
    }
  });

  resize();
  paint();
  if (!reduce) loop();
})();
