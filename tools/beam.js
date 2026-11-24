// Prueba de la llamarada (fuego), la ráfaga (aire) y el chorro (agua): deslizar rápido hacia el rival y mantener el dedo.
// Pierden intensidad y alcance; el agua necesita su burbuja guardada y la gasta (más grande, dura más).
// Uso: node tools/beam.js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ ...devices['iPhone 13'] });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  const c = await p.context().newCDPSession(p), t = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const start = async el => {
    await p.evaluate(el => { if (G) document.getElementById('btnBack').click(); document.querySelector(`.elbtn[data-el="${el}"]`).click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.5; G.foe.x = ARENA_W * 0.5; G.foe.y = ARENA_D * 0.25; G.foe.home = { x: G.foe.x, y: G.foe.y }; }, el);
    await p.waitForTimeout(600);
  };
  const swipe = async () => { await t('touchStart', [{ x: 200, y: 640 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 200, y: 640 - i * 60 }]); await p.waitForTimeout(8); } }; // rápido hacia arriba (hacia el rival)
  const reach = () => p.evaluate(() => { const bm = G.beams.find(x => x.on); if (!bm) return 0; return Math.max(0, ...bm.parts.map(q => Math.hypot(q.vx, q.vy))) * BEAM.life; }); // alcance = rapidez de las llamas nuevas × su vida
  const res = {};

  // fuego: llamarada que se mantiene, daña y pierde alcance
  await start('fuego');
  let hp0 = await p.evaluate(() => G.foe.hp);
  await swipe(); await p.waitForTimeout(450);
  res.fireOn = await p.evaluate(() => G.beams.filter(x => x.on).length); const r1 = await reach();
  await p.waitForTimeout(1300); const r2 = await reach(); res.breath = await p.evaluate(() => G.me.breath.toFixed(2));
  await t('touchEnd', []); await p.waitForTimeout(500);
  res.fireOff = await p.evaluate(() => G.beams.filter(x => x.on).length); res.fireDmg = (hp0 - await p.evaluate(() => G.foe.hp)).toFixed(1); res.reach = [r1.toFixed(0), r2.toFixed(0)];
  if (res.fireOn !== 1) errs.push('fuego: no salió la llamarada');
  if (!(r2 < r1 * 0.8)) errs.push('fuego: el alcance no disminuyó');
  if (res.fireOff !== 0) errs.push('fuego: no se cortó al soltar');
  if (!(res.fireDmg > 3)) errs.push('fuego: no dañó');
  await p.waitForTimeout(1500); res.regen = await p.evaluate(() => G.me.breath.toFixed(2));
  if (!(+res.regen > +res.breath)) errs.push('fuego: el aliento no se recupera');
  // fuego: deslizar y soltar sin bolas guardadas = llamarada corta
  await p.evaluate(() => { G.me.breath = 1; }); await swipe(); await t('touchEnd', []); await p.waitForTimeout(100);
  res.burst = await p.evaluate(() => G.beams.filter(x => x.on).length); await p.waitForTimeout(700);
  res.burstEnd = await p.evaluate(() => G.beams.filter(x => x.on).length);
  if (res.burst !== 1 || res.burstEnd !== 0) errs.push('fuego: la llamarada corta no funcionó');

  // aire: ráfaga que daña y empuja
  await start('aire');
  hp0 = await p.evaluate(() => G.foe.hp); const fy0 = await p.evaluate(() => G.foe.y);
  await swipe(); await p.waitForTimeout(1600); await t('touchEnd', []); await p.waitForTimeout(400);
  res.airDmg = (hp0 - await p.evaluate(() => G.foe.hp)).toFixed(1); res.airPush = (fy0 - await p.evaluate(() => G.foe.y)).toFixed(0);
  if (!(res.airDmg > 1)) errs.push('aire: la ráfaga no dañó');
  if (!(res.airPush > 10)) errs.push('aire: la ráfaga no empujó');

  // agua: sin burbuja no hay chorro; con burbuja la gasta, y más grande dura más
  await start('agua');
  await swipe(); await p.waitForTimeout(500); res.noBubble = await p.evaluate(() => G.beams.length); await t('touchEnd', []); await p.waitForTimeout(200);
  if (res.noBubble !== 0) errs.push('agua: salió el chorro sin burbuja');
  const waterDur = async lvl => {
    await p.evaluate(lvl => { const c = G.me.nodes[G.me.ix.upper]; G.orbs = [{ k: 'water', x: c.x + 30, y: c.y, vx: 0, vy: 0, t: 0, life: 1, docked: true, owner: G.me, lvl, side: 1 }]; G.foe.hp = HP_MAX; }, lvl);
    await p.waitForTimeout(200); hp0 = await p.evaluate(() => G.foe.hp);
    await swipe(); const t0 = Date.now(); await p.waitForTimeout(400);
    const on = await p.evaluate(() => G.beams.filter(x => x.on).length);
    await p.waitForFunction(() => !G.beams.some(x => x.on), null, { timeout: 8000 }).catch(() => errs.push('agua: el chorro no se acabó'));
    const d = (Date.now() - t0) / 1000; await t('touchEnd', []); await p.waitForTimeout(300);
    return { on, d: d.toFixed(1), left: await p.evaluate(() => G.orbs.filter(o => o.docked).length), dmg: (hp0 - await p.evaluate(() => G.foe.hp)).toFixed(1) };
  };
  res.w1 = await waterDur(1); res.w3 = await waterDur(3);
  if (res.w1.on !== 1 || res.w3.on !== 1) errs.push('agua: no salió el chorro');
  if (res.w1.left || res.w3.left) errs.push('agua: la burbuja no se gastó');
  if (!(res.w3.d > res.w1.d * 1.8)) errs.push('agua: la burbuja grande no duró más');
  if (!(res.w3.dmg > 3)) errs.push('agua: el chorro no dañó');
  console.log(res);
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
