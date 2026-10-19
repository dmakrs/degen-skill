// ─── degen: set terminal — крипто-терминал на весь кадр: свечи, панель ордера (LONG/SHORT, плечо, сумма), позиция с PnL, курсор ───
// Всё состояние — чистая функция t из TIMELINE.term (только литералы):
//   term: {
//     chart:  { seed, n, path:[…] },            // история: n свечей, закрытия идут по path (0..200 — «цена» в условных единицах) + шум
//     price:  [{ t, v, dur? }],                 // живая цена последней свечи (trackAt: от предыдущего значения к v за dur)
//     next:   [t, …],                           // в эти моменты живая свеча закрывается и начинается новая
//     panel:  { show:[[a,b]], lev:[{t,v}], amt:[{t,v}] },   // lev — индекс стопа 0..5 (1x…100x), amt — 0..1 (сумма amtMin…amtMax)
//     amtMin, amtMax,                           // подписи суммы, по умолчанию 15000 / 100000
//     press:  [t, …],                           // кнопка LONG вдавлена 0.15 с
//     pos:    { show:[[a,b]], lev:'100x', pnl:[{ t, v, dur? }] },   // плашка позиции (как в референсе), PnL — свой трек
//     liq:    t,                                // ликвидация: плашка «LIQUIDATED», красные вспышки
//     cursor: [{ t, v:[x,y], dur? }], clicks:[t, …],
//   }
// Координаты для курсора: стопы плеча x = 110 + i·100, y = 196; ползунок суммы x = 330 + k·280, y = 262; кнопка LONG — (360, 330).
const TM = { bg: '#1b2028', grid: '#262d37', up: '#22e06b', dn: '#ff2a35', text: '#d7dde6', panel: '#272e38', knob: '#d6e22b' };
const TERM_Y = v => 1210 - v * 3.7;   // 0 → низ графика, 200 → почти до панели
const TERM_LEV = ['1x', '10x', '25x', '50x', '75x', '100x'];

function termHistory(C) {
  const r = rng(C.seed || 7), n = C.n || 18, path = C.path || [100, 100], out = [];
  let prev = path[0];
  for (let i = 0; i < n; i++) {
    const u = i / Math.max(1, n - 1) * (path.length - 1), j = Math.min(path.length - 2, Math.floor(u));
    const close = lerp(path[j], path[j + 1], u - j) + (r() - .5) * 16;
    out.push({ o: prev, c: close, h: Math.max(prev, close) + r() * 8, l: Math.min(prev, close) - r() * 8 });
    prev = close;
  }
  return out;
}
// живые свечи: закрываются в моменты next; хай/лоу — по выборке трека цены с шагом кадра
function termLive(T, t, hist) {
  const price = x => trackAt(T.price || [{ t: 0, v: hist[hist.length - 1].c }], x);
  const cuts = (T.next || []).filter(x => x <= t), out = [];
  let start = 0, open = hist[hist.length - 1].c;
  for (const cut of [...cuts, t]) {
    let h = open, l = open;
    for (let x = start; x <= cut + 1e-6; x += 1 / 30) { const p = price(x); h = Math.max(h, p); l = Math.min(l, p); }
    const c = price(cut);
    out.push({ o: open, c, h: Math.max(h, c), l: Math.min(l, c) });
    open = c; start = cut;
  }
  return out;
}
const candleSvg = (x, k, w = 20) => {
  const up = k.c >= k.o, col = up ? TM.up : TM.dn, y1 = TERM_Y(Math.max(k.o, k.c)), y2 = TERM_Y(Math.min(k.o, k.c));
  return `<line x1="${x}" x2="${x}" y1="${TERM_Y(k.h).toFixed(1)}" y2="${TERM_Y(k.l).toFixed(1)}" stroke="${col}" stroke-width="3"/>
    <rect x="${x - w / 2}" y="${y1.toFixed(1)}" width="${w}" height="${Math.max(3, y2 - y1).toFixed(1)}" fill="${col}"/>`;
};

