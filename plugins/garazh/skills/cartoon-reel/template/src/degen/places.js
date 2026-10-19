// ─── degen: локации — задники/передние планы для set stage (контракт src/sets/garazh.js: функции (t, env) → SVG) ───
// Мир шире кадра (x −400…1120), сова стоит в локальной системе 720×1280 (по пояс, низ закрывает передний план).
//   roomBack / roomFront      — тёплая ночная квартира: торшер, растения, окно на город; монитор слева светит на сову
//                               (env.glow: 'yellow'|'green'|'red'); env.mess 1 — скомканные бумажки на переднем плане (после слива)
//   yachtBack / moneyFront    — палуба яхты на закате, скайлайн, море с дорожкой солнца (эталон references/images/doxa/owl.webp)
//   clubBack                  — клуб: лучи, диско-шар, толпа силуэтами (env.flash 0..1 — стробоскоп)
//   roofBack                  — крыша небоскрёба ночью, огни города, билборд DOXA
//   moonBack                  — «to the moon»: космос, Земля, флаг DOXA
//   moneyFront                — пачки денег с жёлтыми лентами по низу + падающие купюры (env.rain 0..1, по умолчанию 1)
// SETS.paw — крупный план: лапа совы на мышке, клики TIMELINE.events.clicks.
const PL = { ink: '#1a120c' };

// купюра (в своей системе: центр 0,0, 90×44)
const bill = (x, y, rot, s = 1) => `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s})">
  <rect x="-45" y="-22" width="90" height="44" rx="4" fill="#7fd27a" stroke="#2f6b33" stroke-width="3"/>
  <rect x="-37" y="-14" width="74" height="28" rx="3" fill="none" stroke="#3f8f45" stroke-width="2"/>
  <circle cx="0" cy="0" r="10" fill="#a8e6a0" stroke="#3f8f45" stroke-width="2"/></g>`;
// пачка денег (вид сбоку-сверху): x,y — центр верха
const stack = (x, y, s = 1, h = 3) => {
  let o = `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s})">`;
  for (let i = h - 1; i >= 0; i--) o += `<path d="M-80,${i * 18} L80,${i * 18} L80,${i * 18 + 18} L-80,${i * 18 + 18} Z" fill="${i % 2 ? '#4f9e52' : '#5aae5c'}" stroke="${PL.ink}" stroke-width="3"/>`;
  o += `<path d="M-80,0 L-50,-30 L110,-30 L80,0 Z" fill="#79c977" stroke="${PL.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M110,-30 L110,${h * 18 - 12} L80,${h * 18 + 18} L80,0 Z" fill="#3f8743" stroke="${PL.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M0,0 L30,-30 L48,-30 L18,0 Z M18,0 L18,${h * 18 + 18} L0,${h * 18 + 18} L0,0 Z" fill="#f2c94c" stroke="${PL.ink}" stroke-width="2"/>
    <circle cx="25" cy="-15" r="6" fill="none" stroke="#2f6b33" stroke-width="2"/></g>`;
  return o;
};
function moneyFront(t, env) {
  const r = rng(404); let piles = '';
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
    const x = -380 + i * 190 + (row % 2) * 95 + r() * 30, y = 1010 + row * 90 + r() * 20;
    piles += stack(x, y, 1 + row * .25, 2 + Math.floor(r() * 3));
  }
  const rain = env.rain ?? 1, rr = rng(77);
  let fall = '';
  if (rain > 0) for (let i = 0; i < 26; i++) {
    const x0 = -300 + rr() * 1320, sp = 260 + rr() * 220, ph = rr() * 1600;
    const y = ((t * sp + ph) % 1700) - 300, x = x0 + Math.sin(t * 2 + i) * 40;
    fall += bill(x, y, Math.sin(t * 3 + i * 1.7) * 40, .8 + rr() * .4);
  }
  return `<g>${piles}</g><g opacity="${clamp(rain)}">${fall}</g>`;
}

