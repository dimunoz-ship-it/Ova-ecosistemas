/* =========================================================
   OVA Ecosistemas · lógica
   Stepper de misión, fondo por pantalla, 4 actividades con insignias y evaluación
   ========================================================= */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Estado ---------- */
const SCREENS = ['inicio', 'contenido', 'actividades', 'evaluacion', 'creditos', 'recursos'];
const STEP_LABELS = ['Inicio', 'Contenido', 'Actividades', 'Evaluación', 'Créditos', 'Recursos'];

/* Fondo de cada pantalla (paleta A "Selva fresca"). Se cambian aquí. */
const STEP_BG = [
  'linear-gradient(160deg,#2E9E5B 0%,#14532D 78%)',
  'linear-gradient(160deg,#2A9DD8 0%,#14587F 78%)',
  'linear-gradient(160deg,#F0883A 0%,#A24E12 78%)',
  'linear-gradient(160deg,#1E8E9C 0%,#0D4551 78%)',
  'linear-gradient(135deg,#E8863A 0%,#2E9E5B 55%,#14532D 100%)',
  'linear-gradient(160deg,#2A9DD8 0%,#14532D 85%)'
];

const state = {
  screen: 'inicio',
  visited: new Set(['inicio']),
  done: new Set(),
  current: null,
  name: ''
};
let activeLayer = 0;

/* ---------- Avisos, lector de pantalla y confeti ---------- */
let toastTimer;
function toast(msg, type = '') {
  const kind = type === true ? 'ok' : type;
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 2200);
}
const announce = (msg) => { const r = $('#live-region'); if (r) r.textContent = msg; };

function confetti(n = 36) {
  const bits = ['🌿', '⭐', '🍃', '🦋', '🌼', '🐝'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'confeti';
    s.textContent = bits[i % bits.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDuration = 2 + Math.random() * 2.2 + 's';
    s.style.animationDelay = Math.random() * 0.6 + 's';
    s.setAttribute('aria-hidden', 'true');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 5000);
  }
}

/* ---------- Stepper y fondo ---------- */
function buildStepper() {
  $('#stepper').innerHTML = SCREENS.map((id, i) =>
    `<button class="step" data-go="${id}" data-i="${i}" aria-label="${STEP_LABELS[i]}"><span class="dot">${i + 1}</span><span class="step-label">${STEP_LABELS[i]}</span></button>`
  ).join('');
}

function updateStepper() {
  $$('.step').forEach((s) => {
    const id = SCREENS[+s.dataset.i];
    const active = id === state.screen;
    const done = !active && state.visited.has(id);
    s.classList.toggle('active', active);
    s.classList.toggle('done', done);
    if (active) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    $('.dot', s).textContent = done ? '✓' : (+s.dataset.i + 1);
  });
}

function setStageBackground(i) {
  const curr = $('#bgLayer' + activeLayer);
  const next = $('#bgLayer' + (1 - activeLayer));
  next.style.background = STEP_BG[i];
  next.style.opacity = 1;
  curr.style.opacity = 0;
  activeLayer = 1 - activeLayer;
}

/* ---------- Insignias ---------- */
const BADGES = [
  { i: 1, e: '🧩', n: '¿Dónde vive?' },
  { i: 2, e: '🕵️', n: 'Detective de relaciones' },
  { i: 3, e: '🔗', n: 'Arma la cadena' },
  { i: 4, e: '🃏', n: 'Parejas del ecosistema' }
];
function renderBadges() {
  const html = '<span class="b" aria-hidden="true">🎖️</span> Insignias: ' +
    BADGES.map((b) => {
      const got = state.done.has(b.i);
      return `<span class="b ${got ? 'got' : 'miss'}" title="${esc(b.n)}: ${got ? 'completada' : 'pendiente'}" aria-hidden="true">${b.e}</span>`;
    }).join('') +
    `<span class="visually-hidden">${state.done.size} de 4 actividades completadas</span>`;
  $$('#act-badges, #quiz-badges').forEach((el) => { el.innerHTML = html; });
}

/* ---------- Navegación ---------- */
function go(id) {
  if (!SCREENS.includes(id)) id = 'inicio';
  state.screen = id;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  state.visited.add(id);
  updateStepper();
  setStageBackground(SCREENS.indexOf(id));
  announce('Sección: ' + STEP_LABELS[SCREENS.indexOf(id)]);
  document.body.dataset.screen = id;
  window.scrollTo(0, 0);
  try { if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id); } catch (e) { /* sin historial */ }
  if (id === 'actividades') showActMenu();
  if (id === 'evaluacion') { renderBadges(); if (!quiz.started) quizIntro(); }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) go(b.dataset.go);
});
window.addEventListener('hashchange', () => go(location.hash.slice(1)));

/* ---------- Contenido: tarjetas y datos curiosos ---------- */
$$('.fcard').forEach((c) => {
  c.addEventListener('click', () => {
    const on = c.classList.toggle('flipped');
    c.setAttribute('aria-pressed', on);
  });
});

const FACTS = [
  'Un ecosistema puede ser enorme, como un océano, o diminuto, como un charco.',
  'Los hongos y las bacterias devuelven nutrientes al suelo para que las plantas puedan crecer otra vez.',
  'La energía de casi todos los ecosistemas viene del Sol: las plantas la capturan y la comparten con los demás.',
  'Las abejas no solo hacen miel: al pasar de flor en flor ayudan a que las plantas den frutos y semillas.'
];
let factIdx = -1;
$('#fact-btn').addEventListener('click', () => {
  factIdx = (factIdx + 1) % FACTS.length;
  const t = $('#fact-text');
  t.textContent = '¿Sabías que...? ' + FACTS[factIdx];
  t.classList.remove('cambia');
  void t.offsetWidth;
  t.classList.add('cambia');
});

/* =========================================================
   MOTOR DE ARRASTRAR Y SOLTAR (mouse, dedo y toque para seleccionar)
   ========================================================= */
