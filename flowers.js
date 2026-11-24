(() => {
  const intro = document.querySelector('.intro');
  const stage = intro.querySelector('.flower-stage');
  const canvas = stage.querySelector('canvas');
  const cue = stage.querySelector('.field-cue');
  const title = stage.querySelector('h1');
  const showcase = intro.querySelector('.showcase');
  const brush = canvas.getContext('2d');
  if (!brush) {
    cue.hidden = true;
    return;
  }

  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const bound = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = (value) => value * value * (3 - 2 * value);
  let seed = 72625;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  // One original flower silhouette. Texture and stems are painted into sprites once.
  function sprite(color, stem) {
    const image = document.createElement('canvas');
    image.width = image.height = 120;
    const pen = image.getContext('2d');
    pen.translate(60, 49);
    if (stem) {
      pen.strokeStyle = '#273930';
      pen.lineWidth = 2;
      pen.beginPath();
      pen.moveTo(0, 3);
      pen.quadraticCurveTo(14, 26, 4, 65);
      pen.stroke();
      pen.fillStyle = '#273a31';
      pen.beginPath();
      pen.moveTo(9, 42);
      pen.quadraticCurveTo(-9, 39, -22, 24);
      pen.quadraticCurveTo(4, 24, 9, 42);
      pen.moveTo(8, 52);
      pen.quadraticCurveTo(21, 39, 36, 36);
      pen.quadraticCurveTo(26, 53, 8, 52);
      pen.fill();
    }
    pen.fillStyle = color;
    for (let petal = 0; petal < 5; petal++) {
      pen.beginPath();
      pen.moveTo(0, 3);
      pen.bezierCurveTo(-5, -5, -13, -20, -12, -31);
      pen.bezierCurveTo(-12, -44, 9, -46, 12, -34);
      pen.bezierCurveTo(15, -24, 6, -7, 0, 3);
      pen.fill();
      pen.rotate(Math.PI * 2 / 5);
    }
    pen.fillStyle = '#d7a4b4';
    pen.beginPath();
    pen.arc(0, 0, 2.6, 0, Math.PI * 2);
    pen.fill();
    return image;
  }

  const pinks = ['#f8f5ef', '#f6e9eb', '#edc4d2'];
  const sprites = pinks.flatMap(pink => [sprite(pink, false), sprite(pink, true)]);
  const finalBlooms = [
    { x: .064, y: .448, size: 16, art: 0, angle: -.36 },
    { x: .067, y: .655, size: 23, art: 5, angle: .58 },
    { x: .310, y: .715, size: 15, art: 2, angle: -.22 },
    { x: .503, y: .683, size: 12, art: 4, angle: .44 },
    { x: .669, y: .793, size: 19, art: 1, angle: -.50 },
    { x: .871, y: .519, size: 17, art: 2, angle: .22 },
    { x: .929, y: .921, size: 14, art: 4, angle: .71 },
  ].map(bloom => ({ ...bloom, backDx: 0, backDy: 0 }));
  const mainCount = 2780;
  const backgroundCount = 2180;
  const extraCount = 2100;
  const field = Array.from({ length: mainCount + backgroundCount + extraCount }, (_, index) => {
    const fillsMiddle = index >= mainCount + backgroundCount;
    const x = random() * 1.24 - .12;
    const depthSample = random();
    const depth = fillsMiddle
      ? .025 + depthSample ** 1.18 * .54
      : index < mainCount ? depthSample ** 1.48 : depthSample ** 1.2 * .31;
    const valley = 1 - bound(Math.abs(x - .5) * 1.95) ** 1.65;
    // Pull the additional blooms behind the title and above the side ridges.
    const rise = fillsMiddle ? (.07 + .022 * valley) * (1 - depth) : 0;
    return {
      x, depth,
      ground: .315 + valley * .16 + depth * .54 - rise + (random() - .5) * (.032 + depth * .09),
      width: .66 + random() * .64,
      flatten: .50 + random() * .42,
      direction: (random() - .5) * 1.35,
      delay: random() * 5,
      linger: random(),
      art: (random() < .59 ? 0 : random() < .72 ? 2 : 4) + Number(random() < .64),
      dx: 0, dy: 0, backDx: 0, backDy: 0,
    };
  });
  const phoneField = field.filter((_, index) => index % 2 === 0).sort((a, b) => a.depth - b.depth);
  field.sort((a, b) => a.depth - b.depth);
  const pointer = { x: 0, y: 0, active: false };
  let w = 0, h = 0, frame = 0, lastPaint = -Infinity, previousScroll = -1;
  let focal = 0;
  let titleX = 0, titleY = 0;

  function schedule() {
    if (!frame && !document.hidden && !intro.hidden) frame = requestAnimationFrame(paint);
  }

  function resize() {
    if (intro.hidden) return;
    w = stage.clientWidth;
    h = stage.clientHeight;
    focal = Math.min(h, w * 1.85) / 870;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    brush.setTransform(dpr, 0, 0, dpr, 0, 0);
    previousScroll = -1;
    schedule();
  }

  function moveTitle(reduced) {
    const followsPointer = pointer.active && !reduced;
    const targetX = followsPointer ? (pointer.x / w - .5) * 34 : 0;
    const targetY = followsPointer ? (pointer.y / h - .5) * 22 : 0;
    titleX = reduced || Math.abs(targetX - titleX) < .03 ? targetX : titleX + (targetX - titleX) * .19;
    titleY = reduced || Math.abs(targetY - titleY) < .03 ? targetY : titleY + (targetY - titleY) * .19;
    title.style.setProperty('--title-x', `${titleX.toFixed(2)}px`);
    title.style.setProperty('--title-y', `${titleY.toFixed(2)}px`);
  }

  function drawFinalBlooms(progress, time, reduced, lift, radius) {
    if (progress === 0) return;

    for (const bloom of finalBlooms) {
      const sway = reduced ? 0 : Math.sin(time * 1.35 + bloom.y * 12);
      const bob = reduced ? 0 : Math.cos(time * 1.1 + bloom.x * 14);
      const size = bloom.size * Math.max(.62, focal) * 1.45;
      const x = w * bloom.x + sway * size * .24;
      const y = h * (.14 + (bloom.y - .14) * progress) + bob * size * .19 - lift;
      displaceFlower(bloom, x, y, radius, 7 + 46 * .65, reduced);

      brush.save();
      brush.translate(x + bloom.backDx, y + bloom.backDy);
      brush.rotate(bloom.angle + sway * .14);
      brush.globalAlpha = .62 * smooth(bound(progress * 2));
      brush.drawImage(sprites[bloom.art], -size, -size * .69, size * 2, size * 1.7);
      brush.restore();
    }
  }

  function displaceFlower(flower, x, y, radius, strength, reduced) {
    let targetX = 0, targetY = 0;
    if (pointer.active && !reduced) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distance = Math.hypot(dx, dy);
      const amount = bound(1 - distance / radius) ** 1.5 * strength;
      targetX = dx / Math.max(1, distance) * amount;
      targetY = dy / Math.max(1, distance) * amount;
    }

    const needsMotion = !reduced && Math.hypot(targetX - flower.backDx, targetY - flower.backDy) >= .04;
    flower.backDx = needsMotion ? flower.backDx + (targetX - flower.backDx) * .18 : targetX;
    flower.backDy = needsMotion ? flower.backDy + (targetY - flower.backDy) * .18 : targetY;
  }

  function paint(now) {
    frame = 0;
    if (intro.hidden) return;
    const flightLength = h * 1.1;
    const scroll = bound(scrollY / flightLength);
    const reduced = calm.matches;
    const climb = bound((scrollY - flightLength) / Math.max(1, showcase.offsetTop - h * .24 - flightLength));
    if (!reduced && scrollY === previousScroll && now - lastPaint < 28) {
      schedule();
      return;
    }
    lastPaint = now;
    previousScroll = scrollY;
    const travel = reduced ? Number(scroll > .5) : smooth(scroll);
    const settle = smooth(bound((scroll - .67) / .33));
    const exit = reduced ? Number(climb > .1) : smooth(bound(climb / .58));
    const backdrop = reduced ? exit : smooth(bound((climb - .15) / .85));
    stage.style.setProperty('--hero-lift', `${reduced ? 0 : -exit * h * .56}px`);
    stage.style.setProperty('--hero-opacity', 1 - exit);
    moveTitle(reduced);

    brush.clearRect(0, 0, w, h);
    const mobile = w < 620;
    const rangeOfWind = mobile ? 76 : 122;
    const time = now * .001;
    const responding = pointer.active && !reduced;
    for (const flower of mobile ? phoneField : field) {
      const depth = flower.depth;
      const swing = reduced ? 0 : Math.sin(time * 2.12 - flower.x * 6.7 + depth * 2.9);
      const tremor = reduced ? 0 : Math.sin(time * 3.9 + flower.delay);
      const wind = focal * (1.4 + depth * 17);
      if (backdrop > 0 && depth > .10) {
        const backX = w * flower.x + wind * (swing + tremor * .16);
        const backY = h * (flower.ground + .05 + (1 - backdrop) * .52) + wind * tremor * .28;
        const backSize = focal * (3 + 28 * depth ** 1.58) * flower.width;
        if (responding || flower.backDx || flower.backDy) {
          displaceFlower(flower, backX, backY, rangeOfWind, 7 + 46 * depth, reduced);
        }
        if (backX >= -backSize && backX <= w + backSize && backY <= h + backSize) {
          brush.globalAlpha = backdrop * (.09 + depth * .07);
          brush.drawImage(sprites[flower.art], backX + flower.backDx - backSize, backY + flower.backDy - backSize * .72,
            backSize * 2, backSize * 1.75);
          brush.globalAlpha = 1;
        }
      }
      if (exit === 1) continue;
      const heroWind = wind * (1 - settle * .43);
      const lift = reduced ? travel : smooth(bound((scroll - .04 - depth * .19) / (.86 - depth * .19)));
      const closeness = 1 / (1 - travel * (.19 + .44 * depth));
      const x = w * (.5 + (flower.x - .5) * (1 + (closeness - 1) * .72)) + heroWind * (swing + tremor * .16);
      const tail = flower.linger > .94 ? (flower.linger - .94) * 4 : 0;
      const y = h * (.43 + (flower.ground - .43) * closeness - lift * (.235 + depth * 1.43 - tail))
        + heroWind * tremor * .28 - exit * h * .66;
      const size = focal * (3.2 + 30 * depth ** 1.58) * flower.width * closeness * (1 - settle * .43);
      if (x < -size || x > w + size || y < -size || y > h + size) continue;
      if (!reduced && pointer.active) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const length = Math.hypot(dx, dy);
        const move = bound(1 - length / rangeOfWind) ** 1.5 * (7 + 46 * depth) * (1 - settle * .55);
        flower.dx += (dx / Math.max(1, length) * move - flower.dx) * .18;
        flower.dy += (dy / Math.max(1, length) * move - flower.dy) * .18;
      } else {
        flower.dx *= reduced ? 0 : .81;
        flower.dy *= reduced ? 0 : .81;
      }
      brush.save();
      brush.translate(x + flower.dx, y + flower.dy);
      brush.rotate(flower.direction + swing * (.09 + depth * .23) + travel * flower.direction + flower.dx * .006);
      const opacity = (.62 + depth * .36) * (1 - settle * .46) * (1 - exit);
      brush.globalAlpha = opacity;
      const shape = flower.flatten + tremor * depth * .09;
      brush.drawImage(sprites[flower.art], -size, -size * shape * .82, size * 2, size * shape * 2);
      brush.restore();
    }
    if (exit < 1) {
      drawFinalBlooms((reduced ? travel : settle) * (1 - exit), time, reduced, exit * h * .66, rangeOfWind);
    }
    if (!reduced) schedule();
  }

  intro.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || calm.matches) return;
    const bounds = stage.getBoundingClientRect();
    Object.assign(pointer, { x: event.clientX - bounds.left, y: event.clientY - bounds.top, active: true });
    schedule();
  }, { passive: true });
  intro.addEventListener('pointerleave', () => {
    pointer.active = false;
    schedule();
  });
  cue.addEventListener('click', () => {
    scrollTo({ top: stage.offsetHeight * 1.1, behavior: calm.matches ? 'instant' : 'smooth' });
  });
  function onScroll() {
    cue.disabled = scrollY > 0;
    schedule();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(stage);
  calm.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      schedule();
    }
  });
  resize();
  onScroll();
})();
