(() => {
  const intro = document.querySelector('.intro');
  const stage = intro.querySelector('.flower-stage');
  const fallbackCanvas = document.querySelector('.flower-field');
  const cue = stage.querySelector('.field-cue');
  const title = stage.querySelector('h1');
  const showcase = intro.querySelector('.showcase');

  const flightViewport = .68;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const bound = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = (value) => value * value * (3 - 2 * value);
  let seed = 72625;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  // Rasterize the artwork once at twice its drawing scale.
  function sprite(palette, stem) {
    const image = document.createElement('canvas');
    image.width = image.height = 240;
    const pen = image.getContext('2d');
    pen.scale(2, 2);
    pen.translate(60, 49);

    if (stem) {
      pen.strokeStyle = '#384941';
      pen.lineWidth = 1.7;
      pen.beginPath();
      pen.moveTo(0, 3);
      pen.quadraticCurveTo(12, 30, 4, 64);
      pen.stroke();

      pen.fillStyle = '#30473c';
      pen.beginPath();
      pen.moveTo(9, 40);
      pen.quadraticCurveTo(-5, 24, -24, 27);
      pen.quadraticCurveTo(-8, 40, 9, 40);
      pen.moveTo(7, 52);
      pen.quadraticCurveTo(20, 34, 36, 37);
      pen.quadraticCurveTo(27, 49, 7, 52);
      pen.fill();

      pen.strokeStyle = '#607b68';
      pen.lineWidth = .55;
      pen.beginPath();
      pen.moveTo(-17, 29);
      pen.quadraticCurveTo(-5, 35, 8, 39);
      pen.moveTo(8, 51);
      pen.quadraticCurveTo(21, 43, 27, 40);
      pen.stroke();
    }

    const petal = pen.createLinearGradient(1, -2, -6, -43);
    petal.addColorStop(0, palette.root);
    petal.addColorStop(.30, palette.body);
    petal.addColorStop(1, palette.tip);
    const vein = pen.createLinearGradient(0, -5, 0, -31);
    vein.addColorStop(0, palette.fold);
    vein.addColorStop(1, 'transparent');

    for (const [index, scale] of [1, .94, 1.04, .91, .98].entries()) {
      pen.save();
      pen.rotate(index * Math.PI * 2 / 5);
      pen.scale(1, scale);
      pen.fillStyle = petal;
      pen.beginPath();
      pen.moveTo(0, 2);
      pen.bezierCurveTo(-5, -5, -15, -20, -12, -32);
      pen.bezierCurveTo(-10, -42, -2, -45, 0, -40);
      pen.bezierCurveTo(4, -46, 12, -40, 13, -32);
      pen.bezierCurveTo(16, -22, 6, -7, 0, 2);
      pen.fill();

      pen.strokeStyle = vein;
      pen.lineWidth = .58;
      pen.beginPath();
      pen.moveTo(-1, -5);
      pen.quadraticCurveTo(-7, -18, -6, -30);
      pen.moveTo(1, -5);
      pen.quadraticCurveTo(6, -17, 5, -28);
      pen.stroke();
      pen.restore();
    }

    pen.fillStyle = palette.root;
    pen.beginPath();
    pen.arc(0, 0, 4.2, 0, Math.PI * 2);
    pen.fill();
    pen.fillStyle = palette.tip;
    for (let index = 0; index < 8; index++) {
      const angle = index * Math.PI / 4;
      pen.beginPath();
      pen.arc(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, .62, 0, Math.PI * 2);
      pen.fill();
    }
    pen.fillStyle = palette.fold;
    pen.beginPath();
    pen.arc(0, 0, 1.05, 0, Math.PI * 2);
    pen.fill();
    return image;
  }

  const palettes = [
    { root: '#c99eaa', body: '#f0e9e6', tip: '#fffdf5', fold: '#b88d9d' },
    { root: '#c68fa4', body: '#f1dfe7', tip: '#fff5f8', fold: '#b77a96' },
    { root: '#a4657e', body: '#e9b9cc', tip: '#f7d7e1', fold: '#ab708a' },
  ];
  const sprites = palettes.flatMap(palette => [sprite(palette, false), sprite(palette, true)]);
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
    const sizeCurve = depth ** 1.58;
    return {
      x, depth, sizeCurve,
      near: smooth(bound((depth - .44) / .40)),
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
  for (const flower of field) {
    const swingPhase = -flower.x * 6.7 + flower.depth * 2.9;
    flower.swingSin = Math.sin(swingPhase);
    flower.swingCos = Math.cos(swingPhase);
    flower.tremorSin = Math.sin(flower.delay);
    flower.tremorCos = Math.cos(flower.delay);
  }
  const phoneField = field.filter((_, index) => index % 3 === 0).sort((a, b) => a.depth - b.depth);
  field.sort((a, b) => a.depth - b.depth);
  const fallbackField = field.filter((_, index) => index % 4 === 0);
  const pointer = { x: 0, y: 0, active: false };
  let w = 0, h = 0, frame = 0, lastPaint = -Infinity, lastScroll = 0, flow = 0;
  let focal = 0, climbLength = 1;
  let lastTick = 0, lateFrames = 0, throttleUntil = 0;
  let sizedCanvas = null, sizedWidth = 0, sizedHeight = 0;
  let mobile = false;
  let titleX = 0, titleY = 0;
  let canvas = fallbackCanvas.cloneNode();
  let gpu = null;
  let brush = null;

  try { gpu = createGpuRenderer(canvas, sprites); }
  catch { /* Use the Canvas renderer if hardware or shader initialization fails. */ }
  if (gpu) {
    fallbackCanvas.replaceWith(canvas);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      canvas.replaceWith(fallbackCanvas);
      canvas = fallbackCanvas;
      gpu = null;
      brush = canvas.getContext('2d');
      resize();
    }, { once: true });
  } else {
    canvas = fallbackCanvas;
    brush = canvas.getContext('2d');
  }
  if (!gpu && !brush) {
    cue.hidden = true;
    return;
  }

  function getSpriteBounds(sprites) {
    const bounds = new Float32Array(sprites.length * 4);
    sprites.forEach((sprite, index) => {
      const { width, height } = sprite;
      const pixels = sprite.getContext('2d').getImageData(0, 0, width, height).data;
      let left = width, right = 0, top = height, bottom = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!pixels[(y * width + x) * 4 + 3]) continue;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
      // Leave room for the antialiasing footprint when the distant blooms become tiny.
      const gutter = 12;
      bounds.set([
        Math.max(0, left - gutter) / width, Math.max(0, top - gutter) / height,
        Math.min(width, right + 1 + gutter) / width, Math.min(height, bottom + 1 + gutter) / height,
      ], index * 4);
    });
    return bounds;
  }

  function createGpuRenderer(surface, sprites) {
    const gl = surface.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
    });
    if (!gl) return null;

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    const halfTexel = .5 / sprites[0].width;
    const vertex = compile(gl.VERTEX_SHADER, `#version 300 es
      layout(location = 0) in vec4 bounds;
      layout(location = 1) in vec3 style;
      uniform vec2 screen;
      uniform vec4 spriteBounds[${sprites.length}];
      out vec2 samplePoint;
      out float opacity;
      void main() {
        vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
        vec4 crop = spriteBounds[int(style.z)];
        vec2 uv = mix(crop.xy, crop.zw, corner);
        vec2 point = (uv - vec2(.5, .41)) * bounds.zw;
        float c = cos(style.x), s = sin(style.x);
        vec2 position = bounds.xy + mat2(c, s, -s, c) * point;
        gl_Position = vec4(position / screen * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
        samplePoint = vec2((style.z + mix(${halfTexel}, ${1 - halfTexel}, uv.x)) / 6., uv.y);
        opacity = style.y;
      }`);
    const fragment = compile(gl.FRAGMENT_SHADER, `#version 300 es
      precision mediump float;
      uniform sampler2D flowers;
      in vec2 samplePoint;
      in float opacity;
      out vec4 color;
      void main() { color = texture(flowers, samplePoint) * opacity; }`);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.useProgram(program);
    gl.uniform4fv(gl.getUniformLocation(program, 'spriteBounds[0]'), getSpriteBounds(sprites));

    const atlas = document.createElement('canvas');
    atlas.width = sprites.length * sprites[0].width;
    atlas.height = sprites[0].height;
    const pen = atlas.getContext('2d');
    sprites.forEach((sprite, index) => pen.drawImage(sprite, index * sprite.width, 0));

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 5);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const screen = gl.getUniformLocation(program, 'screen');
    const data = new Float32Array((field.length * 2 + finalBlooms.length) * 7);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 28, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 16);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribDivisor(0, 1);
    gl.vertexAttribDivisor(1, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(8 / 255, 8 / 255, 10 / 255, 1);

    let offset = 0;
    return {
      resize(width, height) {
        gl.viewport(0, 0, surface.width, surface.height);
        gl.uniform2f(screen, width, height);
      },
      clear() {
        offset = 0;
      },
      sprite(art, x, y, width, height, opacity, angle) {
        data[offset++] = x;
        data[offset++] = y;
        data[offset++] = width;
        data[offset++] = height;
        data[offset++] = angle;
        data[offset++] = opacity;
        data[offset++] = art;
      },
      finish() {
        if (offset) gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, offset);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (offset) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, offset / 7);
      },
    };
  }

  function drawSprite(art, x, y, width, height, opacity, angle = 0) {
    if (gpu) {
      gpu.sprite(art, x, y, width, height, opacity, angle);
      return;
    }
    brush.globalAlpha = opacity;
    if (angle) {
      brush.save();
      brush.translate(x, y);
      brush.rotate(angle);
      brush.drawImage(sprites[art], -width / 2, -height * .41, width, height);
      brush.restore();
    } else {
      brush.drawImage(sprites[art], x - width / 2, y - height * .41, width, height);
    }
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
  }

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    if (!w || !h) return;
    mobile = w < 620;
    focal = Math.min(h, w * 1.85) / 870;
    if (!intro.hidden) climbLength = Math.max(1, showcase.offsetTop - h * (.34 + flightViewport));
    // Cap the flower surface separately from text and layout on high-DPI displays.
    const rasterBudget = Math.max(.65, Math.sqrt(4250000 / (w * h)));
    const dpr = Math.min(devicePixelRatio || 1, gpu ? (mobile ? 2.5 : 2) : 1.25, rasterBudget);
    const width = Math.round(w * dpr);
    const height = Math.round(h * dpr);
    const replaced = sizedCanvas !== canvas;
    const resized = width !== canvas.width || height !== canvas.height;
    if (width !== canvas.width) canvas.width = width;
    if (height !== canvas.height) canvas.height = height;
    if (replaced || resized || sizedWidth !== w || sizedHeight !== h) {
      if (gpu) gpu.resize(w, h);
      else brush?.setTransform(width / w, 0, 0, height / h, 0, 0);
      sizedCanvas = canvas;
      sizedWidth = w;
      sizedHeight = h;
    }
    schedule();
  }

  function moveTitle(reduced) {
    const followsPointer = pointer.active && !reduced;
    const targetX = followsPointer ? (pointer.x / w - .5) * 34 : 0;
    const targetY = followsPointer ? (pointer.y / h - .5) * 22 : 0;
    titleX = reduced || Math.abs(targetX - titleX) < .03 ? targetX : titleX + (targetX - titleX) * .19;
    titleY = reduced || Math.abs(targetY - titleY) < .03 ? targetY : titleY + (targetY - titleY) * .19;
    const x = `${titleX.toFixed(2)}px`;
    const y = `${titleY.toFixed(2)}px`;
    if (title.style.getPropertyValue('--title-x') !== x) title.style.setProperty('--title-x', x);
    if (title.style.getPropertyValue('--title-y') !== y) title.style.setProperty('--title-y', y);
  }

  function drawFinalBlooms(progress, time, reduced, lift, radius) {
    if (progress === 0) return;

    for (const bloom of finalBlooms) {
      const sway = reduced ? 0 : Math.sin(time * 1.35 + bloom.y * 12);
      const bob = reduced ? 0 : Math.cos(time * 1.1 + bloom.x * 14);
      const phase = reduced ? .5 : (flow + bloom.x * .8 + bloom.y * .2) % 1;
      const zoom = .88 / (1 - .24 * phase);
      const size = bloom.size * Math.max(.62, focal) * 1.45 * zoom;
      const x = w * (.5 + (bloom.x - .5) * zoom) + sway * size * .24;
      const y = h * (.14 + (bloom.y - .14) * progress * zoom) + bob * size * .19 - lift;
      displaceFlower(bloom, x, y, radius, 7 + 46 * .65, reduced);

      drawSprite(bloom.art, x + bloom.backDx, y + bloom.backDy, size * 2, size * 1.7,
        .62 * smooth(bound(progress * 2)) * (reduced ? 1 : flowOpacity(phase)), bloom.angle + sway * .14);
    }
  }

  function displaceFlower(flower, x, y, radius, strength, reduced) {
    let targetX = 0, targetY = 0;
    if (pointer.active && !reduced) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < radius * radius) {
        const distance = Math.sqrt(distanceSquared);
        const scale = (1 - distance / radius) ** 1.5 * strength / Math.max(1, distance);
        targetX = dx * scale;
        targetY = dy * scale;
      }
    }

    const restX = targetX - flower.backDx;
    const restY = targetY - flower.backDy;
    const needsMotion = !reduced && restX * restX + restY * restY >= .0016;
    flower.backDx = needsMotion ? flower.backDx + restX * .18 : targetX;
    flower.backDy = needsMotion ? flower.backDy + restY * .18 : targetY;
  }

  function flowOpacity(phase) {
    return smooth(bound(phase / .12)) * smooth(bound((1 - phase) / .16));
  }

  function paint(now) {
    frame = 0;
    if (document.hidden || !w || !h || (!gpu && !brush)) return;
    const catalog = intro.hidden;
    const flightLength = h * flightViewport;
    const position = scrollY;
    const scroll = bound(position / flightLength);
    const reduced = calm.matches;
    const climb = reduced ? Number(position >= h * .72) : bound((position - flightLength) / climbLength);
    const heroActive = !catalog && position < flightLength;
    const fastMotion = gpu && heroActive && (!mobile || position !== lastScroll);
    if (lastTick && fastMotion && now - lastTick > 25) {
      lateFrames += 2;
      if (lateFrames >= 6) {
        throttleUntil = now + 1400;
        lateFrames = 0;
      }
    } else {
      lateFrames = Math.max(0, lateFrames - 1);
    }
    lastTick = now;
    const minFrameTime = fastMotion && now >= throttleUntil ? 15 : 31;
    if (!reduced && now - lastPaint < minFrameTime) {
      schedule();
      return;
    }
    if (!reduced && Number.isFinite(lastPaint)) {
      flow = (flow + Math.min(50, now - lastPaint) * .00012) % 1;
    }
    lastPaint = now;
    lastScroll = position;
    const travel = reduced ? Number(scroll > .5) : smooth(bound(scroll / .52));
    const pitch = reduced ? travel : bound((scroll - .62) / .38);
    const settle = smooth(bound((scroll - .74) / .26));
    const framing = smooth(pitch);
    const exit = catalog ? 1 : reduced ? Number(climb > .1) : smooth(bound(climb / .58));
    // The translucent field belongs to the rise towards the works section.
    const backdrop = catalog ? 1 : reduced ? exit : smooth(bound((climb - .065) / .43));
    const overheadTrim = smooth(bound((pitch - .04) / .42))
      * (1 - .55 * smooth(bound((pitch - .66) / .34)));
    const backdropGain = backdrop * (catalog ? .68 : 1);
    const liftStyle = `${reduced ? 0 : -exit * h * .56}px`;
    if (stage.style.getPropertyValue('--hero-lift') !== liftStyle) stage.style.setProperty('--hero-lift', liftStyle);
    const opacity = String(1 - exit);
    if (stage.style.getPropertyValue('--hero-opacity') !== opacity) stage.style.setProperty('--hero-opacity', opacity);
    moveTitle(reduced);

    if (gpu) gpu.clear();
    else {
      brush.globalAlpha = 1;
      brush.clearRect(0, 0, w, h);
    }
    const rangeOfWind = mobile ? 76 : 122;
    const time = now * .001;
    const responding = pointer.active && !reduced;
    const swingSin = reduced ? 0 : Math.sin(time * 2.12);
    const swingCos = reduced ? 0 : Math.cos(time * 2.12);
    const tremorSin = reduced ? 0 : Math.sin(time * 3.9);
    const tremorCos = reduced ? 0 : Math.cos(time * 3.9);
    const rangeSquared = rangeOfWind * rangeOfWind;
    const minOpacity = .012;
    const visibleField = gpu ? (mobile ? phoneField : field) : fallbackField;
    for (const flower of visibleField) {
      const depth = flower.depth;
      // Each flower approaches the viewer, then fades and reappears in the distance.
      const phase = reduced ? .5 : (flow + flower.linger) % 1;
      const zoom = reduced ? 1 : .72 / (1 - phase * .51);
      const fade = reduced ? 1 : flowOpacity(phase);
      if (fade < minOpacity) continue;
      const backAlpha = depth > .10 ? backdropGain * (.09 + depth * .07) * fade : 0;
      const heroAlpha = (.62 + depth * .36) * (1 - settle * .22) * (1 - exit)
        * (1 - .24 * overheadTrim * flower.near) * fade;
      if (backAlpha < minOpacity && heroAlpha < minOpacity) continue;
      const swing = swingSin * flower.swingCos + swingCos * flower.swingSin;
      const tremor = tremorSin * flower.tremorCos + tremorCos * flower.tremorSin;
      const wind = focal * (1.4 + depth * 17);
      if (backAlpha >= minOpacity) {
        const backZoom = 1 + (zoom - 1) * .65;
        const backX = w * (.5 + (flower.x - .5) * backZoom) + wind * (swing + tremor * .16);
        const backY = h * (.45 + (flower.ground - .40) * backZoom + (1 - backdrop) * .14) + wind * tremor * .28;
        const backSize = focal * (3 + 28 * flower.sizeCurve) * flower.width * backZoom;
        if (backX >= -backSize && backX <= w + backSize && backY <= h + backSize) {
          if (responding || flower.backDx || flower.backDy) {
            displaceFlower(flower, backX, backY, rangeOfWind, 7 + 46 * depth, reduced);
          }
          drawSprite(flower.art, backX + flower.backDx, backY + flower.backDy, backSize * 2, backSize * 1.75, backAlpha);
        }
      }
      if (heroAlpha < minOpacity) continue;
      const heroWind = wind * (1 - settle * .43);
      // Advance along the viewing axis before raising the field overhead.
      const lift = smooth(bound((pitch - (1 - depth) * .08) / (.82 + .10 * depth)));
      const forwardDepth = travel * (.17 + .49 * depth);
      const overheadDepth = .77 * (.13 + .64 * depth);
      const closeness = 1 / (1 - (forwardDepth + (overheadDepth - forwardDepth) * framing));
      const x = w * (.5 + (flower.x - .5) * closeness * zoom) + heroWind * (swing + tremor * .16);
      const tail = flower.linger > .94 ? (flower.linger - .94) * 4 : 0;
      const y = h * (.43 + ((flower.ground - .43) * closeness - lift * (.235 + depth * 1.43 - tail)) * zoom)
        + heroWind * tremor * .28 - exit * h * .66;
      const size = focal * (3.2 + 30 * flower.sizeCurve) * flower.width * closeness * zoom
        * (1 - settle * .28) * (1 - .46 * overheadTrim * flower.near);
      if (x < -size || x > w + size || y < -size || y > h + size) continue;
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      if (responding && distanceSquared < rangeSquared) {
        const distance = Math.sqrt(distanceSquared);
        const push = (1 - distance / rangeOfWind) ** 1.5 * (7 + 46 * depth) * (1 - settle * .55);
        const scale = push / Math.max(1, distance);
        flower.dx += (dx * scale - flower.dx) * .18;
        flower.dy += (dy * scale - flower.dy) * .18;
      } else {
        flower.dx *= reduced ? 0 : .81;
        flower.dy *= reduced ? 0 : .81;
      }
      const angle = flower.direction * (1 + travel) + swing * (.09 + depth * .23) + flower.dx * .006;
      const shape = flower.flatten + tremor * depth * .09;
      drawSprite(flower.art, x + flower.dx, y + flower.dy, size * 2, size * shape * 2, heroAlpha, angle);
    }
    if (exit < 1) {
      drawFinalBlooms((reduced ? travel : settle) * (1 - exit), time, reduced, exit * h * .66, rangeOfWind);
    }
    gpu?.finish();
    if (!reduced) schedule();
  }

  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || calm.matches) return;
    Object.assign(pointer, { x: event.clientX, y: event.clientY, active: true });
    schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    pointer.active = false;
    schedule();
  });
  cue.addEventListener('click', () => {
    if (calm.matches) showcase.scrollIntoView();
    else scrollTo({ top: h * flightViewport, behavior: 'smooth' });
  });
  function onScroll() {
    cue.disabled = scrollY > 0;
    schedule();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(stage);
  new MutationObserver(resize).observe(intro, { attributes: true, attributeFilter: ['hidden'] });
  calm.addEventListener('change', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
      lateFrames = 0;
    } else {
      schedule();
    }
  });
  resize();
  onScroll();
})();