function enableDnD(root, { itemSel, zoneSel, onResult, free = false }) {
  let selected = null;

  const holderOf = (zone) => zone.querySelector('.holder') || zone;
  const select = (el) => {
    if (selected) selected.classList.remove('selected');
    selected = el === selected ? null : el;
    if (selected) selected.classList.add('selected');
  };
  const zoneAt = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const z = el.closest && el.closest(zoneSel);
      if (z && root.contains(z)) return z;
    }
    return null;
  };
  const clearOver = () => $$(zoneSel, root).forEach((z) => z.classList.remove('over'));

  const drop = (item, zone) => {
    if (!zone) return;
    const isFree = zone.dataset.multi === '1' || !holderOf(zone).querySelector(itemSel);
    const ok = (free ? true : item.dataset.key === zone.dataset.key) && isFree;
    if (ok) {
      holderOf(zone).appendChild(item);
      item.classList.add('pop');
      if (!free) item.classList.add('placed');
      item.classList.remove('selected');
      item.setAttribute('aria-label', item.textContent.trim() + ' (colocado)');
      onResult(true, item, zone);
    } else {
      item.classList.remove('shake');
      void item.offsetWidth;
      item.classList.add('shake');
      onResult(false, item, zone);
    }
  };

  root.addEventListener('pointerdown', (e) => {
    const item = e.target.closest(itemSel);
    if (!item || item.classList.contains('placed')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY;
    let dragging = false;
    try { item.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }

    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!dragging && Math.hypot(dx, dy) > 8) {
        dragging = true;
        item.classList.add('dragging');
        if (selected) select(selected);
      }
      if (dragging) {
        item.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
        clearOver();
        const z = zoneAt(ev.clientX, ev.clientY);
        if (z) z.classList.add('over');
      }
    };
    const up = (ev) => {
      item.removeEventListener('pointermove', move);
      item.removeEventListener('pointerup', up);
      item.removeEventListener('pointercancel', up);
      try { item.releasePointerCapture(e.pointerId); } catch (err) { /* ok */ }
      item.classList.remove('dragging');
      item.style.transform = '';
      clearOver();
      if (dragging) drop(item, zoneAt(ev.clientX, ev.clientY));
      else if (free && selected && selected !== item && item.closest(zoneSel)) {
        // tocar una ficha ya colocada con otra seleccionada = soltar en esa zona
        const it = selected, z = item.closest(zoneSel);
        select(it);
        drop(it, z);
      } else select(item);
    };
    item.addEventListener('pointermove', move);
    item.addEventListener('pointerup', up);
    item.addEventListener('pointercancel', up);
  });

  // Toque: elegir ficha y luego tocar la zona
  root.addEventListener('click', (e) => {
    const zone = e.target.closest(zoneSel);
    // Se ignora solo el toque sobre una ficha suelta (eso la selecciona); sobre fichas ya colocadas sí se suelta
    if (zone && selected && !e.target.closest(itemSel + ':not(.placed)')) {
      const it = selected;
      select(it);
      drop(it, zone);
    }
  });

  // Teclado: Enter o espacio sobre una ficha la selecciona; sobre una zona, la suelta
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest(itemSel);
    if (item && !item.classList.contains('placed')) { e.preventDefault(); select(item); return; }
    const zone = e.target.closest(zoneSel);
    if (zone && selected) { e.preventDefault(); const it = selected; select(it); drop(it, zone); }
  });
}

const chipHTML = (it) =>
  `<div class="chip" tabindex="0" role="button" data-key="${esc(it.k)}">${it.e ? `<span class="e" aria-hidden="true">${it.e}</span>` : ''}<span class="lbl">${esc(it.n)}</span></div>`;

/* =========================================================
   ACTIVIDADES
   ========================================================= */
const ACTS = {
  1: { title: '¿Dónde vive?', help: 'Arrastra cada ser vivo al ecosistema donde vive. En el celular también puedes tocar el ser vivo y luego tocar el ecosistema.', start: act1 },
  2: { title: 'Detective de relaciones', help: 'Toca una situación y luego la relación biológica que le corresponde para unirlas.', start: act2 },
  3: { title: 'Arma la cadena alimenticia', help: 'Ordena los seres vivos de la cadena: arrastra cada uno a su lugar, desde quien capta la energía del Sol hasta quien recicla todo.', start: act3 },
  4: { title: 'Parejas del ecosistema', help: 'Voltea las cartas de a dos y encuentra cada palabra con su dibujo.', start: act4 }
};

function showActMenu() {
  $('#act-menu').hidden = false;
  $('#act-view').hidden = true;
  state.current = null;
  $$('.act-card').forEach((c) => c.classList.toggle('done', state.done.has(+c.dataset.act)));
  renderBadges();
}

function openAct(n) {
  const a = ACTS[n];
  state.current = n;
  $('#act-menu').hidden = true;
  $('#act-view').hidden = false;
  $('#act-body').innerHTML =
    `<h2>${n}. ${esc(a.title)}</h2><p class="lead">${esc(a.help)}</p><div id="act-stage"></div>` +
    `<div class="win" id="act-win" hidden><div class="big" aria-hidden="true">🎉</div><h3>¡Lo lograste!</h3><p id="act-win-msg"></p>` +
    `<div class="win-btns"><button class="btn btn-green" id="win-again">Jugar otra vez</button><button class="btn" id="win-menu">Más actividades</button></div></div>`;
  a.start($('#act-stage'));
  $('#win-again').onclick = () => openAct(n);
  $('#win-menu').onclick = () => showActMenu();
  window.scrollTo(0, 0);
}

function finishAct(msg) {
  state.done.add(state.current);
  renderBadges();
  $('#act-win-msg').textContent = msg;
  const w = $('#act-win');
  w.hidden = false;
  confetti();
  w.scrollIntoView({ behavior: 'smooth', block: 'center' });
  announce('Actividad completada. Ganaste una insignia.');
  if (state.done.size === 4) setTimeout(() => { if (state.screen === 'actividades') toast('¡Completaste las 4 actividades! Ya puedes ir a la evaluación', 'ok'); }, 1200);
}

