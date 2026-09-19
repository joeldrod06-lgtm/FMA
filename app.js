const flowerLink = document.querySelector('#flowerLink');
const stage = document.querySelector('.stage');
const disk = document.querySelector('.disk');
const sunflower = document.querySelector('.sunflower');
const tree = document.querySelector('.tree');
const ground = document.querySelector('.ground-line');
const drawing = document.querySelector('.tree-drawing');
const trunkBody = document.querySelector('#trunkBody');
const replayButton = document.querySelector('.replay-button');
const soften = value => value < .5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
let landed = false;
let activeFall = null;
let fallDistance = 0;

// Recorta el dibujo original en pétalos independientes sin cambiar sus colores ni textura.
for (const [selector, count, angle, offset, sequence] of [
  ['.petals', 20, 18, 2, 0],
  ['.inner-petals', 19, 19, 0, 1],
]) {
  const original = sunflower.querySelector(selector);
  const petals = document.createDocumentFragment();
  for (let index = 0; index < count; index++) {
    const petal = original.cloneNode(false);
    const start = offset + index * angle;
    const end = Math.min(offset + (index + 1) * angle, offset + 360);
    const point = degrees => {
      const radians = degrees * Math.PI / 180;
      return `${50 + 150 * Math.sin(radians)}% ${50 - 150 * Math.cos(radians)}%`;
    };
    petal.classList.add('petal-slice');
    petal.style.clipPath = `polygon(50% 50%, ${point(start)}, ${point(end)})`;
    const direction = (start + end) / 2 * Math.PI / 180;
    const outwardX = Math.sin(direction);
    const outwardY = -Math.cos(direction);
    petal.style.transformOrigin = `${50 + 30 * outwardX}% ${50 + 30 * outwardY}%`;
    // Alterna posiciones para evitar que el desprendimiento recorra la flor como una rueda.
    petal.dataset.delay = 160 + ((index * 7) % count) * 24 + sequence * 80;
    petal.dataset.sway = outwardX;
    petal.dataset.variation = index;
    petals.append(petal);
  }
  original.replaceWith(petals);
}

function releasePetals() {
  for (const petal of sunflower.querySelectorAll('.petal-slice')) {
    const side = Number(petal.dataset.sway);
    const variation = Number(petal.dataset.variation);
    // Conserva la caída de la flor: apenas se separan mientras pierden opacidad.
    petal.animate([
      { opacity: 1, transform: 'translate(0, 0)' },
      { opacity: 0, transform: `translate(${side * 2}px, ${3 + variation % 3}px)` },
    ], {
      delay: Number(petal.dataset.delay),
      duration: 1900 + variation % 4 * 80,
      easing: 'cubic-bezier(.4, 0, .3, 1)',
      fill: 'forwards',
    });
  }
}

function measureFallDistance() {
  // Medidas de diseño: la compresión animada del disco no altera el punto de contacto.
  const origin = flowerLink.getBoundingClientRect().top + sunflower.offsetTop;
  return ground.getBoundingClientRect().top - origin - disk.offsetTop - disk.offsetHeight;
}

function alignSeed() {
  const line = ground.getBoundingClientRect();
  sunflower.style.setProperty('--fall-distance', `${measureFallDistance()}px`);
  const position = disk.getBoundingClientRect();
  const bounds = stage.getBoundingClientRect();
  const scale = Math.min(tree.clientWidth / 420, tree.clientHeight / 520);
  tree.style.left = `${position.left + position.width / 2 - bounds.left + 3.5 * scale}px`;
  tree.style.bottom = `${bounds.bottom - line.top}px`;
}

function updateLayout() {
  if (activeFall) {
    fallDistance = measureFallDistance();
    activeFall.effect.setKeyframes([
      { transform: 'translateY(0)' },
      { transform: `translateY(${fallDistance}px)` },
    ]);
  }
  if (landed) alignSeed();
}

function mergeSeedIntoGround() {
  const startedAt = performance.now();
  disk.animate([
    { offset: 0, transform: 'scale(1, 1)', opacity: 1, easing: 'cubic-bezier(.2, .4, .6, 1)' },
    { offset: .34, transform: 'scale(1.16, .55)', opacity: .84, easing: 'linear' },
    { offset: .70, transform: 'scale(.78, .22)', opacity: .38, easing: 'ease-out' },
    { offset: 1, transform: 'scale(.38, .025)', opacity: 0 },
  ], { duration: 900, fill: 'forwards' });
  // El brote acompaña la compresión inicial para mantener un movimiento continuo.
  growTrunk(startedAt + 160);
}

