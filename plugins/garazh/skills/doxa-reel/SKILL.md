---
name: doxa-reel
description: Makes vertical cartoon reels (720×1280@30, 15–40 s) for DOXA — the prediction-markets terminal — starring the DOXA owl (pixel «deal with it» shades, black tracksuit with the gold «D» band). Montage language of viral crypto-degen reels: hard 1–2 s cuts, a huge green/red PnL counter on top, the terminal full-screen (market card, Yes/No in cents, amount slider, Buy, position PnL, RESOLVED stamp), a pump/dump twist and a «money montage» (club, yacht at sunset, rooftop, the moon). Делает рилсы DOXA: сова-трейдер, prediction markets, монтаж «как крипто-рилсы». Use when asked for a DOXA reel/мультик/ролик про сову, prediction market, Polymarket/Kalshi-style story, or «в стиле того видео с PnL».
---

# doxa-reel

Это надстройка над движком `cartoon-reel` (тот же studio, те же команды). Сначала прочитай `${CLAUDE_SKILL_DIR}/../cartoon-reel/SKILL.md` («Перед стартом», «Процесс») — всё оттуда действует. Здесь — только то, что отличается.

## Перед стартом
1. Студия: `bash ${CLAUDE_SKILL_DIR}/../cartoon-reel/scripts/bootstrap.sh` (если её нет). Библиотека стиля лежит в `src/degen/` и грузится только эпизодам с `look: 'degen'`.
2. Эталоны (Read): `../cartoon-reel/references/images/doxa/owl.webp` (персонаж), `…/doxa/terminal.webp` (UI терминала), `../cartoon-reel/references/degen.md` (стайлгайд и API — **обязательно**).
3. Рабочий пример: `episodes/doxa/` — «YES за 12 центов», 23 с. Новый эпизод начинай копией: `cp -R episodes/doxa episodes/<ep>` и переписывай `timeline.js` + `sfx.mjs`.

## Правила бренда (жёстко)
- Герой — **всегда сова DOXA** (`CHARS.owl`): очки надеты по умолчанию, при шоке сползают на клюв. Других героев не вводить без просьбы.
- Тема — prediction markets и терминал DOXA. Лексика: trade, predict, position, market, probability, Yes/No, ¢. **Никогда**: bet, betting, gamble, casino, ставка, ставки, wager.
- Не приписывать DOXA достижения Kalshi/Polymarket. DOXA = удобство, агрегация, скорость.
- Реальные люди (политики, спортсмены) — только как текст вопроса рынка, без портретов.

## Сюжет (≈1 бит в секунду)
`сетап (сова, минусовой PnL) → клик лапой → терминал: выбор Yes/No, ползунок, Buy → поворот против (шок, очки сползают, тревога) → поворот за (памп, бум, RESOLVED) → монтаж богатства с растущим счётчиком (бит 128 BPM) → возврат в реальность + панч (ещё один рынок / самоирония)`.
Покажи пользователю логлайн, рынок(и) и финал до производства. Текст на экране — по-английски (аудитория DOXA), субтитры ≤ 24 символов.

## Команды
```bash
FRAMES_DIR=/tmp/rv node render.mjs --ep <ep> --stills 1,4,8,12 --dsf 1
node render.mjs --ep <ep> out/<ep>_v1.mp4 --final --sfx
```
Сдача: mp4 (SendUserFile) + бит-шит. Проверка ffprobe — как в cartoon-reel.