// ── ночная квартира трейдера: тёплый полумрак, янтарный торшер, растения, окно на город (эталон — кадры совы DOXA)
const plant = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})">
  ${[[-70, -150, -30], [-20, -190, 0], [40, -170, 25], [80, -110, 50], [-90, -90, -55]].map(([dx, dy, a]) =>
    `<path transform="rotate(${a})" d="M0,0 C${dx * .3},${dy * .5} ${dx * .2 - 30},${dy} 0,${dy} C${dx * .2 + 30},${dy} ${dx * .3 + 10},${dy * .5} 0,0 Z" fill="#2f4a2c" stroke="${PL.ink}" stroke-width="4"/>`).join('')}
  <path d="M-46,0 L46,0 L36,80 L-36,80 Z" fill="#3a2d24" stroke="${PL.ink}" stroke-width="5"/></g>`;
function roomBack(t, env) {
  const glow = env.glow || 'yellow', gc = { yellow: '#f6c445', green: '#43d17a', red: '#f2585b' }[glow] || '#f6c445';
  return `<defs><radialGradient id="rmLamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb84d" stop-opacity=".6"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
      <radialGradient id="rmGlow" cx="0%" cy="50%" r="80%"><stop offset="0" stop-color="${gc}" stop-opacity=".45"/><stop offset="1" stop-color="${gc}" stop-opacity="0"/></radialGradient>
      <linearGradient id="rmWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1b18"/><stop offset="1" stop-color="#2e2722"/></linearGradient></defs>
    <rect x="-400" y="-200" width="1520" height="1600" fill="url(#rmWall)"/>
    ${[...Array(16)].map((_, i) => `<path d="M${-400 + i * 100},-200 V1300" stroke="#262019" stroke-width="6"/>`).join('')}
    <!-- окно: ночной город -->
    <rect x="470" y="140" width="300" height="420" fill="#0f1a33" stroke="#120e0b" stroke-width="12"/>
    ${[...Array(10)].map((_, i) => `<rect x="${484 + i * 28}" y="${300 + (i * 37 % 110)}" width="24" height="${260 - (i * 37 % 110)}" fill="#1a2747"/>`).join('')}
    ${[...Array(30)].map((_, i) => `<rect x="${490 + (i * 53 % 260)}" y="${330 + (i * 71 % 210)}" width="5" height="7" fill="#f6c445" opacity="${(.5 + .5 * Math.abs(Math.sin(t + i))).toFixed(2)}"/>`).join('')}
    <path d="M620,140 V560" stroke="#120e0b" stroke-width="8"/>
    <!-- полка с книгами и постер YES -->
    <rect x="-260" y="330" width="360" height="16" fill="#5a3f28" stroke="${PL.ink}" stroke-width="4"/>
    ${[...Array(8)].map((_, i) => `<rect x="${-250 + i * 26}" y="${262 + (i % 3) * 8}" width="22" height="${68 - (i % 3) * 8}" fill="${['#6b3b2a', '#2f4a5c', '#8a6a2c', '#3d3a4a'][i % 4]}" stroke="${PL.ink}" stroke-width="3"/>`).join('')}
    <g transform="rotate(-4 0 520)"><rect x="-90" y="420" width="170" height="210" fill="#f6c445" stroke="${PL.ink}" stroke-width="6"/>
      <text x="-5" y="520" text-anchor="middle" font-family="Rubik" font-weight="900" font-size="62" fill="#111">YES</text>
      <text x="-5" y="570" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="28" fill="#111">99¢</text></g>
    <!-- торшер справа + растение -->
    <circle cx="830" cy="560" r="320" fill="url(#rmLamp)"/>
    <path d="M830,600 V1000" stroke="#1a140f" stroke-width="10"/><path d="M780,520 L880,520 L900,610 L760,610 Z" fill="#f2b45a" stroke="${PL.ink}" stroke-width="6"/>
    ${plant(-300, 820, 1.4)}${plant(960, 840, 1.2)}
    <rect x="-400" y="-200" width="1520" height="1600" fill="url(#rmGlow)" style="mix-blend-mode:screen"/>`;
}
function roomFront(t, env) {
  const glow = env.glow || 'yellow', gc = { yellow: '#f6c445', green: '#43d17a', red: '#f2585b' }[glow] || '#f6c445';
  const r = rng(31);
  const papers = [...Array(12)].map(() => { const x = -320 + r() * 1360, y = 1190 + r() * 80, s = .8 + r() * .8;
    return `<path transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${s.toFixed(2)})" d="M-60,30 L-40,-30 L-5,-45 L30,-35 L60,-5 L50,35 Z" fill="#e3e1dc" stroke="${PL.ink}" stroke-width="4" stroke-linejoin="round"/>
      <path transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${s.toFixed(2)})" d="M-30,-10 L0,5 L20,-20 M-10,20 L20,10" stroke="#a9a69e" stroke-width="3" fill="none"/>`; }).join('');
  return `<!-- стол -->
    <path d="M-400,930 L1120,930 L1120,1300 L-400,1300 Z" fill="#4a3324" stroke="${PL.ink}" stroke-width="6"/>
    <path d="M-400,930 L1120,930 L1120,960 L-400,960 Z" fill="#5f4230"/>
    <!-- монитор слева (обратная сторона) и свечение на стол -->
    <path d="M-130,560 L170,600 L170,900 L-130,940 Z" fill="#202024" stroke="${PL.ink}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M170,600 L186,604 L186,896 L170,900 Z" fill="${gc}"/>
    <path d="M20,920 L60,920 L70,940 L10,940 Z" fill="#333" stroke="${PL.ink}" stroke-width="4"/>
    <ellipse cx="300" cy="945" rx="200" ry="22" fill="${gc}" opacity=".25"/>
    <!-- клавиатура, энергетик, лапша -->
    <rect x="230" y="940" width="260" height="34" rx="6" fill="#2a2a2e" stroke="${PL.ink}" stroke-width="5"/>
    <rect x="560" y="860" width="56" height="96" rx="8" fill="#43d17a" stroke="${PL.ink}" stroke-width="5"/><rect x="560" y="890" width="56" height="20" fill="#111"/>
    <path d="M660,880 L760,880 L745,960 L675,960 Z" fill="#fff" stroke="${PL.ink}" stroke-width="5"/><path d="M660,900 L760,900" stroke="#e33" stroke-width="10"/>
    ${env.mess ? papers : ''}`;
}

