// ─── rig: руки (плечо → локоть → запястье) + кисти ──────────────────────────
// Всё — чистые функции t. Ключи позы: { t, wrist:[x,y], hand, rot, layer, dur?, elbow?, bend?, arc?, sweep?, bob?, jiggle?, prop?, propRot?, propOffset? }
//   t      — момент СТАРТА движения в эту позу (приезжает к t+dur), dur по умолчанию RIG.dur
//   rot    — поворот кисти в градусах ОТНОСИТЕЛЬНО предплечья (0 = пальцы продолжают предплечье)
//   layer  — 'behind' (под столом/за ноутом) | 'front' (поверх стола и ноута) | 'desk' (рукав за столом, кисть поверх)
//   elbow  — явный локоть вместо IK; bend ±1 — в какую сторону гнуть локоть (IK)
//   arc    — 0..1 доля «дуги» вокруг плеча при переходе (1 = чистая полярная интерполяция, 0 = прямая)
//   sweep  — ±1 принудительное направление дуги (по умолчанию кратчайшее)
//   bob    — доля покачивания корпуса, которую наследует запястье (0 = лежит на столе, 1 = у лица)
//   jiggle — амплитуда «печатающего» дрожания запястья
//   prop   — имя предмета в кисти из реестра PROPS (см. propSvg) | null; propRot (°), propOffset [dx,dy] — в локальной системе кисти
//
// Риг персонажа (CHARS.<who>.rig): { L:{shoulder,len,bend}, R:{…}, sleeve, stripe (null = без полосы), skin, crease, width, dur }.
// Поля необязательные — отсутствующие берутся из RIG/SUIT/SKIN (риг Толяна). Риг хранится в состоянии руки (a.rig),
// поэтому armsSvg(arms, layer) рисует любого персонажа без лишних аргументов.
const SUIT = '#3d4f6b', CREASE = '#b97f55', HW = 5;   // цвет рукава, складки, обводка кисти
const RIG = {
  dur: .18,
  L: { shoulder: [226, 812], len: [98, 104], bend: 1 },
  R: { shoulder: [494, 812], len: [98, 104], bend: -1 },
};
const RIG_DEFAULTS = { sleeve: SUIT, stripe: '#f4f4f0', crease: CREASE, width: 50 };   // skin — SKIN из lib.js
function rigOf(rig) {
  const r = rig || {};
  return { L: r.L || RIG.L, R: r.R || RIG.R, dur: r.dur ?? RIG.dur, sleeve: r.sleeve ?? RIG_DEFAULTS.sleeve,
    stripe: 'stripe' in r ? r.stripe : RIG_DEFAULTS.stripe, skin: r.skin ?? SKIN, crease: r.crease ?? RIG_DEFAULTS.crease, width: r.width ?? RIG_DEFAULTS.width, band: r.band ?? null };
}

// ── математика ──
const TAU = Math.PI * 2, deg = r => r * 180 / Math.PI, rad = d => d * Math.PI / 180;
// кратчайшая разница углов (рад), либо принудительно в сторону sweep
const angDelta = (a, b, sweep) => {
  let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
  if (sweep && Math.sign(d) !== Math.sign(sweep)) d += sweep * TAU;
  return d;
};
// резкий переход: разгон-торможение, сжатое к 85 %, + маленький перелёт на приезде
const snap = k => {
  k = clamp(k);
  const e = easeInOut(clamp(k / .85)), ov = .06 * Math.sin(Math.PI * clamp((k - .7) / .3));
  return e + ov;
};
// 2-костный IK: локоть по плечу и запястью с фиксированными длинами, bend — сторона изгиба
function ik(p0, p2, [l1, l2], bend) {
  let dx = p2[0] - p0[0], dy = p2[1] - p0[1], d = Math.hypot(dx, dy) || 1e-6;
  const maxD = (l1 + l2) * .985, minD = Math.abs(l1 - l2) + 2;
  if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
  if (d < minD) { dx *= minD / d; dy *= minD / d; d = minD; }
  const ux = dx / d, uy = dy / d, a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return { elbow: [p0[0] + ux * a - uy * h * bend, p0[1] + uy * a + ux * h * bend], wrist: [p0[0] + dx, p0[1] + dy] };
}

