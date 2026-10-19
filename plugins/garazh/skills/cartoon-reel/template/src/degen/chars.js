// ─── degen: персонаж DOXA — сова-трейдер (единственный герой всех роликов) ───
// Эталон: references/images/doxa/owl.webp. Коричневые перья, кремовый лицевой диск, жёлтые глаза с тяжёлыми веками
// (самодовольный deadpan), уши-перья, оранжевый клюв; чёрный спортивный костюм с золотыми кантами и лентой «D»;
// пиксельные очки «deal with it». Грузится index.html только для эпизодов с TIMELINE.look === 'degen'.
// Контракт — как у Палыча (pipeline.md §4.7): CHARS.owl = { anchors, rig, body(st, P), head(st, P) },
//   локальная система 720×1280, голова ≈ 360,590, плечи y≈800. Несколько сов в кадре — разные P (движок сам).
// Свои треки (TIMELINE.cast.owl.tracks): shades 0..1 (пиксельные очки падают сверху на глаза),
//   (очки надеты по умолчанию — фирменный вид; при шоке сами сползают на клюв, track slip 0..1 — вручную)
//   grin 0..1 (довольная ухмылка, глаза щёлочкой), sweat 0..1 (пот; при шоке сам), dance 0..1 (танец в такт, stage.js),
//   puff 0..1 (перья дыбом — шок/ликвидация; при шоке сам).
window.CHARS = window.CHARS || {};
const DG = {
  ink: '#1a120c',
  brown: '#8a5a2f', brownDk: '#6b4322', brownLt: '#a8743f', disc: '#f1e2c4', discDk: '#dcc7a0',
  eye: '#f7c531', eyeDk: '#e09a12', beak: '#f29a2e', beakDk: '#c86f17',
  suit: '#161616', suitLt: '#2a2a2a', gold: '#e9b52c', goldDk: '#a87d14',
};

// пиксельные очки «deal with it»: g=0 — над кадром головы, g=1 — на глазах (падают с лёгким отскоком)
function dgPixelShades(g, yEyes, cx = 360) {
  if (g <= .01) return '';
  const k = clamp(g), y = lerp(yEyes - 260, yEyes, k < 1 ? easeOutBack(k) : 1), u = 12;   // u — «пиксель»
  // маска линз: строки пикселей (1 — чёрный), слева и справа; перемычка
  const rows = ['111111111111', '111111111111', '011111111110', '001111111100'];
  const lens = ox => rows.map((r, j) => [...r].map((c, i) => c === '1' ? `<rect x="${ox + i * u}" y="${y - 2 * u + j * u}" width="${u + .5}" height="${u + .5}"/>` : '').join('')).join('');
  const shine = ox => `<rect x="${ox + 2 * u}" y="${y - 2 * u + u}" width="${u}" height="${u}" fill="#fff"/><rect x="${ox + 3 * u}" y="${y - 2 * u}" width="${u}" height="${u}" fill="#fff"/>`
    + `<rect x="${ox + 4 * u}" y="${y - 2 * u + u}" width="${u}" height="${u}" fill="#fff"/><rect x="${ox + 3 * u}" y="${y}" width="${u}" height="${u}" fill="#fff"/>`;
  const L = cx - 13 * u, R = cx + u;
  return `<g fill="#0c0c0c">${lens(L)}${lens(R)}<rect x="${L + 12 * u - 4}" y="${y - 2 * u}" width="${R - L - 12 * u + 8}" height="${u + .5}"/>
    <rect x="${L - u}" y="${y - 2 * u}" width="${u}" height="${u + .5}"/><rect x="${R + 12 * u}" y="${y - 2 * u}" width="${u}" height="${u + .5}"/></g>${shine(L)}${shine(R)}`;
}
const dgSweat = (k, pts) => k <= .02 ? '' : pts.map(([x, y, s], i) => {
  const dy = ((k * 60 + i * 23) % 40);
  return `<path transform="translate(${x},${y + dy}) scale(${s})" d="M0,-18 C6,-6 12,2 12,8 A12,12 0 0 1 -12,8 C-12,2 -6,-6 0,-18 Z" fill="#8fd3ff" stroke="${DG.ink}" stroke-width="4" opacity="${clamp(k * 1.5).toFixed(2)}"/>`;
}).join('');
// перьевой контур: замкнутая кривая с зубцами (детерминированно); puff — длиннее зубцы
function dgFeather(cx, cy, rx, ry, n, amp, seed, a0 = 0, a1 = Math.PI * 2) {
  const r = rng(seed); let d = '';
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, k = i % 2 ? 1 + amp * (.6 + r() * .6) : 1 - amp * .15;
    d += (i ? ' L' : 'M') + (cx + Math.cos(a) * rx * k).toFixed(1) + ',' + (cy + Math.sin(a) * ry * k).toFixed(1);
  }
  return d;
}
// глаз совы: жёлтая радужка, зрачок, тяжёлое веко (перьевое) сверху — lid 0..1
function owlEye(id, cx, cy, r, lid, pr, gx, gy) {
  const ly = cy - r + clamp(lid) * 2 * r;
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${DG.eye}"/>
    <g clip-path="url(#${id})">
      <circle cx="${cx}" cy="${cy}" r="${r * .78}" fill="none" stroke="${DG.eyeDk}" stroke-width="7" opacity=".6"/>
      <circle cx="${cx + gx}" cy="${cy + gy}" r="${pr * 2}" fill="#1a1109"/>
      <circle cx="${cx + gx - pr * .7}" cy="${cy + gy - pr * .7}" r="${pr * .55}" fill="#fff"/>
      <rect x="${cx - r - 4}" y="${cy - r - 4}" width="${2 * r + 8}" height="${ly - cy + r + 4}" fill="${DG.discDk}"/>
    </g>
    ${lid > .02 && lid < .98 ? `<path d="M${cx - r},${ly} Q${cx},${ly + 8} ${cx + r},${ly}" stroke="${DG.ink}" stroke-width="6" fill="none" stroke-linecap="round"/>` : ''}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${DG.ink}" stroke-width="6"/>`;
}