$$('.act-card').forEach((c) => c.addEventListener('click', () => openAct(+c.dataset.act)));
$('#act-back').addEventListener('click', showActMenu);
$('#act-restart').addEventListener('click', () => { if (state.current) openAct(state.current); });

/* ---------- Actividad 1: arrastrar y soltar ---------- */
function act1(stage) {
  const ZONES = [
    { k: 'bosque', n: 'Bosque', e: '🌳' },
    { k: 'desierto', n: 'Desierto', e: '🏜️' },
    { k: 'acuatico', n: 'Mar y ríos', e: '🌊' }
  ];
  const ITEMS = [
    { e: '🐒', n: 'Mono', k: 'bosque' }, { e: '🐆', n: 'Jaguar', k: 'bosque' }, { e: '🦜', n: 'Loro', k: 'bosque' },
    { e: '🐪', n: 'Camello', k: 'desierto' }, { e: '🦂', n: 'Escorpión', k: 'desierto' }, { e: '🌵', n: 'Cactus', k: 'desierto' },
    { e: '🐬', n: 'Delfín', k: 'acuatico' }, { e: '🐙', n: 'Pulpo', k: 'acuatico' }
  ];
  stage.innerHTML =
    `<div class="counter" id="a1-count">Aciertos: 0 / ${ITEMS.length}</div>` +
    `<div class="zones">${ZONES.map((z) => `<div class="zone" tabindex="0" data-key="${z.k}" data-multi="1" aria-label="${z.n}"><div class="zhead"><span aria-hidden="true">${z.e}</span>${z.n}</div><div class="holder"></div></div>`).join('')}</div>` +
    `<div class="tray" id="a1-tray">${shuffle(ITEMS).map(chipHTML).join('')}</div>`;
  let hits = 0;
  enableDnD(stage, {
    itemSel: '.chip', zoneSel: '.zone',
    onResult(ok) {
      if (ok) {
        hits++;
        $('#a1-count').textContent = `Aciertos: ${hits} / ${ITEMS.length}`;
        toast('¡Correcto!', 'ok');
        if (hits === ITEMS.length) finishAct('Ya sabes dónde vive cada uno. ¡Excelente trabajo!');
      } else {
        toast('Ese no es su hogar. ¡Inténtalo de nuevo!', 'err');
      }
    }
  });
}