// ── интерполяция ключей ──
// → { a, b, k }: a — предыдущая поза, b — текущая цель, k — прогресс перехода (1 = удержание)
function keyAt(keys, t, defDur = RIG.dur) {
  let i = keys.length - 1; while (i > 0 && keys[i].t > t) i--;
  const b = keys[i], a = keys[i - 1] || b, dur = b.dur ?? defDur;
  return { a, b, k: i > 0 ? (dur > 0 ? clamp((t - b.t) / dur) : 1) : 1 };
}
const lerpAng = (a, b, k, sweep) => a + angDelta(a, b, sweep) * k;
const field = (k0, k1, name, def) => [k0[name] ?? def, k1[name] ?? def];

// состояние одной руки в момент t (координаты сцены); rig — риг персонажа (по умолчанию Толян)
function armState(side, keys, t, bob, rig) {
  const R = rigOf(rig), cfg = R[side], S0 = [cfg.shoulder[0], cfg.shoulder[1] + bob * .4];
  if (!keys || !keys.length) return null;
  const { a, b, k } = keyAt(keys, t, R.dur), e = snap(k), mid = k >= .5 ? b : a;
  // запястье: смесь прямой и дуги вокруг плеча
  const [bobA, bobB] = field(a, b, 'bob', .4);
  const pA = [a.wrist[0], a.wrist[1] + bob * bobA], pB = [b.wrist[0], b.wrist[1] + bob * bobB];
  const lin = [lerp(pA[0], pB[0], e), lerp(pA[1], pB[1], e)];
  const rA = Math.hypot(pA[0] - S0[0], pA[1] - S0[1]), rB = Math.hypot(pB[0] - S0[0], pB[1] - S0[1]);
  const thA = Math.atan2(pA[1] - S0[1], pA[0] - S0[0]), thB = Math.atan2(pB[1] - S0[1], pB[0] - S0[0]);
  const th = lerpAng(thA, thB, e, b.sweep), r = lerp(rA, rB, e);
  const pol = [S0[0] + Math.cos(th) * r, S0[1] + Math.sin(th) * r];
  const arc = k >= 1 ? 0 : (b.arc ?? 1) * Math.sin(Math.PI * clamp(e));   // к концу перехода дуга сходится в точку
  let wrist = [lerp(lin[0], pol[0], arc), lerp(lin[1], pol[1], arc)];
  const jig = lerp(a.jiggle ?? 0, b.jiggle ?? 0, e);
  if (jig) wrist = [wrist[0] + Math.sin(t * 23) * jig * .5, wrist[1] + Math.sin(t * 31) * jig];
  // локоть: IK с плавной сменой стороны изгиба, либо явный ключ
  const elbowOf = key => key.elbow ? key.elbow : ik(S0, wrist, cfg.len, key.bend ?? cfg.bend).elbow;
  const eA = elbowOf(a), eB = elbowOf(b), ee = clamp(e);
  const elbow = [lerp(eA[0], eB[0], ee), lerp(eA[1], eB[1], ee)];
  if (!a.elbow && !b.elbow) wrist = ik(S0, wrist, cfg.len, 1).wrist;   // обрезка по досягаемости
  // поворот кисти относительно предплечья
  const rot = deg(lerpAng(rad(a.rot ?? 0), rad(b.rot ?? 0), e));
  const layer = (k < 1 && (a.layer === 'front' || b.layer === 'front')) ? 'front' : (mid.layer ?? 'behind');
  // предмет в кисти: переключается на середине перехода; поворот/смещение плавно, если предмет тот же
  const prop = mid.prop ?? null, same = a.prop === b.prop;
  const propRot = same ? lerp(a.propRot ?? 0, b.propRot ?? 0, ee) : (mid.propRot ?? 0);
  const [oA, oB] = field(a, b, 'propOffset', [0, 0]);
  const propOffset = same ? [lerp(oA[0], oB[0], ee), lerp(oA[1], oB[1], ee)] : (mid.propOffset ?? [0, 0]);
  return { side, shoulder: S0, elbow, wrist, rot, hand: mid.hand ?? 'rest', layer, prop, propRot, propOffset, rig: R };
}