// ── закат на яхте
function yachtBack(t, env) {
  const r = rng(5);
  const sky = `<linearGradient id="ySky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e4fa6"/><stop offset=".45" stop-color="#ef6a4a"/><stop offset=".7" stop-color="#f7a24a"/></linearGradient>
    <linearGradient id="ySea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a8c"/><stop offset="1" stop-color="#2f2a6e"/></linearGradient>`;
  const city = [...Array(30)].map((_, i) => { const x = 520 + i * 22, h = 40 + r() * 120;
    return `<rect x="${x}" y="${640 - h}" width="20" height="${h}" fill="#6a3a78"/>`; }).join('') +
    `<path d="M880,640 L880,420 L888,300 L896,420 L896,640 Z" fill="#6a3a78"/>`;
  const clouds = [[-200, 160, 1.2], [420, 120, 1], [700, 260, .8], [60, 330, .7]].map(([x, y, s]) =>
    `<path transform="translate(${x + Math.sin(t * .2) * 10},${y}) scale(${s})" d="M0,30 Q20,0 60,10 Q90,-10 130,10 Q170,0 190,30 Z" fill="#f2884d"/>`).join('');
  const glints = [...Array(14)].map((_, i) => { const y = 670 + i * 26, w = 120 - i * 4 + Math.sin(t * 3 + i) * 20;
    return `<rect x="${(810 - w / 2).toFixed(0)}" y="${y}" width="${w.toFixed(0)}" height="8" rx="4" fill="#ffcf6a" opacity="${(.9 - i * .05).toFixed(2)}"/>`; }).join('');
  const boat = (Math.sin(t * .8) * 3).toFixed(1);
  return `<defs>${sky}</defs><rect x="-400" y="-200" width="1520" height="860" fill="url(#ySky)"/>${clouds}
    <circle cx="810" cy="560" r="90" fill="#ffe08a"/>${city}
    <rect x="-400" y="640" width="1520" height="700" fill="url(#ySea)"/>${glints}
    <g transform="translate(0,${boat})"><path d="M960,760 L1080,760 L1070,780 L975,780 Z" fill="#eee" stroke="${PL.ink}" stroke-width="3"/><rect x="990" y="742" width="50" height="18" fill="#ddd" stroke="${PL.ink}" stroke-width="3"/></g>
    <!-- надстройка яхты слева -->
    <path d="M-400,300 L-40,300 C20,300 40,340 30,380 L-10,560 L-400,560 Z" fill="#f3efe6" stroke="${PL.ink}" stroke-width="7"/>
    <path d="M-400,370 L0,370 L-20,470 L-400,470 Z" fill="#2c3466" stroke="${PL.ink}" stroke-width="5"/>
    <path d="M-400,560 L80,560 L80,840 L-400,840 Z" fill="#e8e2d6" stroke="${PL.ink}" stroke-width="7"/>
    <!-- поручни -->
    <path d="M80,760 L1120,760 M80,820 L1120,820" stroke="#e9e9ef" stroke-width="9"/><path d="M80,760 L1120,760" stroke="${PL.ink}" stroke-width="2" opacity=".5"/>
    ${[...Array(8)].map((_, i) => `<path d="M${160 + i * 130},760 L${160 + i * 130},900" stroke="#e9e9ef" stroke-width="9"/>`).join('')}
    <path d="M-400,880 L1120,880 L1120,1300 L-400,1300 Z" fill="#b8673e"/>
    ${[...Array(12)].map((_, i) => `<path d="M-400,${900 + i * 34} L1120,${900 + i * 34}" stroke="#a45a34" stroke-width="3"/>`).join('')}`;
}