// Una copa de girasoles con contorno de corazón, en las mismas coordenadas del árbol.
function bloomHeart() {
  if (tree.querySelector('.heart-canopy')) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  const make = (tag, attributes) => {
    const node = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const flower = make('g', { id: 'canopy-sunflower' });
  for (let i = 0; i < 12; i++) {
    flower.append(make('ellipse', {
      cx: 0, cy: -6, rx: 2.3, ry: 4.8,
      fill: ['#ffd52b', '#f8bf12', '#ffe352'][i % 3],
      transform: `rotate(${i * 30})`,
    }));
  }
  // Dos flores completas: el centro de cada una queda definido antes de aparecer.
  const letterFlower = flower.cloneNode(true);
  letterFlower.setAttribute('id', 'canopy-letter-flower');
  flower.append(make('circle', { r: 2.8, fill: '#ae791d' }));
  flower.append(make('circle', { r: 1.9, fill: '#79501b' }));
  letterFlower.append(make('circle', { r: 7.3, fill: '#60330e' }));
  letterFlower.append(make('circle', { r: 6.5, fill: '#321909' }));
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4;
    letterFlower.append(make('circle', {
      cx: Math.cos(angle) * 4.8, cy: Math.sin(angle) * 4.8,
      r: .4, fill: '#926026',
    }));
  }
  tree.querySelector('defs').append(flower, letterFlower);
  const canopy = make('g', { class: 'heart-canopy' });
  tree.append(canopy);
  // Polígono usado solo para distribuir flores, sin dibujar un fondo sólido.
  const outline = Array.from({ length: 160 }, (_, i) => {
    const t = i / 160 * Math.PI * 2;
    return [210 + 12.65 * 16 * Math.sin(t) ** 3,
      190 - 11.2 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
  });
  const inside = (x, y) => {
    let result = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const [xi, yi] = outline[i], [xj, yj] = outline[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
    }
    return result;
  };
  let seed = 42;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  // Mapa de flores, no texto superpuesto. Cada celda oscura es un centro de girasol.
  const letters = [
    ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  ];
  const letterPositions = [];
  const letterStartX = 78;
  const letterStartY = 165;
  const letterStepX = 11.5;
  const letterStepY = 14.5;
  for (let glyph = 0; glyph < letters.length; glyph++) {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (letters[glyph][row][col] !== '1') continue;
        letterPositions.push({
          x: letterStartX + (glyph * 6 + col) * letterStepX,
          y: letterStartY + row * letterStepY,
        });
      }
    }
  }

  const blossoms = [];
  const addBlossom = (px, py, isLetter, size) => {
      const wrapper = make('g', {
        transform: `translate(${px} ${py}) rotate(${random() * 360}) scale(${size})`,
      });
      const blossom = make('use', {
        href: isLetter ? '#canopy-letter-flower' : '#canopy-sunflower',
        class: 'heart-blossom',
      });
      wrapper.append(blossom);
      canopy.append(wrapper);
      blossoms.push({ blossom, x: px, y: py });
  };

  // Flores de fondo amplias y cercanas, como la copa compacta de la referencia.
  for (let row = 0, y = 34; y < 394; y += 18.5, row++) {
    for (let x = 28 + row % 2 * 9.25; x < 398; x += 18.5) {
      const px = x + (random() - .5) * 5;
      const py = y + (random() - .5) * 5;
      if (!inside(px, py)) continue;
      if (letterPositions.some(point => Math.hypot(px - point.x, py - point.y) < 8.5)) continue;
      addBlossom(px, py, false, .84 + random() * .18);
    }
  }

  // Las flores de KATY nacen oscuras; nunca se transforman después de aparecer.
  for (const point of letterPositions) {
    addBlossom(point.x, point.y, true, .88);
  }

  // Corazón y letras comparten una sola secuencia aleatoria, flor por flor.
  for (let i = blossoms.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [blossoms[i], blossoms[j]] = [blossoms[j], blossoms[i]];
  }
  const timelineStart = document.timeline.currentTime;
  const blooming = blossoms.map(({ blossom }, index) => {
    const motion = blossom.animate([
      { opacity: 0 },
      { opacity: .08, offset: .22 },
      { opacity: .26, offset: .44 },
      { opacity: .53, offset: .66 },
      { opacity: .8, offset: .84 },
      { opacity: 1 },
    ], {
      duration: 1050,
      delay: index / (blossoms.length - 1) * 3000,
      easing: 'linear',
      fill: 'both',
    });
    motion.startTime = timelineStart;
    return motion.finished;
  });
  Promise.all(blooming).then(() => {
    window.setTimeout(() => finishDedication(blossoms, make, random), 400);
  });
}