// обе руки из poses = { L:[...], R:[...], head:[...] } (TIMELINE.poses или TIMELINE.cast[who].poses); rig — риг персонажа
function rigArms(poses, t, bob, rig) {
  const out = {};
  for (const side of ['L', 'R']) { const s = armState(side, poses && poses[side], t, bob, rig); if (s) out[side] = s; }
  return out;
}
// ── произвольные ключевые треки (TIMELINE.cast[who].tracks.*, TIMELINE.env.*) ──
// Ключ: { t, v, dur? } либо { t, dur?, ...поля } (значение = объект из остальных полей). Числа, массивы и объекты из чисел
// интерполируются с той же snap-кривой, что и позы (dur по умолчанию RIG.dur, 0 = мгновенно); строки/булевы переключаются в t ключа.
function mixVal(a, b, e) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, e);
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((x, i) => mixVal(x, b[i], e));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? mixVal(a[k], b[k], e) : (k in b ? b[k] : a[k]);
    return o;
  }
  return b;
}
const keyVal = k => { if ('v' in k) return k.v; const { t, dur, ...rest } = k; return rest; };
function trackAt(keys, t, defDur = RIG.dur) {
  if (!keys || !keys.length) return undefined;
  const { a, b, k } = keyAt(keys, t, defDur);
  return mixVal(keyVal(a), keyVal(b), snap(k));
}

// наклон головы (градусы) по ключам { t, tilt, dur? }
function rigHead(keys, t) {
  if (!keys || !keys.length) return 0;
  const { a, b, k } = keyAt(keys, t);
  return lerp(a.tilt ?? 0, b.tilt ?? 0, snap(k));
}

