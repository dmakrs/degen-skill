// ─── render(t) ─────────────────────────────────────────────────────────────
// shot.cam: массив [[t,cx,cy,s],[t,cx,cy,s]] либо пресет ('wide', 'cu:palych', …) — раскрывает resolveCam (src/presets.js)
function camAt(shot, t) {
  const [a, b] = resolveCam(shot), k = easeInOut(prog(t, a[0], b[0]));
  return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), s: lerp(a[3], b[3], k) };
}

// озвучка: episodes/<ep>/voice.js (VOICE, генерирует voice/build.mjs) подгружается index.html, если есть TIMELINE.voice.
// Если эпизод не задал subs/talk руками, берём их из озвучки: фразы субтитров и речевые окна [a, b, who].
if (typeof VOICE === 'object' && VOICE) {
  if (!TIMELINE.subs) TIMELINE.subs = VOICE.subs;
  if (!TIMELINE.talk) TIMELINE.talk = VOICE.lines.flatMap(l => l.talk.map(([a, b]) => [a, b, l.who]));
}

// окна [a,b] | [[a,b],…] → список окон; ramp(окна, t, in, out) → 0..1 с мягкими краями
const windows = w => !w || !w.length ? [] : (typeof w[0] === 'number' ? [w] : w);
const inWin = (w, t) => windows(w).some(([a, b]) => t >= a && t < b);
const ramp = (w, t, din, dout) => windows(w).reduce((m, [a, b]) => Math.max(m, easeInOut(prog(t, a, a + din)) * (1 - prog(t, b, b + dout))), 0);
// детерминированная фаза персонажа 0..1 по имени (дыхание/моргание не синхронны у разных персонажей); Толян — 0, как в одиночном пути
function charPhase(who) {
  if (who === 'tolyan') return 0;
  let h = 7; for (const c of String(who)) h = (h * 31 + c.charCodeAt(0)) % 1000003;
  return (h % 997) / 997;
}

// состояние персонажа в момент t: рот/веки/брови/шок/блаженство/руки.
// Одиночный путь (who не задан или нет TIMELINE.cast): всё из TIMELINE.events/poses — эпизод tolyan, байт-в-байт как раньше.
// Путь каста (TIMELINE.cast[who] = { poses:{L,R,head}, tracks:{…}, events:{blink, shock, bliss, squint, kiss, matchDrop, matchBack}, at:{x,y,s}, phase }):
//   events: blink [t…] (нет — автоморгание каждые ~3.3–4.9 с со сдвигом персонажа); shock/bliss/squint/kiss — окна [a,b] или [[a,b],…];
//   шок работает в любом кадре (сдержанно: веки до базового lid, зрачки сжаты, рот «о», если не говорит);
//   tracks: любые ключевые поля st — glasses [{t,v,dur?}], gaze [{t,v:[x,y]}], glow, lid (база века), look, squint… (см. trackAt в rig.js);
//   рот — только у говорящего (окна talk [a,b,who] из озвучки); glow по умолчанию 1, пока в кисти телефон (prop:'phone').
function charState(t, shot, who) {
  const rainbow = !!shot.rainbow;
  const talking = (TIMELINE.talk || []).some(([a, b, w]) => t >= a && t < b && (who == null || w == null || w === who));
  const mouth = talking ? (Math.sin(t * 38) > -0.2 ? .5 + .5 * Math.abs(Math.sin(t * 19)) : 0) : 0;

  if (who != null && TIMELINE.cast) {   // ── путь каста (несколько персонажей, сет stage) ──
    const C = TIMELINE.cast[who] || {}, E = C.events || {}, T = C.tracks || {}, ph = C.phase ?? charPhase(who);
    const tr = {}; for (const k in T) tr[k] = trackAt(T[k], t);
    const blinking = E.blink ? E.blink.some(b => t >= b && t < b + .12) : ((t + ph * 7.3) % (3.3 + ph * 1.6)) < .12;
    const shock = clamp(windows(E.shock).reduce((m, [a, b]) => Math.max(m, easeOutBack(prog(t, a, a + .18)) * (1 - easeInOut(prog(t, b, b + .5)))), 0), 0, 1.1);
    const lidBase = tr.lid ?? .52;
    const lid = blinking ? 1 : lerp(lidBase, 0, shock);
    const bob = Math.sin(t * 2.4 + ph * Math.PI * 2) * 4;
    const bliss = ramp(E.bliss, t, .15, .05), squint = tr.squint ?? ramp(E.squint, t, .1, .1);
    const rig = (CHARS[who] && CHARS[who].rig) || {};
    const poses = resolvePoses(C.poses, who);   // ключи { t, pose:'fingerUp', … } → wrist/hand/… (src/presets.js); без пресетов — тот же объект
    const arms = rigArms(poses, t, bob, rig);
    const holds = name => Object.values(arms).some(a => a.prop === name);
    // спичка Толяна: падает в начале окна matchDrop (по умолчанию — каждого шока), возвращается в ключах matchBack
    const drops = (E.matchDrop || windows(E.shock).map(w => w[0])).filter(d => d <= t), backs = (E.matchBack || []).filter(b => b <= t);
    const lastDrop = drops.length ? Math.max(...drops) : null, lastBack = backs.length ? Math.max(...backs) : -1;
    const st = {
      t, rainbow, who,
      lid, pr: lerp(10, 6, clamp(shock)), brow: shock * 16 - (lid > .55 && !blinking ? 2 : 0),
      mouth: shock > .3 && !talking ? .6 * shock : mouth, shock: clamp(shock),
      bob, look: rainbow ? 0 : (tr.look ?? .6 + .15 * Math.sin(t * 1.3 + ph * 6.28)),
      bliss, squint, kiss: inWin(E.kiss, t), glow: tr.glow ?? (holds('phone') ? 1 : 0),
      matchDrop: lastDrop != null && lastDrop > lastBack ? lastDrop : null,
      tilt: rigHead(poses && poses.head, t), arms,
    };
    for (const k in tr) if (!(k in st)) st[k] = tr[k];   // свои поля (glasses, gaze, …); lid/look/glow/squint уже учтены выше
    return st;
  }

  // ── одиночный путь (TIMELINE.events/poses) ──
  const E = TIMELINE.events || {};
  const blinking = (E.blink || []).some(b => t >= b && t < b + .12);
  // шок (только в кадре с rainbow): глаза распахиваются, брови вверх, потом обратно в полусон
  let shock = 0, lid = .52;
  if (E.shock && rainbow) {
    const sIn = easeOutBack(prog(t, E.shock[0], E.shock[0] + .18));
    const sOut = easeInOut(prog(t, E.shock[1], E.shock[1] + .5));
    shock = clamp(sIn * (1 - sOut), 0, 1.1);
    lid = lerp(.52, 0, shock);
    if (t > E.shock[1] + .5) lid = .6;    // финальный «ну… красиво»
  }
  if (blinking) lid = 1;
  const bob = Math.sin(t * 2.4) * 4;
  const poses = resolvePoses(TIMELINE.poses, 'tolyan');
  // блаженство после chef's kiss — глаза закрыты дугами; окно E.bliss = [from, to]
  const bliss = E.bliss ? easeInOut(prog(t, E.bliss[0], E.bliss[0] + .15)) * (1 - prog(t, E.bliss[1], E.bliss[1] + .05)) : 0;
  return {
    t, rainbow, who,
    lid, pr: lerp(10, 6, clamp(shock)), brow: shock * 16 - (lid > .55 && !blinking ? 2 : 0),
    mouth: shock > .3 && !talking ? .6 * shock : mouth, shock: clamp(shock),
    bob, look: rainbow ? 0 : .6 + .15 * Math.sin(t * 1.3),
    bliss, tilt: rigHead(poses && poses.head, t),
    arms: rigArms(poses, t, bob),   // риг рук: {L, R} → слои рисуют tolyan() и garage()
  };
}

