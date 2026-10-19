// ─── set: stage — несколько персонажей из реестра CHARS между задником и передним планом эпизода ───
// shot: { set:'stage', cast:[ 'who' | {who, x, y, s, flip} … ],       // порядок = порядок отрисовки (первый — дальше всех)
//         back:'garazhBack', front:'garazhFront',                      // имена глобальных функций (t, env) → SVG (умолчания — TIMELINE.stage / stage.preset)
//         cam:[…], rainbow?, shakeIn?,
//         mode:'blackout', phoneLight?: true | [x,y] | {x,y,r,dim}, nose?:[x,y,r], blackout?:'blackoutLayer' }
// Размещение: translate(x,y) + scale s вокруг (360,1280) локальной системы персонажа (720×1280, голова ≈ 360,590);
//   умолчания — TIMELINE.cast[who].at = {x, y, s, flip}. Мир может быть шире кадра (overflow visible): камера shot.cam в мировых px.
// Контракт персонажа CHARS[who] = { rig, body(st, P), head(st, P), nose?(st) }: body — торс без рук, head — голова БЕЗ наклона
//   (движок сам рисует руки armsSvg и вращает голову на st.tilt вокруг (360,700)); P — префикс SVG-id.
// env: TIMELINE.env = { lamp:[{t,swing,bright,dur?}], breaker:[{t,v}], plug:[{t,v}], mugs:[{t,v}], kettleOn:[{t,v}], … } — любые
//   ключевые треки (trackAt), посчитанные на кадр и переданные в back/front/пропы. Пока предмет N в чьей-то кисти (prop:'N'),
//   env[N] = { …env[N], at:'hands', by: who } — передний план не рисует его на месте (garazhFront: env.kettle.at).
function stageEnv(t, members = []) {
  const out = {}, Ev = TIMELINE.env || {};
  for (const k in Ev) out[k] = trackAt(Ev[k], t);
  for (const { m, st } of members)
    for (const a of Object.values(st.arms || {})) if (a.prop) out[a.prop] = { ...(out[a.prop] && typeof out[a.prop] === 'object' ? out[a.prop] : {}), at: 'hands', by: m.who };
  return out;
}

function stagePlacement(m) {
  // умолчания: shot.cast[i] → TIMELINE.cast[who].at → раскладка (TIMELINE.stage.preset: cast[who] | default) → (0,0,1)
  const LY = stageLayout(), d = { ...(LY.cast[m.who] || LY.default || {}), ...((TIMELINE.cast && TIMELINE.cast[m.who] && TIMELINE.cast[m.who].at) || {}) };
  const x = m.x ?? d.x ?? 0, y = m.y ?? d.y ?? 0, s = m.s ?? d.s ?? 1, flip = m.flip ?? d.flip ?? false, sx = flip ? -s : s;
  const rot = m.rot ?? d.rot ?? 0;   // (опц.) поворот всего персонажа вокруг ног, ° — «лежит в деньгах»
  return { x, y, s, sx, transform: `translate(${x},${y})${rot ? ` rotate(${rot} 360 1280)` : ''} translate(360,1280) scale(${sx},${s}) translate(-360,-1280)`,
    toWorld: ([lx, ly]) => [x + 360 + sx * (lx - 360), y + 1280 + s * (ly - 1280)] };
}
// точка головы (локальная, до наклона) → мир: наклон tilt вокруг шеи (360,700), затем размещение
function stageHeadPoint(pl, st, [px, py]) {
  const a = (st.tilt || 0) * Math.PI / 180, dx = px - 360, dy = py - 700;
  return pl.toWorld([360 + dx * Math.cos(a) - dy * Math.sin(a), 700 + dx * Math.sin(a) + dy * Math.cos(a)]);
}
const stageFn = (name, what) => {
  if (!name) return null;
  const f = window[name];
  if (typeof f !== 'function') throw new Error(`stage: ${what} "${name}" не найдена (подключи файл через TIMELINE.scripts)`);
  return f;
};

