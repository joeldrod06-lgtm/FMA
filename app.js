const flowerLink = document.querySelector('#flowerLink');
const stage = document.querySelector('.stage');
const disk = document.querySelector('.disk');
const sunflower = document.querySelector('.sunflower');
const tree = document.querySelector('.tree');
const ground = document.querySelector('.ground-line');
const drawing = document.querySelector('.tree-drawing');
const trunkBody = document.querySelector('#trunkBody');
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
  flower.append(make('circle', { r: 4.3, fill: '#a76716' }));
  flower.append(make('circle', { r: 3.2, fill: '#4e290e' }));
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4;
    flower.append(make('circle', {
      cx: Math.cos(angle) * 2, cy: Math.sin(angle) * 2, r: .45, fill: '#b78329',
    }));
  }
  tree.querySelector('defs').append(flower);
  const canopy = make('g', { class: 'heart-canopy' });
  tree.append(canopy);
  // Polígono usado solo para distribuir flores, sin dibujar un fondo sólido.
  const outline = Array.from({ length: 160 }, (_, i) => {
    const t = i / 160 * Math.PI * 2;
    return [206.5 + 11.2 * 16 * Math.sin(t) ** 3,
      183 - 12.7 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
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
  const blossoms = [];
  for (let row = 0, y = 22; y < 410; y += 15, row++) {
    for (let x = 24 + row % 2 * 8; x < 390; x += 16) {
      const px = x + (random() - .5) * 8;
      const py = y + (random() - .5) * 8;
      if (!inside(px, py)) continue;
      const size = .65 + random() * .48;
      const wrapper = make('g', { transform: `translate(${px} ${py}) rotate(${random() * 360}) scale(${size})` });
      const blossom = make('use', { href: '#canopy-sunflower', class: 'heart-blossom' });
      wrapper.append(blossom);
      canopy.append(wrapper);
      blossoms.push(blossom);
    }
  }
  // Baraja todas las posiciones: cada flor tiene su propio instante de aparición.
  for (let i = blossoms.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [blossoms[i], blossoms[j]] = [blossoms[j], blossoms[i]];
  }
  let delay = 0;
  for (const blossom of blossoms) {
    blossom.animate([
      { opacity: 0, transform: 'scale(.65)' },
      { opacity: 1, transform: 'scale(1)' },
    ], {
      duration: 420,
      delay,
      easing: 'cubic-bezier(.22, .61, .36, 1)',
      fill: 'both',
    });
    delay += 19 + random() * 15;
  }
  for (const branch of tree.querySelectorAll('.branch-fill, .thin')) {
    branch.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: delay, easing: 'ease-in-out', fill: 'forwards',
    });
  }
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


