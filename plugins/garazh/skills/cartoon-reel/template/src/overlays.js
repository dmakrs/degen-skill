// ─── overlays: субтитры, бейджи ────────────────────────────────────────────
// TIMELINE.subs может отсутствовать: тогда render.js подставляет VOICE.subs (озвучка) или пустой список
function subtitle(t) {
  const ph = (TIMELINE.subs || []).find(p => t >= p.from && t < p.to);
  if (!ph) return '';
  const vis = ph.words.filter(w => t >= w[1]);
  const pop = easeOutBack(prog(t, ph.from, ph.from + .14));
  const html = vis.map((w, i) => `<span class="${i === vis.length - 1 ? 'hl' : ''}">${w[0]}</span>`).join(' ');
  return `<div class="sub" style="transform:translateX(-50%) scale(${(.75 + .25 * pop).toFixed(3)})">${html}</div>`;
}

function badges(t) {
  return (TIMELINE.badges || []).filter(b => t >= b.from && t < b.to).map(b => {
    const k = easeOutBack(prog(t, b.from, b.from + .38));
    return `<div class="badge" style="left:${b.x}px;top:${b.y}px;transform:rotate(${b.rot + (1 - k) * 10}deg) scale(${k.toFixed(3)})">
      <div class="name">${b.name}</div><div class="role" style="background:${b.color}">${b.role}</div></div>`;
  }).join('');
}

// ─── PnL-счётчик (look degen): TIMELINE.pnl = { keys:[{ t, v, dur? }], show:[[a,b],…], y? } ───
// v — значение в $; между ключами счётчик «накручивается» за dur (0 — скачок). Знак задаёт цвет (зелёный / красный),
// на каждом новом ключе — поп easeOutBack. Нет TIMELINE.pnl — ничего не рисуется (старые эпизоды байт-в-байт).
const fmtUsd = v => (v < 0 ? '-' : '+') + '$' + Math.round(Math.abs(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function pnlAt(t) {
  const K = (TIMELINE.pnl && TIMELINE.pnl.keys) || [];
  let v = K.length ? K[0].v : 0, from = -1;
  for (let i = 0; i < K.length; i++) {
    const k = K[i]; if (t < k.t) break;
    const prev = i ? K[i - 1].v : k.v, d = k.dur || 0;
    v = d ? lerp(prev, k.v, easeInOut(prog(t, k.t, k.t + d))) : k.v; from = k.t;
  }
  return { v, from };
}
function pnl(t) {
  const P = TIMELINE.pnl;
  if (!P || !inWin(P.show || [[0, 1e9]], t)) return '';
  const { v, from } = pnlAt(t), pop = from < 0 ? 1 : easeOutBack(prog(t, from, from + .22));
  return `<div class="pnl ${v < 0 ? 'down' : 'up'}" style="top:${P.y ?? 96}px;transform:translateX(-50%) scale(${(.8 + .2 * pop).toFixed(3)})">${fmtUsd(v)}</div>`;
}
