// Procedural SFX track: node sfx/build.mjs [--ep tolyan] [--out out/tolyan.sfx.wav] [--keep] [--dump]
// Every cue is synthesised with ffmpeg lavfi expressions (aevalsrc), peak-normalised,
// then mixed with adelay/amix(normalize=0) + alimiter into a 48 kHz stereo wav of TIMELINE.duration seconds.
// Cue times come from the episode: episodes/<ep>/sfx.mjs exports cues(TIMELINE), and TIMELINE is read
// from episodes/<ep>/timeline.js (the same file the browser renders) via node:vm — one source of truth.
//   --dump  print the expanded hit table (id, delay in samples, db, rate, pan) as JSON and exit — diff it to prove a retime/refactor is audio-neutral
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(here);
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); if (i < 0) return def; if (i + 1 >= argv.length) throw new Error(`${name} needs a value`); return argv[i + 1]; };
const ep = opt('--ep', 'tolyan'), epDir = path.join(root, 'episodes', ep);
const outPath = path.resolve(opt('--out', path.join(root, 'out', `${ep}.sfx.wav`)));
const keep = argv.includes('--keep'), dump = argv.includes('--dump');
const tmp = path.join(here, '.tmp', ep);

// timeline.js is a classic browser script (`const TIMELINE = {...}`) of pure literals: evaluate it in an empty vm context
function loadTimeline(file) {
  const TL = runInNewContext(readFileSync(file, 'utf8') + '\n;TIMELINE', {}, { filename: file });
  if (!TL || !(TL.duration > 0)) throw new Error(`${file}: TIMELINE.duration missing`);
  return TL;
}
const TL = loadTimeline(path.join(epDir, 'timeline.js'));
// озвучка (episodes/<ep>/voice.js, генерирует voice/build.mjs) — второй аргумент cues(TL, VOICE): тайминги слов для синхронных ударов
const voiceFile = path.join(epDir, 'voice.js');
const VOICE = existsSync(voiceFile) ? runInNewContext(readFileSync(voiceFile, 'utf8') + '\n;VOICE', {}, { filename: voiceFile }) : null;
const sfxMod = await import(pathToFileURL(path.join(epDir, 'sfx.mjs')).href);
if (typeof sfxMod.cues !== 'function') throw new Error(`${ep}/sfx.mjs must export cues(TIMELINE)`);
const cues = sfxMod.cues(TL, VOICE) || [], DURATION = TL.duration, SR = sfxMod.SAMPLE_RATE ?? 48000, PEAK_CEILING_DB = sfxMod.PEAK_CEILING_DB ?? -3;
for (const c of cues) { if (!c.id || !c.type) throw new Error(`cue without id/type: ${JSON.stringify(c)}`); if (cues.filter(x => x.id === c.id).length > 1) throw new Error(`duplicate cue id "${c.id}"`); }

