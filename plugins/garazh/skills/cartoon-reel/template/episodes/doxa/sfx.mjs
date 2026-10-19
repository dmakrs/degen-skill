// Звук эпизода doxa: тишина-напряжение до пампа, бит 128 BPM с резолва и на весь монтаж, деньги и клики.
// Все времена — из TIMELINE (шоты, клики рынков, события).
export const SAMPLE_RATE = 48000;
export const PEAK_CEILING_DB = -3;

export function cues(TL) {
  const shot = id => TL.shots.find(s => s.id === id), r = x => Math.round(x * 1000) / 1000;
  const M = TL.markets.btc, Q = TL.markets.quit, bpm = TL.bpm;
  const drop = shot('club').from, beatEnd = shot('reality').from, len = r(beatEnd - drop);
  const cuts = TL.shots.slice(1).map(s => s.from);
  return [
    // фон: тихий гул квартиры, приглушён под музыкой
    { id: 'room', type: 'room', t: 0, rms: -40, duck: { from: drop, to: beatEnd, level: 0.2, fadeDown: 0.05, fadeUp: 0.2 } },
    // музыка — с дропа (клуб) до возврата в реальность; обрыв на склейке = тишина перед панчем
    { id: 'kick', type: 'kickLoop', t: drop, len, bpm, db: -6 },
    { id: 'hat',  type: 'hatLoop',  t: drop, len, bpm, db: -20 },
    { id: 'clap', type: 'clapLoop', t: drop, len, bpm, db: -14 },
    { id: 'bass', type: 'bassLoop', t: drop, len, bpm, db: -9, root: 49, notes: [0, 0, 0, 3, 5, 5, 3, 0] },
    // монтаж
    { id: 'cuts', type: 'whooshCut', t: cuts, align: 'end', db: -20 },
    { id: 'badge', type: 'bloop', t: TL.badges[0].from, db: -12 },
    { id: 'paw', type: 'click', t: TL.events.clicks, db: -8 },
    { id: 'ui', type: 'click', t: [...M.clicks, ...Q.clicks], db: -12 },
    { id: 'slide', type: 'whoosh', t: M.amount[1].t, db: -20, f: 2200, w: 2000 },
    // слив и шок
    { id: 'alarm', type: 'alarm', t: shot('shock').from, db: -14 },
    { id: 'sting', type: 'slideWhistle', t: r(shot('shock').from + .05), db: -16, rates: [.5] },
    // памп: райзер в удар, бум, резолв, деньги
    { id: 'riser', type: 'riser', t: M.prob[3].t, align: 'end', dur: 1.0, db: -14 },
    { id: 'boom', type: 'boom', t: M.prob[3].t, db: -5 },
    { id: 'resolve', type: 'sparkle', t: M.resolve.t, db: -10 },
    { id: 'cash', type: 'cash', t: [M.resolve.t, ...TL.pnl.keys.filter(k => k.v > 0 && k.t >= drop && k.t < beatEnd).map(k => k.t)], db: -8 },
    { id: 'buyNo', type: 'cash', t: Q.press, db: -12 },
  ];
}