function shake(t, amp) {
  return { x: amp * (Math.sin(t * 91) + Math.sin(t * 57)) / 2, y: amp * (Math.cos(t * 83) + Math.sin(t * 47)) / 2 };
}

// реестр сетов: каждый файл в src/sets (или эпизода) регистрирует SETS.<name> = (t, shot, st) => '<svg…>'
window.SETS = window.SETS || {};
window.TIMELINE = TIMELINE;
window.render = function (t) {
  const shot = TIMELINE.shots.find(s => t >= s.from && t < s.to) || TIMELINE.shots[TIMELINE.shots.length - 1];
  const draw = SETS[shot.set];
  if (!draw) throw new Error(`shot "${shot.id}": неизвестный set "${shot.set}" (есть: ${Object.keys(SETS).join(', ')})`);
  const c = camAt(shot, t);
  const E = TIMELINE.events || {};
  let amp = 0;
  if (E.boom != null && t >= E.boom && t < E.boom + .35) amp = 14 * (1 - (t - E.boom) / .35);
  for (const [bt, a, d = .35] of E.shakes || []) if (t >= bt && t < bt + d) amp = Math.max(amp, a * (1 - (t - bt) / d));   // доп. удары [t, px, dur?]
  if (shot.shakeIn && t < shot.from + .25) amp = shot.shakeIn * (1 - (t - shot.from) / .25);   // тряска на входе в кадр
  const sh = shake(t, amp);
  const svg = draw(t, shot, charState(t, shot));
  const cam = document.getElementById('cam');
  cam.innerHTML = svg;
  cam.style.transform = `translate(${360 - c.x * c.s + sh.x}px, ${640 - c.y * c.s + sh.y}px) scale(${c.s})`;
  document.getElementById('ui').innerHTML = badges(t) + subtitle(t) + (TIMELINE.pnl ? pnl(t) : '');
  const fi = Math.round(t * 30);
  document.querySelectorAll('.grain').forEach((g, i) => g.style.display = i === fi % 6 ? 'block' : 'none');
  document.getElementById('flicker').style.opacity = (0.05 + 0.04 * Math.sin(fi * 2.7) * Math.sin(fi * 1.3)).toFixed(3);
};