/* ---------- Actividad 2: unir ---------- */
let a2Resize = null;
function act2(stage) {
  const PAIRS = [
    { id: 'dep', e: '🦁', t: 'Un león persigue y se come a una cebra', r: 'Depredación', c: '#E5484D' },
    { id: 'mut', e: '🐝', t: 'Una abeja toma néctar y poliniza la flor', r: 'Mutualismo', c: '#2E9E5B' },
    { id: 'com', e: '🌱', t: 'Dos plantas pelean por la luz y el agua', r: 'Competencia', c: '#E08A00' },
    { id: 'par', e: '🐕', t: 'Una garrapata chupa la sangre de un perro', r: 'Parasitismo', c: '#8E5BD9' },
    { id: 'cmn', e: '🐦', t: 'Un ave hace su nido en un árbol sin dañarlo', r: 'Comensalismo', c: '#2A9DD8' }
  ];
  stage.innerHTML =
    `<div class="counter" id="a2-count">Parejas: 0 / ${PAIRS.length}</div>` +
    `<div class="match-wrap" id="a2-wrap"><svg class="lines" id="a2-lines" aria-hidden="true"></svg>` +
    `<div class="col">${shuffle(PAIRS).map((p) => `<button class="mcard left" data-id="${p.id}" style="--c:${p.c}"><span class="e" aria-hidden="true">${p.e}</span><span>${esc(p.t)}</span></button>`).join('')}</div>` +
    `<div class="col">${shuffle(PAIRS).map((p) => `<button class="mcard right" data-id="${p.id}" style="--c:${p.c}">${esc(p.r)}</button>`).join('')}</div></div>`;

  const wrap = $('#a2-wrap');
  const svg = $('#a2-lines');
  const matched = [];
  let left = null;

  const draw = () => {
    if (!wrap.isConnected) return;
    const w = wrap.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${w.width} ${w.height}`);
    svg.innerHTML = matched.map((id) => {
      const a = $(`.mcard.left[data-id="${id}"]`, wrap).getBoundingClientRect();
      const b = $(`.mcard.right[data-id="${id}"]`, wrap).getBoundingClientRect();
      const col = PAIRS.find((p) => p.id === id).c;
      return `<line style="stroke-dasharray:none;stroke-dashoffset:0;animation:none" x1="${a.right - w.left}" y1="${a.top + a.height / 2 - w.top}" x2="${b.left - w.left}" y2="${b.top + b.height / 2 - w.top}" stroke="${col}"/>`;
    }).join('');
  };
  if (a2Resize) window.removeEventListener('resize', a2Resize);
  a2Resize = draw;
  window.addEventListener('resize', a2Resize);

  wrap.addEventListener('click', (e) => {
    const card = e.target.closest('.mcard');
    if (!card || card.classList.contains('matched')) return;
    if (card.classList.contains('left')) {
      if (left) left.classList.remove('selected');
      left = card === left ? null : card;
      if (left) left.classList.add('selected');
      return;
    }
    if (!left) { toast('Primero toca una situación'); return; }
    if (left.dataset.id === card.dataset.id) {
      matched.push(card.dataset.id);
      left.classList.remove('selected');
      left.classList.add('matched');
      card.classList.add('matched');
      left = null;
      draw();
      $('#a2-count').textContent = `Parejas: ${matched.length} / ${PAIRS.length}`;
      toast('¡Pareja correcta!', 'ok');
      if (matched.length === PAIRS.length) finishAct('Ya reconoces las relaciones biológicas. ¡Eres un gran detective!');
    } else {
      [left, card].forEach((c) => { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); });
      left.classList.remove('selected');
      left = null;
      toast('Esa no es. Piensa cómo se tratan los dos seres vivos.', 'err');
    }
  });
}

/* ---------- Actividad 3: cadena alimenticia ---------- */
function act3(stage) {
  const CHAIN = [
    { k: 's1', role: 'Productor', e: '🌿', n: 'Planta' },
    { k: 's2', role: 'Consumidor primario', e: '🦗', n: 'Saltamontes' },
    { k: 's3', role: 'Consumidor secundario', e: '🐸', n: 'Rana' },
    { k: 's4', role: 'Consumidor terciario', e: '🐍', n: 'Serpiente' },
    { k: 's5', role: 'Descomponedor', e: '🍄', n: 'Hongos' }
  ];
  stage.innerHTML =
    `<div class="sun-tag">☀️ El Sol da la energía</div>` +
    `<div class="chain" id="a3-chain">${CHAIN.map((c, i) =>
      `<div class="slot" tabindex="0" data-key="${c.k}" aria-label="${c.role}"><div class="role">${i + 1}. ${c.role}</div><div class="holder"></div></div>` +
      (i < CHAIN.length - 1 ? '<span class="arrow" aria-hidden="true"><span>↓</span></span>' : '')).join('')}</div>` +
    `<div class="tray">${shuffle(CHAIN).map((c) => chipHTML({ e: c.e, n: c.n, k: c.k })).join('')}</div>`;
  let hits = 0;
  enableDnD(stage, {
    itemSel: '.chip', zoneSel: '.slot',
    onResult(ok) {
      if (ok) {
        hits++;
        toast('¡Bien ubicado!', 'ok');
        if (hits === CHAIN.length) {
          $('#a3-chain').classList.add('done');
          finishAct('La energía fluye del Sol a las plantas, a los consumidores y vuelve al suelo con los descomponedores.');
        }
      } else {
        toast('Ese no va ahí. ¿Quién capta la energía del Sol primero?', 'err');
      }
    }
  });
}

/* ---------- Actividad 4: memoria ---------- */
function act4(stage) {
  const P = [['Productor', '🌿'], ['Herbívoro', '🐄'], ['Carnívoro', '🦁'], ['Omnívoro', '🐻'], ['Descomponedor', '🍄'], ['Polinizador', '🐝']];
  const cards = shuffle(P.flatMap(([n, e], i) => [{ id: i, t: n, emoji: false }, { id: i, t: e, emoji: true }]));
  stage.innerHTML =
    `<div class="counter" id="a4-count">Intentos: 0</div>` +
    `<div class="mem">${cards.map((c) => `<button class="mc" data-id="${c.id}" aria-label="Carta boca abajo"><span class="in"><span class="f fr" aria-hidden="true">?</span><span class="f bk${c.emoji ? ' emoji' : ''}">${esc(c.t)}</span></span></button>`).join('')}</div>`;
  let first = null, lock = false, tries = 0, found = 0;
  $('.mem', stage).addEventListener('click', (e) => {
    const c = e.target.closest('.mc');
    if (!c || lock || c.classList.contains('up')) return;
    c.classList.add('up');
    if (!first) { first = c; return; }
    tries++;
    $('#a4-count').textContent = `Intentos: ${tries}`;
    if (first.dataset.id === c.dataset.id) {
      [first, c].forEach((x) => x.classList.add('matched'));
      first = null;
      found++;
      toast('¡Pareja!', 'ok');
      if (found === P.length) finishAct(`Encontraste todas las parejas en ${tries} intentos.`);
    } else {
      lock = true;
      const a = first;
      first = null;
      setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); lock = false; }, 900);
    }
  });
}

/* =========================================================
   EVALUACIÓN · 10 retos dinámicos
   Cada reto se califica al pulsar «Comprobar» (un solo intento) y vale 1 punto;
   si el reto tiene varias partes, el punto se da en proporción a los aciertos.
   Tipos: mc (opción única) · tfset (verdadero o falso) · classify (arrastrar a grupos)
          order (ordenar) · fill (completar) · match (unir con líneas)
   ========================================================= */
const QUESTIONS = [
  {
    type: 'mc', hint: 'Elige una opción.',
    q: '¿Qué es un ecosistema?',
    o: ['Un lugar donde seres vivos y elementos sin vida se relacionan', 'Solo el conjunto de animales de un lugar', 'Un tipo de planta que vive en el agua', 'Un parque con jardines'], a: 0,
    x: 'Un ecosistema une a los seres vivos con el agua, el aire, la luz y el suelo del lugar donde viven.'
  },
  {
    type: 'classify', hint: 'Arrastra cada ecosistema al tipo que le corresponde. En el celular, toca la ficha y luego el grupo.',
    q: 'Clasifica los ecosistemas',
    zones: [
      { k: 'terrestre', n: 'Terrestre', e: '🌳', c: '#E4F6E7' },
      { k: 'acuatico', n: 'Acuático', e: '🌊', c: '#DDF2FC' },
      { k: 'mixto', n: 'Mixto (agua y tierra)', e: '🌴', c: '#FFF1CF' }
    ],
    items: [
      { e: '🌲', n: 'Bosque', k: 'terrestre' }, { e: '🏜️', n: 'Desierto', k: 'terrestre' },
      { e: '🐋', n: 'Océano', k: 'acuatico' }, { e: '🏞️', n: 'Río Sinú', k: 'acuatico' },
      { e: '🐊', n: 'Ciénaga', k: 'mixto' }, { e: '🦀', n: 'Manglar', k: 'mixto' }
    ],
    x: 'Los ecosistemas terrestres están en tierra, los acuáticos en el agua y los mixtos combinan las dos, como las ciénagas y los manglares.'
  },
  {
    type: 'tfset', hint: 'Marca si cada afirmación es verdadera o falsa.',
    q: 'Seres vivos y elementos sin vida',
    stm: [
      { t: 'El agua, el aire y la luz del sol son seres vivos.', v: false, x: 'Son elementos sin vida; aun así, los seres vivos dependen de ellos.' },
      { t: 'Las plantas, los animales y los hongos forman parte de un ecosistema.', v: true, x: 'Todos los seres vivos de un lugar hacen parte de su ecosistema.' },
      { t: 'El suelo es un elemento sin vida del ecosistema.', v: true, x: 'El suelo, las rocas y el agua son la parte sin vida del ecosistema.' },
      { t: 'Un ecosistema solo puede ser muy grande, como un océano.', v: false, x: 'También puede ser pequeño, como un charco o un tronco caído.' }
    ]
  },
  {
    type: 'match', hint: 'Toca una situación y luego la relación que le corresponde para unirlas. Puedes cambiar una unión antes de comprobar.',
    q: 'Une cada situación con su relación biológica',
    pairs: [
      { id: 'dep', e: '🦅', t: 'Un águila caza y se come a una serpiente', s: 'Águila y serpiente', r: 'Depredación' },
      { id: 'mut', e: '🐠', t: 'El pez payaso protege a la anémona y ella lo protege a él', s: 'Pez payaso y anémona', r: 'Mutualismo' },
      { id: 'com', e: '🐓', t: 'Dos gallos pelean por el mismo alimento', s: 'Dos gallos', r: 'Competencia' },
      { id: 'par', e: '🐛', t: 'Una lombriz vive dentro del intestino de un perro y le quita nutrientes', s: 'Lombriz y perro', r: 'Parasitismo' },
      { id: 'cmn', e: '🦈', t: 'Un pez pequeño viaja pegado a un tiburón y come sus sobras', s: 'Pez y tiburón', r: 'Comensalismo' }
    ],
    x: 'Depredación: uno caza al otro. Mutualismo: los dos ganan. Competencia: pelean por lo mismo. Parasitismo: uno vive a costa del otro. Comensalismo: uno gana y el otro ni gana ni pierde.'
  },
  {
    type: 'fill', hint: 'Arrastra cada palabra al espacio que le corresponde. Sobra una.',
    q: 'Completa la explicación',
    parts: ['En el ', ' los dos seres vivos se benefician; en el ', ' uno se beneficia y el otro sale perjudicado.'],
    blanks: ['mutualismo', 'parasitismo'],
    words: ['mutualismo', 'parasitismo', 'competencia'],
    x: 'En el mutualismo los dos ganan; en el parasitismo uno gana y el otro sale perjudicado.'
  },
  {
    type: 'mc', hint: 'Elige una opción.',
    q: 'Una orquídea crece sobre el tronco de un árbol: lo usa de apoyo, pero no lo daña ni lo ayuda. ¿Qué relación es?',
    o: ['Comensalismo', 'Parasitismo', 'Depredación', 'Mutualismo'], a: 0,
    x: 'En el comensalismo uno se beneficia (la orquídea) y el otro ni gana ni pierde (el árbol).'
  },
  {
    type: 'order', hint: 'Arrastra cada ser vivo a su lugar, siguiendo el camino de la energía. En el celular, toca la ficha y luego el lugar.',
    q: 'Ordena esta cadena alimenticia',
    slots: ['1.º', '2.º', '3.º', '4.º'],
    items: [
      { e: '🌾', n: 'Pasto', k: '0' }, { e: '🐇', n: 'Conejo', k: '1' },
      { e: '🐍', n: 'Serpiente', k: '2' }, { e: '🦅', n: 'Águila', k: '3' }
    ],
    x: 'La energía va del Sol al pasto (productor), luego al conejo, a la serpiente y por último al águila.'
  },
  {
    type: 'classify', hint: 'Arrastra cada ser vivo al papel que cumple en la cadena alimenticia.',
    q: '¿Qué papel cumple cada uno?',
    zones: [
      { k: 'productor', n: 'Productor', e: '🌱', c: '#E4F6E7' },
      { k: 'consumidor', n: 'Consumidor', e: '🍽️', c: '#FFF1CF' },
      { k: 'descomponedor', n: 'Descomponedor', e: '♻️', c: '#F1E6DA' }
    ],
    items: [
      { e: '🌽', n: 'Planta de maíz', k: 'productor' }, { e: '🌿', n: 'Alga', k: 'productor' },
      { e: '🐄', n: 'Vaca', k: 'consumidor' }, { e: '🐆', n: 'Jaguar', k: 'consumidor' },
      { e: '🍄', n: 'Hongo', k: 'descomponedor' }, { e: '🦠', n: 'Bacterias', k: 'descomponedor' }
    ],
    x: 'Los productores fabrican su alimento con la luz del sol; los consumidores se alimentan de otros seres vivos; los descomponedores reciclan los restos.'
  },
  {
    type: 'mc', hint: 'Elige una opción.',
    q: '¿Qué pasaría si desaparecieran todos los descomponedores?',
    o: ['Los restos se acumularían y el suelo recibiría menos nutrientes', 'Habría más alimento para todos los animales', 'Las plantas crecerían más rápido sin ayuda', 'No cambiaría nada en el ecosistema'], a: 0,
    x: 'Sin hongos ni bacterias, los restos no se transformarían en nutrientes y las plantas tendrían menos para crecer.'
  },
  {
    type: 'tfset', hint: 'Marca si cada afirmación es verdadera o falsa.',
    q: 'Sobre las cadenas alimenticias',
    stm: [
      { t: 'La energía de una cadena alimenticia empieza en el Sol.', v: true, x: 'Las plantas capturan la energía del Sol y la comparten con quien se las come.' },
      { t: 'Los productores se alimentan de otros animales.', v: false, x: 'Los productores, como las plantas, fabrican su propio alimento.' },
      { t: 'Un herbívoro es un consumidor primario.', v: true, x: 'Los herbívoros se comen a los productores, por eso son los primeros consumidores.' }
    ]
  }
];

const quiz = { started: false, i: 0, score: 0, checked: false, run: null };
const quizEl = () => $('#quiz');
const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
let qResize = null;

function quizIntro() {
  quiz.started = false;
  quizEl().innerHTML =
    `<div class="result"><div class="big" style="font-size:3.4rem" aria-hidden="true">📝</div>` +
    `<h3>¡Hora de demostrar lo que aprendiste!</h3>` +
    `<p>Son ${QUESTIONS.length} retos: vas a arrastrar, unir, ordenar y completar. En cada uno pulsa «Comprobar» para ver cómo te fue y por qué.</p>` +
    `<label for="qname"><b>¿Cómo te llamas?</b></label>` +
    `<input id="qname" class="nameinput" maxlength="40" placeholder="Escribe tu nombre" autocomplete="given-name" value="${esc(state.name)}">` +
    `<div class="btn-row" style="justify-content:center"><button class="btn btn-ghost" data-go="actividades">← Atrás</button><button class="btn btn-big" id="q-start">Empezar</button></div></div>`;
  $('#q-start').onclick = () => {
    state.name = $('#qname').value.trim();
    quiz.started = true; quiz.i = 0; quiz.score = 0;
    quizQuestion();
  };
  $('#qname').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#q-start').click(); });
}

function quizQuestion() {
  const n = QUESTIONS.length;
  const q = QUESTIONS[quiz.i];
  quiz.checked = false;
  quizEl().innerHTML =
    `<div class="qinfo"><span>Pregunta ${quiz.i + 1} de ${n}</span><span>⭐ ${fmt(quiz.score)}</span></div>` +
    `<div class="qbar" aria-hidden="true"><span style="width:${(quiz.i / n) * 100}%"></span></div>` +
    `<p class="qtext">${esc(q.q)}</p>` +
    `<p class="qhint"><span aria-hidden="true">👉</span><span>${esc(q.hint)}</span></p>` +
    `<div class="qbody" id="qbody"></div>` +
    `<div id="q-fb" aria-live="polite"></div>` +
    `<div class="btn-row" id="q-actions"><button class="btn btn-green" id="q-check" disabled>Comprobar</button></div>`;
  const api = { ready: (ok) => { const b = $('#q-check'); if (b && !quiz.checked) b.disabled = !ok; } };
  quiz.run = BUILDERS[q.type](q, $('#qbody'), api);
  $('#q-check').onclick = quizCheck;
  $('#evaluacion h2').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function quizCheck() {
  if (quiz.checked || !quiz.run) return;
  quiz.checked = true;
  const n = QUESTIONS.length;
  const q = QUESTIONS[quiz.i];
  const r = quiz.run.check();                 // { pts, max, fixes }
  const frac = r.pts / r.max;
  quiz.score += frac;
  const body = $('#qbody');
  body.classList.add('q-locked');
  body.inert = true;
  $('.qbar span', quizEl()).style.width = ((quiz.i + 1) / n) * 100 + '%';

  const state3 = frac === 1 ? 'ok' : frac === 0 ? 'bad' : 'part';
  const title = state3 === 'ok' ? '¡Correcto!' : state3 === 'part' ? `Vas bien: acertaste ${r.pts} de ${r.max}.` : 'Casi.';
  const icon = state3 === 'ok' ? '✔' : state3 === 'part' ? '◐' : '✘';
  const fixes = r.fixes.length ? `<div>Corrección:</div><ul class="fixes">${r.fixes.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '';
  const why = q.x ? `<span class="xtxt">${esc(q.x)}</span>` : '';
  $('#q-fb').innerHTML = `<div class="explain ${state3}"><span class="icon" aria-hidden="true">${icon}</span><div><strong>${title}</strong>${fixes}${why}</div></div>`;
  announce(state3 === 'ok' ? 'Respuesta correcta' : state3 === 'part' ? 'Respuesta parcialmente correcta' : 'Respuesta incorrecta');

  const last = quiz.i === n - 1;
  $('#q-actions').innerHTML = `<button class="btn btn-green" id="q-next">${last ? 'Ver mi resultado' : 'Siguiente →'}</button>`;
  $('#q-next').focus();
  $('#q-next').onclick = () => { if (last) quizResult(); else { quiz.i++; quizQuestion(); } };
}

/* ---------- Constructores de cada tipo de reto ---------- */
const BUILDERS = { mc: buildMC, tfset: buildTF, classify: buildPlace, order: buildPlace, fill: buildPlace, match: buildMatch };

function buildMC(q, body, api) {
  const order = shuffle(q.o.map((_, k) => k));
  let chosen = null;
  body.innerHTML = `<div class="opts">${order.map((k, idx) =>
    `<button class="opt" data-k="${k}"><span class="letra" aria-hidden="true">${'ABCD'[idx]}</span><span>${esc(q.o[k])}</span></button>`).join('')}</div>`;
  $$('.opt', body).forEach((b) => b.addEventListener('click', () => {
    $$('.opt', body).forEach((o) => { o.classList.remove('sel'); o.setAttribute('aria-pressed', 'false'); });
    b.classList.add('sel');
    b.setAttribute('aria-pressed', 'true');
    chosen = +b.dataset.k;
    api.ready(true);
  }));
  return {
    check() {
      $$('.opt', body).forEach((b) => {
        const k = +b.dataset.k;
        b.classList.remove('sel');
        if (k === q.a) b.classList.add('ok'); else if (k === chosen) b.classList.add('bad');
      });
      return { pts: chosen === q.a ? 1 : 0, max: 1, fixes: [] };
    }
  };
}

function buildTF(q, body, api) {
  const ans = q.stm.map(() => null);
  body.innerHTML = q.stm.map((s, i) =>
    `<div class="tf-row" data-i="${i}"><p class="tf-text">${esc(s.t)}</p>` +
    `<div class="tf-btns"><button class="tf-btn" data-v="1" aria-pressed="false">✔ Verdadero</button><button class="tf-btn" data-v="0" aria-pressed="false">✘ Falso</button></div>` +
    `<p class="tf-exp" hidden></p></div>`).join('');
  $$('.tf-btn', body).forEach((b) => b.addEventListener('click', () => {
    const row = b.closest('.tf-row');
    $$('.tf-btn', row).forEach((x) => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); });
    b.classList.add('sel');
    b.setAttribute('aria-pressed', 'true');
    ans[+row.dataset.i] = b.dataset.v === '1';
    api.ready(ans.every((a) => a !== null));
  }));
  return {
    check() {
      let pts = 0;
      q.stm.forEach((s, i) => {
        const row = $(`.tf-row[data-i="${i}"]`, body);
        const ok = ans[i] === s.v;
        row.classList.add(ok ? 'ok' : 'bad');
        if (ok) pts++;
        const e = $('.tf-exp', row);
        e.hidden = false;
        e.textContent = (ok ? '✔ ' : `✘ Era ${s.v ? 'verdadero' : 'falso'}. `) + s.x;
      });
      return { pts, max: q.stm.length, fixes: [] };
    }
  };
}