// ── кисти ──
// локальная система: запястье в (0,0), +x — вдоль предплечья наружу, y вниз. Размер ≈ 72×44.
// части: {cap:[x1,y1,x2,y2,w]} — капсула (палец), {d:'...'} — контур; рисуем в два прохода (обводка → заливка), как tube()
const cap = (x1, y1, x2, y2, w) => ({ cap: [x1, y1, x2, y2, w] });
const ell = (cx, cy, rx, ry) => ({ d: `M${cx - rx},${cy} a${rx},${ry} 0 1 0 ${rx * 2},0 a${rx},${ry} 0 1 0 ${-rx * 2},0` });
const fan = (ox, oy, len, w, angles) => angles.map(a => cap(ox, oy, ox + Math.cos(rad(a)) * len, oy + Math.sin(rad(a)) * len, w));
const HANDS = {
  // плоская варежка на столе (как раньше на столе)
  rest: { parts: [ell(28, 0, 36, 22)], lines: 'M16,-14 v16 M30,-16 v18 M44,-14 v16' },
  // кулак, указательный вверх (вдоль предплечья) — «внимание!»
  fingerUp: { parts: [ell(24, 3, 22, 20), cap(36, -6, 74, -8, 15)], lines: 'M14,10 q6,6 12,0 M28,12 q5,5 10,0' },
  // плоский кулак в профиль, палец вдоль предплечья, большой сверху
  point: { parts: [ell(18, 0, 24, 18), cap(30, -4, 70, -5, 14), cap(16, -8, 30, -22, 12)], lines: 'M10,8 q8,8 16,2 M26,10 q6,6 12,2' },
  // пальцы щепоткой — «chef's kiss»
  kiss: { parts: [ell(14, 0, 20, 20), { d: 'M22,-18 Q52,-14 64,-2 Q52,12 22,18 Z' }], lines: 'M26,-8 Q46,-6 60,-2 M26,0 Q46,0 60,-2 M26,8 Q46,6 60,-2' },
  // раскрытая ладонь, 4 пальца веером + большой
  spread: { parts: [ell(20, 0, 24, 22), ...fan(34, 0, 32, 13, [-36, -12, 12, 36]), cap(14, -10, 30, -34, 13)], lines: 'M12,-4 q8,-4 16,0 M14,8 q8,-3 14,0' },
  // кулак, большой палец вдоль предплечья — deadpan 👍
  thumbsUp: { parts: [ell(26, 4, 24, 22), cap(30, -12, 64, -18, 15)], lines: 'M12,0 h26 M14,10 h24 M18,19 h16' },
  // кисть на тачпаде (пока не нужна в гараже): плоская ладонь, пальцы чуть вперёд
  trackpad: { parts: [ell(24, 0, 34, 20), ...fan(44, 0, 20, 12, [-24, -8, 8, 24])], lines: 'M12,-10 v20 M26,-12 v24' },
};
function handSvg(name, side, x, y, angDeg, rig) {
  const h = HANDS[name] || HANDS.rest, R = rigOf(rig);
  const prim = (p, pass) => p.cap
    ? `<path d="M${p.cap[0]},${p.cap[1]} L${p.cap[2]},${p.cap[3]}" stroke="${pass ? R.skin : S}" stroke-width="${p.cap[4] + (pass ? 0 : 2 * HW)}" fill="none" stroke-linecap="round"/>`
    : `<path d="${p.d}" fill="${pass ? R.skin : S}" stroke="${pass ? 'none' : S}" stroke-width="${2 * HW}" stroke-linejoin="round"/>`;
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${angDeg.toFixed(1)})${side === 'R' ? ' scale(1,-1)' : ''}">
    ${h.parts.map(p => prim(p, 0)).join('')}${h.parts.map(p => prim(p, 1)).join('')}
    <path d="${h.lines}" stroke="${R.crease}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
}

// ── предметы в кисти ──
// Реестр PROPS.<name> — функция (x, y, ang, st, t, env) → SVG, либо объект { draw(x, y, ang, st, t, env), offset:[dx,dy], rot, upright }.
//   offset — положение предмета в локальной системе кисти (x вдоль предплечья, y вниз; для правой руки y зеркалится, как кисть);
//   rot — поворот предмета (°): относительно кисти, или абсолютный (мировой), если upright: true (чайник, кружка);
//   ключ позы может переопределить: propOffset, propRot (суммируется с rot реестра).
window.PROPS = window.PROPS || {};
function propSvg(a, st, t, env) {
  const p = PROPS[a.prop];
  if (!p) throw new Error(`поза ${a.side}: неизвестный prop "${a.prop}" (есть: ${Object.keys(PROPS).join(', ') || '—'})`);
  const draw = typeof p === 'function' ? p : p.draw, base = (typeof p === 'object' && p.offset) || [0, 0];
  const hAng = deg(Math.atan2(a.wrist[1] - a.elbow[1], a.wrist[0] - a.elbow[0])) + a.rot;   // угол системы кисти
  const ox = base[0] + a.propOffset[0], oy = (base[1] + a.propOffset[1]) * (a.side === 'R' ? -1 : 1);
  const c = Math.cos(rad(hAng)), s = Math.sin(rad(hAng));
  const x = a.wrist[0] + ox * c - oy * s, y = a.wrist[1] + ox * s + oy * c;
  const rot = (p.rot ?? 0) + a.propRot, ang = p.upright ? rot : hAng + (a.side === 'R' ? -rot : rot);
  return draw(x, y, ang, st, t, env);
}
// мировая точка предмета в кисти (для света телефона и т.п.): та же геометрия, что в propSvg
function propPoint(a) {
  const p = PROPS[a.prop], base = (p && typeof p === 'object' && p.offset) || [0, 0];
  const hAng = deg(Math.atan2(a.wrist[1] - a.elbow[1], a.wrist[0] - a.elbow[0])) + a.rot;
  const ox = base[0] + a.propOffset[0], oy = (base[1] + a.propOffset[1]) * (a.side === 'R' ? -1 : 1);
  const c = Math.cos(rad(hAng)), s = Math.sin(rad(hAng));
  return [a.wrist[0] + ox * c - oy * s, a.wrist[1] + ox * s + oy * c];
}