CHARS.owl = {
  anchors: { head: [360, 600], mouth: [360, 690], chest: [360, 830], desk: 932 },
  rig: { L: { shoulder: [236, 812], len: [98, 104], bend: 1 }, R: { shoulder: [484, 812], len: [98, 104], bend: -1 },
         sleeve: '#1d1d1f', stripe: null, band: { color: DG.gold, text: 'D', w: 32 }, skin: DG.brown, crease: DG.brownDk, width: 56 },
  body(st, P) {
    const b = (st.bob || 0) * .4;
    // лента «D» по борту: золотые буквы на чёрном
    const dRow = (x, y0, y1) => { let s = ''; for (let y = y0; y < y1; y += 34) s += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Rubik" font-weight="900" font-size="26" fill="${DG.goldDk}">D</text>`; return s; };
    return `<g transform="translate(0,${b})">
      <path d="M314,690 L406,690 L414,780 L306,780 Z" fill="${DG.brown}" stroke="${DG.ink}" stroke-width="${W}"/>
      <path d="M116,1040 C114,880 156,790 254,766 L466,766 C564,790 606,880 604,1040 Z" fill="${DG.suit}" stroke="${DG.ink}" stroke-width="${W}" stroke-linejoin="round"/>
      <path d="M470,800 C540,860 570,950 580,1040 L604,1040 C602,900 570,820 500,786 Z" fill="${DG.suitLt}"/>
      <!-- капюшон-воротник -->
      <path d="M248,770 C236,820 290,856 360,858 C430,856 484,820 472,770 C440,800 280,800 248,770 Z" fill="${DG.suitLt}" stroke="${DG.ink}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M318,800 L322,846 M402,800 L398,846" stroke="${DG.gold}" stroke-width="4" stroke-linecap="round"/>
      <!-- молния и канты -->
      <path d="M360,856 L360,1040" stroke="${DG.gold}" stroke-width="6"/>
      <path d="M346,856 L346,1040 M374,856 L374,1040" stroke="${DG.goldDk}" stroke-width="2" opacity=".7"/>
      <path d="M226,900 C236,960 240,1000 242,1040" stroke="${DG.gold}" stroke-width="7" fill="none"/>
      ${dRow(206, 920, 1040)}
      <path d="M494,900 C484,960 480,1000 478,1040" stroke="${DG.gold}" stroke-width="7" fill="none"/>
      ${dRow(514, 920, 1040)}
    </g>`;
  },
  head(st, P) {
    const { lid = .55, pr = 9, mouth = 0, brow = 0, bob = 0, shock = 0, bliss = 0 } = st;
    const g = st.shades ?? 1, grin = clamp(st.grin ?? 0), puff = Math.max(st.puff ?? 0, shock), sweat = Math.max(st.sweat ?? 0, shock > .3 ? shock : 0);
    const amp = .035 + puff * .09;
    const headD = dgFeather(360, 600, 178, 170, 44, amp, 21) + ' Z';
    // уши-перья (слева и справа, наклон наружу)
    const tuft = sx => `<path transform="translate(360,0) scale(${sx},1) translate(-360,0)" d="M232,470 L176,${360 - puff * 30} L214,402 L208,${350 - puff * 24} L284,436 Z" fill="${DG.brown}" stroke="${DG.ink}" stroke-width="${W}" stroke-linejoin="round"/>
      <path transform="translate(360,0) scale(${sx},1) translate(-360,0)" d="M228,452 L198,392 L238,430" fill="${DG.brownLt}"/>`;
    // лицевой диск: два «лепестка» вокруг глаз, сливаются над клювом
    const discD = 'M360,500 C320,470 236,470 214,540 C196,600 220,680 280,708 C320,726 346,724 360,744 C374,724 400,726 440,708 C500,680 524,600 506,540 C484,470 400,470 360,500 Z';
    const L = st.lid >= 1 ? 1 : clamp(lerp(Math.max(lid, .42), 0, shock * .9) + grin * .2, 0, 1);
    const eyes = bliss > .5
      ? `<path d="M240,590 Q290,610 340,590 M380,590 Q430,610 480,590" stroke="${DG.ink}" stroke-width="8" fill="none" stroke-linecap="round"/>`
      : owlEye(P + 'eL', 290, 594, 54 + shock * 6, L, lerp(pr, 5, shock) * .9, 6, 8) + owlEye(P + 'eR', 432, 592, 56 + shock * 6, Math.max(L - .04, 0), lerp(pr, 5, shock) * .9, -6, 8);
    const by = 520 - brow * 1.2, tilt = shock > .3 ? -6 : 10;   // брови: самодовольно к центру, при шоке — вверх
    const open = clamp(mouth + shock * .6);
    return `<g transform="translate(0,${bob})">
      ${tuft(1)}${tuft(-1)}
      <path d="M300,446 L286,${396 - puff * 20} L326,428 L338,${380 - puff * 24} L362,424 L392,${384 - puff * 20} L398,430 L436,${402 - puff * 16} L420,452 Z" fill="${DG.brownLt}" stroke="${DG.ink}" stroke-width="${W}" stroke-linejoin="round"/>
      <path d="${headD}" fill="${DG.brown}" stroke="${DG.ink}" stroke-width="${W}" stroke-linejoin="round"/>
      <clipPath id="${P}hc"><path d="${headD}"/></clipPath>
      <g clip-path="url(#${P}hc)">
        <ellipse cx="300" cy="460" rx="120" ry="50" fill="${DG.brownLt}" opacity=".55"/>
        <ellipse cx="450" cy="720" rx="160" ry="70" fill="${DG.brownDk}" opacity=".6"/>
      </g>
      <path d="${discD}" fill="${DG.disc}" stroke="${DG.ink}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M360,520 L360,560" stroke="${DG.discDk}" stroke-width="5" stroke-linecap="round"/>
      ${eyes}
      <path d="M226,${by + tilt} Q280,${by - 18} 344,${by + 14}" stroke="${DG.brownDk}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M376,${by + 14} Q440,${by - 18} 494,${by + tilt}" stroke="${DG.brownDk}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <!-- клюв: верхний крючок + нижняя половинка (опускается от mouth/shock), ухмылка — уголок вбок -->
      ${open > .08 ? `<path d="M338,${672 + open * 6} L382,${672 + open * 6} L360,${702 + open * 34} Z" fill="${DG.beakDk}" stroke="${DG.ink}" stroke-width="5" stroke-linejoin="round"/>` : ''}
      <path d="M332,640 C334,622 386,622 388,640 L364,${700 - open * 6} Q360,${706 - open * 6} 356,${700 - open * 6} Z" fill="${DG.beak}" stroke="${DG.ink}" stroke-width="${W}" stroke-linejoin="round"/>
      <path d="M346,640 q8,-6 14,-2" stroke="#fff" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/>
      ${grin > .2 ? `<path d="M392,${690 - grin * 4} q22,${-4 - grin * 10} ${30 + grin * 8},${-22 - grin * 6}" stroke="${DG.ink}" stroke-width="5" fill="none" stroke-linecap="round"/>` : ''}
      ${dgPixelShades(g, 592 + clamp(Math.max(st.slip ?? 0, shock)) * 64, 361)}
      ${dgSweat(sweat, [[520, 520, 1.1], [200, 560, .9]])}
    </g>`;
  },
};