/* Arrastrar a grupos (classify), ordenar (order) y completar (fill): comparten el mismo motor */
function buildPlace(q, body, api) {
  let layout, items;
  if (q.type === 'classify') {
    items = q.items;
    layout = `<div class="zones stack">${q.zones.map((z) =>
      `<div class="zone" tabindex="0" data-key="${esc(z.k)}" data-multi="1" aria-label="${esc(z.n)}" style="--zc:${z.c}">` +
      `<div class="zhead"><span aria-hidden="true">${z.e}</span>${esc(z.n)}</div><div class="holder"></div></div>`).join('')}</div>`;
  } else if (q.type === 'order') {
    items = q.items;
    layout = `<div class="sun-tag">☀️ El Sol da la energía</div><div class="chain">${q.slots.map((s, i) =>
      `<div class="slot" tabindex="0" data-key="${i}" data-single="1" aria-label="Lugar ${esc(s)}"><div class="role">${esc(s)}</div><div class="holder"></div></div>` +
      (i < q.slots.length - 1 ? '<span class="arrow" aria-hidden="true"><span>↓</span></span>' : '')).join('')}</div>`;
  } else {
    items = q.words.map((w) => ({ n: w, k: w }));
    layout = `<p class="fill-text">${q.parts.map((t, i) => esc(t) +
      (i < q.blanks.length ? `<span class="blank" tabindex="0" data-key="${esc(q.blanks[i])}" data-single="1" aria-label="Espacio ${i + 1}"><span class="holder"></span></span>` : '')).join('')}</p>`;
  }
  body.innerHTML = layout + `<div class="tray" tabindex="0" data-tray="1" data-multi="1" aria-label="Fichas por colocar">${shuffle(items).map(chipHTML).join('')}</div>`;
  const tray = $('.tray', body);
  const isReady = () => (q.type === 'fill' ? $$('.blank', body).every((b) => b.querySelector('.chip')) : !tray.querySelector('.chip'));
  enableDnD(body, { itemSel: '.chip', zoneSel: '.zone, .slot, .blank, .tray', free: true, onResult: () => api.ready(isReady()) });

  return {
    check() {
      let pts = 0;
      const fixes = [];
      if (q.type === 'fill') {
        $$('.blank', body).forEach((bl, i) => {
          const chip = bl.querySelector('.chip');
          const ok = !!chip && chip.dataset.key === bl.dataset.key;
          bl.classList.add(ok ? 'ok' : 'bad');
          if (chip) chip.classList.add(ok ? 'ok' : 'bad');
          if (ok) pts++; else fixes.push(`Espacio ${i + 1}: «${q.blanks[i]}»`);
        });
        return { pts, max: q.blanks.length, fixes };
      }
      $$('.chip', body).forEach((chip) => {
        const zone = chip.closest('.zone, .slot');
        const ok = !!zone && zone.dataset.key === chip.dataset.key;
        chip.classList.add(ok ? 'ok' : 'bad');
        if (ok) { pts++; return; }
        const name = $('.lbl', chip).textContent.trim();
        if (q.type === 'classify') fixes.push(`${name} va en «${q.zones.find((z) => z.k === chip.dataset.key).n}»`);
        else fixes.push(`${name} va en el lugar ${q.slots[+chip.dataset.key]}`);
      });
      return { pts, max: q.items.length, fixes };
    }
  };
}

