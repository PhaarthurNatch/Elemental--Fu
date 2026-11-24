// Prueba de las estelas (fuego y agua moviendo rápido la esfera; el dedo solo no deja estela) y qué bloquea cada una, y de las piedras pesadas que siguen al personaje con retraso.
// Agua bloquea aire, tierra y fuego; fuego bloquea aire, el agua pasa debilitada, la tierra pasa; aire bloquea fuego y agua, no la tierra.
// Uso: node tools/wake.js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ ...devices['iPhone 13'] });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  const c = await p.context().newCDPSession(p), t = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const start = async el => { await p.evaluate(el => { if (G) document.getElementById('btnBack').click(); document.querySelector(`.elbtn[data-el="${el}"]`).click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.orbs = []; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.7; G.foe.x = ARENA_W * 0.5; G.foe.y = ARENA_D * 0.3; G.foe.home = { x: G.foe.x, y: G.foe.y }; }, el); await p.waitForTimeout(600); };
  const res = {};
  // fuego: mover rápido la bola de fuego deja una estela larga
  await start('fuego');
  const fire = await p.evaluate(() => { const f = arenaProps()[0], v = view(); return { x: v.ox + f.x * v.k, y: v.oy + (TOP + f.y * DEPTH - 20) * v.k }; });
  await t('touchStart', [{ x: fire.x, y: fire.y }]); await p.waitForTimeout(60);
  for (let i = 1; i <= 9; i++) { await t('touchMove', [{ x: fire.x + i * 5, y: fire.y + i * 4 }]); await p.waitForTimeout(40); } // despacio: sale la bola
  await p.waitForTimeout(200);
  for (let i = 1; i <= 14; i++) { await t('touchMove', [{ x: fire.x + 45 + i * 16, y: fire.y + 36 + (i % 2 ? 40 : -10) }]); await p.waitForTimeout(30); } // rápido de un lado a otro
  res.fireWake = await p.evaluate(() => G.wakes.filter(w => w.k === 'fire').length); await t('touchEnd', []); await p.waitForTimeout(1600);
  res.fireGone = await p.evaluate(() => G.wakes.length);
  if (!(res.fireWake > 10)) errs.push('fuego: mover rápido la bola no dejó estela');
  if (res.fireGone) errs.push('fuego: la estela no se disipó');
  // qué bloquea cada estela: una línea horizontal entre los dos; el rival lanza hacia ti
  const test = async (wk, ak) => p.evaluate(async ([wk, ak]) => {
    G.orbs = []; G.wakes = []; G.me.hp = 100; const y = (G.me.gy + G.foe.gy) / 2 - 20, src = {};
    for (let x = G.me.gx - 60; x <= G.me.gx + 60; x += 6) addWake(wk, G.me, x, y, src);
    for (const w of G.wakes) { w.life = w.max = 5; w.age = -5; }
    const h = G.foe.nodes[G.foe.ix.upper], c = G.me.nodes[G.me.ix.upper], o = newOrb(ak, h.x, h.y), dx = c.x - h.x, dy = c.y + 4 * G.me.s - h.y, d = Math.hypot(dx, dy); G.orbs.push(o); launch(o, dx / d * 600, dy / d * 600, G.foe);
    await new Promise(r => setTimeout(r, 900)); return { dmg: +(100 - G.me.hp).toFixed(1), weak: !!o.weak };
  }, [wk, ak]);
  await start('agua');
  const rules = [['water', 'fire', 'block'], ['water', 'air', 'block'], ['water', 'earth', 'block'], ['fire', 'air', 'block'], ['fire', 'water', 'weak'], ['fire', 'earth', 'pass'], ['air', 'fire', 'block'], ['air', 'water', 'block'], ['air', 'earth', 'pass']];
  res.rules = {};
  for (const [wk, ak, want] of rules) { const r = await test(wk, ak); res.rules[wk + '/' + ak] = r;
    const ok = want === 'block' ? r.dmg === 0 : want === 'weak' ? r.weak && r.dmg > 1 && r.dmg < 10 : r.dmg > 10;
    if (!ok) errs.push(`estela de ${wk} contra ${ak}: se esperaba ${want}, dio ${JSON.stringify(r)}`); }
  // aire y fuego: deslizar el dedo solo ya no deja estela ni golpea
  await start('aire');
  const foeS = await p.evaluate(() => { const v = view(), f = G.foe.nodes[G.foe.ix.upper]; return { x: v.ox + f.x * v.k, y: v.oy + f.y * v.k }; });
  const hp0 = await p.evaluate(() => G.foe.hp);
  await t('touchStart', [{ x: foeS.x - 120, y: foeS.y }]); await p.waitForTimeout(30);
  for (let i = 1; i <= 12; i++) { await t('touchMove', [{ x: foeS.x - 120 + i * 20, y: foeS.y + 2 }]); await p.waitForTimeout(25); }
  res.airWake = await p.evaluate(() => G.wakes.filter(w => w.k === 'air').length); await t('touchEnd', []); await p.waitForTimeout(300);
  res.airDmg = hp0 - await p.evaluate(() => G.foe.hp);
  if (res.airWake || res.airDmg > 0.5) errs.push('aire: deslizar todavía deja estela o daña');
  await start('fuego');
  const foeF = await p.evaluate(() => { const v = view(), f = G.foe.nodes[G.foe.ix.upper]; return { x: v.ox + f.x * v.k, y: v.oy + f.y * v.k }; });
  const hpF = await p.evaluate(() => G.foe.hp);
  await t('touchStart', [{ x: foeF.x - 120, y: foeF.y }]); await p.waitForTimeout(30);
  for (let i = 1; i <= 12; i++) { await t('touchMove', [{ x: foeF.x - 120 + i * 20, y: foeF.y + 2 }]); await p.waitForTimeout(25); }
  res.fireFinger = await p.evaluate(() => G.wakes.filter(w => w.k === 'fire').length); await t('touchEnd', []); await p.waitForTimeout(300);
  res.fireFingerDmg = hpF - await p.evaluate(() => G.foe.hp);
  if (res.fireFinger || res.fireFingerDmg > 0.5) errs.push('fuego: deslizar el dedo todavía deja estela o daña');
  res.ver = await p.evaluate(() => { document.getElementById('btnBack').click(); return document.getElementById('ver').textContent; });
  if (!/Versión v\d/.test(res.ver)) errs.push('no aparece la versión al elegir personaje');
  // tierra: las piedras guardadas siguen al personaje con medio segundo de retraso
  await start('tierra');
  await p.evaluate(() => { for (let i = 0; i < 3; i++) { const c = G.me.nodes[G.me.ix.upper], o = newOrb('earth', c.x, c.y); o.docked = true; o.owner = G.me; o.lvl = 1; G.orbs.push(o); } }); await p.waitForTimeout(800);
  await p.evaluate(() => { G.me.x += 120; }); await p.waitForTimeout(100);
  const lag1 = await p.evaluate(() => { const c = G.me.nodes[G.me.ix.upper]; return Math.max(...G.orbs.map(o => Math.abs(o.ax - c.x))); });
  await p.waitForTimeout(900); const lag2 = await p.evaluate(() => { const c = G.me.nodes[G.me.ix.upper]; return Math.max(...G.orbs.map(o => Math.abs(o.ax - c.x))); });
  res.lag = [lag1.toFixed(0), lag2.toFixed(0)];
  if (!(lag1 > 50 && lag2 < 10)) errs.push('tierra: las piedras no siguieron con retraso: ' + res.lag);
  console.log(res);
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