// ── отрисовка ──
function sleeveSvg(a) {
  const { shoulder: s, elbow: e, wrist: w } = a, R = rigOf(a.rig);
  // полоса по центру рукава, подрезана у плеча и у запястья
  const cut = (p, q, d) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [p[0] + (q[0] - p[0]) * d / L, p[1] + (q[1] - p[1]) * d / L]; };
  const s1 = cut(s, e, 12), w1 = cut(w, e, 16);
  const stripe = `M${s1[0].toFixed(1)},${s1[1].toFixed(1)} L${e[0].toFixed(1)},${e[1].toFixed(1)} L${w1[0].toFixed(1)},${w1[1].toFixed(1)}`;
  // band (опц., rig.band = { color, text, w }): широкая лента по рукаву с повторяющимися буквами (DOXA: «DDDD» на золотом канте)
  if (R.band) {
    const B = R.band, bw = B.w ?? 30, id = `band_${a.side}_${Math.round(s[0])}_${Math.round(s[1])}_${Math.round(w[0])}_${Math.round(w[1])}`;
    const lr = w[0] < s[0];   // текст читается слева направо: путь ведём от левого конца
    const tp = lr ? `M${w1[0].toFixed(1)},${w1[1].toFixed(1)} L${e[0].toFixed(1)},${e[1].toFixed(1)} L${s1[0].toFixed(1)},${s1[1].toFixed(1)}` : stripe;
    return tube([s, e, w].map(p => [+p[0].toFixed(1), +p[1].toFixed(1)]), R.width, R.sleeve) +
      `<path d="${stripe}" stroke="${B.color}" stroke-width="${bw}" fill="none" stroke-linejoin="round"/>
       <path id="${id}" d="${tp}" stroke="${R.sleeve}" stroke-width="${bw - 8}" fill="none" stroke-linejoin="round"/>
       <text font-family="Rubik" font-weight="900" font-size="${bw - 10}" fill="${B.color}" dy="${(bw - 10) * .36}"><textPath href="#${id}">${(B.text || 'D').repeat(40)}</textPath></text>`;
  }
  return tube([s, e, w].map(p => [+p[0].toFixed(1), +p[1].toFixed(1)]), R.width, R.sleeve) +
    (R.stripe ? `<path d="${stripe}" stroke="${R.stripe}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="${stripe}" stroke="${R.sleeve}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : '');
}
function armHandSvg(a, st, t, env) {
  const fa = deg(Math.atan2(a.wrist[1] - a.elbow[1], a.wrist[0] - a.elbow[0]));   // направление предплечья
  return handSvg(a.hand, a.side, a.wrist[0], a.wrist[1], fa + a.rot, a.rig) + (a.prop ? propSvg(a, st, t, env) : '');
}
// слой 'behind' — до стола; 'front' — после ноутбука. 'desk': рукав в behind, кисть во front.
// Предмет в кисти (prop) рисуется сразу после кисти, в её слое; st/t/env нужны только предметам (опц.)
function armsSvg(arms, layer, st, t, env) {
  if (!arms) return '';
  let s = '';
  for (const a of Object.values(arms)) {
    if (a.layer === layer) s += sleeveSvg(a) + armHandSvg(a, st, t, env);
    else if (a.layer === 'desk') s += layer === 'behind' ? sleeveSvg(a) : armHandSvg(a, st, t, env);
  }
  return s;
}
