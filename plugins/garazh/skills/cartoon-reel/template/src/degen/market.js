// ─── degen: set market — терминал prediction markets в духе DOXA (эталон: references/images/doxa/terminal.webp) ───
// Вертикальная версия терминала: шапка DOXA, чипы категорий, карточка рынка (вопрос, вероятность, график),
// кнопки Yes/No с ценой в центах, ордер (сумма, Buy), плашка позиции с PnL, штамп резолва, курсор.
// Всё — чистая функция t из TIMELINE.market (только литералы):
//   Несколько рынков в эпизоде: TIMELINE.markets = { btc:{…}, quit:{…} } и shot.market:'quit' (иначе TIMELINE.market).
//   market: {
//     cat: 'Crypto', title: 'Bitcoin to $200k by 2026?', ends: "Dec 31, '26", icon: '₿', vol: '$72.4M',
//     chart:   { seed, n, path:[…] },            // история вероятности (0..100) — n точек по path + шум
//     prob:    [{ t, v, dur? }],                 // живая вероятность YES, %, — двигает график, цену кнопок и крупную цифру
//     select:  [{ t, v:'yes'|'no'|null }],       // какая кнопка выбрана (подсвечена)
//     amount:  [{ t, v, dur? }], amtMin, amtMax, // ползунок суммы 0..1 (по умолчанию $100…$10,000)
//     press:   [t, …],                           // кнопка Buy вдавлена 0.15 с
//     pos:     { show:[[a,b]], pnl:[{ t, v, dur? }] },    // плашка позиции: сторона/цена входа/сумма + PnL
//     resolve: { t, outcome:'YES'|'NO' },        // штамп «RESOLVED · YES» (pop) — дальше рынок закрыт
//     rows:    [{ name, p }],                    // (опц.) список исходов вместо графика, как в карточках DOXA
//     cursor:  [{ t, v:[x,y], dur? }], clicks:[t, …],
//   }
// Точки для курсора: кнопка Yes (200, 826), No (520, 826), ползунок суммы x = 110 + k·500, y = 930; Buy (360, 1018).
const MK = { bg: '#09090a', panel: '#141518', line: '#24262b', text: '#eceef2', dim: '#8a8f99', yellow: '#f6c445',
  yes: '#43d17a', yesBg: '#11351f', no: '#f2585b', noBg: '#3a1316' };
const mkFont = (s, w = 700, fam = 'Rubik') => `font-family="${fam}" font-weight="${w}" font-size="${s}"`;
const MK_CHART = { x0: 60, x1: 660, y0: 420, y1: 700 };
const mkY = p => MK_CHART.y1 - p / 100 * (MK_CHART.y1 - MK_CHART.y0);