// ---------- helpers ----------
function ff(args, label) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg failed (${label}):\n${r.stderr}`);
  return r.stderr;
}
function measure(file) { // astats works in float (volumedetect would clip >0 dBFS float peaks)
  const s = ff(['-i', file, '-af', 'astats=measure_perchannel=none:measure_overall=Peak_level+RMS_level', '-f', 'null', '-'], 'measure');
  const ov = s.slice(s.lastIndexOf('Overall'));
  return { max: +ov.match(/Peak level dB: (-?[\d.]+)/)[1], mean: +ov.match(/RMS level dB: (-?[\d.]+)/)[1] };
}
// seeded PRNG so every build is identical
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const N0 = '(random(0)*2-1)', N1 = '(random(1)*2-1)'; // white noise, two independent streams
const src = (expr, dur) => `aevalsrc='${expr}':s=${SR}:d=${dur.toFixed(4)}`;
// term that starts at t0 and receives local time as string
const at = (t0, fn) => `gt(t,${t0})*(${fn(`(t-${t0})`)})`;
const ping = (f, k, tt, a = 1) => `${a}*sin(2*PI*${f}*${tt})*exp(-${k}*${tt})`;
// exponential sweep f0->f1 over D seconds (then holds f1): phase in cycles*2PI
const sweepPhase = (f0, f1, D, tt) => { const r = f1 / f0, L = Math.log(r); return `(2*PI*${(f0 * D / L).toFixed(6)}*(pow(${r},min(${tt},${D})/${D})-1)+2*PI*${f1}*max(${tt}-${D},0))`; };
const sw = x => `pow(sin(PI*clip(${x},0,1)),2)`; // smooth 0..1..0 bump

// ---------- recipes: (cue) -> { graph (ends in [m]), dur } ----------
const RECIPES = {
  // 24/7 night garage: 50 Hz mains hum + harmonics, faint filtered air, distant crickets
  room: () => ({
    dur: DURATION, graph: [
      `${src('(0.5*sin(2*PI*50*t)+0.26*sin(2*PI*100*t+0.7)+0.17*sin(2*PI*150*t+1.9)+0.07*sin(2*PI*250*t+0.3))*(1+0.06*sin(2*PI*0.23*t))', DURATION)}[hum]`,
      `${src(`0.7*${N0}`, DURATION)},highpass=f=120,lowpass=f=1800,lowpass=f=1800[air]`,
      // two crickets, each a burst of ~30 Hz chirps; slightly different pitch/rhythm
      `${src(`0.10*lt(mod(t,1.15),0.42)*pow(sin(PI*mod(t,0.034)/0.034),2)*sin(2*PI*4350*t)+0.08*lt(mod(t+0.55,1.73),0.5)*pow(sin(PI*mod(t,0.029)/0.029),2)*sin(2*PI*4780*t)`, DURATION)},aecho=0.8:0.5:70|110:0.35|0.2[cr]`,
      `[hum][air][cr]amix=inputs=3:normalize=0[m]`].join(';'),
  }),

  // finger-raise: tiny click + soft swish
  tick: () => ({ dur: 0.22, graph:
    `${src(`${at(0, tt => `0.9*sin(2*PI*2300*${tt})*exp(-${tt}*650)`)}+0.5*${N0}*${sw('t/0.17')}*0.8`, 0.22)},bandpass=f=3000:width_type=h:w=3200[m]` }),

  // cartoon "bloop": rising sine sweep, fast decay
  bloop: () => ({ dur: 0.28, graph:
    `${src(`min(1,t/0.004)*exp(-t*17)*(sin(${sweepPhase(280, 950, 0.11, 't')})+0.3*sin(2*${sweepPhase(280, 950, 0.11, 't')}))`, 0.28)}[m]` }),

  // cloth whoosh: band-passed noise swell
  whoosh: c => ({ dur: 0.26, graph:
    `${src(`${N0}*${sw('t/0.2')}`, 0.26)},bandpass=f=${c.f ?? 1400}:width_type=h:w=${c.w ?? 1800},lowpass=f=6000[m]` }),

  // chef's kiss: lips smack (noise transient) + tiny pitched pop
  mwah: () => ({ dur: 0.2, graph: [
    `${src(`${N0}*exp(-t*140)*min(1,t/0.0015)`, 0.2)},bandpass=f=1700:width_type=h:w=2400[sm]`,
    `${src(`${at(0.006, tt => `min(1,${tt}/0.002)*exp(-${tt}*55)*sin(${sweepPhase(300, 820, 0.05, tt)})`)}*0.9`, 0.2)}[bl]`,
    `${src(`${at(0.002, tt => `${N1}*exp(-${tt}*400)`)}*0.35`, 0.2)},lowpass=f=900[mu]`,
    `[sm][bl][mu]amix=inputs=3:normalize=0[m]`].join(';') }),

  // sparkle: 4 descending pings
  sparkle: () => {
    const fs = [3951, 3136, 2637, 2093], step = 0.065;
    const terms = fs.map((f, i) => at(+(i * step).toFixed(3), tt => `${ping(f, 20, tt)}+${ping(f * 2, 32, tt, 0.25)}`)).join('+');
    return { dur: 0.6, graph: `${src(`min(1,t/0.002)*(${terms})`, 0.6)}[m]` };
  },

  // soft whoosh that ends exactly on the cut: swell then abrupt stop
  whooshCut: () => ({ dur: 0.38, graph:
    `${src(`${N0}*pow(clip(t/0.36,0,1),2.2)`, 0.38)},bandpass=f=1000:width_type=h:w=1500,lowpass=f=3500[m]` }),

  // soft UI blip (typing indicator dot)
  blip: () => ({ dur: 0.12, graph:
    `${src(`${sw('t/0.1')}*(sin(2*PI*660*t)+0.2*sin(2*PI*1320*t))`, 0.12)}[m]` }),

  // tiny keyboard-ish tick (one char appearing)
  textTick: () => ({ dur: 0.03, graph:
    `${src(`exp(-t*900)*(0.9*${N0}+0.7*sin(2*PI*3100*t))`, 0.03)},highpass=f=1800[m]` }),

  // mouse click: crisp press, softer release
  click: () => ({ dur: 0.14, graph:
    `${src(`exp(-t*750)*(0.8*${N0}+0.8*sin(2*PI*1900*t))+0.45*${at(0.06, tt => `exp(-${tt}*900)*(0.8*${N1}+0.8*sin(2*PI*2500*${tt}))`)}`, 0.14)},highpass=f=900[m]` }),

  // BOOM: pitch-dropping sine thump + noise burst, saturated for punch
  boom: () => ({ dur: 0.7, graph: [
    `${src(`min(1,t/0.0015)*exp(-t*7.5)*sin(2*PI*(42*t+(150-42)*0.07*(1-exp(-t/0.07))))`, 0.7)}[th]`,
    `${src(`${N0}*exp(-t*20)`, 0.7)},lowpass=f=1400,highpass=f=50[nz]`,
    `[th][nz]amix=inputs=2:weights=1 0.55:normalize=0,asoftclip=type=tanh[m]`].join(';') }),

  // 8-bit "acid website" fanfare: pulse-wave major arpeggio, sample-held + 3-bit quantised
  fanfare: c => {
    const S = 60 / (c.bpm ?? 160) / 4, root = c.root ?? 523.25, dur = (c.cutAt ?? DURATION) - c.t;
    const pat = [0, 4, 7, 12, 16, 12, 7, 4].map((s, i) => `eq(mod(floor(t/${S.toFixed(5)}),8),${i})*${s}`).join('+');
    const TQ = '(floor(t*11025)/11025)'; // sample-and-hold time
    const tt = `mod(${TQ},${S.toFixed(5)})`;
    const f = `${root}*pow(2,(${pat})/12)`;
    const duty = `(0.5-0.25*mod(floor(t/${S.toFixed(5)}),2))`;
    const wave = `(gt(mod(${f}*${tt},1),${duty})*2-1)`;
    const env = `(0.3+0.7*exp(-${tt}*12))*min(1,${tt}/0.002)`;
    return { dur, graph: `${src(`round(${wave}*${env}*7)/7`, dur)},highpass=f=250,lowpass=f=7500[m]` };
  },

  // ── degen / DOXA: музыка и деньги. Лупы синтезируются целиком на длину c.len (с), такт — c.bpm (128)
  // kickLoop: бочка на каждую долю (pitch-drop синус, мягкий клип)
  kickLoop: c => { const B = 60 / (c.bpm ?? 128), tt = `mod(t,${B.toFixed(5)})`;
    return { dur: c.len, graph: `${src(`min(1,${tt}/0.001)*exp(-${tt}*8)*sin(2*PI*(46*${tt}+(170-46)*0.035*(1-exp(-${tt}/0.035))))`, c.len)},asoftclip=type=tanh[m]` }; },
  // hatLoop: хэт на офбит + тихие 16-е
  hatLoop: c => { const B = 60 / (c.bpm ?? 128), q = B / 4, tt = `mod(t,${q.toFixed(5)})`, n = `floor(t/${q.toFixed(5)})`;
    return { dur: c.len, graph: `${src(`${N0}*exp(-${tt}*70)*(0.25+0.75*eq(mod(${n},4),2))`, c.len)},highpass=f=7000[m]` }; },
  // clapLoop: хлопок на 2 и 4
  clapLoop: c => { const B = 60 / (c.bpm ?? 128), tt = `mod(t+${B.toFixed(5)},${(2 * B).toFixed(5)})`;
    return { dur: c.len, graph: `${src(`${N0}*(exp(-${tt}*30)+0.6*gt(${tt},0.012)*exp(-(${tt}-0.012)*40))`, c.len)},bandpass=f=1400:width_type=h:w=1600[m]` }; },
  // bassLoop: 808-бас по нотам c.notes (полутоны от c.root, одна нота на долю, по кругу)
  bassLoop: c => { const B = 60 / (c.bpm ?? 128), notes = c.notes || [0, 0, 3, 5], tt = `mod(t,${B.toFixed(5)})`, i = `mod(floor(t/${B.toFixed(5)}),${notes.length})`;
    const st = notes.map((s, k) => `eq(${i},${k})*${s}`).join('+'), f = `${c.root ?? 55}*pow(2,(${st})/12)`;
    return { dur: c.len, graph: `${src(`min(1,${tt}/0.004)*exp(-${tt}*2.2)*sin(2*PI*${f}*${tt})`, c.len)},asoftclip=type=tanh,lowpass=f=400[m]` }; },
  // cash: «ка-чинг» — щелчок кассы + два металлических пинга
  cash: () => ({ dur: 0.7, graph: [
    `${src(`${N0}*exp(-t*90)`, 0.7)},bandpass=f=3000:width_type=h:w=2500[cl]`,
    `${src(`${at(0.05, tt => `${ping(2093, 7, tt)}+${ping(5274, 11, tt, .5)}+${ping(3136, 9, tt, .4)}`)}+${at(0.16, tt => `${ping(2637, 6, tt)}+${ping(6645, 10, tt, .4)}`)}`, 0.7)}[pg]`,
    `[cl][pg]amix=inputs=2:weights=0.6 1:normalize=0[m]`].join(';') }),
  // riser: шум с растущим тоном и громкостью, align:'end' — приземляется на удар
  riser: c => ({ dur: c.dur ?? 1.2, graph:
    `${src(`pow(t/${c.dur ?? 1.2},2)*(0.6*${N0}+0.5*sin(${sweepPhase(200, 1600, c.dur ?? 1.2, 't')}))`, c.dur ?? 1.2)},highpass=f=300[m]` }),
  // alarm: тревожный двухтон (слив, шок)
  alarm: () => ({ dur: 0.9, graph:
    `${src(`(gt(sin(2*PI*(880-220*gt(mod(t,0.3),0.15))*t),0)*2-1)*0.5*${sw('t/0.9')}`, 0.9)},lowpass=f=3000[m]` }),

  // slide-whistle up, "shock" sting
  slideWhistle: () => ({ dur: 0.2, graph:
    `${src(`min(1,t/0.006)*(sin(${sweepPhase(850, 2900, 0.15, 't')}+0.5*sin(2*PI*26*t))+0.15*sin(3*${sweepPhase(850, 2900, 0.15, 't')}))`, 0.2)}[m]` }),

  // small wooden tick (matchstick)
  woodTick: () => ({ dur: 0.1, graph: [
    `${src(`0.7*sin(2*PI*1250*t)*exp(-t*240)+0.35*sin(2*PI*2150*t)*exp(-t*330)`, 0.1)}[a]`,
    `${src(`${N0}*exp(-t*500)`, 0.1)},bandpass=f=1800:width_type=h:w=2200[b]`,
    `[a][b]amix=inputs=2:weights=1 0.5:normalize=0,lowpass=f=5000[m]`].join(';') }),

  // bell-ish ding
  ding: () => ({ dur: 0.7, graph:
    `${src(`min(1,t/0.003)*(${ping(1568, 6, 't')}+${ping(1568 * 2.76, 11, 't', 0.3)}+${ping(1568 * 5.4, 18, 't', 0.1)}+${ping(1568 * 2, 8, 't', 0.2)})`, 0.7)}[m]` }),

  // ── garazh: новые рецепты (только добавления) ──
  // сегмент гула гаража: 50 Гц + гармоники + воздух; длина c.dur (обрывается на ЩЁЛК автомата, возвращается с лампой)
  garageHum: c => ({ dur: c.dur, graph: [
    `${src('min(1,t/0.03)*(0.5*sin(2*PI*50*t)+0.26*sin(2*PI*100*t+0.7)+0.17*sin(2*PI*150*t+1.9)+0.07*sin(2*PI*250*t+0.3))*(1+0.06*sin(2*PI*0.23*t))', c.dur)}[hum]`,
    `${src(`0.7*min(1,t/0.03)*${N0}`, c.dur)},highpass=f=120,lowpass=f=1800,lowpass=f=1800[air]`,
    `[hum][air]amix=inputs=2:normalize=0[m]`].join(';') }),

  // сверчки отдельно (идут и в темноте); длина c.dur
  crickets: c => ({ dur: c.dur, graph:
    `${src(`0.10*lt(mod(t,1.15),0.42)*pow(sin(PI*mod(t,0.034)/0.034),2)*sin(2*PI*4350*t)+0.08*lt(mod(t+0.55,1.73),0.5)*pow(sin(PI*mod(t,0.029)/0.029),2)*sin(2*PI*4780*t)`, c.dur)},aecho=0.8:0.5:70|110:0.35|0.2[m]` }),

  // кнопка чайника: пластиковый щелчок
  kettleClick: () => ({ dur: 0.1, graph: [
    `${src(`min(1,t/0.0008)*(0.8*sin(2*PI*1100*t)*exp(-t*420)+0.5*sin(2*PI*2400*t)*exp(-t*600))`, 0.1)}[a]`,
    `${src(`${N0}*exp(-t*700)`, 0.1)},bandpass=f=2200:width_type=h:w=2600[b]`,
    `[a][b]amix=inputs=2:weights=1 0.5:normalize=0,lowpass=f=6000[m]`].join(';') }),

  // нарастающий гул чайника: тон f0→f1 за c.dur (степень 1.5) + шипение кипения; c.f0, c.f1
  kettleHum: c => {
    const D = c.dur, f0 = c.f0 ?? 130, f1 = c.f1 ?? 360, p = 1.5, x = `(t/${D.toFixed(4)})`;
    const ph = `2*PI*(${f0}*t+${((f1 - f0) * D / (p + 1)).toFixed(5)}*pow(${x},${p + 1}))`;
    return { dur: D, graph: [
      `${src(`min(1,t/0.03)*(0.3+0.7*${x})*(sin(${ph})+0.45*sin(2*${ph})+0.2*sin(3*${ph}))`, D)},lowpass=f=2400[tn]`,
      `${src(`${N0}*(0.15+0.85*pow(${x},2))`, D)},bandpass=f=1100:width_type=h:w=1800[bo]`,
      `[tn][bo]amix=inputs=2:weights=1 0.35:normalize=0[m]`].join(';') };
  },

  // ЩЁЛК автомата: сухой удар + щелчок + короткий металлический звон
  breakerThunk: () => ({ dur: 0.35, graph: [
    `${src(`min(1,t/0.0006)*exp(-t*38)*sin(2*PI*(70*t+60*0.03*(1-exp(-t/0.03))))`, 0.35)}[th]`,
    `${src(`${N0}*exp(-t*260)`, 0.35)},bandpass=f=2600:width_type=h:w=4000[ck]`,
    `${src(`0.5*sin(2*PI*1350*t)*exp(-t*60)+0.25*sin(2*PI*3100*t)*exp(-t*90)`, 0.35)}[rg]`,
    `[th][ck][rg]amix=inputs=3:weights=1 1 0.5:normalize=0,asoftclip=type=tanh,lowpass=f=7000[m]`].join(';') }),

  // мерцание лампы: сухой электрический тик
  lampFlick: () => ({ dur: 0.06, graph:
    `${src(`exp(-t*130)*(0.7*${N0}+0.8*sin(2*PI*120*t))`, 0.06)},highpass=f=400,lowpass=f=5000[m]` }),

  // лампа «дзынь»: стеклянный пинг
  lampDing: () => ({ dur: 0.4, graph:
    `${src(`min(1,t/0.002)*(${ping(2637, 14, 't')}+${ping(2637 * 2.32, 24, 't', 0.35)}+${ping(2637 * 3.9, 40, 't', 0.12)})`, 0.4)}[m]` }),

  // «бип» ноутбука: два тона вверх
  laptopBeep: () => ({ dur: 0.26, graph:
    `${src(`lt(t,0.1)*sin(2*PI*880*t)*min(1,t/0.004)*clip((0.1-t)/0.006,0,1)+gt(t,0.12)*lt(t,0.24)*sin(2*PI*1320*t)*clip((t-0.12)/0.004,0,1)*clip((0.24-t)/0.006,0,1)`, 0.26)},lowpass=f=4000[m]` }),

  // тик прогресса: короткий сухой
  progTick: () => ({ dur: 0.03, graph:
    `${src(`exp(-t*320)*(sin(2*PI*1500*t)+0.4*${N0})`, 0.03)},highpass=f=700[m]` }),

  // пип ответа Claude: мягкий сине-тоновый
  pip: () => ({ dur: 0.14, graph:
    `${src(`min(1,t/0.003)*exp(-t*28)*(sin(2*PI*920*t)+0.25*sin(2*PI*1840*t))`, 0.14)}[m]` }),

  // вилка в розетку: два «клака» + глухой толчок
  plugClick: () => ({ dur: 0.16, graph: [
    `${src(`exp(-t*260)*(0.8*${N0}+0.7*sin(2*PI*1500*t))+0.8*${at(0.045, tt => `exp(-${tt}*220)*(0.7*${N1}+0.8*sin(2*PI*1000*${tt}))`)}`, 0.16)},highpass=f=500[a]`,
    `${src(`${at(0.045, tt => `sin(2*PI*220*${tt})*exp(-${tt}*60)`)}`, 0.16)}[b]`,
    `[a][b]amix=inputs=2:weights=1 0.5:normalize=0,lowpass=f=6000[m]`].join(';') }),

  // звяк кружки: керамический пинг
  mugClink: () => ({ dur: 0.45, graph:
    `${src(`min(1,t/0.0012)*(${ping(3150, 22, 't')}+${ping(4450, 34, 't', 0.5)}+${ping(6100, 60, 't', 0.2)})+0.3*${N0}*exp(-t*600)`, 0.45)},highpass=f=1500[m]` }),

  // щелчок очков: крошечный пластиковый
  glassesClick: () => ({ dur: 0.07, graph:
    `${src(`exp(-t*480)*(0.8*sin(2*PI*2700*t)+0.5*${N0})`, 0.07)},highpass=f=1200[m]` }),

  // тихий свисток чайника c.dur: ~2.9 кГц с подъёмом, вибрато и дыханием
  kettleWhistle: c => {
    const D = c.dur, x = `(t/${D.toFixed(4)})`, f = `(2800+260*${x})`;
    return { dur: D, graph: [
      `${src(`min(1,t/0.8)*(1+0.03*sin(2*PI*6*t))*(sin(2*PI*${f}*t)+0.2*sin(4*PI*${f}*t))`, D)}[w]`,
      `${src(`0.5*min(1,t/0.8)*${N0}`, D)},bandpass=f=3000:width_type=h:w=900[br]`,
      `[w][br]amix=inputs=2:weights=1 0.5:normalize=0[m]`].join(';') };
  },
};

// ---------- 1) synthesise each cue ----------
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const FADE_IN = 0.002;
const rendered = {};
for (const c of cues) {
  const rec = RECIPES[c.type];
  if (!rec) throw new Error(`unknown cue type ${c.type}`);
  const { graph, dur } = rec(c);
  const fo = Math.min(0.012, dur / 3), fadeOut = c.type === 'room' ? 0.05 : (c.type === 'fanfare' ? 0.004 : c.type === 'whooshCut' ? 0.008 : Math.max(fo, 0.006));
  const raw = path.join(tmp, `${c.id}.raw.wav`), norm = path.join(tmp, `${c.id}.wav`);
  ff(['-filter_complex', `${graph};[m]afade=t=in:d=${c.type === 'room' ? 0.05 : FADE_IN},afade=t=out:st=${(dur - fadeOut).toFixed(4)}:d=${fadeOut}[o]`,
    '-map', '[o]', '-t', dur.toFixed(4), '-ar', SR, '-ac', 1, '-c:a', 'pcm_f32le', raw], c.id);
  const m = measure(raw);
  if (!Number.isFinite(m.max) || !Number.isFinite(m.mean)) throw new Error(`cue ${c.id}: silent or unmeasurable (${JSON.stringify(m)})`);
  const g = c.type === 'room' ? c.rms - m.mean : -m.max; // room: set RMS; others: peak -> 0 dBFS
  ff(['-i', raw, '-af', `volume=${g.toFixed(3)}dB`, '-c:a', 'pcm_f32le', norm], c.id + ' norm');
  rendered[c.id] = { file: norm, dur };
}

// ---------- 2) expand hits and mix ----------
const rand = rng(1337);
const inputs = []; // {file, delaySamples, db, pan, rate, duck}
for (const c of cues) {
  const r = rendered[c.id];
  let times = c.every ? [] : [].concat(c.t);
  if (c.every) for (let x = c.every.from; x < c.every.to - 1e-9; x += c.every.step) times.push(+x.toFixed(4));
  if (times.some(t => !Number.isFinite(t) || t < 0 || t > DURATION)) throw new Error(`cue ${c.id}: bad time(s) ${JSON.stringify(times)} (duration ${DURATION})`);
  times.forEach((t, i) => {
    let db = (c.dbs ? c.dbs[i % c.dbs.length] : c.db) ?? 0, rate = c.rates ? c.rates[i % c.rates.length] : 1;
    if (c.jitter) { db += (rand() * 2 - 1) * (c.jitter.gain ?? 0); rate *= 1 + (rand() * 2 - 1) * (c.jitter.rate ?? 0); }
    if (c.align === 'end') t -= r.dur / rate;
    inputs.push({ id: c.id, file: r.file, delay: Math.max(0, Math.round(t * SR)), db, pan: c.pan ?? 0, rate, duck: c.duck });
  });
}
if (dump) { console.log(JSON.stringify(inputs.map(({ file, ...x }) => x), null, 1)); if (!keep) rmSync(tmp, { recursive: true, force: true }); process.exit(0); }
const duckExpr = d => d ? `1-${(1 - d.level).toFixed(3)}*(clip((t-${d.from - d.fadeDown})/${d.fadeDown},0,1)-clip((t-${d.to})/${d.fadeUp},0,1))` : null;
const chains = inputs.map((x, i) => {
  const th = (x.pan + 1) * Math.PI / 4, L = Math.SQRT2 * Math.cos(th), R = Math.SQRT2 * Math.sin(th);
  const f = [];
  if (x.rate !== 1) f.push(`asetrate=${Math.round(SR * x.rate)}`, `aresample=${SR}`);
  f.push(`volume=${x.db.toFixed(2)}dB`);
  if (x.duck) f.push(`volume='${duckExpr(x.duck)}':eval=frame`);
  f.push(`pan=stereo|c0=${L.toFixed(4)}*c0|c1=${R.toFixed(4)}*c0`, `adelay=${x.delay}S:all=1`);
  return `[${i}:a]${f.join(',')}[s${i}]`;
});
const ceiling = Math.pow(10, PEAK_CEILING_DB / 20);
const total = Math.round(DURATION * SR);
const filter = [...chains,
  `${inputs.map((_, i) => `[s${i}]`).join('')}amix=inputs=${inputs.length}:normalize=0:duration=longest:dropout_transition=0,` +
  `alimiter=limit=${ceiling.toFixed(4)}:attack=2:release=60:level=disabled,apad=whole_len=${total},atrim=end_sample=${total},aresample=${SR}[out]`].join(';');
mkdirSync(path.dirname(outPath), { recursive: true });
if (!inputs.length) // нет ни одного удара (пустой cues) — тихая дорожка нужной длины, чтобы --sfx/--voice не падали
  ff(['-f', 'lavfi', '-i', `anullsrc=r=${SR}:cl=stereo`, '-t', String(DURATION), '-ar', SR, '-ac', 2, '-c:a', 'pcm_s16le', outPath], 'silence');
else
  ff([...inputs.flatMap(x => ['-i', x.file]), '-filter_complex', filter, '-map', '[out]', '-ar', SR, '-ac', 2, '-c:a', 'pcm_s16le', outPath], 'mix');

const fin = inputs.length ? measure(outPath) : { max: '-inf', mean: '-inf' };
console.log(`sfx: ${inputs.length} hits from ${cues.length} cues -> ${path.relative(process.cwd(), outPath) || outPath}  (peak ${fin.max} dB, mean ${fin.mean} dB)`);
if (!keep && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