// ── клуб
function clubBack(t, env) {
  const fl = env.flash ?? 0, beams = ['#ff4fd8', '#4fd8ff', '#f6c445', '#43d17a', '#a06bff'];
  const b = beams.map((c, i) => { const a = Math.sin(t * 1.7 + i * 1.3) * 35 + (i - 2) * 12;
    return `<path transform="rotate(${a.toFixed(1)} ${100 + i * 130} -60)" d="M${100 + i * 130},-60 L${40 + i * 130},1300 L${160 + i * 130},1300 Z" fill="${c}" opacity=".28"/>`; }).join('');
  const r = rng(12), crowd = [...Array(18)].map((_, i) => { const x = -380 + i * 85, y = 820 + r() * 40 - Math.abs(Math.sin(t * 4.2 + i)) * 24;
    return `<circle cx="${x}" cy="${y.toFixed(0)}" r="42" fill="#1b0f2e"/><path d="M${x - 60},1200 Q${x - 60},${(y + 40).toFixed(0)} ${x},${(y + 40).toFixed(0)} Q${x + 60},${(y + 40).toFixed(0)} ${x + 60},1200 Z" fill="#1b0f2e"/>
      ${i % 3 === 0 ? `<path d="M${x + 30},${(y + 50).toFixed(0)} L${x + 70},${(y - 60).toFixed(0)}" stroke="#1b0f2e" stroke-width="22" stroke-linecap="round"/>` : ''}`; }).join('');
  return `<rect x="-400" y="-200" width="1520" height="1600" fill="#2b1446"/>${b}
    <g transform="rotate(${(t * 40) % 360} 360 90)"><circle cx="360" cy="90" r="64" fill="#cfd3e6" stroke="${PL.ink}" stroke-width="5"/>
      ${[...Array(6)].map((_, i) => `<path d="M${300 + i * 20},40 V140" stroke="#8b90a8" stroke-width="3"/>`).join('')}${[...Array(5)].map((_, i) => `<path d="M300,${50 + i * 20} H420" stroke="#8b90a8" stroke-width="3"/>`).join('')}</g>
    <path d="M360,-200 V26" stroke="${PL.ink}" stroke-width="5"/>${crowd}
    <rect x="-400" y="-200" width="1520" height="1600" fill="#fff" opacity="${(fl * .35 * (Math.floor(t * 10) % 2)).toFixed(2)}"/>`;
}