function termPanel(T, t) {
  const P = T.panel, lev = trackAt(P.lev || [{ t: 0, v: 0 }], t), amt = clamp(trackAt(P.amt || [{ t: 0, v: 0 }], t));
  const pressed = (T.press || []).some(p => t >= p && t < p + .15);
  const amin = T.amtMin ?? 15000, amax = T.amtMax ?? 100000, amount = Math.round(lerp(amin, amax, amt) / 500) * 500;
  const stops = TERM_LEV.map((s, i) => { const x = 110 + i * 100, on = lev >= i - .01;
    return `<circle cx="${x}" cy="196" r="${on ? 11 : 8}" fill="${on ? TM.knob : '#58606b'}"/>
      <text x="${x}" y="236" text-anchor="middle" font-family="Rubik" font-weight="700" font-size="20" fill="${TM.text}">${s}</text>`; }).join('');
  const kx = 110 + lev * 100, ax = 330 + amt * 280;
  return `<g>
    <rect x="40" y="64" width="640" height="320" rx="14" fill="${TM.panel}" stroke="#39414d" stroke-width="3"/>
    <rect x="80" y="88" width="280" height="54" rx="6" fill="${TM.up}"/><text x="220" y="126" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="28" fill="#0d2a17">LONG</text>
    <rect x="360" y="88" width="280" height="54" rx="6" fill="${TM.dn}" opacity=".9"/><text x="500" y="126" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="28" fill="#fff">SHORT</text>
    <line x1="110" x2="610" y1="196" y2="196" stroke="#58606b" stroke-width="6" stroke-linecap="round"/>
    <line x1="110" x2="${kx.toFixed(1)}" y1="196" y2="196" stroke="${TM.knob}" stroke-width="6" stroke-linecap="round"/>
    ${stops}<circle cx="${kx.toFixed(1)}" cy="196" r="15" fill="#fff" stroke="${TM.knob}" stroke-width="5"/>
    <rect x="80" y="244" width="200" height="42" rx="6" fill="#1b2028"/><text x="96" y="274" font-family="'JetBrains Mono'" font-weight="700" font-size="24" fill="${TM.text}">$${amount}</text>
    <line x1="330" x2="610" y1="264" y2="264" stroke="#58606b" stroke-width="6" stroke-linecap="round"/>
    <line x1="330" x2="${ax.toFixed(1)}" y1="264" y2="264" stroke="${TM.knob}" stroke-width="6" stroke-linecap="round"/>
    ${[0, 1, 2, 3].map(i => `<circle cx="${330 + i * 93.3}" cy="264" r="7" fill="${330 + i * 93.3 <= ax + 1 ? TM.knob : '#58606b'}"/>`).join('')}
    <circle cx="${ax.toFixed(1)}" cy="264" r="13" fill="#fff" stroke="${TM.knob}" stroke-width="5"/>
    <g transform="translate(360,334) scale(${pressed ? .94 : 1}) translate(-360,-334)">
      <rect x="160" y="304" width="400" height="62" rx="8" fill="${pressed ? '#18b456' : TM.up}" stroke="#0f6f35" stroke-width="${pressed ? 2 : 0}"/>
      <rect x="160" y="304" width="400" height="10" rx="5" fill="#fff" opacity=".25"/>
      <text x="360" y="348" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="34" fill="#fff">LONG</text></g>
  </g>`;
}

function termPos(T, t) {
  const P = T.pos, v = trackAt(P.pnl || [{ t: 0, v: 0 }], t), liq = T.liq != null && t >= T.liq;
  const txt = liq ? 'LIQUIDATED' : fmtUsd(v), col = liq ? '#fff' : v < 0 ? TM.dn : TM.up;
  const blink = liq && Math.floor((t - T.liq) * 6) % 2 === 0;
  return `<g>
    <rect x="16" y="300" width="688" height="84" rx="6" fill="#0d1014" stroke="#39414d" stroke-width="3"/>
    <rect x="30" y="314" width="180" height="56" rx="4" fill="${TM.up}"/><text x="120" y="352" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="28" fill="#0d2a17">LONG</text>
    <text x="276" y="354" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="30" fill="#fff">${P.lev || '100x'}</text>
    <rect x="340" y="314" width="350" height="56" rx="4" fill="${liq ? (blink ? TM.dn : '#7d0f16') : '#1f252e'}"/>
    <text x="515" y="354" text-anchor="middle" font-family="'JetBrains Mono'" font-weight="700" font-size="32" fill="${col}">${txt}</text>
  </g>`;
}

function termCursor(T, t) {
  if (!T.cursor) return '';
  const [x, y] = trackAt(T.cursor, t), down = (T.clicks || []).find(c => t >= c && t < c + .3);
  const k = down != null ? (t - down) / .3 : 0, sc = down != null && t < down + .1 ? .85 : 1;
  return `${down != null ? `<circle cx="${x}" cy="${y}" r="${(10 + k * 34).toFixed(1)}" fill="none" stroke="#fff" stroke-width="${(4 * (1 - k)).toFixed(2)}" opacity="${(1 - k).toFixed(2)}"/>` : ''}
    <g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${sc * 1.5})"><path d="M0,0 L0,26 L7,19 L12,30 L17,28 L12,17 L21,17 Z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/></g>`;
}

(window.SETS = window.SETS || {}).terminal = (t, shot) => {
  const T = TIMELINE.term || {}, hist = termHistory(T.chart || {}), live = termLive(T, t, hist);
  const all = [...hist, ...live], step = 32, x0 = 700 - (all.length - 1) * step - 40;
  const last = all[all.length - 1], py = TERM_Y(last.c), liq = T.liq != null && t >= T.liq;
  const grid = [...Array(14)].map((_, i) => `<line x1="0" x2="720" y1="${420 + i * 60}" y2="${420 + i * 60}" stroke="${TM.grid}" stroke-width="2"/>`).join('') +
    [...Array(8)].map((_, i) => `<line y1="400" y2="1280" x1="${40 + i * 96}" x2="${40 + i * 96}" stroke="${TM.grid}" stroke-width="2"/>`).join('');
  const candles = all.map((k, i) => candleSvg(x0 + i * step, k, i >= hist.length ? 22 : 20)).join('');
  const showPanel = T.panel && inWin(T.panel.show, t), showPos = T.pos && inWin(T.pos.show, t);
  const flash = liq ? `<rect width="720" height="1280" fill="${TM.dn}" opacity="${(.28 * (1 - prog(t, T.liq, T.liq + .6)) + .1 * (Math.floor((t - T.liq) * 6) % 2)).toFixed(3)}"/>` : '';
  return `<svg viewBox="0 0 720 1280" width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="1280" fill="${TM.bg}"/>${grid}
    <rect x="0" y="0" width="24" height="1280" fill="${TM.dn}"/>
    ${candles}
    <line x1="0" x2="720" y1="${py.toFixed(1)}" y2="${py.toFixed(1)}" stroke="${last.c >= last.o ? TM.up : TM.dn}" stroke-width="2" stroke-dasharray="8 6" opacity=".8"/>
    ${showPanel ? termPanel(T, t) : ''}${showPos ? termPos(T, t) : ''}
    ${flash}${termCursor(T, t)}
  </svg>`;
};