function mkHistory(C) {
  const r = rng(C.seed || 3), n = C.n || 40, path = C.path || [50, 50], out = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) * (path.length - 1), j = Math.min(path.length - 2, Math.floor(u));
    out.push(clamp(lerp(path[j], path[j + 1], u - j) + (r() - .5) * 5, 1, 99));
  }
  return out;
}
const mkOwlLogo = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})">
  <path d="M-22,-14 L-26,-34 L-10,-22 Z M22,-14 L26,-34 L10,-22 Z" fill="${MK.yellow}"/>
  <circle cx="0" cy="0" r="24" fill="${MK.yellow}"/><circle cx="-10" cy="-2" r="8" fill="${MK.bg}"/><circle cx="10" cy="-2" r="8" fill="${MK.bg}"/>
  <path d="M-4,8 L4,8 L0,16 Z" fill="${MK.bg}"/></g>`;

(window.SETS = window.SETS || {}).market = (t, shot) => {
  const M = (shot.market && TIMELINE.markets && TIMELINE.markets[shot.market]) || TIMELINE.market || {}, hist = mkHistory(M.chart || {});
  const p = clamp(trackAt(M.prob || [{ t: 0, v: hist[hist.length - 1] }], t), 1, 99);
  const sel = M.select ? trackAt(M.select, t) : null;
  const res = M.resolve && t >= M.resolve.t ? M.resolve : null;
  const amt = clamp(trackAt(M.amount || [{ t: 0, v: 0 }], t)), amin = M.amtMin ?? 100, amax = M.amtMax ?? 10000;
  const amount = Math.round(lerp(amin, amax, amt) / 100) * 100;
  const pressed = (M.press || []).some(x => t >= x && t < x + .15);
  const yesC = Math.round(p), noC = 100 - yesC;

  // шапка + чипы
  const head = `<rect width="720" height="96" fill="${MK.bg}"/>${mkOwlLogo(46, 50, .9)}
    <text x="82" y="62" ${mkFont(34, 900)} fill="#fff" letter-spacing="2">DOXA</text>
    <rect x="200" y="36" width="58" height="24" rx="5" fill="${MK.yellow}"/><text x="229" y="54" text-anchor="middle" ${mkFont(15, 800)} fill="#111">BETA</text>
    <rect x="560" y="26" width="140" height="50" rx="8" fill="${MK.yellow}"/><text x="630" y="59" text-anchor="middle" ${mkFont(22, 700)} fill="#111">Trade</text>
    <line x1="0" x2="720" y1="96" y2="96" stroke="${MK.line}" stroke-width="2"/>`
    + ['All', 'Crypto', 'Politics', 'Sport', 'Tech'].map((c, i) => {
      const x = 30 + i * 136, on = c === (M.cat || 'Crypto');
      return `<text x="${x + 50}" y="146" text-anchor="middle" ${mkFont(24, on ? 700 : 500)} fill="${on ? '#fff' : MK.dim}">${c}</text>${on ? `<rect x="${x + 14}" y="160" width="72" height="4" rx="2" fill="${MK.yellow}"/>` : ''}`;
    }).join('');

  // карточка рынка
  const title = (M.title || 'Bitcoin to $200k by 2026?');
  const words = title.split(' '), lines = ['']; for (const w of words) { if ((lines[lines.length - 1] + ' ' + w).trim().length > 20) lines.push(w); else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim(); }
  const card = `<rect x="20" y="186" width="680" height="1074" rx="18" fill="${MK.panel}" stroke="${MK.line}" stroke-width="2"/>
    <rect x="44" y="212" width="88" height="88" rx="14" fill="#f7931a"/><text x="88" y="274" text-anchor="middle" ${mkFont(56, 900)} fill="#fff">${M.icon || '₿'}</text>
    ${lines.map((l, i) => `<text x="152" y="${246 + i * 40}" ${mkFont(34, 700)} fill="${MK.text}">${l}</text>`).join('')}
    <text x="676" y="232" text-anchor="end" ${mkFont(18, 500)} fill="${MK.dim}">Ends ${M.ends || "Dec 31, '26"}</text>
    <text x="44" y="370" ${mkFont(64, 900)} fill="${MK.yes}">${yesC}%</text>
    <text x="${44 + (String(yesC).length + 1) * 40 + 16}" y="370" ${mkFont(26, 600)} fill="${MK.dim}">chance YES</text>
    <text x="676" y="370" text-anchor="end" ${mkFont(20, 500)} fill="${MK.dim}">Vol ${M.vol || '$72.4M'}</text>`;

  // график вероятности: история + живой хвост (последняя точка = p)
  let chart = '';
  if (M.rows) {
    chart = M.rows.map((r, i) => { const y = 440 + i * 56;
      return `<text x="44" y="${y + 8}" ${mkFont(26, 500)} fill="${MK.text}">${r.name}</text>
        <rect x="330" y="${y - 4}" width="120" height="6" rx="3" fill="${MK.line}"/><rect x="330" y="${y - 4}" width="${1.2 * r.p}" height="6" rx="3" fill="${MK.yes}"/>
        <text x="470" y="${y + 8}" ${mkFont(22, 600)} fill="${MK.text}">${r.p}%</text>
        <rect x="526" y="${y - 22}" width="72" height="44" rx="6" fill="${MK.yesBg}"/><text x="562" y="${y + 8}" text-anchor="middle" ${mkFont(22, 600)} fill="${MK.yes}">Yes</text>
        <rect x="604" y="${y - 22}" width="72" height="44" rx="6" fill="${MK.noBg}"/><text x="640" y="${y + 8}" text-anchor="middle" ${mkFont(22, 600)} fill="${MK.no}">No</text>`; }).join('');
  } else {
    const pts = [...hist, p], n = pts.length, X = i => MK_CHART.x0 + i / (n - 1) * (MK_CHART.x1 - MK_CHART.x0);
    const d = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${mkY(v).toFixed(1)}`).join(' ');
    const up = p >= hist[hist.length - 1], col = up ? MK.yes : MK.no;
    chart = [0, 25, 50, 75, 100].map(g => `<line x1="${MK_CHART.x0}" x2="${MK_CHART.x1}" y1="${mkY(g)}" y2="${mkY(g)}" stroke="${MK.line}" stroke-width="2"/>
        <text x="${MK_CHART.x1 + 8}" y="${mkY(g) + 6}" ${mkFont(16, 500)} fill="${MK.dim}">${g}%</text>`).join('')
      + `<path d="${d} L${MK_CHART.x1},${MK_CHART.y1} L${MK_CHART.x0},${MK_CHART.y1} Z" fill="${col}" opacity=".12"/>
         <path d="${d}" stroke="${col}" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
         <circle cx="${MK_CHART.x1}" cy="${mkY(p).toFixed(1)}" r="${9 + 3 * Math.sin(t * 8)}" fill="${col}"/>
         <circle cx="${MK_CHART.x1}" cy="${mkY(p).toFixed(1)}" r="${18 + 6 * ((t * 1.5) % 1)}" fill="none" stroke="${col}" stroke-width="3" opacity="${(1 - (t * 1.5) % 1).toFixed(2)}"/>`;
  }

  // Yes / No
  const btn = (x, side, label, cents, fg, bg) => { const on = sel === side;
    return `<rect x="${x}" y="780" width="300" height="92" rx="12" fill="${on ? fg : bg}" stroke="${on ? '#fff' : 'none'}" stroke-width="4"/>
      <text x="${x + 150}" y="840" text-anchor="middle" ${mkFont(36, 800)} fill="${on ? '#0b0b0b' : fg}">${label} ${cents}¢</text>`; };
  // после первого Buy цена входа фиксируется (payout не плывёт вместе с рынком)
  const bought = (M.press || []).find(x => t >= x), pe = bought != null ? Math.round(clamp(trackAt(M.prob || [{ t: 0, v: 50 }], bought), 1, 99)) : yesC;
  const pay = sel ? Math.round(amount / ((sel === 'yes' ? pe : 100 - pe) / 100)) : 0;
  const ax = 110 + amt * 500;
  const order = `${btn(50, 'yes', 'Yes', yesC, MK.yes, MK.yesBg)}${btn(370, 'no', 'No', noC, MK.no, MK.noBg)}
    <text x="50" y="914" ${mkFont(22, 500)} fill="${MK.dim}">Amount</text><text x="670" y="914" text-anchor="end" ${mkFont(30, 800)} fill="${MK.text}">$${amount.toLocaleString('en-US')}</text>
    <line x1="110" x2="610" y1="936" y2="936" stroke="${MK.line}" stroke-width="8" stroke-linecap="round"/>
    <line x1="110" x2="${ax.toFixed(1)}" y1="936" y2="936" stroke="${MK.yellow}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="${ax.toFixed(1)}" cy="936" r="16" fill="#fff" stroke="${MK.yellow}" stroke-width="6"/>
    <g transform="translate(360,1018) scale(${pressed ? .94 : 1}) translate(-360,-1018)">
      <rect x="50" y="978" width="620" height="80" rx="12" fill="${sel === 'no' ? MK.no : MK.yes}"/>
      <text x="360" y="1030" text-anchor="middle" ${mkFont(36, 800)} fill="#0b0b0b">Buy ${sel === 'no' ? 'No' : 'Yes'}</text></g>
    <text x="360" y="1096" text-anchor="middle" ${mkFont(22, 500)} fill="${MK.dim}">Payout if ${sel === 'no' ? 'NO' : 'YES'}: <tspan fill="${MK.yellow}" font-weight="800">$${pay.toLocaleString('en-US')}</tspan></text>`;

  // позиция
  let pos = '';
  if (M.pos && inWin(M.pos.show, t)) {
    const v = trackAt(M.pos.pnl || [{ t: 0, v: 0 }], t), col = v < 0 ? MK.no : MK.yes;
    pos = `<rect x="36" y="1130" width="648" height="100" rx="12" fill="#0d0e10" stroke="${col}" stroke-width="3"/>
      <rect x="54" y="1152" width="110" height="56" rx="8" fill="${MK.yesBg}"/><text x="109" y="1190" text-anchor="middle" ${mkFont(26, 800)} fill="${MK.yes}">YES</text>
      <text x="184" y="1190" ${mkFont(24, 600)} fill="${MK.dim}">@ ${M.pos.entry || '12¢'}</text>
      <text x="664" y="1194" text-anchor="end" ${mkFont(40, 900, "'JetBrains Mono'")} fill="${col}">${fmtUsd(v)}</text>`;
  }
  // штамп резолва
  let stamp = '';
  if (res) {
    const k = easeOutBack(prog(t, res.t, res.t + .3)), col = res.outcome === 'NO' ? MK.no : MK.yellow;
    stamp = `<rect x="20" y="186" width="680" height="1074" rx="18" fill="#000" opacity="${(.45 * clamp(k)).toFixed(2)}"/>
      <g transform="translate(360,600) rotate(-8) scale(${(2.2 - 1.2 * k).toFixed(3)})" opacity="${clamp(k * 1.5).toFixed(2)}">
        <rect x="-250" y="-80" width="500" height="160" rx="16" fill="none" stroke="${col}" stroke-width="12"/>
        <text x="0" y="-12" text-anchor="middle" ${mkFont(40, 800)} fill="${col}" letter-spacing="6">RESOLVED</text>
        <text x="0" y="54" text-anchor="middle" ${mkFont(76, 900)} fill="${col}">${res.outcome}</text></g>`;
  }
  return `<svg viewBox="0 0 720 1280" width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="1280" fill="${MK.bg}"/>${head}${card}${chart}${order}${pos}${stamp}${termCursor(M, t)}</svg>`;
};
