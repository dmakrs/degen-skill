// Звук «El Clásico»: тишина гостиной, гул стадиона на ТВ-шотах, рёв на голах, свисток, тревога на 0:1,
// райзер+бум на камбэке, бит 128 BPM только с победы до конца (другой музыки и «ка-чинга» нет).
export const SAMPLE_RATE = 48000;
export const PEAK_CEILING_DB = -3;

export function cues(TL) {
  const shot = id => TL.shots.find(s => s.id === id), r = x => Math.round(x * 1000) / 1000;
  const M = TL.markets.madrid, V = TL.tv, bpm = TL.bpm;
  const tvShots = TL.shots.filter(s => s.set === 'tv');
  const win = shot('win1').from, beatEnd = TL.duration, len = r(beatEnd - win);
  const away = V.goals.filter(g => g.team === 'away').map(g => g.t), home = V.goals.filter(g => g.team === 'home').map(g => g.t);
  const comeback = home[0];
  return [
    { id: 'room', type: 'room', t: 0, rms: -44 },
    ...tvShots.map((s, i) => ({ id: `crowd${i}`, type: 'crowd', t: s.from, len: r(s.to - s.from), db: -15 })),
    { id: 'roarAway', type: 'roar', t: away, dur: 1.6, db: -13 },
    { id: 'roarHome', type: 'roar', t: home, dur: 2.4, db: -5 },
    { id: 'whistle', type: 'whistle', t: V.final, blasts: [[0.22, 0.12], [0.22, 0.12], [0.75, 0]], db: -9 },
    { id: 'cuts', type: 'whooshCut', t: TL.shots.slice(1).map(s => s.from), align: 'end', db: -22 },
    { id: 'badge', type: 'bloop', t: TL.badges[0].from, db: -12 },
    { id: 'ui', type: 'click', t: M.clicks, db: -12 },
    { id: 'slide', type: 'whoosh', t: M.amount[1].t, db: -20, f: 2200, w: 2000 },
    { id: 'alarm', type: 'alarm', t: [shot('shock').from, M.alert[0][0]], db: -14 },
    { id: 'sting', type: 'slideWhistle', t: r(shot('shock').from + .05), db: -16, rates: [.5] },
    { id: 'riser', type: 'riser', t: comeback, align: 'end', dur: 1.2, db: -14 },
    { id: 'boom', type: 'boom', t: comeback, db: -6 },
    { id: 'resolve', type: 'sparkle', t: M.resolve.t, db: -10 },
    // единственная музыка — бит с победы до конца ролика
    { id: 'kick', type: 'kickLoop', t: win, len, bpm, db: -6 },
    { id: 'hat',  type: 'hatLoop',  t: win, len, bpm, db: -20 },
    { id: 'clap', type: 'clapLoop', t: win, len, bpm, db: -14 },
    { id: 'bass', type: 'bassLoop', t: win, len, bpm, db: -9, root: 49, notes: [0, 0, 0, 3, 5, 5, 3, 0] },
  ];
}