// ── крыша небоскрёба ночью
function roofBack(t, env) {
  const r = rng(44);
  const tw = [...Array(36)].map((_, i) => { const x = -400 + i * 44, h = 200 + r() * 420;
    let w = `<rect x="${x}" y="${900 - h}" width="40" height="${h}" fill="${i % 2 ? '#1e2547' : '#252d55'}"/>`;
    for (let k = 0; k < 8; k++) if (r() > .4) w += `<rect x="${x + 8 + (k % 2) * 16}" y="${(900 - h + 20 + k * 22).toFixed(0)}" width="8" height="10" fill="#f6c445" opacity="${(.5 + .5 * Math.sin(t * 2 + i + k)).toFixed(2)}"/>`;
    return w; }).join('');
  return `<defs><linearGradient id="rfSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1030"/><stop offset="1" stop-color="#3a2a6e"/></linearGradient></defs>
    <rect x="-400" y="-200" width="1520" height="1600" fill="url(#rfSky)"/>
    ${[...Array(40)].map((_, i) => `<circle cx="${-400 + (i * 97 % 1520)}" cy="${(i * 61 % 500) - 100}" r="2" fill="#fff" opacity=".7"/>`).join('')}
    <circle cx="560" cy="150" r="60" fill="#f4f0d8"/>${tw}
    <!-- билборд -->
    <g transform="translate(-260,180)"><rect width="300" height="150" fill="#0b0b0c" stroke="#f6c445" stroke-width="8"/>
      <text x="150" y="98" text-anchor="middle" font-family="Rubik" font-weight="900" font-size="64" fill="#f6c445" letter-spacing="4">DOXA</text>
      <path d="M60,150 V300 M240,150 V300" stroke="#333" stroke-width="10"/></g>
    <path d="M-400,880 L1120,880 L1120,1300 L-400,1300 Z" fill="#3a3d48"/><path d="M-400,880 L1120,880" stroke="#5a5e6c" stroke-width="16"/>
    <path d="M-400,800 L1120,800" stroke="#c7cad6" stroke-width="8"/>${[...Array(12)].map((_, i) => `<path d="M${-380 + i * 130},800 V880" stroke="#c7cad6" stroke-width="8"/>`).join('')}`;
}