/* Unir con líneas: las uniones se pueden cambiar hasta pulsar «Comprobar» */
function buildMatch(q, body, api) {
  const P = q.pairs;
  const COL = { idle: '#2A9DD8', ok: '#1E9E55', bad: '#D6383F' };
  body.innerHTML =
    `<div class="match-wrap" id="qm-wrap"><svg class="lines" id="qm-lines" aria-hidden="true"></svg>` +
    `<div class="col">${shuffle(P).map((p) => `<button class="mcard left" data-id="${p.id}"><span class="e" aria-hidden="true">${p.e}</span><span>${esc(p.t)}</span></button>`).join('')}</div>` +
    `<div class="col">${shuffle(P).map((p) => `<button class="mcard right" data-id="${p.id}">${esc(p.r)}</button>`).join('')}</div></div>`;
  const wrap = $('#qm-wrap');
  const svg = $('#qm-lines');
  const link = {};          // id de la situación -> id de la relación elegida
  let left = null;
  let checked = false;

  const draw = () => {
    if (!wrap.isConnected) return;
    const w = wrap.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${w.width} ${w.height}`);
    svg.innerHTML = Object.entries(link).map(([lid, rid]) => {
      const a = $(`.mcard.left[data-id="${lid}"]`, wrap).getBoundingClientRect();
      const b = $(`.mcard.right[data-id="${rid}"]`, wrap).getBoundingClientRect();
      const col = checked ? (lid === rid ? COL.ok : COL.bad) : COL.idle;
      return `<line style="stroke-dasharray:none;stroke-dashoffset:0;animation:none" x1="${a.right - w.left}" y1="${a.top + a.height / 2 - w.top}" x2="${b.left - w.left}" y2="${b.top + b.height / 2 - w.top}" stroke="${col}"/>`;
    }).join('');
  };
  const paint = () => {
    $$('.mcard', wrap).forEach((c) => {
      const id = c.dataset.id;
      c.classList.toggle('linked', c.classList.contains('left') ? id in link : Object.values(link).includes(id));
    });
    api.ready(Object.keys(link).length === P.length);
    draw();
  };
  if (qResize) window.removeEventListener('resize', qResize);
  qResize = draw;
  window.addEventListener('resize', qResize);

  wrap.addEventListener('click', (e) => {
    const card = e.target.closest('.mcard');
    if (!card) return;
    const id = card.dataset.id;
    if (card.classList.contains('left')) {
      if (left) left.classList.remove('selected');
      left = card === left ? null : card;
      if (left) left.classList.add('selected');
      return;
    }
    if (!left) {
      // sin situación elegida: si la relación ya estaba unida, se deshace la unión
      const lid = Object.keys(link).find((k) => link[k] === id);
      if (lid) { delete link[lid]; paint(); } else toast('Primero toca una situación');
      return;
    }
    Object.keys(link).forEach((k) => { if (link[k] === id) delete link[k]; });
    link[left.dataset.id] = id;
    left.classList.remove('selected');
    left = null;
    paint();
  });

  return {
    check() {
      checked = true;
      let pts = 0;
      const fixes = [];
      if (left) left.classList.remove('selected');
      P.forEach((p) => {
        const ok = link[p.id] === p.id;
        $(`.mcard.left[data-id="${p.id}"]`, wrap).classList.add(ok ? 'ok' : 'bad');
        if (ok) pts++; else fixes.push(`${p.s} → ${p.r}`);
      });
      $$('.mcard.right', wrap).forEach((c) => {
        const lid = Object.keys(link).find((k) => link[k] === c.dataset.id);
        c.classList.add(lid === c.dataset.id ? 'ok' : 'bad');
      });
      draw();
      return { pts, max: P.length, fixes };
    }
  };
}

function quizResult() {
  const n = QUESTIONS.length;
  const s = quiz.score;
  const stars = s >= 9 ? 3 : s >= 6 ? 2 : s >= 3 ? 1 : 0;
  const msg = s >= 9 ? '¡Eres un experto en ecosistemas!'
    : s >= 6 ? '¡Muy bien! Ya casi dominas el tema.'
    : s >= 3 ? 'Vas por buen camino. Repasa el contenido y vuelve a intentarlo.'
    : 'No te preocupes: repasa el video y las actividades y lo intentas otra vez.';
  const who = state.name ? `, ${esc(state.name)}` : '';
  quizEl().innerHTML =
    `<div class="result"><h3>¡Terminaste${who}!</h3>` +
    `<div class="score" id="q-score" aria-label="Puntaje ${fmt(s)} de ${n}">0</div><p><b>de ${n} puntos</b></p>` +
    `<div class="stars" aria-hidden="true">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">⭐</span>`).join('')}</div>` +
    `<p class="lead" style="margin:0 auto 12px">${msg}</p>` +
    `<div class="win-btns"><button class="btn btn-green" id="q-cert">⬇️ Descargar mi constancia</button><button class="btn" id="q-retry">Repetir evaluación</button><button class="btn btn-ghost" data-go="creditos">Ver créditos →</button></div></div>`;
  const t0 = performance.now();
  const el = $('#q-score');
  (function tick(t) {
    const p = Math.min(1, (t - t0) / 900);
    el.textContent = fmt(p * s);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
  if (s >= 6) confetti();
  quiz.started = false; // al volver a entrar a la sección, se muestra de nuevo la presentación
  $('#q-retry').onclick = quizIntro;
  $('#q-cert').onclick = () => downloadCert(s, n);
  $('#evaluacion h2').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Constancia descargable (se genera en el navegador, no se guarda nada en internet) */
function downloadCert(score, total) {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 800;
  const g = c.getContext('2d');
  g.fillStyle = '#FFF8E7'; g.fillRect(0, 0, 1200, 800);
  g.strokeStyle = '#2E9E5B'; g.lineWidth = 14; g.strokeRect(30, 30, 1140, 740);
  g.strokeStyle = '#FFC93C'; g.lineWidth = 6; g.strokeRect(52, 52, 1096, 696);
  g.textAlign = 'center'; g.fillStyle = '#14532D';
  const F = '"Fredoka","Nunito",system-ui,sans-serif';
  g.font = `700 70px ${F}`; g.fillText('Constancia', 600, 170);
  g.fillStyle = '#374151'; g.font = `400 34px ${F}`; g.fillText('Se le reconoce a', 600, 250);
  g.fillStyle = '#1E7F47'; g.font = `700 78px ${F}`;
  g.fillText(state.name || 'Estudiante', 600, 360, 1000);
  g.fillStyle = '#374151'; g.font = `400 34px ${F}`;
  g.fillText('por completar la evaluación del OVA «Ecosistemas»', 600, 440);
  g.fillStyle = '#14532D'; g.font = `700 64px ${F}`;
  g.fillText(`Puntaje: ${fmt(score)} de ${total}`, 600, 550);
  g.font = `400 28px ${F}`; g.fillStyle = '#374151';
  g.fillText('Ciencias Naturales · Grado 6°', 600, 650);
  g.fillText(new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }), 600, 700);
  c.toBlob((blob) => {
    if (!blob) { toast('No se pudo crear la constancia', 'err'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'constancia-ecosistemas.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Constancia descargada', 'ok');
  });
}

/* ---------- Video: si no carga el archivo local, se muestra el enlace a YouTube ---------- */
(function () {
  const v = $('#ova-video'), fb = $('#video-fallback');
  if (!v || !fb) return;
  const show = () => { v.hidden = true; fb.hidden = false; };
  const src = v.querySelector('source');
  if (src) src.addEventListener('error', show);
  v.addEventListener('error', show);
})();

/* ---------- Inicio: la imagen se inclina un poco con el mouse (solo en computador) ---------- */
(function () {
  const sec = $('#inicio'), art = $('#art-wrap');
  if (!sec || !art || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  sec.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = sec.getBoundingClientRect();
    art.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    art.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
  sec.addEventListener('pointerleave', () => { art.style.setProperty('--px', 0); art.style.setProperty('--py', 0); });
})();

/* ---------- Arranque ---------- */
buildStepper();
$('#bgLayer0').style.background = STEP_BG[0];
updateStepper();
renderBadges();
if (location.hash && SCREENS.includes(location.hash.slice(1))) go(location.hash.slice(1));
