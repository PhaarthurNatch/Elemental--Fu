// Prueba de cómo reacciona cada elemento al chocar (esferas lanzadas, guardadas y en la mano):
// el aire y el agua le quitan vuelo a la tierra (el fuego no); el agua detiene al aire y al fuego; la tierra detiene todo; el fuego detiene al aire y achica al agua sin detenerla; el viento detiene al fuego (avivándolo) y al agua (salpicándola); mismo elemento: se anulan.
// Uso: node tools/hits.js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ ...devices['iPhone 13'] });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  await p.click('.elbtn[data-el="fuego"]');
  await p.evaluate(() => { document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.me.x = ARENA_W * 0.15; G.me.y = ARENA_D * 0.85; G.foe.x = ARENA_W * 0.85; G.foe.y = ARENA_D * 0.85; G.foe.home = { x: G.foe.x, y: G.foe.y }; });
  await p.waitForTimeout(500);
  // A (tuya) y B (del rival) lanzadas una contra otra
  const pairTest = (ka, kb) => p.evaluate(async ([ka, kb]) => {
    G.orbs = []; G.fx = []; const y = TOP + ARENA_D * 0.3 * DEPTH, a = newOrb(ka, 160, y), b = newOrb(kb, 360, y); G.orbs.push(a, b); launch(a, 500, 0, G.me); launch(b, -500, 0, G.foe);
    const va = Math.abs(a.vx), vb = Math.abs(b.vx); await new Promise(r => setTimeout(r, 300));
    const st = (o, v0) => o.life <= 0 || o.dead || (!o.thrown && o.k === 'earth') ? 'stop' : o.weak ? 'weak' : Math.abs(o.vx) < v0 * 0.9 ? 'slow' : 'ok';
    return [st(a, va), st(b, vb)];
  }, [ka, kb]);
  const want = { 'fire/water': ['stop', 'weak'], 'fire/air': ['stop', 'stop'], 'fire/earth': ['stop', 'ok'], 'water/air': ['stop', 'stop'], 'water/earth': ['stop', 'slow'], 'air/earth': ['stop', 'slow'], 'earth/earth': ['stop', 'stop'], 'fire/fire': ['stop', 'stop'], 'water/water': ['stop', 'stop'], 'air/air': ['stop', 'stop'] };
  const res = {};
  for (const [k, w] of Object.entries(want)) { const [ka, kb] = k.split('/'); const r = await pairTest(ka, kb); res[k] = r.join(' / ');
    if (r[0] !== w[0] || r[1] !== w[1]) errs.push(`${k}: se esperaba ${w.join(' / ')}, dio ${r.join(' / ')}`); }
  // el viento aviva el fuego (llamarada) y salpica el agua al detenerlos
  const windFx = async kb => p.evaluate(async kb => { G.orbs = []; G.fx = []; const y = TOP + ARENA_D * 0.3 * DEPTH, a = newOrb('air', 160, y), b = newOrb(kb, 360, y); G.orbs.push(a, b); launch(a, 500, 0, G.me); launch(b, -500, 0, G.foe);
    await new Promise(r => setTimeout(r, 300)); return { flame: G.fx.filter(q => q.k === 'flame').length, drop: G.fx.filter(q => q.k === 'drop').length }; }, kb);
  res.windFire = await windFx('fire'); res.windWater = await windFx('water');
  if (!(res.windFire.flame > 6)) errs.push('el viento no avivó el fuego: ' + JSON.stringify(res.windFire));
  if (!(res.windWater.drop > 10)) errs.push('el viento no salpicó el agua: ' + JSON.stringify(res.windWater));
  // guardadas y en la mano también chocan
  const stayTest = (mine, mode, inc) => p.evaluate(async ([mine, mode, inc]) => {
    G.orbs = []; const c = G.me.nodes[G.me.ix.upper], o = newOrb(mine, c.x + 40, c.y); o.owner = G.me; G.orbs.push(o);
    if (mode === 'docked') { o.docked = true; o.lvl = 1; if (mine === 'water') o.side = 1; } else { o.held = true; o.x = c.x + 60; o.y = c.y - 80; const v = view(); PTRS.set(999, { x: v.ox + o.x * v.k, y: v.oy + o.y * v.k, x0: 0, y0: 0, t0: performance.now(), moved: true, prop: -1, orb: o }); } // en la mano: un dedo simulado la sostiene
    await new Promise(r => setTimeout(r, 300));
    const tx = o.x, ty = o.y, i = newOrb(inc, tx + 140, ty); G.orbs.push(i); launch(i, -700, 0, G.foe);
    await new Promise(r => setTimeout(r, 350));
    PTRS.delete(999); return { mine: o.life <= 0 || o.dead ? 'gone' : o.weak ? 'weak' : 'ok', inc: i.weak ? 'weak' : i.life <= 0 || i.dead || (!i.thrown && inc === 'earth') ? 'stop' : 'ok' }; // (la que se achica puede seguir y golpearte)
  }, [mine, mode, inc]);
  const stays = [['fire', 'docked', 'air', 'gone', 'stop'], ['fire', 'docked', 'water', 'gone', 'weak'], ['earth', 'docked', 'fire', 'ok', 'stop'], ['water', 'held', 'fire', 'weak', 'stop']];
  res.stay = {};
  for (const [mine, mode, inc, wm, wi] of stays) { const r = await stayTest(mine, mode, inc); res.stay[`${mine} ${mode} / ${inc}`] = r;
    if (r.mine !== wm || r.inc !== wi) errs.push(`${mine} ${mode} contra ${inc}: se esperaba ${wm} / ${wi}, dio ${r.mine} / ${r.inc}`); }
  // el escudo de agua detiene una bola de fuego (y se gasta un poco)
  const sh = await p.evaluate(async () => { G.orbs = []; G.me.shield = 1; G.me.hp = 100; const c = G.me.nodes[G.me.ix.upper], i = newOrb('fire', c.x + 140, c.y); G.orbs.push(i); launch(i, -700, 0, G.foe);
    await new Promise(r => setTimeout(r, 400)); return { hp: G.me.hp, shield: +G.me.shield.toFixed(2), gone: i.life <= 0 || !!i.dead, steam: G.fx.filter(q => q.k === 'steam').length }; });
  res.shield = sh; await p.evaluate(() => { G.me.shield = 0; });
  if (!(sh.hp === 100 && sh.gone && sh.shield < 0.9 && sh.steam > 0)) errs.push('el escudo de agua no detuvo la bola de fuego: ' + JSON.stringify(sh));
  // el fuego quema la piedra donde la toca y la calienta; caliente, con agua suelta vapor (y se enfría) y con viento lo dispersa más
  const hot = await p.evaluate(async () => { G.orbs = []; G.fx = []; const c = G.me.nodes[G.me.ix.upper], st = newOrb('earth', c.x + 70, c.y - 90); st.owner = G.me; st.held = true; G.orbs.push(st); const v = view(); PTRS.set(998, { x: v.ox + st.x * v.k, y: v.oy + st.y * v.k, x0: 0, y0: 0, t0: performance.now(), moved: true, prop: -1, orb: st }); await new Promise(r => setTimeout(r, 200)); // una piedra en la mano, lejos del cuerpo
    const at = k => { const i = newOrb(k, st.x + 130, st.y); G.orbs.push(i); launch(i, -700, 0, G.foe); return i; };
    for (let k = 0; k < 3; k++) { at('fire'); await new Promise(r => setTimeout(r, 250)); }
    const marks = (st.marks || []).length, heat = st.heat; G.fx = []; at('water'); await new Promise(r => setTimeout(r, 250));
    PTRS.delete(998); return { marks, heat: +heat.toFixed(2), steam: G.fx.filter(q => q.k === 'steam').length, cooled: +st.heat.toFixed(2) }; });
  res.hot = hot;
  if (!(hot.marks > 0 && hot.heat > 0.5 && hot.steam > 3 && hot.cooled < hot.heat)) errs.push('piedra caliente: no se quemó/calentó o no soltó vapor con el agua: ' + JSON.stringify(hot));
  // tierra: las piedras guardadas siguen al personaje con medio segundo de retraso
  await p.evaluate(() => { document.getElementById('btnBack').click(); document.querySelector('.elbtn[data-el="tierra"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.orbs = []; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.7; }); await p.waitForTimeout(500);
  await p.evaluate(() => { for (let i = 0; i < 3; i++) { const c = G.me.nodes[G.me.ix.upper], o = newOrb('earth', c.x, c.y); o.docked = true; o.owner = G.me; o.lvl = 1; G.orbs.push(o); } }); await p.waitForTimeout(800);
  await p.evaluate(() => { G.me.x += 120; }); await p.waitForTimeout(100);
  const lag1 = await p.evaluate(() => { const c = G.me.nodes[G.me.ix.upper]; return Math.max(...G.orbs.map(o => Math.abs(o.ax - c.x))); });
  await p.waitForTimeout(900); const lag2 = await p.evaluate(() => { const c = G.me.nodes[G.me.ix.upper]; return Math.max(...G.orbs.map(o => Math.abs(o.ax - c.x))); });
  res.lag = [lag1.toFixed(0), lag2.toFixed(0)];
  if (!(lag1 > 50 && lag2 < 10)) errs.push('tierra: las piedras no siguieron con retraso: ' + res.lag);
  // alcance (pedido del dueño): tierra > agua > fuego > aire (lanzados), y en las llamaradas/chorros/ráfagas: agua > fuego > aire
  res.range = await p.evaluate(async () => { G.orbs = []; const out = {}; for (const k of ['earth', 'water', 'fire', 'air']) { const o = newOrb(k, ARENA_W * 0.5, TOP + 20); G.orbs.push(o); launch(o, 0, 0.001, G.me); out[k] = Math.round(o.lifeS * 0.001); o.life = 0; }
    out.beam = { water: BEAM.water.range, fire: BEAM.fire.range, air: BEAM.air.range }; return out; });
  if (!(res.range.earth > res.range.water && res.range.water > res.range.fire && res.range.fire > res.range.air && res.range.air > 400)) errs.push('alcances fuera de orden: ' + JSON.stringify(res.range));
  if (!(res.range.beam.water > res.range.beam.fire && res.range.beam.fire > res.range.beam.air)) errs.push('alcances de las llamaradas fuera de orden');
  console.log(res);
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