function stageDraw(t, shot) {
  const SG = stageLayout();   // TIMELINE.stage (+ пресет stage.preset, src/presets.js): back/front/blackout по умолчанию
  const cast = (shot.cast || []).map(m => typeof m === 'string' ? { who: m } : m);
  const members = cast.map((m, i) => {
    const ch = CHARS[m.who];
    if (!ch) throw new Error(`shot "${shot.id}": неизвестный персонаж "${m.who}" (есть: ${Object.keys(CHARS).join(', ')})`);
    const dup = cast.findIndex(o => o.who === m.who) !== i;
    return { m, ch, st: charState(t, shot, m.who), pl: stagePlacement(m), P: m.who + (dup ? i : '') + '_' };
  });
  const env = stageEnv(t, members);
  const back = stageFn(shot.back ?? SG.back, 'back'), front = stageFn(shot.front ?? SG.front, 'front');
  // танец (track dance 0..1): подпрыгивание в такт TIMELINE.bpm (128) + покачивание; нет трека — ровно как раньше
  const bpm = TIMELINE.bpm || 128;
  for (const mm of members) {
    const dn = mm.st.dance || 0;
    if (dn) {
      const ph = t * bpm / 60 * Math.PI + (mm.st.who === mm.m.who ? charPhase(mm.m.who) * .8 : 0);
      mm.pl = { ...mm.pl, transform: `translate(0,${(-Math.abs(Math.sin(ph)) * 26 * dn).toFixed(1)}) rotate(${(Math.sin(ph / 2) * 4 * dn).toFixed(2)} ${360 + mm.pl.x} 1280) ` + mm.pl.transform };
    }
  }
  const behind = members.map(({ ch, st, pl, P }) =>
    `<g transform="${pl.transform}">${ch.body(st, P)}${armsSvg(st.arms, 'behind', st, t, env)}<g transform="rotate(${(st.tilt || 0).toFixed(2)} 360 700)">${ch.head(st, P)}</g></g>`).join('');
  const fore = members.map(({ st, pl }) => { const a = armsSvg(st.arms, 'front', st, t, env); return a ? `<g transform="${pl.transform}">${a}</g>` : ''; }).join('');
  let scene = (back ? back(t, env) : '') + behind + (front ? front(t, env) : '') + fore;

  if (shot.mode === 'blackout') {
    // нос (светится в темноте): shot.nose [x,y,r] или первый персонаж каста с CHARS[who].nose(st) (Толян);
    // blackoutLayer сам добавляет дыхание sin(t·2.4)·4 к y — вычитаем его, чтобы свет лёг ровно на нарисованный нос
    let nose = shot.nose || null;
    if (!nose) for (const { ch, st, pl } of members) if (ch.nose) {
      const n = ch.nose(st), [x, y] = stageHeadPoint(pl, st, [n.x, n.y]);
      nose = [x, y - Math.sin(t * 2.4) * 4, n.r * pl.s]; break;
    }
    // свет телефона: true — из кисти с prop:'phone' (мировая точка предмета), либо [x,y] / {x,y,r,dim}
    let phone = null;
    if (shot.phoneLight) {
      const o = shot.phoneLight;
      if (Array.isArray(o)) phone = { x: o[0], y: o[1] };
      else if (typeof o === 'object') phone = { ...o };
      else for (const { st, pl } of members) for (const a of Object.values(st.arms || {})) if (a.prop === 'phone' && !phone) { const [x, y] = pl.toWorld(propPoint(a)); phone = { x, y }; }
      if (phone) { phone.r = phone.r ?? 230; phone.dim = phone.dim ?? .5; }
    }
    const layer = stageFn(shot.blackout ?? SG.blackout ?? 'blackoutLayer', 'blackout');
    const cover = `<rect x="-2000" y="-2000" width="5000" height="5000" fill="#050302"/>`;
    const dark = cover + (nose ? layer(t, nose, phone ? [phone.x, phone.y, phone.r] : null, 'bo') : '');
    if (!phone) return stageWrap(dark);
    // чёрный кадр с мягким окном вокруг телефона: сцена проступает на (1 − dim) в центре
    const g = Math.round(phone.dim * 255).toString(16).padStart(2, '0');
    const mask = `<defs><radialGradient id="boHole"><stop offset="0" stop-color="#${g}${g}${g}"/><stop offset=".55" stop-color="#${g}${g}${g}" stop-opacity="1"/><stop offset="1" stop-color="#fff"/></radialGradient>
      <mask id="boMask" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000"><rect x="-2000" y="-2000" width="5000" height="5000" fill="#fff"/>
      <ellipse cx="${phone.x.toFixed(1)}" cy="${phone.y.toFixed(1)}" rx="${phone.r}" ry="${phone.r * 1.2}" fill="url(#boHole)"/></mask></defs>`;
    return stageWrap(scene + mask + `<g mask="url(#boMask)">${dark}</g>`);
  }
  return stageWrap(scene);
}
const stageWrap = inner => `<svg viewBox="0 0 720 1280" width="720" height="1280" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">${inner}</svg>`;
(window.SETS = window.SETS || {}).stage = (t, shot) => stageDraw(t, shot);
