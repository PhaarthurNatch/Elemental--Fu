// Prueba de guardar la esfera: llevarla a tu personaje la adosa de inmediato (sin sacar otra ni salpicar al soltar); deslizar rápido hacia el rival la dispara y lo daña.
// Uso: node tools/store.js
const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ ...devices['iPhone 13'] });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  await p.click('.elbtn[data-el="agua"]');
  await p.evaluate(() => { document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.foe.el = 'tierra'; G.orbs = G.orbs.filter(o => o.owner !== G.foe); G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; });
  await p.waitForTimeout(600);
  const c = await p.context().newCDPSession(p), t = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const pool = await p.evaluate(() => { const f = arenaProps()[1], v = view(); return { x: v.ox + f.x * v.k, y: v.oy + (TOP + f.y * DEPTH) * v.k }; });
  const me = await p.evaluate(() => { const v = view(), c = G.me.nodes[G.me.ix.upper]; return { x: v.ox + c.x * v.k, y: v.oy + (c.y + 4 * G.me.s) * v.k }; });
  // sacar la esfera despacio y llevarla a tu personaje
  await t('touchStart', [{ x: pool.x, y: pool.y }]); await p.waitForTimeout(60);
  for (let i = 1; i <= 25; i++) { await t('touchMove', [{ x: pool.x + (me.x - pool.x) * i / 25, y: pool.y + (me.y - pool.y) * i / 25 }]); await p.waitForTimeout(30); }
  await p.waitForTimeout(100); const early = await p.evaluate(() => G.orbs.filter(o => o.docked).length); // inmediato
  for (let i = 1; i <= 10; i++) { await t('touchMove', [{ x: me.x + i * 4, y: me.y - i * 3 }]); await p.waitForTimeout(60); } // sigue moviendo el dedo y lo suelta
  await t('touchEnd', []); await p.waitForTimeout(100);
  const extra = await p.evaluate(() => ({ orbs: G.orbs.filter(o => !o.docked).length, splash: G.splashes.length })); // no sale otra esfera ni una salpicadura
  await p.waitForTimeout(700); const docked = await p.evaluate(() => G.orbs.filter(o => o.docked).length);
  const still = await p.evaluate(() => { const o = G.orbs.find(o => o.docked), c = G.me.nodes[G.me.ix.upper]; return o ? Math.hypot(o.x - c.x, o.y - c.y) : null; });
  // llevar 3 esferas más: el máximo es 3 orbitando
  for (let n = 0; n < 3; n++) { await t('touchStart', [{ x: pool.x, y: pool.y }]); await p.waitForTimeout(60);
    for (let i = 1; i <= 15; i++) { await t('touchMove', [{ x: pool.x + (me.x - pool.x) * i / 15, y: pool.y + (me.y - pool.y) * i / 15 }]); await p.waitForTimeout(30); }
    await p.waitForTimeout(900); await t('touchEnd', []); await p.waitForTimeout(700); }
  const maxOk = await p.evaluate(() => { const d = G.orbs.filter(o => o.docked); return { n: d.length, lvl: d[0] && d[0].lvl, side: d[0] && d[0].side, held: G.orbs.filter(o => !o.docked && o.life > 0).length }; }); // agua: una sola que crece hasta 3
  await p.evaluate(() => { const d = G.orbs.filter(o => o.docked); G.orbs = [d[0]]; });
  // deslizar rápido hacia abajo (lejos del rival): no dispara
  await t('touchStart', [{ x: 300, y: 400 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 300, y: 400 + i * 60 }]); await p.waitForTimeout(8); } await t('touchEnd', []); await p.waitForTimeout(300);
  const notFired = await p.evaluate(() => G.orbs.filter(o => o.docked).length);
  // deslizar rápido desde la esfera hacia el rival: dispara (sigue la dirección deslizada, sin apuntado automático)
  const hp0 = await p.evaluate(() => G.foe.hp);
  const u = await p.evaluate(() => { const o = G.orbs.find(o => o.docked), f = G.foe.nodes[G.foe.ix.upper], dx = f.x - o.x, dy = f.y + 4 * G.foe.s - o.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; });
  await t('touchStart', [{ x: 300, y: 600 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 300 + u.x * i * 60, y: 600 + u.y * i * 60 }]); await p.waitForTimeout(8); } await t('touchEnd', []);
  const flying = await p.evaluate(() => G.orbs.filter(o => o.thrown).length), dirOk = await p.evaluate(u => { const o = G.orbs.find(o => o.thrown); return !!o && (o.vx * u.x + o.vy * u.y) / Math.hypot(o.vx, o.vy) > 0.97; }, u); await p.waitForTimeout(1200);
  const dmg = hp0 - await p.evaluate(() => G.foe.hp);
  // fuego: hasta 3 orbitando
  await p.evaluate(() => { document.getElementById('btnBack').click(); document.querySelector('.elbtn[data-el="fuego"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.foe.el = 'tierra'; G.orbs = G.orbs.filter(o => o.owner !== G.foe); G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; });
  await p.waitForTimeout(600);
  const fire = await p.evaluate(() => { const f = arenaProps()[0], v = view(); return { x: v.ox + f.x * v.k, y: v.oy + (TOP + f.y * DEPTH - 20) * v.k }; });
  const me2 = await p.evaluate(() => { const v = view(), c = G.me.nodes[G.me.ix.upper]; return { x: v.ox + c.x * v.k, y: v.oy + (c.y + 4 * G.me.s) * v.k }; });
  for (let n = 0; n < 4; n++) { await t('touchStart', [{ x: fire.x, y: fire.y }]); await p.waitForTimeout(60);
    for (let i = 1; i <= 15; i++) { await t('touchMove', [{ x: fire.x + (me2.x - fire.x) * i / 15, y: fire.y + (me2.y - fire.y) * i / 15 }]); await p.waitForTimeout(30); }
    await p.waitForTimeout(900); await t('touchEnd', []); await p.waitForTimeout(700); }
  const fireN = await p.evaluate(() => G.orbs.filter(o => o.docked && o.k === 'fire').length);
  if (fireN !== 3) errs.push('fuego: no quedaron 3 orbitando: ' + fireN);
  console.log({ early, extra, docked, maxOk, fireN, still: still && still.toFixed(1), notFired, flying, dmg: dmg.toFixed(1) });
  if (early !== 1) errs.push('no se adosó de inmediato');
  if (extra.orbs || extra.splash) errs.push('al adosar salió otra esfera o una salpicadura: ' + JSON.stringify(extra));
  if (docked !== 1 || !(still < 55)) errs.push('no quedó orbitando cerca del personaje');
  if (!(maxOk.n === 1 && maxOk.lvl === 3)) errs.push('agua: no quedó una sola esfera de tamaño 3: ' + JSON.stringify(maxOk));
  if (notFired !== 1) errs.push('disparó hacia atrás');
  if (flying !== 1 || !(dmg > 5)) errs.push('no se disparó al rival');
  if (!dirOk) errs.push('la esfera no siguió la dirección deslizada');
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