// ── луна
function moonBack(t, env) {
  return `<rect x="-400" y="-200" width="1520" height="1600" fill="#07071a"/>
    ${[...Array(70)].map((_, i) => `<circle cx="${-400 + (i * 137 % 1520)}" cy="${(i * 89 % 1000) - 200}" r="${1 + i % 3}" fill="#fff" opacity="${(.4 + .6 * Math.abs(Math.sin(t * 2 + i))).toFixed(2)}"/>`).join('')}
    <g transform="translate(560,200) rotate(${t * 6})"><circle r="110" fill="#2f6fd6" stroke="${PL.ink}" stroke-width="6"/>
      <path d="M-60,-60 Q-20,-80 0,-40 Q30,-20 10,10 Q-30,20 -50,-10 Z M30,30 Q70,20 80,50 Q60,80 30,70 Z" fill="#43d17a"/></g>
    <path d="M-400,880 Q360,760 1120,880 L1120,1300 L-400,1300 Z" fill="#cfcfd8" stroke="${PL.ink}" stroke-width="6"/>
    ${[[-200, 960, 60], [620, 940, 44], [880, 1040, 70]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .35}" fill="#aeaebb" stroke="${PL.ink}" stroke-width="4"/>`).join('')}
    <!-- флаг -->
    <path d="M120,880 V560" stroke="#ddd" stroke-width="8"/><path d="M124,566 L300,${590 + Math.sin(t * 5) * 8} L124,650 Z" fill="#f6c445" stroke="${PL.ink}" stroke-width="5"/>
    <text x="190" y="${618 + Math.sin(t * 5) * 4}" text-anchor="middle" font-family="Rubik" font-weight="900" font-size="34" fill="#111">D</text>`;
}

// ── крупный план: лапа на мышке
(window.SETS = window.SETS || {}).paw = (t, shot) => {
  const C = (TIMELINE.events && TIMELINE.events.clicks) || [];
  const down = C.some(c => t >= c && t < c + .12), dy = down ? 10 : 0;
  const glow = shot.glow || '#f6c445';
  return `<svg viewBox="0 0 720 1280" width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="1280" fill="#6b4529"/>
    ${[...Array(14)].map((_, i) => `<path d="M0,${80 + i * 90} Q360,${60 + i * 90} 720,${90 + i * 90}" stroke="#5a3a22" stroke-width="5" fill="none"/>`).join('')}
    <rect width="720" height="1280" fill="${glow}" opacity=".12"/>
    <path d="M330,0 C300,140 420,200 380,340" stroke="#ddd" stroke-width="12" fill="none"/>
    <g transform="translate(360,700) rotate(-12)">
      <path d="M-150,-280 C-150,-370 150,-370 150,-280 L150,220 C150,330 -150,330 -150,220 Z" fill="#f2f2ee" stroke="${PL.ink}" stroke-width="9"/>
      <path d="M0,-350 V-120 M-150,-120 Q0,-100 150,-120" stroke="${PL.ink}" stroke-width="6" fill="none"/>
      <path d="M-148,-280 C-148,-360 -4,-352 -4,-352 L-4,-124 L-148,-124 Z" fill="${down ? '#d8d8d2' : '#fbfbf8'}" stroke="${PL.ink}" stroke-width="5" transform="translate(0,${dy * .5})"/>
      <rect x="-14" y="-300" width="28" height="80" rx="14" fill="#bbb" stroke="${PL.ink}" stroke-width="5"/>
      <!-- лапа: перья + пальцы -->
      <g transform="translate(0,${dy})">
        <path d="M-130,-60 C-170,40 -150,260 -60,420 L140,420 C170,260 150,40 120,-60 C80,-120 -90,-120 -130,-60 Z" fill="#8a5a2f" stroke="${PL.ink}" stroke-width="9"/>
        ${[...Array(9)].map((_, i) => `<path d="M${-110 + i * 26},${40 + (i % 2) * 30} l14,26 l14,-26" stroke="#6b4322" stroke-width="5" fill="none"/>`).join('')}
        <path d="M-90,-80 C-100,-200 -40,-250 -30,-150 L-30,-70 Z" fill="#8a5a2f" stroke="${PL.ink}" stroke-width="8"/>
        <path d="M-10,-80 C-10,-170 60,-170 60,-90 Z" fill="#8a5a2f" stroke="${PL.ink}" stroke-width="8"/>
        <path d="M70,-70 C80,-130 130,-120 125,-60 Z" fill="#8a5a2f" stroke="${PL.ink}" stroke-width="8"/>
        <path d="M-70,-200 l-6,-26 l18,18 Z" fill="#2b2b2b"/>
        <path d="M-150,180 L-150,420 M150,180 L150,420" stroke="#161616" stroke-width="80"/>
        <path d="M-180,240 L180,240 L180,460 L-180,460 Z" fill="#161616" stroke="${PL.ink}" stroke-width="9"/>
        <path d="M-180,250 L180,250" stroke="#e9b52c" stroke-width="10"/>
      </g>
    </g>
    ${down ? `<g transform="translate(300,330)"><path d="M-60,-30 L-90,-60 M0,-50 L0,-90 M60,-30 L90,-60" stroke="#fff" stroke-width="8" stroke-linecap="round"/></g>` : ''}
  </svg>`;
};