function finishDedication(blossoms, make, random) {
  const dedication = document.querySelector('.dedication');
  dedication.hidden = false;
  dedication.animate([
    { opacity: 0 },
    { opacity: .22, offset: .32 },
    { opacity: .7, offset: .72 },
    { opacity: 1 },
  ], { duration: 1250, easing: 'cubic-bezier(.25, .1, .25, 1)', fill: 'both' });
  const falling = make('g', { class: 'falling-petals' });
  tree.append(falling);

  // Una lluvia ligera continúa mientras la composición permanezca en pantalla.
  const dropPetal = () => {
    const source = blossoms[Math.floor(random() * blossoms.length)];
    const origin = make('g', { transform: `translate(${source.x} ${source.y})` });
    const petal = make('ellipse', {
      cx: 0, cy: 0, rx: 2 + random() * .7, ry: 4.3 + random() * 1.2,
      fill: ['#ffd52b', '#f7bd14', '#ffe052'][Math.floor(random() * 3)],
    });
    origin.append(petal);
    falling.append(origin);
    const drift = (random() - .5) * 72;
    const drop = 520 - source.y + random() * 12;
    const motion = petal.animate([
      { opacity: 0, transform: 'translate(0, 0) rotate(0deg)' },
      { opacity: .1, transform: `translate(${drift * .06}px, ${drop * .05}px) rotate(3deg)`, offset: .16 },
      { opacity: .38, transform: `translate(${drift * .24}px, ${drop * .22}px) rotate(-5deg)`, offset: .36 },
      { opacity: .52, transform: `translate(${drift * .52}px, ${drop * .48}px) rotate(7deg)`, offset: .58 },
      { opacity: .4, transform: `translate(${drift * .78}px, ${drop * .74}px) rotate(-6deg)`, offset: .78 },
      { opacity: .14, transform: `translate(${drift * .94}px, ${drop * .92}px) rotate(5deg)`, offset: .93 },
      { opacity: 0, transform: `translate(${drift}px, ${drop}px) rotate(8deg)` },
    ], {
      duration: 5200 + random() * 1200,
      easing: 'linear',
      fill: 'both',
    });
    motion.finished.then(() => origin.remove());
    window.setTimeout(dropPetal, 680 + random() * 520);
  };
  dropPetal();
}

function growTrunk(startedAt = performance.now()) {
  const branches = [['.left-low, .t-left-low', .40], ['.right-low, .t-right-low', .59], ['.left-high, .t-left-high', .76], ['.right-high, .t-right-high', .89]];
  trunkBody.setAttribute('d', 'M187 520 L226 520 C224 460 220 387 209 210 L195 210 C197 365 193 445 187 520 Z');
  function frame(now) {
    if (now < startedAt) {
      requestAnimationFrame(frame);
      return;
    }
    stage.classList.add('is-growing');
    const progress = Math.min((now - startedAt) / 1850, 1);
    const p = soften(progress);
    drawing.style.transform = `scaleY(${p})`;
    for (const [selector, threshold] of branches) {
      for (const branch of tree.querySelectorAll(selector)) branch.style.opacity = Math.min(1, Math.max(0, (p - threshold) / .11));
    }
    if (progress < 1) requestAnimationFrame(frame);
    else bloomHeart();
  }
  requestAnimationFrame(frame);
}
flowerLink.addEventListener('click', async () => {
  if (stage.classList.contains('is-falling')) return;
  stage.classList.add('is-falling');
  releasePetals();
  fallDistance = measureFallDistance();
  const fall = sunflower.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${fallDistance}px)` }], { duration: 3600, easing: 'cubic-bezier(.42, 0, .78, .72)', fill: 'forwards' });
  activeFall = fall;
  await fall.finished;
  activeFall = null;
  sunflower.style.setProperty('--fall-distance', `${fallDistance}px`);
  fall.cancel();
  landed = true;
  alignSeed();
  mergeSeedIntoGround();
});
window.addEventListener('resize', updateLayout);
window.visualViewport?.addEventListener('resize', updateLayout);
if ('ResizeObserver' in window) new ResizeObserver(updateLayout).observe(stage);

replayButton.addEventListener('click', () => {
  const url = new URL(window.location.href);
  url.searchParams.set('replay', Date.now());
  window.location.replace(url);
});

if (new URLSearchParams(window.location.search).has('replay')) {
  window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  window.requestAnimationFrame(() => flowerLink.click());
}


